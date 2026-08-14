# BooksHQ — Project Tracker

_Last updated: 2026-08-14 (wrote Quote Card Copy + Share spec)_

This is a living doc so future sessions (with me or with Claude Code) don't have to reconstruct project state from scratch. Update it whenever a work session wraps up with something meaningfully done or discovered.

## Stack

- **Frontend:** React 18 + Vite, React Router, Tailwind CSS, Recharts, Framer Motion
- **Backend:** Node.js + Express (`server/server.js` handles app setup only; ~32 routes live in per-resource files under `server/routes/` — see Architecture note below)
- **Database:** PostgreSQL via Drizzle ORM (`server/database/schema.ts`)
- **Other:** csv-parse (Readwise import), adm-zip, date-fns, multer (file uploads)
- **Repo:** https://github.com/franco3x/bookshq (main branch, working tree clean as of last sync)

## Data model (as of latest schema)

- `authors` — name, birthYear, deathYear, gender, race (jsonb array), nationality (jsonb array), vocation (jsonb array), bio
- `books` — title, authorId (legacy single-author FK), coverImage, genre (jsonb array), tags (jsonb array), asin, readCount, dateFirstRead/dateLastRead, Goodreads fields (goodreadsId, userRating, avgRating, userReview, pageCount, yearPublished, readStatus)
- `book_authors` — junction table for proper multi-author support (books.authorId is kept for legacy/back-compat)
- `highlights` — text, bookId, authorId (denormalized for query speed), location, isFavorite, tags, originalDate
- `user_settings`, `user_stats` — single-user app, global XP/level
- `author_levels` — per-author XP/level
- `category_levels` — XP/level by dimension (genre, gender, race, nationality)
- `achievements` / `user_achievements` — gamification unlocks

## Feature inventory (what's built and working)

- **Imports:** Goodreads library CSV import; Readwise highlights CSV import/parsing
- **Books/Authors core:** list, detail, edit pages for both; multi-author and multi-genre support (JSONB arrays + junction table)
- **Author enrichment:** demographic data (gender, race, nationality, vocation, birth/death year, bio) via Wikidata, with title-case normalization
- **Gamification:** XP and leveling at three levels — global reader level, per-author level, per-category level (genre/gender/race/nationality) — plus a full achievement system (static + dynamically generated achievements, e.g. per-genre/nationality/vocation)
- **Merge Portal:** dedupe/merge tooling for books and authors, including automatic duplicate-scan suggestions
- **Cover fetching:** automatic cover image + genre lookup, with "smart selection" and manual refresh
- **Analytics & Stats pages:** charts (reading timeline, category breakdowns) via Recharts; a manual "recalculate stats" action for XP/levels
- **Obsidian exporter:** service exists for exporting highlights to Obsidian
- **Other:** deep linking to highlights from book detail, bulk mark-as-read, decrement read count, tag/genre normalization scripts

## Recently worked on (from commit history, most recent first)

1. **fix:** `server/services/cover-fetcher.js` — added `GOOGLE_BOOKS_API_KEY` (now in `.env`) to the Google Books request in `fetchFromGoogleBooks` (`&key=...`, only appended when the env var is set, so it still degrades gracefully to the old unauthenticated/lower-quota behavior if the key is ever missing). Confirmed the dotenv load-order is safe for this: `server.js` imports `routes/import.js` first, which pulls in `services/db-service.js` → `database/db.js`, and `db.js` calls `dotenv.config()` at its own top level — since that whole chain evaluates before `cover-fetcher.js`'s module body runs (both `books.js` and `admin.js` also import `db.js` before `cover-fetcher.js` locally), `process.env.GOOGLE_BOOKS_API_KEY` is already populated by the time the module-level `const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY` line executes. Verified live: fetching "The Subtle Art of Not Giving a F*ck" — which previously fell back to Open Library due to rate-limiting — now returns a `books.google.com` cover URL directly from Google. Open Library fallback logic untouched.
2. **fix:** `server/services/cover-fetcher.js` — Google Books' unauthenticated quota was getting rate-limited ("Too Many Requests"), causing "Failed to fetch cover" errors. Split the Google logic into `fetchFromGoogleBooks(title, author)` (unchanged smart-selection behavior: filters Summary/Analysis/Study Guide titles, prefers English, prefers largest image) and added `fetchFromOpenLibrary(title, author)` as a fallback (queries `openlibrary.org/search.json`, uses the first result with a `cover_i`, builds `covers.openlibrary.org/b/id/{cover_i}-L.jpg`; genre always `null` since Open Library subject data is too noisy). `fetchBookCover(title, author)` now tries Google first, falls back to Open Library on throw or empty result, and always returns `{ coverUrl, genre }` — even on total failure (previously it could return bare `null`, which would break callers that destructure the result). Verified live: Google Books actually was rate-limited during testing, and the Open Library fallback returned a valid cover URL — confirms the fix addresses the real failure mode, not just a hypothetical one.
3. **refactor:** split `server/server.js` (was ~1080 lines, all ~32 routes inline) into per-resource route files under `server/routes/` — `books.js`, `authors.js`, `highlights.js`, `merge.js`, `analytics.js`, `achievements.js`, `stats.js`, `search.js`, `import.js`, `export.js`, `admin.js`, `health.js`. Each exports an Express `Router`; `server.js` now only does app setup (dotenv, cors, json middleware) and mounts routers with `app.use('/api/<resource>', router)`. Pure reorg — no route paths or logic changed. One ordering subtlety preserved: in `books.js`, `POST /:id/read` is registered before `POST /bulk/read` because both match the same path shape and the `:id/read` handler relies on an explicit `isNaN(bookId) → next()` guard to fall through to the bulk handler — moving `bulk/read` above `:id/read` would break bulk-read. Verified: server boots cleanly, and GET /api/books, /api/authors, /api/authors/:id, /api/highlights(+/random), /api/stats(+/categories+/authors/rankings), /api/achievements, /api/analytics/books, /api/search, POST /api/merge/books, and POST /api/books/bulk/read all responded correctly against the real dev database.
4. `6893191` **perf:** optimized `/api/authors` — replaced N+1 relational queries with batched grouped queries (book counts, highlight counts, levels fetched separately and merged in memory)
5. `787e827` **feat:** dynamic book XP based on pages/genre; smarter cover fetching with a manual refresh option
6. `353ce78` **feat:** title-case normalization for tags/genres + backfill script
7. `d31f367` / `ad8adf0` **feat:** Analytics page — reading timeline chart, new charting components, dedicated API endpoint
8. Earlier: merge portal, Goodreads import, achievements system, multi-author/multi-genre migrations, author demographics — see `git log` for full history (50 commits total)

## Known issues / cleanup candidates

- **Cleanup:** `server/scripts/profile-authors.js` is a leftover benchmark script used while optimizing `/api/authors` (commit `6893191`). Safe to delete now that the optimization has shipped, unless you want to keep it around for future query profiling.
- Stray local files seen in a recent working copy (`debug_absolute.log`, `debug_final.log`) aren't tracked in git — fine to `.gitignore` or delete if they reappear.

## Open questions / not yet decided

- **iPhone access:** undecided. Options to weigh when this comes up: responsive/mobile-friendly web view via Safari (simplest, no new build), a PWA (installable, offline-ish, still just a web view under the hood), or a native app (most work, best experience). No default direction chosen — discuss tradeoffs fresh when it's time to act on this.

## Reviewed, no action needed

- **Personal data (readwise-data.csv, Goodreads export CSV) is tracked in git and the repo is public.** Reviewed 2026-08-13 — decided this is not a concern (contents are just book titles and quotes, nothing sensitive). Repo stays public, no history rewrite planned. Revisit only if that judgment changes later.
- **Direct Kindle highlight import (skip My Clippings.txt).** Discussed 2026-08-13. There is no official Amazon API for Kindle highlights — the only paths are scraping Amazon's `read.amazon.com/notebook` page (what Readwise's own auto-sync does under the hood), either manually per-book (e.g. the Bookcision bookmarklet: https://readwise.io/bookcision) or via a scripted bulk scraper (e.g. https://github.com/parroty/kindle-your-highlights, https://github.com/ryangreenberg/kindle-exporter). All options are unofficial, fragile to Amazon markup changes, and sit in a gray area re: ToS for automation. Decided not worth pursuing right now — sticking with the manual Clippings.txt import. Revisit if the manual step becomes enough of an annoyance to justify the fragility, or if Amazon ever ships an official export/API.

## Recently fixed

- ✅ **Cover fetching — fully resolved, see Recently worked on above for the two fixes.** Root cause was Google Books' unauthenticated rate limit ("Too Many Requests") getting hit constantly; symptom was "Failed to fetch cover" in the UI. Fixed in two passes: (1) added an Open Library fallback + fixed a silent-failure bug so errors surface in logs instead of just failing quietly, (2) the real fix — added a free `GOOGLE_BOOKS_API_KEY` to `.env`, which raises Google's quota substantially and made Google the reliably-working primary source again, with Open Library now only a rare fallback for genuine misses. Verified live on multiple previously-failing books. Worth doing a pass through the library to re-refresh any covers that got the lower-res Open Library fallback image while Google was still rate-limited.
- ✅ `.gitignore` committed — confirmed tracked (`git ls-files` now lists it, in commit `8050ad7`); it's actually enforced going forward, not just sitting locally.
- ✅ `server.js` route-file split — done, see Recently worked on above.
- ✅ `Authors.jsx` missing `Link` import — added, verified live against the running dev server (908 real authors, list view renders with zero console errors)
- ✅ Duplicate `highlights` route in `App.jsx` — removed
- ✅ Real project `README.md` written (setup instructions, scripts reference, project structure, feature list) — replaces the default Vite/React boilerplate

## Spec: Quote Card Copy + Share

Written 2026-08-14. Supersedes the old "Quote card Copy + Share" next-step bullet — this is the full design, ready to hand to Claude Code in scoped chunks. Not yet implemented.

### Why / current state

- `src/pages/BookDetail.jsx` (~line 619-620): the per-highlight "Share" and "Copy" buttons have no `onClick` at all — fully dead.
- `src/components/HighlightCard.jsx` (used on the Highlights page and the Home "Daily Inspiration" widget): the Share button *is* wired up — it calls `POST /api/export/image` and downloads a PNG — but the backend, `server/services/image-generator.js`, is a stub left over from a V1 decision to disable image generation (`node-canvas` install issues at the time). It returns an empty buffer, so today it silently downloads a broken/empty file.
- No Copy button exists on `HighlightCard.jsx` at all.

### Inspiration reviewed (2026-08-14)

Looked at three existing "share a quote" flows to steal from:

- **Readwise (app "Share highlight" sheet):** matrix of independent controls — an aspect-ratio picker (landscape / square / portrait / story), a style picker (Pretty / Clean / Classic), and a row of color swatches. "Pretty" uses the book cover as a background image, sometimes bled off to one side with the quote text overlaid or placed alongside it; "Clean"/"Classic" are flat-color backgrounds with a small logo mark. Two separate actions at the bottom: "Share image" (renders a PNG) vs "Share text" (shares plain text).
- **Kindle (native "Share Quote" sheet):** no independent controls — just a horizontal swipeable carousel of ~5 fully pre-baked cards (cream background, black background, teal background w/ quote marks, pink background w/ quote marks, navy background with a tree illustration). Swipe until you like one, tap Share. Much less configuration surface than Readwise, but noticeably more polished per-card since each is hand-designed rather than generated from independent axes.
- **Substack ("Share Post" sheet):** less about quotes and more a generic OG-style post card — post title + publication name, with/without the cover image, in a couple of crop variations. Useful mainly as a reference for the iOS share-sheet integration (the card renders live inside the native share sheet with a download icon in the corner), less useful as a template-design reference.

### Design direction

Combine Readwise's flexibility with Kindle's per-card polish: a curated set of **presets** (not a full generative color-picker grid — more surface area than a solo dev needs to maintain) crossed with an **aspect ratio** choice.

**Aspect ratios (4, matching Readwise):**
1. Landscape (~1.91:1) — Twitter/X, link previews
2. Square (1:1) — general/Instagram feed
3. Portrait (4:5) — Instagram feed (taller)
4. Story (9:16) — Instagram/FB Stories, Snapchat

**Style presets (start with 4-5, modeled on Kindle's hand-designed feel but reusing BooksHQ's existing design tokens):**
1. **Cover Bleed** — book cover image as full-bleed background (blurred/darkened for text legibility), quote text overlaid in white, citation at bottom. Directly benefits from the cover-fetcher work — better covers = better cards. This is the one to get right first.
2. **Cover Split** — book cover as a vertical strip on one side (like Readwise's Pretty/portrait layout), quote on a solid panel on the other side.
3. **Minimal Light** — plain light background (using the app's existing light theme tokens), quote in serif type (matches the serif already used for highlight text in `HighlightCard.jsx`), small BooksHQ wordmark/logo bottom corner.
4. **Minimal Dark** — same as above, dark background, matches the app's existing dark theme (`--bg-secondary` etc. from the CSS vars already in use).
5. *(stretch)* **Accent** — one or two brand-accent-color backgrounds (`--accent-primary`) for users who want something punchier than the two minimal options.

No independent color-swatch grid for v1 — that's what makes Kindle's set feel more finished than Readwise's more mechanical one. Presets can get more color options later if wanted.

### Technical approach: rendering

V1 tried `node-canvas` and hit native-binding install issues (this is exactly the kind of thing that breaks on some machines/Node versions and is a pain to keep working across environments). Two ways to avoid the same trap:

- **Recommended: `satori` + `@resvg/resvg-js`.** `satori` (the library behind Vercel's OG image generation) converts a JSX/HTML-like layout description straight to SVG using flexbox layout — no browser, no native canvas bindings for the layout step. `@resvg/resvg-js` then rasterizes that SVG to a PNG; it does use a native binary, but it's a well-maintained, broadly-precompiled one (ships prebuilt binaries for the common platforms) with a much better track record than `node-canvas` historically had. Templates become declarative layout objects — a natural fit for "5 presets," and easy to add more later.
- **Alternative: headless browser (Playwright/Puppeteer) rendering an HTML/CSS template to a screenshot.** Most flexible (arbitrary CSS, easiest to reuse the app's existing Tailwind classes/CSS vars directly) but heavier — spinning up a Chromium instance per image request is slower and more resource-hungry for a self-hosted single-user app than it needs to be. Worth falling back to this only if satori's flexbox-only layout model turns out too limiting for a given template (e.g. the Cover Bleed blur/overlay effect).

Go with satori + resvg first; only reach for headless-browser rendering if a specific template can't be expressed in satori's layout model.

### Feature scope

**Copy (no backend work):**
- Add a Copy button to `HighlightCard.jsx` (currently missing entirely) and wire up the dead Copy button in `BookDetail.jsx`.
- Copies formatted plain text to the clipboard via `navigator.clipboard.writeText`, e.g.:
  ```
  "<highlight text>"

  — <book title>, <author name>
  ```
- Should give some transient UI feedback (icon swap to a checkmark, toast, etc.) confirming the copy succeeded — check what pattern (if any) the app already uses elsewhere for this kind of feedback before inventing a new one.

**Share (backend rework required):**
- Replace the `image-generator.js` stub with real satori+resvg rendering, one render function per style preset, parameterized by aspect ratio.
- `POST /api/export/image` should accept `{ highlightId, aspectRatio, style }` and return the rendered PNG (it currently seems to accept raw text/title/author/coverUrl in the request body per `HighlightCard.jsx`'s existing fetch call — worth deciding whether to keep that shape or switch to passing just `highlightId` and having the backend look up the rest, which would also make the future `BookDetail.jsx` wiring simpler since it wouldn't have to duplicate that payload-building logic).
- Frontend: a new "Share Quote" modal/sheet (replaces the current bare Share button) with the aspect-ratio × style picker described above, a live preview, and two actions: "Share image" (renders + triggers either the native Web Share API on mobile/supporting browsers, or a plain download otherwise) and "Share text" (same clipboard copy as above, or opens the OS share sheet with just text).
- This modal is the natural home for both `HighlightCard.jsx`'s Share button and `BookDetail.jsx`'s dead Share button — same component, two call sites.

### Open questions (decide when starting implementation)

- Exact visual design of each preset (colors, fonts, spacing) — needs actual mockup/iteration, this spec only defines the structure.
- Should the last-used aspect ratio/style be remembered (e.g. in `user_settings`) so repeat sharers don't have to re-pick every time?
- Whether "Cover Bleed" gracefully degrades for books with no cover image (relevant now that cover-fetcher sometimes can't find one) — probably falls back to "Minimal Light/Dark" automatically in that case.

## Next steps (candidates, not yet prioritized)

- (Longer-term / open) iPhone access strategy
- **Quote card Copy + Share** — see the full spec above. Suggested build order: (1) Copy button, frontend-only, no dependencies; (2) satori+resvg rendering pipeline with just one style preset (Minimal Light or Dark, simplest to get right) at one aspect ratio, to validate the technical approach end-to-end; (3) fill out remaining presets and aspect ratios; (4) the unified Share modal wiring both `HighlightCard.jsx` and `BookDetail.jsx`.

## How to keep this doc useful

Update this file at the end of any session where something meaningfully shipped, was discovered, or was decided — new features, bugs found, architecture decisions, abandoned approaches. Keep the "known issues" and "next steps" sections honest and current; stale entries here are worse than no doc at all.
