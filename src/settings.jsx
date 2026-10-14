import { createContext, useCallback, useContext, useState } from 'react'
import { configureApi } from './api/client'
import { DEFAULT_FEATURES } from './features'

const STORAGE_KEY = 'watchlist.settings'

const DEFAULTS = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3333',
  mock: false,
  features: DEFAULT_FEATURES,
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved) return { ...DEFAULTS, ...saved, features: { ...DEFAULT_FEATURES, ...saved.features } }
  } catch {
    /* ignore */
  }
  return DEFAULTS
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  // Configure synchronously so children's effects already use the right API.
  configureApi({ baseUrl: settings.apiUrl, mock: settings.mock })

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const toggleFeature = useCallback(
    (key, value) =>
      update((prev) => ({ ...prev, features: { ...prev.features, [key]: value ?? !prev.features[key] } })),
    [update],
  )

  return (
    <SettingsContext.Provider value={{ settings, update, toggleFeature }}>{children}</SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => useContext(SettingsContext)
