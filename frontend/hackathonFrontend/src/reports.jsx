import { useEffect, useState } from 'react'
import { ClipboardList, FileText } from 'lucide-react'
import { api } from './api'
import { formatJobTime } from './format'
import { Panel, Skeleton } from './ui'

function Field({ label, value }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  return (
    <div className="report-field">
      <h3>{label}</h3>
      {Array.isArray(value) ? (
        <ul>
          {value.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      ) : (
        <p>{value}</p>
      )}
    </div>
  )
}

export function ReportDocument({ report }) {
  return (
    <article className="report-doc">
      <header className="report-doc-head">
        <h2>{report.title}</h2>
        <dl className="report-meta">
          <div>
            <dt>Report</dt>
            <dd>{report.report_id}</dd>
          </div>
          <div>
            <dt>Asset</dt>
            <dd>{report.asset_id}</dd>
          </div>
          <div>
            <dt>Technician</dt>
            <dd>{report.technician}</dd>
          </div>
          <div>
            <dt>Job time</dt>
            <dd>{formatJobTime(report.job_time)}</dd>
          </div>
        </dl>
      </header>
      <div className="report-grid">
        <Field label="Symptom" value={report.symptom} />
        <Field label="Site conditions" value={report.site_conditions} />
        <Field label="As found" value={report.as_found} />
        <Field label="Root cause" value={report.root_cause} />
        <Field label="Actions taken" value={report.actions_taken} />
        <Field label="As left" value={report.as_left} />
        <Field label="Recommendation" value={report.recommendation} />
        <Field label="Follow-up" value={report.follow_up} />
      </div>
      <div className="report-tips">
        <Field label="Tips for the next tech" value={report.tips_for_next_tech} />
      </div>
      <Field label="Sources used" value={report.sources_used} />
    </article>
  )
}

export function ReportList({ reports, selectedId, onSelect, empty }) {
  if (reports === null) return <Skeleton lines={4} />
  if (reports.length === 0) return <p className="muted small">{empty}</p>
  return (
    <ul className="report-list">
      {reports.map((r) => (
        <li key={r.report_id}>
          <button
            className={`report-row ${r.report_id === selectedId ? 'is-selected' : ''}`}
            onClick={() => onSelect(r)}
          >
            <FileText size={16} aria-hidden />
            <span className="report-row-main">
              <strong>{r.title}</strong>
              <span className="muted small">
                {r.asset_id} · {r.technician} · <span className="nowrap">{formatJobTime(r.job_time)}</span>
              </span>
              {r.recommendation && <span className="small clamp-2 report-row-outcome">{r.recommendation}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function KnowledgeBaseView({ initialId }) {
  const [reports, setReports] = useState(null)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .reports()
      .then((r) => {
        const sorted = [...r].reverse()
        setReports(sorted)
        setSelected(sorted.find((x) => x.report_id === initialId) || sorted[0] || null)
      })
      .catch((e) => {
        setError(e.message)
        setReports([])
      })
  }, [initialId])

  return (
    <div className="page kb-page">
      <div className="page-head">
        <h1>Field reports</h1>
        <p className="muted">Every report here is read by the assistant at the start of each new job.</p>
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="kb-layout">
        <Panel title={`Reports${reports ? ` (${reports.length})` : ''}`} icon={ClipboardList}>
          <ReportList
            reports={reports}
            selectedId={selected?.report_id}
            onSelect={setSelected}
            empty="No field reports yet. Finish a job to add the first one."
          />
        </Panel>
        <section className="panel kb-detail">
          {selected ? (
            <ReportDocument report={selected} />
          ) : (
            <div className="empty-state">
              <FileText size={28} aria-hidden />
              <p>Select a report to read it.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
