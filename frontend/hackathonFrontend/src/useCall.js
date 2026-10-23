import { useCallback, useEffect, useRef, useState } from 'react'

// Hands-free call: the mic stays open, a simple voice-activity detector finds where the tech starts and stops
// talking, and each utterance is handed back as a 16 kHz WAV for transcription. Works the same in every browser.

const WORKLET = `
class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(1024); this.n = 0 }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i]
        if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0 }
      }
    }
    return true
  }
}
registerProcessor('call-tap', Tap)
`

// Audio kept from before speech is detected, so the first word isn't clipped. Generous because cutting in over
// the assistant needs a longer run of voice before it counts.
const PREROLL_MS = 1500
const START_MS = 150 // sustained voice needed to start an utterance
const BARGE_IN_START_MS = 350 // longer while the assistant is talking, so its own voice doesn't trigger it
const END_SILENCE_MS = 1200 // pause that ends a turn; shorter splits sentences mid-thought
const MIN_SPEECH_MS = 300 // shorter blips (coughs, clicks) are dropped
const MAX_UTTERANCE_MS = 30000
const TARGET_RATE = 16000
// Streaming transcription: a partial transcript every INTERIM_MS while the tech talks (live caption), and one at
// the first PAUSE_MS of quiet. If no more speech follows, that pause transcript is the final one and is usually
// back before the turn ends, so the reply doesn't wait on Whisper.
const INTERIM_MS = 1500
const PAUSE_MS = 300

function rmsOf(frame) {
  let sum = 0
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
  return Math.sqrt(sum / frame.length)
}

function encodeWav(frames, inputRate) {
  const total = frames.reduce((n, f) => n + f.length, 0)
  const ratio = inputRate / TARGET_RATE
  const outLen = Math.floor(total / ratio)
  const pcm = new Int16Array(outLen)
  // Flatten, then downsample by averaging each output sample's source window.
  const flat = new Float32Array(total)
  let o = 0
  for (const f of frames) {
    flat.set(f, o)
    o += f.length
  }
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(total, Math.floor((i + 1) * ratio))
    let acc = 0
    for (let j = start; j < end; j++) acc += flat[j]
    const v = Math.max(-1, Math.min(1, acc / Math.max(1, end - start)))
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff
  }
  const buf = new ArrayBuffer(44 + pcm.length * 2)
  const view = new DataView(buf)
  const str = (off, s) => [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  view.setUint32(4, 36 + pcm.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, TARGET_RATE, true)
  view.setUint32(28, TARGET_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  str(36, 'data')
  view.setUint32(40, pcm.length * 2, true)
  new Int16Array(buf, 44).set(pcm)
  return new Blob([buf], { type: 'audio/wav' })
}

export function useCall({ onUtterance, onPause, onInterim, onBargeIn, assistantSpeakingRef }) {
  // phase: off | connecting | listening | capturing | waiting | muted
  const [phase, setPhase] = useState('off')
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')
  const audioRef = useRef(null)
  const phaseRef = useRef('off')
  const handlers = useRef({ onUtterance, onPause, onInterim, onBargeIn })
  useEffect(() => {
    handlers.current = { onUtterance, onPause, onInterim, onBargeIn }
  })

  const go = useCallback((p) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const stop = useCallback(() => {
    const a = audioRef.current
    audioRef.current = null
    if (a) {
      a.node.port.onmessage = null
      a.stream.getTracks().forEach((t) => t.stop())
      a.ctx.close()
    }
    setLevel(0)
    go('off')
  }, [go])

  useEffect(() => stop, [stop])

  const start = useCallback(async () => {
    if (audioRef.current) return
    setError('')
    go('connecting')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    } catch {
      setError('Microphone permission was denied.')
      go('off')
      return
    }
    const ctx = new AudioContext()
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
    await ctx.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)
    const source = ctx.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(ctx, 'call-tap')
    source.connect(node)

    const frameMs = (1024 / ctx.sampleRate) * 1000
    const vad = {
      noise: 0.01,
      loudMs: 0,
      quietMs: 0,
      voicedMs: 0,
      totalMs: 0,
      preroll: [],
      captured: [],
      tick: 0,
      sinceInterimMs: 0,
      paused: false,
      seq: 0, // bumps whenever speech resumes after a pause, invalidating that pause's transcript
    }

    node.port.onmessage = ({ data: frame }) => {
      const rms = rmsOf(frame)
      if (++vad.tick % 4 === 0) setLevel(Math.min(1, rms * 12))
      const p = phaseRef.current
      const speaking = assistantSpeakingRef.current

      if (p === 'listening') {
        const threshold = speaking ? Math.max(0.05, vad.noise * 6) : Math.max(0.015, vad.noise * 3)
        if (rms > threshold) {
          vad.loudMs += frameMs
        } else {
          // Decay rather than reset, so the dips between syllables don't restart the count.
          vad.loudMs = Math.max(0, vad.loudMs - frameMs * 0.5)
          if (!speaking && vad.loudMs === 0) vad.noise = vad.noise * 0.95 + rms * 0.05
        }
        vad.preroll.push(frame)
        while (vad.preroll.length * frameMs > PREROLL_MS) vad.preroll.shift()
        if (vad.loudMs >= (speaking ? BARGE_IN_START_MS : START_MS)) {
          if (speaking) handlers.current.onBargeIn?.()
          vad.captured = [...vad.preroll]
          vad.preroll = []
          vad.voicedMs = vad.loudMs
          vad.totalMs = vad.captured.length * frameMs
          vad.quietMs = 0
          vad.loudMs = 0
          vad.sinceInterimMs = 0
          vad.paused = false
          vad.seq++
          go('capturing')
        }
      } else if (p === 'capturing') {
        vad.captured.push(frame)
        vad.totalMs += frameMs
        vad.sinceInterimMs += frameMs
        if (rms > Math.max(0.012, vad.noise * 2.2)) {
          vad.quietMs = 0
          vad.voicedMs += frameMs
          if (vad.paused) {
            vad.paused = false
            vad.seq++
          }
        } else {
          vad.quietMs += frameMs
        }
        const enough = vad.voicedMs >= MIN_SPEECH_MS
        if (enough && !vad.paused && vad.quietMs >= PAUSE_MS) {
          vad.paused = true
          handlers.current.onPause?.(encodeWav(vad.captured, ctx.sampleRate), vad.seq)
        } else if (enough && !vad.paused && vad.sinceInterimMs >= INTERIM_MS) {
          vad.sinceInterimMs = 0
          handlers.current.onInterim?.(encodeWav(vad.captured, ctx.sampleRate))
        }
        if (vad.quietMs >= END_SILENCE_MS || vad.totalMs >= MAX_UTTERANCE_MS) {
          const frames = vad.captured
          vad.captured = []
          if (!enough) {
            go('listening')
          } else {
            go('waiting')
            handlers.current.onUtterance(encodeWav(frames, ctx.sampleRate), vad.seq)
          }
        }
      }
    }

    audioRef.current = { ctx, stream, node }
    go('listening')
  }, [assistantSpeakingRef, go])

  // Back to listening once a turn has been handed off. Only from 'waiting', so an utterance being captured
  // or a muted mic is never cut short.
  const resume = useCallback(() => {
    if (audioRef.current && phaseRef.current === 'waiting') go('listening')
  }, [go])

  const mute = useCallback(
    (on) => {
      if (!audioRef.current) return
      go(on ? 'muted' : 'listening')
    },
    [go],
  )

  return { phase, active: phase !== 'off', level, error, start, stop, resume, mute }
}
