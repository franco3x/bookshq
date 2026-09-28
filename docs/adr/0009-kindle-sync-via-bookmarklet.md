# 9. Sync Kindle highlights via a bookmarklet on read.amazon.com/notebook

## Status

Accepted (2026-09-27). Supersedes [ADR 0005](0005-import-strategy-csv-only-no-kindle-scraping.md).

## Context

The purpose of BooksHQ is to replace Readwise so the Readwise subscription can be cancelled. The subscription had lapsed when ADR 0005 was written; it has since been renewed, and the goal is to be able to cancel it for good once BooksHQ covers what Readwise does. Kindle reading happens on both a physical Kindle and the Kindle apps (phone/tablet/desktop).

Highlights made on a physical Kindle are written to `My Clippings.txt` on the device, which BooksHQ could already import. Highlights made in the Kindle *apps* never appear in any file — they exist only in Amazon's cloud, viewable at `read.amazon.com/notebook`. Amazon offers no API for them. Readwise's own Kindle sync works by reading that notebook page through its browser extension.

ADR 0005 (2026-08-13) chose not to build any scraping of that page, accepting a gap in frictionless highlight capture. What changed: once Readwise is cancelled, app highlights have *no* path into BooksHQ at all, so the gap ADR 0005 accepted is no longer acceptable. ADR 0005 itself named this as a trigger to revisit ("if the manual … friction becomes painful enough in practice to justify accepting the scraping fragility and ToS risk after all").

## Decision

Build a "Send to BooksHQ" **bookmarklet** (`src/bookmarklet/kindle-notebook.js`). The user drags it from the Import modal's "Kindle Sync" tab to the bookmarks bar once, then clicks it while on `read.amazon.com/notebook`. It runs inside the user's own logged-in tab: it scrolls the library list until every book is loaded, fetches each book's annotation pages (following Amazon's `token` / `contentLimitState` pagination), extracts text, location, note and color for each highlight, and POSTs `{ books: [{ asin, title, author, highlights: [...] }] }` to `POST /api/import/kindle-notebook`.

Alternatives considered:

- **Playwright "robot browser" run by the server on a schedule** — the only fully automatic option, but it keeps its own Amazon login that expires every few weeks/months, is more likely to be challenged by Amazon's bot detection (captchas), and downloads and launches a full Chromium per sync.
- **A personal browser extension** (Readwise's approach) — syncs automatically while the browser is open and uses the real login, but adds install/update friction (developer-mode sideloading) and is harder to debug than a script.
- **Bookcision-style per-book bookmarklet** — one book at a time and manual; this decision is the same technique extended to the whole library in one click.
- **The Kindle app's official "Export Notebook"** — the only sanctioned route and the least likely to break, but manual and one book at a time.

The bookmarklet was chosen as the least code with no credential handling: it reuses the user's existing Amazon session, looks to Amazon like the user reading their own notebook, and is updated by re-dragging the button from the Import modal.

Feasibility was tested live before building (2026-09-27): Amazon's Content-Security-Policy on the notebook page allows both running a `javascript:` bookmark and `fetch` POSTs to `localhost` (ports 3001 and 5005). The body is sent as `text/plain` so the request needs no CORS preflight, and the server additionally answers Chrome's Private Network Access preflight (`Access-Control-Allow-Private-Network: true`) on that route in case a browser sends one. All Amazon-specific selectors are isolated in a single `SEL` block at the top of the bookmarklet.

Two companions were built alongside it:

- `POST /api/import/kindle-device` imports `My Clippings.txt` straight from a Kindle mounted under `/Volumes`, covering sideloaded (non-Amazon) books whose highlights never reach the cloud notebook.
- `?dryRun=1` on the notebook endpoint previews what an import would create (new books, new authors, highlight counts) without writing anything. It was used to catch book-matching problems before the first real sync (see [ADR 0010](0010-import-book-matching-strategy.md)).

## Consequences

- Syncing takes one click, not zero. There is no scheduled/background sync; if hands-off syncing becomes important, the same scraping logic could move into a browser extension without changing the server endpoint.
- The integration will break whenever Amazon changes the notebook page's markup. The fix belongs in the `SEL` block; nothing server-side depends on Amazon's HTML.
- Automating access to `read.amazon.com` remains a Terms-of-Service gray area. That risk is accepted knowingly, as ADR 0005 anticipated.
- Publisher "clipping limits" still apply: Amazon truncates or withholds some highlights for some books, exactly as it does for Readwise.
- The bookmarklet POSTs to the BooksHQ origin it was dragged from (`window.location.origin`, i.e. the local dev server). Hosting BooksHQ somewhere other than the user's own machine would require revisiting how the bookmarklet reaches it (URL, CORS, authentication).
- First real sync (2026-09-27): 282 notebook books and 7,814 highlights produced 7 new books, 336 new highlights and 12 in-place updates; running it again added nothing.
