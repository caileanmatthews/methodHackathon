import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { useSpeech } from './useSpeech'
import { ConditionsStrip, ReportCard } from './components'
import './App.css'

const SCENARIO_1_NOTE =
  'B-12 failed to open on the first SCADA trip command during pre-storm switching, opened on the second command 28 s later, and was closed back in. Go to Harlan Creek and tell me whether B-12 can stay in service through the ice storm tonight. If not, tell me what you need.'

function SetupScreen({ onStart, onShowReports }) {
  const [sites, setSites] = useState([])
  const [assets, setAssets] = useState([])
  const [form, setForm] = useState({
    technician: 'Jordan Reyes',
    substation_id: 'SUB-HCK',
    asset_id: 'HCK-OCB-B12',
    dispatch_note: SCENARIO_1_NOTE,
    scenario_mode: true,
  })
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    api.sites().then(setSites).catch((e) => setError(e.message))
    api.assets().then(setAssets).catch(() => {})
  }, [])

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const siteAssets = assets.filter((a) => a.substation_id === form.substation_id)

  async function start(e) {
    e.preventDefault()
    setStarting(true)
    setError('')
    try {
      await onStart({ ...form, asset_id: form.asset_id || null })
    } catch (err) {
      setError(err.message)
      setStarting(false)
    }
  }

  return (
    <form className="setup" onSubmit={start}>
      <h2>New job</h2>
      <label>
        Technician
        <input value={form.technician} onChange={set('technician')} />
      </label>
      <label>
        Work site
        <select
          value={form.substation_id}
          onChange={(e) => setForm((f) => ({ ...f, substation_id: e.target.value, asset_id: '' }))}
        >
          {sites.map((s) => (
            <option key={s.substation_id} value={s.substation_id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Asset
        <select value={form.asset_id} onChange={set('asset_id')}>
          <option value="">Not sure yet</option>
          {siteAssets.map((a) => (
            <option key={a.asset_id} value={a.asset_id}>
              {a.aliases[0]} · {a.model}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dispatch note
        <textarea rows={4} value={form.dispatch_note} onChange={set('dispatch_note')} />
      </label>
      <label className="check">
        <input type="checkbox" checked={form.scenario_mode} onChange={set('scenario_mode')} />
        Scenario mode (replay 2027-01-19 storm weather instead of live NWS)
      </label>
      {error && <div className="error">{error}</div>}
      <button className="primary" disabled={starting}>
        {starting ? 'Checking site conditions and briefing…' : 'Start job'}
      </button>
      <button type="button" className="ghost" onClick={onShowReports}>
        Field report library
      </button>
    </form>
  )
}

function ReportsScreen({ onBack }) {
  const [reports, setReports] = useState(null)
  useEffect(() => {
    api.reports().then((r) => setReports(r.reverse()))
  }, [])
  return (
    <div className="reports-screen">
      <button className="ghost" onClick={onBack}>
        ← Back
      </button>
      <h2>Field report library</h2>
      <p className="muted">Every report here is fed to the assistant on future jobs.</p>
      {reports === null && <p className="muted">Loading…</p>}
      {reports?.length === 0 && <p className="muted">No reports yet. Finish a job to add one.</p>}
      {reports?.map((r) => (
        <ReportCard key={r.report_id} report={r} />
      ))}
    </div>
  )
}

function JobScreen({ job, onExit }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: job.reply }])
  const [conditions, setConditions] = useState(job.conditions)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [voiceOut, setVoiceOut] = useState(true)
  const [handsFree, setHandsFree] = useState(false)
  const [report, setReport] = useState(null)
  const bottomRef = useRef(null)
  const sendRef = useRef(null)

  const speech = useSpeech({ onFinalTranscript: (t) => sendRef.current(t) })

  useEffect(() => {
    if (!conditions) api.conditions(job.substation_id, job.scenario_mode).then(setConditions)
  }, [conditions, job])

  useEffect(() => {
    if (voiceOut) speech.speak(job.reply)
    // Speak the opening briefing once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  function deliver(reply, newReport) {
    setMessages((m) => [...m, { role: 'assistant', text: reply }])
    if (newReport) setReport(newReport)
    if (voiceOut) speech.speak(reply, handsFree && !newReport ? speech.listen : undefined)
    else if (handsFree) speech.listen()
  }

  async function send(text) {
    const msg = text.trim()
    if (!msg || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg }])
    setBusy(true)
    try {
      const res = await api.chat(job.session_id, msg)
      if (res.conditions) setConditions(res.conditions)
      deliver(res.reply, res.report)
    } catch (e) {
      setMessages((m) => [...m, { role: 'error', text: e.message }])
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    sendRef.current = send
  })

  async function finish() {
    if (busy) return
    setMessages((m) => [...m, { role: 'user', text: 'Job complete — write up the field report.' }])
    setBusy(true)
    try {
      const res = await api.finishJob(job.session_id)
      deliver(res.reply, res.report)
    } catch (e) {
      setMessages((m) => [...m, { role: 'error', text: e.message }])
    } finally {
      setBusy(false)
    }
  }

  function micPress() {
    if (speech.listening) speech.stopListening()
    else speech.listen()
  }

  return (
    <div className="job">
      <div className="job-head">
        <div>
          <div className="label">{job.technician}</div>
          <strong>{conditions?.substation?.name || job.substation_id}</strong>
          {job.asset_id && <span className="muted"> · {job.asset_id}</span>}
        </div>
        <button className="ghost" onClick={onExit}>
          End
        </button>
      </div>

      <ConditionsStrip conditions={conditions} />

      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.text}
            {m.role === 'assistant' && (
              <button className="replay" onClick={() => speech.speak(m.text)} aria-label="Read aloud">
                🔊
              </button>
            )}
          </div>
        ))}
        {busy && <div className="msg assistant pending">Checking the library…</div>}
        {speech.interim && <div className="msg user interim">{speech.interim}</div>}
        {report && <ReportCard report={report} />}
        <div ref={bottomRef} />
      </div>

      <div className="controls">
        <div className="toggles">
          <label className="check">
            <input type="checkbox" checked={voiceOut} onChange={(e) => setVoiceOut(e.target.checked)} />
            Read replies aloud
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={handsFree}
              disabled={!speech.supported}
              onChange={(e) => setHandsFree(e.target.checked)}
            />
            Hands-free
          </label>
          {speech.speaking && (
            <button className="ghost small" onClick={speech.stopSpeaking}>
              Stop talking
            </button>
          )}
        </div>
        <button
          className={`mic ${speech.listening ? 'on' : ''}`}
          onClick={micPress}
          disabled={!speech.supported || busy || speech.transcribing}
          aria-label={speech.listening ? 'Stop listening' : 'Talk'}
        >
          {speech.listening
            ? 'Listening… tap to stop'
            : speech.transcribing
              ? 'Transcribing…'
              : speech.supported
                ? '🎙  Tap to talk'
                : 'Voice not supported in this browser'}
        </button>
        {speech.error && <div className="error">{speech.error}</div>}
        <form
          className="type-row"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Or type: readings, questions, what you did…"
          />
          <button className="primary" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
        <button className="finish" onClick={finish} disabled={busy}>
          Finish job &amp; write report
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [job, setJob] = useState(null)
  const [view, setView] = useState('setup')

  async function startJob(form) {
    const res = await api.startSession(form)
    setJob({ ...form, ...res })
    setView('job')
  }

  return (
    <div className="app">
      <header className="top">
        <span className="brand">⚡ Watt's Up · Field Assistant</span>
      </header>
      <main>
        {view === 'setup' && <SetupScreen onStart={startJob} onShowReports={() => setView('reports')} />}
        {view === 'reports' && <ReportsScreen onBack={() => setView('setup')} />}
        {view === 'job' && job && (
          <JobScreen
            job={job}
            onExit={() => {
              window.speechSynthesis?.cancel()
              setJob(null)
              setView('setup')
            }}
          />
        )}
      </main>
    </div>
  )
}
