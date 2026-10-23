export function ConditionsStrip({ conditions }) {
  if (!conditions) return <div className="conditions muted">Loading site conditions…</div>
  const { weather, nearby, substation } = conditions
  const now = weather.forecast?.[0]
  const alerts = weather.alerts || []
  const features = Object.entries(nearby?.feature_counts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <div className="conditions">
      {alerts.map((a) => (
        <div key={a.event + a.onset} className={`alert sev-${(a.severity || '').toLowerCase()}`}>
          <strong>{a.event}</strong>
          <span>{a.headline}</span>
        </div>
      ))}
      <div className="cond-row">
        {now && (
          <div className="cond-tile">
            <span className="big">{now.temperature}°{now.temperatureUnit}</span>
            <span>{now.shortForecast}</span>
            <span className="muted">Wind {now.windSpeed}</span>
          </div>
        )}
        {weather.forecast?.slice(1, 3).map((p) => (
          <div key={p.name} className="cond-tile">
            <span className="label">{p.name}</span>
            <span className="mid">{p.temperature}°{p.temperatureUnit}</span>
            <span className="muted">{p.shortForecast}</span>
          </div>
        ))}
        <div className="cond-tile wide">
          <span className="label">Site</span>
          <span>{substation.surroundings}</span>
          {features.length > 0 && (
            <span className="muted">
              Nearby: {features.map(([k, n]) => `${n}× ${k}`).join(', ')}
            </span>
          )}
        </div>
      </div>
      <div className="source muted">
        Weather: {weather.source} · Map: {nearby?.source}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null
  return (
    <section>
      <h4>{title}</h4>
      {Array.isArray(children) ? (
        <ul>
          {children.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : (
        <p>{children}</p>
      )}
    </section>
  )
}

export function ReportCard({ report, onClose }) {
  return (
    <div className="report">
      <div className="report-head">
        <div>
          <div className="label">{report.report_id}</div>
          <h3>{report.title}</h3>
          <div className="muted">
            {report.asset_id} · {report.technician} · {report.job_time}
          </div>
        </div>
        {onClose && (
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      <Section title="Symptom">{report.symptom}</Section>
      <Section title="Site conditions">{report.site_conditions}</Section>
      <Section title="As found">{report.as_found}</Section>
      <Section title="Root cause">{report.root_cause}</Section>
      <Section title="Actions taken">{report.actions_taken}</Section>
      <Section title="As left">{report.as_left}</Section>
      <Section title="Recommendation">{report.recommendation}</Section>
      <Section title="Follow-up">{report.follow_up}</Section>
      <Section title="Tips for the next tech">{report.tips_for_next_tech}</Section>
      <Section title="Sources used">{report.sources_used}</Section>
    </div>
  )
}
