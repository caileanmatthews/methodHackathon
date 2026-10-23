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

// Streams one assistant turn as newline-delimited JSON events, calling onEvent for each.
// kind: "brief" (opening briefing), "message", or "finish" (write the field report).
export async function streamTurn({ session_id, kind, message = '', call = false, signal }, onEvent) {
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, kind, message, call }),
    signal,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line) continue
      const event = JSON.parse(line)
      if (event.type === 'error') throw new Error(event.message)
      onEvent(event)
    }
  }
}
