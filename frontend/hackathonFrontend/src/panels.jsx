import {
  Ban,
  CircleCheck,
  CloudSnow,
  Cpu,
  LoaderCircle,
  MapPin,
  Radio,
  TriangleAlert,
  Wind,
} from 'lucide-react'
import { formatClock, formatDate } from './format'
import { Badge, Panel, Skeleton } from './ui'

const HOUR = 3600_000

const DISPATCH_STATUS = {
  assessing: { label: 'Assessing', tone: 'info', icon: LoaderCircle },
  ok_in_service: { label: 'Can stay in service', tone: 'ok', icon: CircleCheck },
  conditional: { label: 'Conditional', tone: 'warn', icon: TriangleAlert },
  remove_from_service: { label: 'Remove from service', tone: 'crit', icon: Ban },
}

export function DispatchPanel({ dispatch }) {
  const meta = DISPATCH_STATUS[dispatch?.status] || DISPATCH_STATUS.assessing
  const Icon = meta.icon
  return (
    <Panel title="Dispatch status" icon={Radio} className="dispatch-panel">
      <div className={`status-line tone-${meta.tone}`}>
        <Icon size={18} aria-hidden />
        <span>{meta.label}</span>
        {dispatch?.shownAt && (
          <time className="muted small">
            {formatClock(dispatch.shownAt)}
          </time>
        )}
      </div>
      {dispatch ? (
        <>
          <p className="dispatch-headline">{dispatch.headline}</p>
          <p className="muted small">{dispatch.rationale}</p>
          {dispatch.needs?.length > 0 && (
            <>
              <h3 className="sub-head">Tech needs</h3>
              <ul className="plain-list">
                {dispatch.needs.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <p className="muted small">
          The assistant posts its service recommendation here as the diagnosis firms up.
        </p>
      )}
    </Panel>
  )
}

export function DispatchStrip({ dispatch }) {
  const meta = DISPATCH_STATUS[dispatch?.status] || DISPATCH_STATUS.assessing
  const Icon = meta.icon
  return (
    <div className={`dispatch-strip tone-${meta.tone}`}>
      <Icon size={16} aria-hidden />
      <strong>{meta.label}</strong>
      {dispatch?.headline && <span className="clamp-2">{dispatch.headline}</span>}
    </div>
  )
}

function hoursLabel(ms) {
  const h = Math.floor(ms / HOUR)
  const m = Math.round((ms % HOUR) / 60000)
  return h ? `${h} h ${m} min` : `${m} min`
}

// Forecast periods drawn on one time axis, with the alert window and the job time marked.
function StormTimeline({ forecast, alerts, nowMs }) {
  const periods = forecast
    .map((p) => ({ ...p, start: Date.parse(p.startTime) }))
    .filter((p) => !Number.isNaN(p.start))
  if (periods.length < 2) return null

  const start = Math.min(nowMs, periods[0].start)
  const end = periods[periods.length - 1].start + 12 * HOUR
  const pct = (t) => Math.min(100, Math.max(0, ((t - start) / (end - start)) * 100))
  const windows = alerts
    .filter((a) => a.onset)
    .map((a) => ({ ...a, from: Date.parse(a.onset), to: a.ends ? Date.parse(a.ends) : end }))

  const segs = periods.map((p, i) => {
    const left = pct(p.start)
    const width = pct(periods[i + 1]?.start ?? end) - left
    const freezing = p.temperatureUnit === 'F' ? p.temperature <= 32 : p.temperature <= 0
    // Short periods (e.g. a 4-hour "Overnight") keep their colour but drop labels that would collide.
    return { ...p, left, width, freezing, labelled: width >= 14 }
  })

  return (
    <div className="timeline">
      <div className="timeline-marks">
        <span className="mark-now" style={{ left: `${pct(nowMs)}%` }}>
          Now
        </span>
        {windows.slice(0, 1).map((w) => (
          <span key={w.from} className="mark-alert" style={{ left: `${pct(w.from)}%` }}>
            {w.event.split(' ').slice(-1)[0]} {formatClock(w.from)}
          </span>
        ))}
      </div>
      <div className="timeline-track">
        {segs.map((p) => (
          <div
            key={p.name}
            className={`timeline-seg ${p.freezing ? 'is-freezing' : ''}`}
            style={{ left: `${p.left}%`, width: `${p.width}%` }}
            title={`${p.name}: ${p.temperature}°${p.temperatureUnit}, ${p.shortForecast}`}
          >
            {p.labelled && <span>{p.temperature}°</span>}
          </div>
        ))}
        {windows.map((w) => (
          <div
            key={w.event + w.from}
            className="timeline-alert"
            style={{ left: `${pct(w.from)}%`, width: `${pct(w.to) - pct(w.from)}%` }}
            title={w.event}
          />
        ))}
        <div className="timeline-now" style={{ left: `${pct(nowMs)}%` }} />
      </div>
      <div className="timeline-labels">
        {segs
          .filter((p) => p.labelled)
          .map((p) => (
            <span key={p.name} style={{ left: `${p.left}%` }}>
              {p.name}
            </span>
          ))}
      </div>
      <div className="timeline-legend small muted">
        <span>
          <i className="swatch is-freezing" /> At or below freezing
        </span>
        {windows.length > 0 && (
          <span>
            <i className="swatch is-alert" /> Alert in effect
          </span>
        )}
      </div>
    </div>
  )
}

export function ConditionsPanel({ conditions, nowMs }) {
  if (!conditions) {
    return (
      <Panel title="Site conditions" icon={CloudSnow}>
        <Skeleton lines={4} />
      </Panel>
    )
  }
  const { weather } = conditions
  const forecast = weather.forecast || []
  const alerts = weather.alerts || []
  const current = forecast[0]
  // NWS headlines repeat the event name ("Winter Storm Warning: ..."), which the title already shows.
  const withoutEvent = (a) => {
    const h = a.headline || ''
    const prefix = `${a.event}:`
    return h.toLowerCase().startsWith(prefix.toLowerCase()) ? h.slice(prefix.length).trim() : h
  }
  const nextOnset = alerts
    .map((a) => Date.parse(a.onset))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)[0]

  return (
    <Panel title="Site conditions" icon={CloudSnow}>
      {current ? (
        <div className="weather-now">
          <div className="temp">
            {current.temperature}
            <span>°{current.temperatureUnit}</span>
          </div>
          <div>
            <div className="weather-desc">{current.shortForecast}</div>
            <div className="muted small icon-text">
              <Wind size={14} aria-hidden /> {current.windSpeed}
            </div>
          </div>
        </div>
      ) : (
        <p className="muted small">No forecast available.</p>
      )}

      <StormTimeline forecast={forecast} alerts={alerts} nowMs={nowMs} />

      {alerts.map((a) => (
        <div key={a.event + a.onset} className={`alert-box sev-${(a.severity || 'unknown').toLowerCase()}`}>
          <div className="alert-title">
            <TriangleAlert size={16} aria-hidden />
            <strong>{a.event}</strong>
            {nextOnset && Date.parse(a.onset) === nextOnset && (
              <Badge tone={nextOnset > nowMs ? 'warn' : 'crit'}>
                {nextOnset > nowMs ? `Onset in ${hoursLabel(nextOnset - nowMs)}` : 'In effect'}
              </Badge>
            )}
          </div>
          <p className="small">{withoutEvent(a)}</p>
        </div>
      ))}

      <p className="source-note">Weather: {weather.source}</p>
    </Panel>
  )
}

function age(from, toMs) {
  const t = Date.parse(from)
  if (Number.isNaN(t)) return ''
  const years = (toMs - t) / (365.25 * 24 * HOUR)
  return years >= 1 ? `${Math.floor(years)} yr ago` : `${Math.max(1, Math.round(years * 12))} mo ago`
}

export function AssetPanel({ asset, nowMs }) {
  if (!asset) {
    return (
      <Panel title="Asset" icon={Cpu}>
        <p className="muted small">No asset selected for this job. Name it in the conversation.</p>
      </Panel>
    )
  }
  const rows = [
    ['Model', asset.model],
    ['Manufacturer', asset.manufacturer],
    ['Installed', asset.install_year],
    ['Protects', asset.protects],
    asset.last_full_maintenance && [
      'Last full maintenance',
      `${formatDate(asset.last_full_maintenance)} · ${age(asset.last_full_maintenance, nowMs)}`,
    ],
    asset.last_mechanism_lubrication && [
      'Last mechanism lube',
      `${formatDate(asset.last_mechanism_lubrication)} · ${age(asset.last_mechanism_lubrication, nowMs)}`,
    ],
    asset.last_test_date && ['Last relay test', `${formatDate(asset.last_test_date)} · ${age(asset.last_test_date, nowMs)}`],
    asset.operations_counter && [
      'Operations counter',
      `${asset.operations_counter.toLocaleString()} (as of ${formatDate(asset.operations_counter_as_of)})`,
    ],
  ].filter(Boolean)

  return (
    <Panel title="Asset" icon={Cpu}>
      <div className="asset-title">
        <strong>{asset.aliases[0]}</strong>
        <span className="muted">{asset.asset_id}</span>
      </div>
      <p className="muted small">{asset.asset_type}</p>
      <dl className="facts">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {asset.condition_flags?.length > 0 && (
        <div className="tag-row">
          {asset.condition_flags.map((f) => (
            <Badge key={f} tone="warn">
              {f}
            </Badge>
          ))}
        </div>
      )}
      <p className="muted small">Also called {asset.aliases.slice(1).join(', ')}</p>
    </Panel>
  )
}

export function SurroundingsPanel({ conditions }) {
  if (!conditions) return null
  const { substation, nearby } = conditions
  const features = Object.entries(nearby?.feature_counts || {}).sort((a, b) => b[1] - a[1])
  return (
    <Panel title="Site & surroundings" icon={MapPin}>
      <dl className="facts">
        <div>
          <dt>Access</dt>
          <dd>{substation.access_notes}</dd>
        </div>
        <div>
          <dt>Surroundings</dt>
          <dd>{substation.surroundings}</dd>
        </div>
      </dl>
      {features.length > 0 && (
        <>
          <h3 className="sub-head">Within {((nearby.radius_m || 1500) / 1000).toFixed(1)} km (OpenStreetMap)</h3>
          <ul className="feature-list">
            {features.slice(0, 8).map(([k, n]) => (
              <li key={k}>
                <span>{k.replace('=', ': ').replace(/_/g, ' ')}</span>
                <span className="num">{n}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="source-note">Map: {nearby?.source || 'unavailable'}</p>
    </Panel>
  )
}
