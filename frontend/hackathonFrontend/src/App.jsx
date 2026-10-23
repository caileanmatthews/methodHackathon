import { useEffect, useState } from 'react'
import { ClipboardList, Moon, Plus, Sun, Zap } from 'lucide-react'
import { api } from './api'
import { DISPATCH_TONES } from './format'
import HomeView from './HomeView'
import JobView from './JobView'
import { KnowledgeBaseView } from './reports'
import './App.css'

function initialTheme() {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage unavailable; fall back to the system preference
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [theme, setTheme] = useState(initialTheme)
  const [view, setView] = useState({ name: 'home' })
  const [job, setJob] = useState(null)
  const [sites, setSites] = useState([])
  const [assets, setAssets] = useState([])
  const [loadError, setLoadError] = useState('')
  const [jobStatus, setJobStatus] = useState(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  useEffect(() => {
    Promise.all([api.sites(), api.assets()])
      .then(([s, a]) => {
        setSites(s)
        setAssets(a)
      })
      .catch(() => setLoadError("Can't reach the backend. Make sure the API is running on port 8000."))
  }, [])

  async function startJob(form) {
    const res = await api.startSession(form)
    setJobStatus(null)
    setJob({ ...form, ...res })
    setView({ name: 'job' })
  }

  function go(next) {
    window.speechSynthesis?.cancel()
    setView(next)
  }

  const site = job && sites.find((s) => s.substation_id === job.substation_id)
  const asset = job && assets.find((a) => a.asset_id === job.asset_id)

  return (
    <div className="shell">
      <header className="appbar">
        <button className="brand" onClick={() => go(job ? { name: 'job' } : { name: 'home' })}>
          <span className="brand-mark" aria-hidden>
            <Zap size={16} fill="currentColor" />
          </span>
          <span className="brand-name">
            Field Assistant <span className="brand-org">Watt's Up Power Co.</span>
          </span>
        </button>

        {job && (
          <button
            className={`appbar-job ${view.name === 'job' ? 'is-active' : ''}`}
            onClick={() => go({ name: 'job' })}
          >
            <span className="live-dot" data-tone={DISPATCH_TONES[jobStatus] || 'info'} aria-hidden />
            <span className="truncate">
              {site?.name || job.substation_id}
              {asset && ` · ${asset.aliases[0]}`}
            </span>
            {job.scenario_mode && <span className="appbar-chip">Scenario</span>}
          </button>
        )}

        <nav className="appbar-nav" aria-label="Main">
          <button
            className={view.name === 'home' ? 'is-active' : ''}
            onClick={() => go({ name: 'home' })}
            aria-label="New job"
          >
            <Plus size={16} aria-hidden />
            <span>New job</span>
          </button>
          <button
            className={view.name === 'library' ? 'is-active' : ''}
            onClick={() => go({ name: 'library' })}
            aria-label="Field reports"
          >
            <ClipboardList size={16} aria-hidden />
            <span>Field reports</span>
          </button>
          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </nav>
      </header>

      <main className="content">
        {view.name === 'home' && (
          <HomeView
            sites={sites}
            assets={assets}
            loadError={loadError}
            onStart={startJob}
            onOpenReport={(id) => go({ name: 'library', reportId: id })}
            onOpenLibrary={() => go({ name: 'library' })}
          />
        )}
        {view.name === 'library' && <KnowledgeBaseView initialId={view.reportId} />}
        {job && (
          <div hidden={view.name !== 'job'} className="job-host">
            <JobView key={job.session_id} job={job} assets={assets} onDispatch={setJobStatus} />
          </div>
        )}
      </main>
    </div>
  )
}
