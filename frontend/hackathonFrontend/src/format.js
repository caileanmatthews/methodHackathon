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

export function formatDateTime(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value || ''
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export const DISPATCH_TONES = {
  assessing: 'info',
  ok_in_service: 'ok',
  conditional: 'warn',
  remove_from_service: 'crit',
}
