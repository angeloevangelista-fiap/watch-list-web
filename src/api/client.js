import { mockFetch } from './mock'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
    this.fieldErrors = parseValidationErrors(body)
  }
}

/**
 * Reads the `errors` object of an ASP.NET Core validation response
 * (ValidationProblemDetails, returned automatically by [ApiController]):
 *
 *   { "title": "One or more validation errors occurred.", "status": 400,
 *     "errors": { "Title": ["The Title field is required."],
 *                 "$.year": ["The JSON value could not be converted to ..."] } }
 *
 * Returns { title: "The Title field is required.", year: "..." } or null.
 * Keys are normalized to the camelCase field name ("Title" → "title", "$.year" → "year").
 */
export function parseValidationErrors(body) {
  const errors = body && typeof body === 'object' ? body.errors : null
  if (!errors || typeof errors !== 'object') return null
  const out = {}
  for (const [key, value] of Object.entries(errors)) {
    const name = key.replace(/^\$\.?/, '').split('.').pop() || key
    const field = name.charAt(0).toLowerCase() + name.slice(1)
    const message = Array.isArray(value) ? value.join(' ') : String(value)
    out[field] = out[field] ? `${out[field]} ${message}` : message
  }
  return Object.keys(out).length ? out : null
}

/** One-line description of an error, including the API's validation messages if any. */
export function describeError(err) {
  const messages = Object.values(err?.fieldErrors ?? {})
  return messages.length ? `${err.message} ${messages.join(' ')}` : err?.message ?? String(err)
}

let config = { baseUrl: 'http://localhost:3333', mock: false }

export function configureApi(next) {
  config = { ...config, ...next }
}

// ---- Request log (shown in the Lab panel) ---------------------------------

let log = []
const listeners = new Set()

export function subscribeLog(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const getLog = () => log
export function clearLog() {
  log = []
  listeners.forEach((fn) => fn())
}
function record(entry) {
  log = [entry, ...log].slice(0, 60)
  listeners.forEach((fn) => fn())
}

// ---- fetch wrapper ----------------------------------------------------------

function buildUrl(path, query) {
  const base = config.baseUrl.replace(/\/+$/, '') + '/'
  const url = new URL(path.replace(/^\/+/, ''), base)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return url
}

export async function request(method, path, { query, body } = {}) {
  const url = buildUrl(path, query)
  const init = {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }
  const started = performance.now()
  const entry = {
    id: crypto.randomUUID(),
    at: new Date(),
    method,
    url: url.pathname + url.search,
    requestBody: body,
    mock: config.mock,
  }

  let res
  try {
    res = config.mock ? await mockFetch(url, init) : await fetch(url, init)
  } catch {
    record({ ...entry, status: 0, ms: Math.round(performance.now() - started) })
    throw new ApiError(
      `Could not reach the API at ${config.baseUrl}. Is it running, and is CORS enabled?`,
      0,
      null,
    )
  }

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  record({ ...entry, status: res.status, ms: Math.round(performance.now() - started), responseBody: data })

  if (!res.ok) {
    // ASP.NET Core errors are ProblemDetails: { type, title, status, detail?, traceId }
    const problem = data && typeof data === 'object' ? data : {}
    const message =
      problem.detail ||
      problem.title ||
      problem.message ||
      (typeof data === 'string' && data) ||
      `${method} ${url.pathname} failed with status ${res.status}`
    throw new ApiError(message, res.status, data)
  }
  return { data, headers: res.headers, status: res.status }
}
