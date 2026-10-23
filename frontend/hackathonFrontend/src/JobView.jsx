import { useEffect, useRef, useState } from 'react'
import { ClipboardCheck, Mic, MicOff, Phone, PhoneOff, SendHorizontal, Square, Volume2, VolumeX } from 'lucide-react'
import { api, transcribe } from './api'
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
      <div className="msg-body">{m.text}</div>
    </div>
  )
}

export default function JobView({ job, assets, onDispatch }) {
  // Job clock: in scenario mode it starts at the scenario time and runs forward in real time.
  const [startedAt] = useState(() => Date.now())
  const clockMs = () => (job.scenario_mode ? SCENARIO_NOW + (Date.now() - startedAt) : Date.now())
  const now = () => formatClock(clockMs())
  const [messages, setMessages] = useState(() => [{ role: 'assistant', text: job.reply, time: now() }])
  const [conditions, setConditions] = useState(job.conditions)
  const [dispatch, setDispatch] = useState(() => job.dispatch && { ...job.dispatch, shownAt: clockMs() })
  const [report, setReport] = useState(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [voiceOut, setVoiceOut] = useState(true)
  const [callTranscribing, setCallTranscribing] = useState(false)
  const [callError, setCallError] = useState('')
  const [callStartedAt, setCallStartedAt] = useState(null)
  const [, setTick] = useState(0)
  const [tab, setTab] = useState('chat')
  const bottomRef = useRef(null)
  const lastReplyRef = useRef(null)
  const sendRef = useRef(null)

  const speech = useSpeech({ onFinalTranscript: (t) => sendRef.current(t) })
  const call = useCall({
    assistantSpeakingRef: speech.speakingRef,
    // The tech started talking over the assistant: stop speaking and listen.
    onBargeIn: () => speech.stopSpeaking(),
    onUtterance: async (wav) => {
      setCallTranscribing(true)
      try {
        const text = (await transcribe(wav)).trim()
        if (text) sendRef.current(text, true)
        else call.resume()
      } catch (e) {
        setCallError(e.message)
        call.resume()
      } finally {
        setCallTranscribing(false)
      }
    },
  })

  // Re-render once a second so the call timer moves.
  useEffect(() => {
    if (!call.active) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [call.active])
  const asset = assets.find((a) => a.asset_id === job.asset_id)
  const nowMs = clockMs()

  useEffect(() => {
    if (!conditions) api.conditions(job.substation_id, job.scenario_mode).then(setConditions).catch(() => {})
  }, [conditions, job])

  useEffect(() => {
    if (voiceOut) speech.speak(job.reply)
    // Speak the opening briefing once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    onDispatch?.(dispatch?.status)
  }, [dispatch, onDispatch])

  // A new reply scrolls to its first line so the answer is read from the top; anything else follows the end.
  useEffect(() => {
    if (messages[messages.length - 1]?.role === 'assistant' && !busy) {
      lastReplyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, busy, speech.interim])

  function apply(res) {
    if (res.conditions) setConditions(res.conditions)
    if (res.dispatch) setDispatch({ ...res.dispatch, shownAt: clockMs() })
    setMessages((m) => [...m, { role: 'assistant', text: res.reply, time: now() }])
    if (res.report) {
      setReport(res.report)
      setTab('report')
    }
    if (call.active) {
      // On a call every reply is spoken, and the mic listens straight away so the tech can cut in.
      speech.speak(res.reply)
      call.resume()
    } else if (voiceOut) {
      speech.speak(res.reply)
    }
  }

  async function run(userText, request) {
    if (busy) {
      if (call.active) call.resume()
      return
    }
    setMessages((m) => [...m, { role: 'user', text: userText, time: now() }])
    setBusy(true)
    setTab((t) => (t === 'report' ? t : 'chat'))
    try {
      apply(await request())
    } catch (e) {
      setMessages((m) => [...m, { role: 'error', text: e.message }])
      if (call.active) call.resume()
    } finally {
      setBusy(false)
    }
  }

  function send(text, viaCall = false) {
    const msg = text.trim()
    if (!msg) return
    if (!viaCall) setInput('')
    run(msg, () => api.chat(job.session_id, msg, viaCall || call.active))
  }

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
  useEffect(() => {
    sendRef.current = send
  })

  const finish = () => run('Job complete. Write up the field report.', () => api.finishJob(job.session_id))

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
              {busy && (
                <div className="msg is-assistant">
                  <div className="msg-meta">
                    <span>Field assistant</span>
                  </div>
                  <div className="msg-body thinking">
                    <span className="dots" aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                    Reviewing the library and site conditions
                  </div>
                </div>
              )}
              {speech.interim && <div className="msg is-user is-interim">{speech.interim}</div>}
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
