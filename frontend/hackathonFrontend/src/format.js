export function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Both substations are in the US Eastern time zone; show every clock in site-local time.
const SITE_TZ = 'America/New_York'

export function formatClock(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: SITE_TZ })
}

export const DISPATCH_TONES = {
  assessing: 'info',
  ok_in_service: 'ok',
  conditional: 'warn',
  remove_from_service: 'crit',
}

// The backend records job time as site-local text, e.g. "2027-01-19 02:30 (Tuesday)".
export function formatJobTime(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(value || '')
  if (!m) return value || ''
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]))
  const opts = { timeZone: 'UTC' }
  const date = d.toLocaleDateString('en-US', { ...opts, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  return `${date}, ${d.toLocaleTimeString('en-US', { ...opts, hour: 'numeric', minute: '2-digit' })}`
}
