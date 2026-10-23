import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribe } from './api'

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
const canRecord = Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder)

// Chrome/Edge/Safari recognise speech in the browser. Firefox has no Web Speech recognition,
// so there we record audio and have the backend transcribe it with Whisper.
const MODE = Recognition ? 'native' : canRecord ? 'recorder' : null

const SILENCE_RMS = 0.015 // below this counts as quiet
const END_SILENCE_MS = 1400 // stop this long after the tech stops talking
const NO_SPEECH_MS = 8000 // give up if nothing is said
const MAX_RECORD_MS = 45000

// Strip markdown so text-to-speech doesn't read out symbols.
function speakable(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_#`>|]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

// Prefer the neural/natural voices browsers ship (Edge "Online (Natural)", Chrome "Google"), then any US English.
function pickVoice(voices) {
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'))
  const score = (v) =>
    (/natural|neural/i.test(v.name) ? 4 : 0) +
    (/google/i.test(v.name) ? 3 : 0) +
    (/aria|jenny|guy|samantha/i.test(v.name) ? 2 : 0) +
    (v.lang === 'en-US' ? 1 : 0)
  return en.sort((a, b) => score(b) - score(a))[0] || null
}

function pickMimeType() {
  for (const t of ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported?.(t)) return t
  }
  return ''
}

export function useSpeech({ onFinalTranscript }) {
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  // True while listening or transcribing; a ref so callbacks held across renders see the current value.
  const activeRef = useRef(false)
  // Read synchronously by the call's voice detector, which runs outside React renders.
  const speakingRef = useRef(false)
  const speakGen = useRef(0)
  const voiceRef = useRef(null)
  const callbackRef = useRef(onFinalTranscript)
  useEffect(() => {
    callbackRef.current = onFinalTranscript
  })

  useEffect(() => {
    if (MODE !== 'native') return
    const rec = new Recognition()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      let finalText = ''
      let interimText = ''
      for (const r of e.results) {
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      setInterim(interimText)
      if (finalText.trim()) callbackRef.current(finalText.trim())
    }
    rec.onend = () => {
      activeRef.current = false
      setListening(false)
      setInterim('')
    }
    rec.onerror = () => {
      activeRef.current = false
      setListening(false)
    }
    recRef.current = rec
    return () => rec.abort()
  }, [])

  // Release the microphone when the job screen closes.
  useEffect(
    () => () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  const startRecording = useCallback(async () => {
    setError('')
    let stream = streamRef.current
    if (!stream || !stream.active) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      } catch {
        activeRef.current = false
        setError('Microphone permission was denied.')
        return
      }
      streamRef.current = stream
    }

    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    const chunks = []
    let heardSpeech = false

    // Watch the input level so recording ends on its own when the tech stops talking.
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    ctx.createMediaStreamSource(stream).connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    const startedAt = performance.now()
    let lastLoud = startedAt
    let frame

    const watch = () => {
      if (recorder.state !== 'recording') return
      analyser.getFloatTimeDomainData(samples)
      const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length)
      const now = performance.now()
      if (rms > SILENCE_RMS) {
        heardSpeech = true
        lastLoud = now
      }
      const done =
        (heardSpeech && now - lastLoud > END_SILENCE_MS) ||
        (!heardSpeech && now - startedAt > NO_SPEECH_MS) ||
        now - startedAt > MAX_RECORD_MS
      if (done) recorder.stop()
      else frame = requestAnimationFrame(watch)
    }

    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    recorder.onstop = async () => {
      cancelAnimationFrame(frame)
      ctx.close()
      setListening(false)
      if (!heardSpeech || chunks.length === 0) {
        activeRef.current = false
        return
      }
      setTranscribing(true)
      setInterim('Transcribing…')
      try {
        const text = await transcribe(new Blob(chunks, { type: recorder.mimeType }))
        if (text) callbackRef.current(text)
        else setError("Didn't catch that. Try again.")
      } catch (e) {
        setError(e.message)
      } finally {
        activeRef.current = false
        setTranscribing(false)
        setInterim('')
      }
    }

    recorder.start(250)
    setListening(true)
    frame = requestAnimationFrame(watch)
  }, [])

  const listen = useCallback(() => {
    if (activeRef.current || !MODE) return
    activeRef.current = true
    speakGen.current++
    window.speechSynthesis?.cancel()
    speakingRef.current = false
    setSpeaking(false)
    if (MODE === 'recorder') return startRecording()
    try {
      recRef.current.start()
      setListening(true)
    } catch {
      activeRef.current = false
    }
  }, [startRecording])

  const stopListening = useCallback(() => {
    if (MODE === 'recorder') {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    } else recRef.current?.stop()
  }, [])


  useEffect(() => {
    if (!window.speechSynthesis) return
    const choose = () => {
      voiceRef.current = pickVoice(window.speechSynthesis.getVoices())
    }
    choose()
    window.speechSynthesis.addEventListener?.('voiceschanged', choose)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', choose)
  }, [])

  const setSpeakingBoth = useCallback((v) => {
    speakingRef.current = v
    setSpeaking(v)
  }, [])

  // Speak sentence by sentence: sounds more natural, and avoids Chrome cutting off long utterances.
  const speak = useCallback(
    (text, onDone) => {
      const synth = window.speechSynthesis
      if (!synth) return onDone?.()
      synth.cancel()
      const gen = ++speakGen.current
      const sentences = speakable(text).match(/[^.!?]+[.!?]*\s*/g) || []
      if (sentences.length === 0) return onDone?.()
      setSpeakingBoth(true)
      sentences.forEach((s, i) => {
        const u = new SpeechSynthesisUtterance(s.trim())
        if (voiceRef.current) u.voice = voiceRef.current
        u.rate = 1.03
        if (i === sentences.length - 1) {
          u.onend = () => {
            if (gen !== speakGen.current) return
            setSpeakingBoth(false)
            onDone?.()
          }
        }
        u.onerror = () => {
          if (gen === speakGen.current) setSpeakingBoth(false)
        }
        synth.speak(u)
      })
    },
    [setSpeakingBoth],
  )

  const stopSpeaking = useCallback(() => {
    speakGen.current++
    window.speechSynthesis?.cancel()
    setSpeakingBoth(false)
  }, [setSpeakingBoth])

  return {
    supported: Boolean(MODE),
    listening,
    speaking,
    speakingRef,
    transcribing,
    interim,
    error,
    listen,
    stopListening,
    speak,
    stopSpeaking,
  }
}
