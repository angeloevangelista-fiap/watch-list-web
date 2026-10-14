// In-browser mock of the Watchlist API (Phase 1 + every Phase 2 feature).
// Data lives in localStorage. It is only used when "Mock API" is on in the Lab
// panel, so the app can be demoed before a real API exists.

const STORAGE_KEY = 'reelist.mock-db.v2'
const MAX_YEAR = new Date().getFullYear() + 5

const SEED = [
  ['Dune: Part Two', 'movie', 2024, 'Sci-Fi', true, 5],
  ['Severance', 'series', 2022, 'Thriller', true, 5],
  ['Past Lives', 'movie', 2023, 'Romance', false, null],
  ['Shōgun', 'series', 2024, 'Historical', false, null],
  ['Oppenheimer', 'movie', 2023, 'Drama', true, 4],
  ['The Bear', 'series', 2022, 'Drama', true, 4],
  ['Perfect Days', 'movie', 2023, 'Drama', false, null],
  ['Arcane', 'series', 2021, 'Animation', false, null],
  ['Everything Everywhere All at Once', 'movie', 2022, 'Sci-Fi', true, 5],
  ['The Zone of Interest', 'movie', 2023, 'Drama', false, null],
  ['Blade Runner 2049', 'movie', 2017, 'Sci-Fi', false, null],
  ['Fleabag', 'series', 2016, 'Comedy', true, 5],
  ['Spirited Away', 'movie', 2001, 'Animation', true, 5],
  ['Succession', 'series', 2018, 'Drama', false, null],
]

function seed() {
  const now = Date.now()
  return SEED.map(([title, type, year, genre, watched, rating], i) => {
    const stamp = new Date(now - (SEED.length - i) * 36e5).toISOString()
    return {
      id: i + 1,
      title,
      type,
      year,
      genre,
      posterUrl: '',
      notes: '',
      watched,
      rating,
      createdAt: stamp,
      updatedAt: stamp,
    }
  })
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fall through to seed */
  }
  return seed()
}

function save(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

let db = load()

export function resetMockDb() {
  db = seed()
  save(db)
}

// ---- helpers ----------------------------------------------------------------

const json = (status, body, headers = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

// Same shapes ASP.NET Core returns from an [ApiController].
const traceId = () => `00-${crypto.randomUUID().replace(/-/g, '')}-${crypto.randomUUID().slice(0, 16).replace(/-/g, '')}-00`

const problem = (status, title, type, extra = {}) =>
  json(status, { type, title, status, ...extra, traceId: traceId() }, { 'Content-Type': 'application/problem+json; charset=utf-8' })

const notFound = () => problem(404, 'Not Found', 'https://tools.ietf.org/html/rfc9110#section-15.5.5')

const validationProblem = (errors) =>
  problem(400, 'One or more validation errors occurred.', 'https://tools.ietf.org/html/rfc9110#section-15.5.1', { errors })

const badRequest = () => problem(400, 'Bad Request', 'https://tools.ietf.org/html/rfc9110#section-15.5.1')

// Mirrors DataAnnotations on the C# model: [Required], [StringLength(120)],
// [AllowedValues("movie", "series")], [Range(1888, 2031)], [Range(1, 5)].
// Messages are ASP.NET Core's defaults; keys are the C# property names.
function validate(input, { partial }) {
  const errors = {}
  const has = (k) => k in input
  const add = (key, msg) => (errors[key] = [...(errors[key] ?? []), msg])

  // Values that can't be converted to the C# type fail during JSON binding,
  // before validation: the key is the JSON path and the body param is "required".
  const converters = { year: 'System.Nullable`1[System.Int32]', rating: 'System.Nullable`1[System.Int32]', watched: 'System.Boolean' }
  for (const [k, clr] of Object.entries(converters)) {
    const v = input[k]
    const bad = k === 'watched' ? has(k) && typeof v !== 'boolean' : v != null && !Number.isInteger(v)
    if (bad) add(`$.${k}`, `The JSON value could not be converted to ${clr}. Path: $.${k} | LineNumber: 0 | BytePositionInLine: 1.`)
  }
  if (Object.keys(errors).length) {
    add('request', 'The request field is required.')
    return errors
  }

  if (!partial || has('title')) {
    if (typeof input.title !== 'string' || !input.title.trim()) add('Title', 'The Title field is required.')
    else if (input.title.length > 120) add('Title', 'The field Title must be a string with a maximum length of 120.')
  }
  if (!partial || has('type')) {
    if (typeof input.type !== 'string' || !input.type) add('Type', 'The Type field is required.')
    else if (!['movie', 'series'].includes(input.type))
      add('Type', 'The Type field does not equal any of the values specified in AllowedValuesAttribute.')
  }
  if (input.year != null && (input.year < 1888 || input.year > MAX_YEAR))
    add('Year', `The field Year must be between 1888 and ${MAX_YEAR}.`)
  if (input.rating != null && (input.rating < 1 || input.rating > 5))
    add('Rating', 'The field Rating must be between 1 and 5.')
  return Object.keys(errors).length ? errors : null
}

function pick(input) {
  const out = {}
  for (const k of ['title', 'type', 'year', 'genre', 'posterUrl', 'notes', 'watched', 'rating']) {
    if (k in input) out[k] = typeof input[k] === 'string' ? input[k].trim() : input[k]
  }
  if (out.year === '') out.year = null
  return out
}

function list(params) {
  let items = [...db]
  const q = params.get('q')?.toLowerCase()
  const type = params.get('type')
  const watched = params.get('watched')

  if (q) items = items.filter((i) => `${i.title} ${i.genre ?? ''}`.toLowerCase().includes(q))
  if (type) items = items.filter((i) => i.type === type)
  if (watched === 'true' || watched === 'false') items = items.filter((i) => i.watched === (watched === 'true'))
  return json(200, items)
}

function stats() {
  const rated = db.filter((i) => Number.isInteger(i.rating))
  const watched = db.filter((i) => i.watched).length
  return json(200, {
    total: db.length,
    watched,
    unwatched: db.length - watched,
    byType: {
      movie: db.filter((i) => i.type === 'movie').length,
      series: db.filter((i) => i.type === 'series').length,
    },
    averageRating: rated.length
      ? Math.round((rated.reduce((s, i) => s + i.rating, 0) / rated.length) * 10) / 10
      : null,
  })
}

// ---- router -----------------------------------------------------------------

export async function mockFetch(url, init) {
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 220))

  const match = url.pathname.match(/\/watchlist(?:\/([^/]+))?\/?$/)
  if (!match) return new Response(null, { status: 404 })

  const id = match[1]
  const method = init.method
  let body = {}
  if (init.body) {
    try {
      body = JSON.parse(init.body)
    } catch {
      return badRequest()
    }
  }

  if (!id) {
    if (method === 'GET') return list(url.searchParams)
    if (method === 'POST') {
      const errors = validate(body, { partial: false })
      if (errors) return validationProblem(errors)
      const now = new Date().toISOString()
      const item = {
        id: Math.max(0, ...db.map((i) => i.id)) + 1,
        genre: '',
        posterUrl: '',
        notes: '',
        year: null,
        watched: false,
        rating: null,
        ...pick(body),
        createdAt: now,
        updatedAt: now,
      }
      db = [...db, item]
      save(db)
      return json(201, item, { Location: `/watchlist/${item.id}` })
    }
    return new Response(null, { status: 405 })
  }

  if (id === 'stats' && method === 'GET') return stats()

  // Like a {id:int} route constraint: a non-numeric id doesn't match the route.
  if (!/^\d+$/.test(id)) return new Response(null, { status: 404 })
  const numericId = Number(id)
  const current = db.find((i) => i.id === numericId)
  if (!current) return notFound()

  if (method === 'GET') return json(200, current)

  if (method === 'PUT' || method === 'PATCH') {
    const partial = method === 'PATCH'
    const errors = validate(body, { partial })
    if (errors) return validationProblem(errors)
    const base = partial
      ? current
      : { genre: '', posterUrl: '', notes: '', year: null, watched: false, rating: null, createdAt: current.createdAt }
    const updated = { ...base, ...pick(body), id: numericId, updatedAt: new Date().toISOString() }
    db = db.map((i) => (i.id === numericId ? updated : i))
    save(db)
    return json(200, updated)
  }

  if (method === 'DELETE') {
    db = db.filter((i) => i.id !== numericId)
    save(db)
    return new Response(null, { status: 204 })
  }

  return new Response(null, { status: 405 })
}
