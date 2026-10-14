// Phase 2 features. Each one is OFF by default and is turned on from the Lab
// panel once the API supports it. The `contract` is shown to students in the
// app, so keep it in sync with README.md.

export const RESOURCE = '/api/watchlist'

export const FEATURES = [
  {
    key: 'filtering',
    title: 'Search & filters',
    summary:
      'Move filtering to the server. The search box and status tabs become query params.',
    contract: `GET /api/watchlist?q=dune&watched=false

q        → case-insensitive match on title (and genre)
watched  → true | false
Any omitted param means "don't filter by it".`,
  },
  {
    key: 'patch',
    title: 'Partial updates (PATCH)',
    summary:
      'Toggling "watched" sends only the changed field instead of the whole object with PUT.',
    contract: `PATCH /api/watchlist/{id}
{ "watched": true }

200 OK     → the full, updated item
404        → item doesn't exist
Fields not in the body must stay unchanged.`,
  },
  {
    key: 'ratings',
    title: 'Ratings',
    summary: 'Add a new "rating" field (1–5 stars) to the resource.',
    contract: `New property on the item:
"rating": 1 | 2 | 3 | 4 | 5 | null

Accepted on POST, PUT and PATCH.`,
  },
  {
    key: 'stats',
    title: 'Stats endpoint',
    summary: 'A dashboard summary that the API computes.',
    contract: `GET /api/watchlist/stats

200 OK
{
  "total": 14,
  "watched": 8,
  "unwatched": 6,
  "averageRating": 4.6     // null if nothing is rated
}`,
  },
]

export const DEFAULT_FEATURES = Object.fromEntries(FEATURES.map((f) => [f.key, false]))
