# 6. Cover fetching: Google Books primary, Open Library fallback

## Status

Accepted

## Context

BooksHQ automatically fetches book cover images (and genre metadata) from an external source, both during import backfill and via a manual "refresh cover" action per book. The original implementation (`server/services/cover-fetcher.js`) called only the Google Books API, unauthenticated (no API key).

This surfaced two real production problems, discovered 2026-08-14:

1. Unauthenticated Google Books requests are rate-limited per-IP at a level that's easy to exhaust for a library of hundreds of books (confirmed live: "Too Many Requests" errors on well-known titles like a Barack Obama book and Mark Manson's "The Subtle Art of Not Giving a F*ck"). When this happened, every cover-refresh request failed with a generic "Failed to fetch cover" error in the UI.
2. A latent bug: the error path in `fetchBookCover` returned a bare `null` instead of `{ coverUrl: null, genre: null }`, which crashed callers that destructure the result — turning a legitimate "no cover found" case into an unhandled exception.

## Decision

Two changes, made together:

1. **Add a fallback source.** Split the Google Books logic into `fetchFromGoogleBooks(title, author)` and added `fetchFromOpenLibrary(title, author)`, querying `openlibrary.org/search.json` and using the first result with a `cover_i` (built into a `covers.openlibrary.org/b/id/{cover_i}-L.jpg` URL). Open Library's "subject" field is deliberately *not* used for genre — it's too noisy to trust, unlike Google's `categories` field — so genre stays `null` whenever Open Library is the one that succeeds. `fetchFromOpenLibrary` also tries progressively looser title queries (full title, then title truncated before a colon to drop long subtitles, then a free-text combined query) since Open Library's search is less forgiving of exact long titles than Google's `intitle:` operator. `fetchBookCover` tries Google first and only falls back to Open Library on a thrown error or an empty result, and now always returns a well-formed `{ coverUrl, genre }` object, even on total failure.
2. **Add a Google Books API key.** The real root-cause fix: obtained a free `GOOGLE_BOOKS_API_KEY` (via Google Cloud Console, restricted to the Books API only) and wired it into `fetchFromGoogleBooks` as `&key=...`, appended only when the env var is present so the code still degrades gracefully to the old unauthenticated behavior if the key is ever missing. This raises Google's quota substantially, making it reliably the primary source again.

Google Books remains primary (better metadata — genre categories, multiple image sizes) with Open Library only as a fallback for genuine misses, rather than switching primary/fallback order or querying both sources and picking the best result every time (which would cost an extra API call per book for no benefit in the common case).

## Consequences

- Cover-fetch reliability improved substantially: verified live that a previously-failing book ("The Subtle Art of Not Giving a F*ck") now resolves directly from Google after the API key was added, and that the Open Library fallback path independently returns valid results when deliberately exercised.
- Books whose covers were fetched during the period Google was rate-limited (before the API key was added) may be showing lower-resolution Open Library images rather than Google's typically higher-quality ones — worth a manual re-refresh pass across the library.
- The route handler's error catch block (`server/routes/books.js`, `POST /:id/cover/fetch`) previously swallowed exceptions silently (no `console.error`), which made this bug much harder to diagnose than it should have been. A `console.error('[cover/fetch] Error:', e)` was added there as part of this fix, establishing a pattern that other route handlers' catch blocks should probably also follow for the same reason.
- If Google's quota is ever exhausted again for a different reason (key gets revoked, quota policy changes, etc.), the Open Library fallback and the "no details found" (not-a-crash) failure mode are both already in place as a safety net.
