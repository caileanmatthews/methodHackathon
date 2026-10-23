import { useEffect, useRef, useState } from 'react'
import { ClipboardCheck, Mic, MicOff, Phone, PhoneOff, SendHorizontal, Square, Volume2, VolumeX } from 'lucide-react'
import { api, streamTurn, transcribe } from './api'
import { useCall } from './useCall'
import { useSpeech } from './useSpeech'
import { AssetPanel, ConditionsPanel, DispatchPanel, DispatchStrip, SurroundingsPanel } from './panels'
import { formatClock } from './format'
import { ReportDocument } from './reports'
import { Switch } from './ui'

function formatDuration(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

const SCENARIO_NOW = Date.parse('2027-01-19T02:30:00-05:00')

function Message({ m, technician, onSpeak }) {
  if (m.role === 'error') return <div className="msg-error">{m.text}</div>
  const mine = m.role === 'user'
  return (
    <div className={`msg ${mine ? 'is-user' : 'is-assistant'}`}>
      <div className="msg-meta">
        <span>{mine ? technician : 'Field assistant'}</span>
        <time>{m.time}</time>
        {!mine && (
          <button className="icon-btn" onClick={() => onSpeak(m.text)} aria-label="Read this reply aloud">
            <Volume2 size={15} />
          </button>
        )}
      </div>
      {m.text ? (
        <div className="msg-body">
          {m.text}
          {m.interrupted && <span className="msg-note"> (interrupted)</span>}
        </div>
      ) : (
        <div className="msg-body thinking">
          <span className="dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          {m.status || 'Reviewing the library and site conditions'}
        </div>
      )}
      {m.text && m.status && <div className="msg-status">{m.status}…</div>}
    </div>
  )
}

export default function JobView({ job, assets, onDispatch }) {
  // Job clock: in scenario mode it starts at the scenario time and runs forward in real time.
  const [startedAt] = useState(() => Date.now())
  const clockMs = () => (job.scenario_mode ? SCENARIO_NOW + (Date.now() - startedAt) : Date.now())
  const now = () => formatClock(clockMs())
  const [messages, setMessages] = useState([])
  const [conditions, setConditions] = useState(null)
  const [dispatch, setDispatch] = useState(null)
  const [report, setReport] = useState(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [voiceOut, setVoiceOut] = useState(true)
  const [callTranscribing, setCallTranscribing] = useState(false)
  const [callError, setCallError] = useState('')
  const [callCaption, setCallCaption] = useState('')
  const [callStartedAt, setCallStartedAt] = useState(null)
  const [, setTick] = useState(0)
  const [tab, setTab] = useState('chat')
  const bottomRef = useRef(null)
  const lastReplyRef = useRef(null)
  const sendRef = useRef(null)
  // Refs for values read inside an in-flight stream, which outlives the render that started it.
  const busyRef = useRef(false)
  const abortRef = useRef(null)
  const queuedRef = useRef(null)
  const msgSeq = useRef(0)
  const briefedRef = useRef(false)
  const liveRef = useRef({ callActive: false, voiceOut: true })
  // Streaming transcription state for the current call turn.
  const sttRef = useRef({ turn: 0, interimBusy: false, pause: null })

  const speech = useSpeech({ onFinalTranscript: (t) => sendRef.current(t) })
  const call = useCall({
    assistantSpeakingRef: speech.speakingRef,
    // The tech started talking over the assistant: stop speaking and listen.
    onBargeIn: () => speech.stopSpeaking(),
    // Live caption while the tech talks; skipped if the previous partial is still being transcribed.
    onInterim: (wav) => {
      const stt = sttRef.current
      if (stt.interimBusy) return
      stt.interimBusy = true
      const turn = stt.turn
      transcribe(wav)
        .then((t) => turn === sttRef.current.turn && setCallCaption(t))
        .catch(() => {})
        .finally(() => {
          stt.interimBusy = false
        })
    },
    // Start transcribing at the first pause; if the turn ends without more speech, this is the final text.
    onPause: (wav, seq) => {
      const stt = sttRef.current
      const turn = stt.turn
      stt.pause = { seq, promise: transcribe(wav) }
      stt.pause.promise.then((t) => turn === sttRef.current.turn && setCallCaption(t)).catch(() => {})
    },
    onUtterance: async (wav, seq) => {
      const stt = sttRef.current
      const early = stt.pause?.seq === seq ? stt.pause.promise : null
      stt.pause = null
      stt.turn++
      setCallTranscribing(true)
      try {
        const text = (early ? await early.catch(() => transcribe(wav)) : await transcribe(wav)).trim()
        if (text) sendRef.current(text, true)
        else call.resume()
      } catch (e) {
        setCallError(e.message)
        call.resume()
      } finally {
        setCallTranscribing(false)
        setCallCaption('')
      }
    },
  })

  useEffect(() => {
    liveRef.current = { callActive: call.active, voiceOut }
  })

  // Re-render once a second so the call timer moves.
  useEffect(() => {
    if (!call.active) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [call.active])
  const asset = assets.find((a) => a.asset_id === job.asset_id)
  const nowMs = clockMs()

  // The dashboard fills in from the (server-cached) conditions while the briefing streams.
  // The briefing may go ahead before the map data lands ("still loading"); fetch the full set when that happens.
  const mapPending = !conditions || conditions.nearby?.source?.startsWith('still loading')
  useEffect(() => {
    if (mapPending) api.conditions(job.substation_id, job.scenario_mode).then(setConditions).catch(() => {})
  }, [mapPending, job])

  useEffect(() => {
    onDispatch?.(dispatch?.status)
  }, [dispatch, onDispatch])

  // A new reply scrolls to its first line so the answer is read from the top; anything else follows the end.
  useEffect(() => {
    if (messages[messages.length - 1]?.role === 'assistant' && !speech.interim && !callCaption) {
      lastReplyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, speech.interim, callCaption])

  // Run one assistant turn, showing and speaking the reply as it streams in.
  async function turn(kind, { userText, message = '', viaCall = false } = {}) {
    if (busyRef.current) {
      // Cutting in on a call: stop the reply in progress and send this as the next turn.
      if (viaCall) {
        queuedRef.current = message
        abortRef.current?.abort()
      }
      return
    }
    busyRef.current = true
    setBusy(true)
    setTab((t) => (t === 'report' ? t : 'chat'))
    const id = ++msgSeq.current
    setMessages((m) => [
      ...m,
      ...(userText ? [{ role: 'user', text: userText, time: now() }] : []),
      { role: 'assistant', id, text: '', time: now() },
    ])
    const update = (patch) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    const onCall = liveRef.current.callActive
    const speaker = onCall || liveRef.current.voiceOut ? speech.speakStream() : null
    const controller = new AbortController()
    abortRef.current = controller
    let text = ''

    try {
      await streamTurn(
        { session_id: job.session_id, kind, message, call: onCall || viaCall, signal: controller.signal },
        (e) => {
          if (e.type === 'text') {
            // On a call, start listening with the first words so the tech can cut in.
            if (!text && onCall) call.resume()
            text += e.text
            update({ text, status: null })
            speaker?.push(e.text)
          } else if (e.type === 'replace') {
            text = e.text
            update({ text })
          } else if (e.type === 'status') {
            update({ status: e.text })
          } else if (e.type === 'conditions') {
            setConditions(e.data)
          } else if (e.type === 'dispatch') {
            setDispatch({ ...e.data, shownAt: clockMs() })
          } else if (e.type === 'report') {
            setReport(e.data)
            setTab('report')
          }
        },
      )
      update({ text: text.trim(), status: null })
      speaker?.end()
    } catch (err) {
      speaker?.end()
      if (err.name === 'AbortError') {
        speech.stopSpeaking()
        if (text) update({ status: null, interrupted: true })
        else setMessages((m) => m.filter((x) => x.id !== id))
      } else {
        setMessages((m) => [...m.filter((x) => x.id !== id || x.text), { role: 'error', text: err.message }])
      }
    } finally {
      busyRef.current = false
      abortRef.current = null
      setBusy(false)
      if (liveRef.current.callActive) call.resume()
      const queued = queuedRef.current
      queuedRef.current = null
      if (queued) turn('message', { userText: queued, message: queued, viaCall: true })
    }
  }

  // Stream the opening briefing as soon as the job opens (once, even under StrictMode's double effects).
  useEffect(() => {
    if (briefedRef.current) return
    briefedRef.current = true
    turn('brief')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function send(text, viaCall = false) {
    const msg = text.trim()
    if (!msg) return
    if (!viaCall) setInput('')
    turn('message', { userText: msg, message: msg, viaCall })
  }
  useEffect(() => {
    sendRef.current = send
  })

  const finish = () => turn('finish', { userText: 'Job complete. Write up the field report.' })

  async function startCall() {
    setCallError('')
    if (speech.listening) speech.stopListening()
    await call.start()
    setCallStartedAt(Date.now())
    speech.speak("I'm here. Go ahead whenever you're ready.")
  }

  function endCall() {
    call.stop()
    speech.stopSpeaking()
    setCallStartedAt(null)
  }

  const callElapsed = callStartedAt ? Math.floor((Date.now() - callStartedAt) / 1000) : 0
  const callStatus =
    call.phase === 'connecting'
      ? 'Connecting microphone…'
      : call.phase === 'muted'
        ? 'Muted. Unmute to talk.'
        : call.phase === 'capturing'
          ? 'Hearing you…'
          : callTranscribing
            ? 'Got it, transcribing…'
            : busy
              ? 'Thinking…'
              : speech.speaking
                ? 'Speaking. Talk any time to cut in.'
                : 'Listening. Go ahead.'

  const micLabel = speech.listening
    ? 'Listening… tap to stop'
    : speech.transcribing
      ? 'Transcribing…'
      : speech.supported
        ? 'Push to talk'
        : 'Voice input unavailable'

  return (
    <div className="job" data-tab={tab}>
      <div className="job-tabs" role="tablist" aria-label="Job views">
        {[
          ['chat', 'Assistant'],
          ['site', 'Site & asset'],
          ['report', 'Field report', 'Report'],
        ].map(([id, label, short]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`tab ${id === 'site' ? 'narrow-only' : ''}`}
            onClick={() => setTab(id)}
            disabled={id === 'report' && !report}
          >
            {short ? (
              <>
                <span className="wide-only">{label}</span>
                <span className="narrow-only-inline">{short}</span>
              </>
            ) : (
              label
            )}
          </button>
        ))}
        <div className="job-tabs-end">
          <button className="btn btn-secondary" onClick={finish} disabled={busy || Boolean(report)}>
            <ClipboardCheck size={16} aria-hidden />
            <span className="wide-only">{report ? 'Report saved' : 'Finish job & write report'}</span>
            <span className="narrow-only-inline">{report ? 'Saved' : 'Finish'}</span>
          </button>
        </div>
      </div>

      <div className="narrow-only">
        <DispatchStrip dispatch={dispatch} />
      </div>

      <div className="job-main">
        {tab === 'report' && report ? (
          <div className="report-pane">
            <ReportDocument report={report} />
          </div>
        ) : (
          <div className="chat-pane">
            <div className="chat-log" aria-live="polite">
              {messages.map((m, i) => (
                <div key={i} ref={i === messages.length - 1 ? lastReplyRef : undefined} className="msg-wrap">
                  <Message m={m} technician={job.technician} onSpeak={(t) => speech.speak(t)} />
                </div>
              ))}
              {(speech.interim || callCaption) && (
                <div className="msg is-user is-interim">{speech.interim || callCaption}</div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className={`composer ${call.active ? 'in-call' : ''}`}>
              {call.active ? (
                <div className="call-bar" role="status" aria-live="polite">
                  <div className={`call-orb phase-${call.phase}`} style={{ '--level': call.level }} aria-hidden>
                    <Phone size={20} />
                  </div>
                  <div className="call-info">
                    <strong>
                      On call <span className="num muted">{formatDuration(callElapsed)}</span>
                    </strong>
                    <span>{callStatus}</span>
                  </div>
                  <div className="call-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => call.mute(call.phase !== 'muted')}
                      aria-pressed={call.phase === 'muted'}
                    >
                      {call.phase === 'muted' ? <MicOff size={16} aria-hidden /> : <Mic size={16} aria-hidden />}
                      {call.phase === 'muted' ? 'Unmute' : 'Mute'}
                    </button>
                    <button className="btn btn-danger" onClick={endCall}>
                      <PhoneOff size={16} aria-hidden /> End call
                    </button>
                  </div>
                </div>
              ) : (
                <div className="voice-actions">
                  <button className="call-btn" onClick={startCall} disabled={!navigator.mediaDevices}>
                    <Phone size={22} aria-hidden />
                    <span>Start call</span>
                  </button>
                  <button
                    className={`ptt-btn ${speech.listening ? 'is-live' : ''}`}
                    onClick={() => (speech.listening ? speech.stopListening() : speech.listen())}
                    disabled={!speech.supported || busy || speech.transcribing}
                    aria-label={micLabel}
                  >
                    {speech.listening ? <Square size={14} fill="currentColor" /> : <Mic size={16} />}
                    <span>{micLabel}</span>
                  </button>
                </div>
              )}
              <form
                className="composer-input"
                onSubmit={(e) => {
                  e.preventDefault()
                  send(input)
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a reading, question, or what you did"
                  aria-label="Message"
                />
                <button className="btn btn-primary" disabled={busy || !input.trim()} aria-label="Send">
                  <SendHorizontal size={18} />
                </button>
              </form>
              <div className="composer-opts">
                {!call.active && (
                  <Switch checked={voiceOut} onChange={setVoiceOut}>
                    Read replies aloud
                  </Switch>
                )}
                {speech.speaking && (
                  <button className="btn btn-ghost btn-sm" onClick={speech.stopSpeaking}>
                    <VolumeX size={15} aria-hidden /> Stop speaking
                  </button>
                )}
                {(call.error || callError || speech.error) && (
                  <span className="field-error">{call.error || callError || speech.error}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="job-side" aria-label="Job context">
        <DispatchPanel dispatch={dispatch} />
        <ConditionsPanel conditions={conditions} nowMs={nowMs} />
        <AssetPanel asset={asset} nowMs={nowMs} />
        <SurroundingsPanel conditions={conditions} />
      </aside>
    </div>
  )
}
