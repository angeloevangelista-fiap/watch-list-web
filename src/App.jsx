import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Clapperboard, FlaskConical, Plus, RefreshCw, Search, ServerCrash, Popcorn } from 'lucide-react'
import { describeError } from './api/client'
import { changeItem, createItem, deleteItem, listItems, updateItem } from './api/watchlist'
import { FEATURES } from './features'
import { useSettings } from './settings'
import ConfirmDialog from './components/ConfirmDialog'
import ItemCard from './components/ItemCard'
import ItemForm from './components/ItemForm'
import LabPanel from './components/LabPanel'
import StatsBar from './components/StatsBar'
import Toasts from './components/Toasts'

const STATUS_TABS = [
  ['all', 'All'],
  ['unwatched', 'To watch'],
  ['watched', 'Watched'],
]

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function App() {
  const { settings, update } = useSettings()
  const f = settings.features

  // List controls
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const q = useDebounced(search, 350)

  // Data
  const [list, setList] = useState({ items: [], loading: true, error: null })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const [busyIds, setBusyIds] = useState(() => new Set())

  // UI
  const [form, setForm] = useState(null) // null | { item?: object }
  const [toDelete, setToDelete] = useState(null)
  const [lab, setLab] = useState(null) // null | initial tab name
  const [toasts, setToasts] = useState([])

  const notify = useCallback((message, kind = 'success') => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  // Only send query params to GET /api/watchlist when the filtering feature is on.
  const queryKey = JSON.stringify(f.filtering ? { q, status } : null)

  useEffect(() => {
    let cancelled = false
    setList((l) => ({ ...l, loading: true, error: null }))
    listItems(JSON.parse(queryKey))
      .then((items) => !cancelled && setList({ items, loading: false, error: null }))
      .catch((error) => !cancelled && setList((l) => ({ ...l, loading: false, error })))
    return () => {
      cancelled = true
    }
  }, [queryKey, version, settings.apiUrl, settings.mock])

  // Phase 1: the status tabs filter on the client. Phase 2 (filtering): the server does it.
  const visible = useMemo(() => {
    if (f.filtering) return list.items
    if (status === 'all') return list.items
    return list.items.filter((i) => i.watched === (status === 'watched'))
  }, [list.items, status, f.filtering])

  const counts = useMemo(() => {
    if (f.filtering || (!list.items.length && (list.error || list.loading))) return null
    const watched = list.items.filter((i) => i.watched).length
    return { all: list.items.length, watched, unwatched: list.items.length - watched }
  }, [list.items, list.error, list.loading, f.filtering])

  const enabledCount = FEATURES.filter((x) => f[x.key]).length

  // ---- mutations -----------------------------------------------------------

  async function handleCreate(payload) {
    try {
      const created = await createItem(payload)
      notify(`“${created?.title ?? payload.title}” added to your watchlist`)
      reload()
    } catch (err) {
      if (!err.fieldErrors) notify(err.message, 'error')
      throw err
    }
  }

  async function handleUpdate(item, payload) {
    try {
      await updateItem(item.id, payload)
      notify('Changes saved')
      reload()
    } catch (err) {
      if (!err.fieldErrors) notify(err.message, 'error')
      throw err
    }
  }

  async function handleDelete(item) {
    try {
      await deleteItem(item.id)
      notify(`“${item.title}” removed`)
      reload()
    } catch (err) {
      notify(describeError(err), 'error')
      throw err
    }
  }

  async function quickChange(item, changes, message) {
    setBusyIds((s) => new Set(s).add(item.id))
    try {
      const saved = await changeItem(item, changes, f.patch)
      setList((l) => ({ ...l, items: l.items.map((i) => (i.id === item.id ? saved : i)) }))
      if (message) notify(message)
      if (f.filtering || f.stats) reload()
    } catch (err) {
      notify(describeError(err), 'error')
    } finally {
      setBusyIds((s) => {
        const next = new Set(s)
        next.delete(item.id)
        return next
      })
    }
  }

  // ---- render --------------------------------------------------------------

  const showInitialError = list.error && !list.items.length

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">
            <Clapperboard size={18} />
          </span>
          <span className="brand-name">Watchlist</span>
        </div>

        <div className="topbar-right">
          <button
            className={`chip phase ${enabledCount ? 'phase-2' : ''}`}
            onClick={() => setLab('features')}
            title="Open the Lab to manage Phase 2 features"
          >
            {enabledCount ? `Phase 2 · ${enabledCount}/${FEATURES.length}` : 'Phase 1'}
          </button>
          <span
            className={`chip api ${list.error?.status === 0 ? 'down' : 'up'}`}
            title={settings.mock ? 'Using the in-browser mock API' : settings.apiUrl}
          >
            <span className="dot" />
            {settings.mock ? 'Mock API' : new URL(settings.apiUrl, location.href).host}
          </span>
          <button className="btn ghost" onClick={() => setLab('contract')} title="See the API contract the app expects">
            <BookOpen size={16} /> <span className="hide-sm">API</span>
          </button>
          <button className="icon-btn" onClick={() => setLab('features')} aria-label="Open Lab" title="Lab">
            <FlaskConical size={18} />
          </button>
          <button className="btn primary" onClick={() => setForm({})}>
            <Plus size={18} /> <span className="hide-sm">Add title</span>
          </button>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <h1>My watchlist</h1>
          <p className="muted">Keep track of the movies and series you want to watch.</p>
        </section>

        {f.stats && <StatsBar version={version} />}

        <div className="toolbar">
          <nav className="tabs" aria-label="Filter by status">
            {STATUS_TABS.map(([key, label]) => (
              <button key={key} className={status === key ? 'active' : ''} onClick={() => setStatus(key)}>
                {label}
                {counts && <span className="count">{counts[key]}</span>}
              </button>
            ))}
          </nav>

          {f.filtering && (
            <div className="controls">
              <label className="search">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search titles or genres…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        {list.error && list.items.length > 0 && (
          <div className="alert error">
            {list.error.message}
            <button className="link-btn" onClick={reload}>Retry</button>
          </div>
        )}

        {showInitialError ? (
          <div className="empty">
            <ServerCrash size={40} />
            <h2>{list.error.status === 0 ? 'Can’t reach the API' : 'Something went wrong'}</h2>
            <p className="muted">{list.error.message}</p>
            <div className="empty-actions">
              <button className="btn" onClick={reload}>
                <RefreshCw size={16} /> Try again
              </button>
              {!settings.mock && (
                <button className="btn ghost" onClick={() => update({ mock: true })}>
                  Use the mock API instead
                </button>
              )}
            </div>
          </div>
        ) : list.loading && !list.items.length ? (
          <div className="grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="card skeleton" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <Popcorn size={40} />
            <h2>{list.items.length || q || status !== 'all' ? 'Nothing here' : 'Your watchlist is empty'}</h2>
            <p className="muted">
              {list.items.length || q || status !== 'all'
                ? 'No titles match this view.'
                : 'Add the first movie or series you want to watch.'}
            </p>
            <button className="btn primary" onClick={() => setForm({})}>
              <Plus size={18} /> Add title
            </button>
          </div>
        ) : (
          <div className={`grid ${list.loading ? 'is-loading' : ''}`}>
            {visible.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                busy={busyIds.has(item.id)}
                showRating={f.ratings}
                onEdit={(it) => setForm({ item: it })}
                onDelete={setToDelete}
                onToggleWatched={(it) =>
                  quickChange(it, { watched: !it.watched }, it.watched ? null : `Marked “${it.title}” as watched`)
                }
                onRate={(it, rating) => quickChange(it, { rating })}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="footer muted small">
        REST API class project · {settings.mock ? 'mock API' : settings.apiUrl}
      </footer>

      {form && (
        <ItemForm
          item={form.item}
          showRating={f.ratings}
          onSubmit={(payload) => (form.item ? handleUpdate(form.item, payload) : handleCreate(payload))}
          onClose={() => setForm(null)}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Remove title?"
          message={`“${toDelete.title}” will be removed from your watchlist. This can’t be undone.`}
          confirmLabel="Remove"
          onConfirm={() => handleDelete(toDelete)}
          onClose={() => setToDelete(null)}
        />
      )}
      {lab && <LabPanel initialTab={lab} onClose={() => setLab(null)} onDataReset={reload} />}
      <Toasts toasts={toasts} />
    </div>
  )
}
