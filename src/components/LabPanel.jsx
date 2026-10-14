import { useEffect, useState, useSyncExternalStore } from 'react'
import { ChevronDown, FlaskConical, RotateCcw, Trash2, X } from 'lucide-react'
import { clearLog, getLog, subscribeLog } from '../api/client'
import { resetMockDb } from '../api/mock'
import { FEATURES } from '../features'
import { useSettings } from '../settings'
import ContractView from './ContractView'

function FeatureCard({ feature, enabled, onToggle }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`feature ${enabled ? 'enabled' : ''}`}>
      <div className="feature-head">
        <div>
          <div className="feature-title">{feature.title}</div>
          <p className="muted small">{feature.summary}</p>
        </div>
        <label className="switch" title={enabled ? 'Disable' : 'Enable'}>
          <input type="checkbox" checked={enabled} onChange={onToggle} aria-label={`Enable ${feature.title}`} />
          <span className="switch-track" />
        </label>
      </div>
      <button className="link-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <ChevronDown size={14} className={open ? 'rot' : ''} /> API contract
      </button>
      {open && <pre className="code">{feature.contract}</pre>}
    </div>
  )
}

function statusClass(status) {
  if (status === 0 || status >= 500) return 'bad'
  if (status >= 400) return 'warn'
  return 'ok'
}

function RequestLog() {
  const log = useSyncExternalStore(subscribeLog, getLog)
  const [selected, setSelected] = useState(null)

  if (!log.length) return <p className="muted center pad">No requests yet. Use the app and they'll show up here.</p>

  return (
    <div className="reqlog">
      <div className="reqlog-bar">
        <span className="muted small">{log.length} requests (newest first)</span>
        <button className="link-btn" onClick={clearLog}>
          <Trash2 size={14} /> Clear
        </button>
      </div>
      {log.map((r) => (
        <div key={r.id} className="req">
          <button className="req-row" onClick={() => setSelected(selected === r.id ? null : r.id)}>
            <span className={`method m-${r.method.toLowerCase()}`}>{r.method}</span>
            <span className="req-url">{r.url}</span>
            <span className={`status ${statusClass(r.status)}`}>{r.status || 'ERR'}</span>
            <span className="muted small">{r.ms}ms</span>
          </button>
          {selected === r.id && (
            <div className="req-detail">
              {r.requestBody !== undefined && (
                <>
                  <span className="small muted">Request body</span>
                  <pre className="code">{JSON.stringify(r.requestBody, null, 2)}</pre>
                </>
              )}
              <span className="small muted">Response{r.mock ? ' (mock)' : ''}</span>
              <pre className="code">
                {r.responseBody === undefined || r.responseBody === null
                  ? '(empty body)'
                  : JSON.stringify(r.responseBody, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Connection({ onDataReset }) {
  const { settings, update } = useSettings()
  const [url, setUrl] = useState(settings.apiUrl)

  return (
    <div className="connection">
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault()
          update({ apiUrl: url.trim() })
        }}
      >
        <span>API base URL</span>
        <div className="input-row">
          <input value={url} onChange={(e) => setUrl(e.target.value)} disabled={settings.mock} />
          <button className="btn" disabled={settings.mock || url.trim() === settings.apiUrl}>Save</button>
        </div>
        <small className="muted">The app calls <code>{'{base}'}/api/watchlist</code>.</small>
      </form>

      <div className="feature">
        <div className="feature-head">
          <div>
            <div className="feature-title">Mock API</div>
            <p className="muted small">
              Use a fake API that runs in the browser and already implements Phase 1 and Phase 2. Handy for demos
              and for comparing against your own API.
            </p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.mock} onChange={(e) => update({ mock: e.target.checked })} aria-label="Use mock API" />
            <span className="switch-track" />
          </label>
        </div>
        {settings.mock && (
          <button
            className="link-btn"
            onClick={() => {
              resetMockDb()
              onDataReset()
            }}
          >
            <RotateCcw size={14} /> Reset mock data
          </button>
        )}
      </div>
    </div>
  )
}

export default function LabPanel({ initialTab = 'features', onClose, onDataReset }) {
  const { settings, toggleFeature } = useSettings()
  const [tab, setTab] = useState(initialTab)
  const enabledCount = FEATURES.filter((f) => settings.features[f.key]).length

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" aria-label="Lab">
        <header className="drawer-header">
          <div className="drawer-title">
            <FlaskConical size={20} />
            <div>
              <h2>Lab</h2>
              <p className="muted small">Class tools: API contract, Phase 2 features, request log and connection</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <nav className="tabs drawer-tabs">
          {[
            ['contract', 'API contract'],
            ['features', `Phase 2 · ${enabledCount}/${FEATURES.length}`],
            ['requests', 'Requests'],
            ['connection', 'Connection'],
          ].map(([key, label]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>

        <div className="drawer-body">
          {tab === 'features' && (
            <>
              <p className="muted small intro">
                Phase 1 (the CRUD) is always on. Turn on each Phase 2 feature after your API supports it. The app
                will start sending the requests described in its contract.
              </p>
              {FEATURES.map((f) => (
                <FeatureCard key={f.key} feature={f} enabled={settings.features[f.key]} onToggle={() => toggleFeature(f.key)} />
              ))}
            </>
          )}
          {tab === 'contract' && <ContractView />}
          {tab === 'requests' && <RequestLog />}
          {tab === 'connection' && <Connection onDataReset={onDataReset} />}
        </div>
      </aside>
    </div>
  )
}
