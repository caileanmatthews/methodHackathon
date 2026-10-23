import { useEffect, useRef, useState } from 'react'
import { ClipboardCheck, Mic, SendHorizontal, Square, Volume2, VolumeX } from 'lucide-react'
import { api } from './api'
import { useSpeech } from './useSpeech'
import { AssetPanel, ConditionsPanel, DispatchPanel, DispatchStrip, SurroundingsPanel } from './panels'
import { formatClock } from './format'
import { ReportDocument } from './reports'
import { Switch } from './ui'

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
  const [handsFree, setHandsFree] = useState(false)
  const [tab, setTab] = useState('chat')
  const bottomRef = useRef(null)
  const lastReplyRef = useRef(null)
  const sendRef = useRef(null)

  const speech = useSpeech({ onFinalTranscript: (t) => sendRef.current(t) })
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
    if (voiceOut) speech.speak(res.reply, handsFree && !res.report ? speech.listen : undefined)
    else if (handsFree && !res.report) speech.listen()
  }

  async function run(userText, call) {
    if (busy) return
    setMessages((m) => [...m, { role: 'user', text: userText, time: now() }])
    setBusy(true)
    setTab((t) => (t === 'report' ? t : 'chat'))
    try {
      apply(await call())
    } catch (e) {
      setMessages((m) => [...m, { role: 'error', text: e.message }])
    } finally {
      setBusy(false)
    }
  }

  function send(text) {
    const msg = text.trim()
    if (!msg) return
    setInput('')
    run(msg, () => api.chat(job.session_id, msg))
  }
  useEffect(() => {
    sendRef.current = send
  })

  const finish = () => run('Job complete. Write up the field report.', () => api.finishJob(job.session_id))

  const micLabel = speech.listening
    ? 'Listening… tap to stop'
    : speech.transcribing
      ? 'Transcribing…'
      : speech.supported
        ? 'Tap to talk'
        : 'Voice input unavailable'

  return (
    <div className="job" data-tab={tab}>
      <div className="job-tabs" role="tablist" aria-label="Job views">
        {[
          ['chat', 'Assistant'],
          ['site', 'Site & asset'],
          ['report', 'Report'],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`tab ${id === 'site' ? 'narrow-only' : ''}`}
            onClick={() => setTab(id)}
            disabled={id === 'report' && !report}
          >
            {label}
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

            <div className="composer">
              <button
                className={`mic-btn ${speech.listening ? 'is-live' : ''}`}
                onClick={() => (speech.listening ? speech.stopListening() : speech.listen())}
                disabled={!speech.supported || busy || speech.transcribing}
                aria-label={micLabel}
              >
                {speech.listening ? <Square size={22} fill="currentColor" /> : <Mic size={24} />}
                <span>{micLabel}</span>
              </button>
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
                <Switch checked={voiceOut} onChange={setVoiceOut}>
                  Read replies aloud
                </Switch>
                <Switch checked={handsFree} onChange={setHandsFree} disabled={!speech.supported}>
                  Hands-free
                </Switch>
                {speech.speaking && (
                  <button className="btn btn-ghost btn-sm" onClick={speech.stopSpeaking}>
                    <VolumeX size={15} aria-hidden /> Stop speaking
                  </button>
                )}
                {speech.error && <span className="field-error">{speech.error}</span>}
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
