// Phase 2 features. Each one is OFF by default and is turned on from the Lab
// panel once the API supports it. The `contract` is shown to students in the
// app, so keep it in sync with README.md.

export const RESOURCE = '/watchlist'

export const FEATURES = [
  {
    key: 'filtering',
    title: 'Search & filters',
    level: 'Easy',
    summary:
      'Move filtering to the server. The search box, type filter and status tabs become query params.',
    contract: `GET /watchlist?q=dune&type=movie&watched=false

q        → case-insensitive match on title (and genre)
type     → "movie" | "series"
watched  → true | false
Any omitted param means "don't filter by it".

C# hint:
[HttpGet]
public IActionResult GetAll(
    [FromQuery] string? q,
    [FromQuery] string? type,
    [FromQuery] bool? watched)`,
  },
  {
    key: 'patch',
    title: 'Partial updates (PATCH)',
    level: 'Easy',
    summary:
      'Toggling "watched" sends only the changed field instead of the whole object with PUT.',
    contract: `PATCH /watchlist/{id}
{ "watched": true }

200 OK     → the full, updated item
404        → NotFound()
Fields not in the body must stay unchanged.

C# hint: a DTO where every property is
nullable; only copy the ones that are not null.
public record PatchItemDto(string? Title, bool? Watched, ...);`,
  },
  {
    key: 'ratings',
    title: 'Ratings',
    level: 'Easy',
    summary: 'Add a new "rating" field (1–5 stars) to the resource.',
    contract: `New property on the item:
"rating": 1 | 2 | 3 | 4 | 5 | null

Accepted on POST, PUT and PATCH.

C# hint:
[Range(1, 5)]
public int? Rating { get; set; }`,
  },
  {
    key: 'stats',
    title: 'Stats endpoint',
    level: 'Medium',
    summary: 'A dashboard summary that the API computes.',
    contract: `GET /watchlist/stats

200 OK
{
  "total": 14,
  "watched": 8,
  "unwatched": 6,
  "byType": { "movie": 9, "series": 5 },
  "averageRating": 4.6     // null if nothing is rated
}

C# hint: [HttpGet("stats")] + LINQ (Count, Where, Average).
Routing prefers the literal "stats" over "{id}",
so the order of the methods doesn't matter.`,
  },
  {
    key: 'validation',
    title: 'Server-side validation',
    level: 'Medium',
    summary:
      'The form stops validating in the browser. Every bad input goes to the API, which must reject it.',
    contract: `POST / PUT / PATCH with invalid data →
400 Bad Request (ASP.NET Core default, automatic
with [ApiController] + DataAnnotations):

{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Title": ["The Title field is required."],
    "Year": ["The field Year must be between 1888 and 2031."]
  },
  "traceId": "00-..."
}

C# hint:
[Required, StringLength(120)] public string Title
[Required, AllowedValues("movie", "series")] public string Type
[Range(1888, 2031)] public int? Year`,
  },
]

export const DEFAULT_FEATURES = Object.fromEntries(FEATURES.map((f) => [f.key, false]))
