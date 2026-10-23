async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  return res.json()
}

export const api = {
  sites: () => request('/sites'),
  assets: () => request('/assets'),
  reports: () => request('/reports'),
  conditions: (id, scenario) => request(`/conditions/${id}?scenario=${scenario}`),
  startSession: (body) => request('/session', { method: 'POST', body: JSON.stringify(body) }),
  chat: (session_id, message, call = false) =>
    request('/chat', { method: 'POST', body: JSON.stringify({ session_id, message, call }) }),
  finishJob: (id) => request(`/session/${id}/report`, { method: 'POST' }),
}

export async function transcribe(blob) {
  const form = new FormData()
  form.append('audio', blob, 'speech.webm')
  const res = await fetch('/api/transcribe', { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Transcription failed (${res.status})`)
  }
  return (await res.json()).text
}
