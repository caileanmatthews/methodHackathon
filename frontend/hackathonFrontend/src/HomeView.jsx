import { useEffect, useState } from 'react'
import { ArrowRight, ClipboardList, Library, Wrench } from 'lucide-react'
import { api } from './api'
import { ReportList } from './reports'
import { Panel, Skeleton, Switch } from './ui'

const SCENARIO_1_NOTE =
  'B-12 failed to open on the first SCADA trip command during pre-storm switching, opened on the second command 28 s later, and was closed back in. Go to Harlan Creek and tell me whether B-12 can stay in service through the ice storm tonight. If not, tell me what you need.'

export default function HomeView({ sites, assets, loadError, onStart, onOpenReport, onOpenLibrary }) {
  const [form, setForm] = useState({
    technician: 'Jordan Reyes',
    substation_id: 'SUB-HCK',
    asset_id: 'HCK-OCB-B12',
    dispatch_note: SCENARIO_1_NOTE,
    scenario_mode: true,
  })
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [reports, setReports] = useState(null)

  useEffect(() => {
    api
      .reports()
      .then((r) => setReports([...r].reverse().slice(0, 6)))
      .catch(() => setReports([]))
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
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
    <div className="page home-page">
      <div className="page-head">
        <h1>Start a job</h1>
        <p className="muted">
          The assistant checks site conditions, reads the asset's history, and briefs you before you open the cabinet.
        </p>
      </div>

      <div className="home-layout">
        <Panel title="Job details" icon={Wrench}>
          {loadError ? (
            <div className="error-box">{loadError}</div>
          ) : sites.length === 0 ? (
            <Skeleton lines={5} />
          ) : (
            <form className="form" onSubmit={start}>
              <div className="form-row">
                <label className="field">
                  <span>Technician</span>
                  <input value={form.technician} onChange={set('technician')} required />
                </label>
                <label className="field">
                  <span>Work site</span>
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
              </div>
              <label className="field">
                <span>Asset</span>
                <select value={form.asset_id} onChange={set('asset_id')}>
                  <option value="">Not sure yet</option>
                  {siteAssets.map((a) => (
                    <option key={a.asset_id} value={a.asset_id}>
                      {a.aliases[0]} · {a.asset_type} ({a.model})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Dispatch note</span>
                <textarea rows={4} value={form.dispatch_note} onChange={set('dispatch_note')} />
              </label>
              <Switch
                checked={form.scenario_mode}
                onChange={(v) => setForm((f) => ({ ...f, scenario_mode: v }))}
              >
                <span>
                  Scenario mode
                  <span className="muted small block">
                    Replays the 2027-01-19 ice storm instead of today's live NWS weather.
                  </span>
                </span>
              </Switch>
              {error && <div className="error-box">{error}</div>}
              <div className="form-actions">
                <button className="btn btn-primary btn-lg" disabled={starting}>
                  {starting ? (
                    'Checking conditions and briefing…'
                  ) : (
                    <>
                      Start job <ArrowRight size={18} aria-hidden />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </Panel>

        <div className="home-side">
          <Panel
            title="Recent field reports"
            icon={ClipboardList}
            actions={
              <button className="btn btn-ghost btn-sm" onClick={onOpenLibrary}>
                View all
              </button>
            }
          >
            <ReportList
              reports={reports}
              onSelect={(r) => onOpenReport(r.report_id)}
              empty="None yet. The report from your first finished job will appear here and inform every job after it."
            />
          </Panel>
          <Panel title="Knowledge sources" icon={Library}>
            <ul className="source-list">
              <li>
                <strong>Document library</strong>
                <span className="muted small">Manuals, bulletins, procedures, memos, retired techs' interviews</span>
              </li>
              <li>
                <strong>Maintenance history</strong>
                <span className="muted small">Work orders 2003–2026 and the SCADA event log</span>
              </li>
              <li>
                <strong>Live conditions</strong>
                <span className="muted small">National Weather Service and OpenStreetMap, cached when offline</span>
              </li>
              <li>
                <strong>Field reports</strong>
                <span className="muted small">Written by the assistant at the end of each job</span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
