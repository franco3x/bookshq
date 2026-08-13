# BooksHQ — Project Tracker

_Last updated: 2026-08-13 (split server.js into per-resource route files)_

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

1. **refactor:** split `server/server.js` (was ~1080 lines, all ~32 routes inline) into per-resource route files under `server/routes/` — `books.js`, `authors.js`, `highlights.js`, `merge.js`, `analytics.js`, `achievements.js`, `stats.js`, `search.js`, `import.js`, `export.js`, `admin.js`, `health.js`. Each exports an Express `Router`; `server.js` now only does app setup (dotenv, cors, json middleware) and mounts routers with `app.use('/api/<resource>', router)`. Pure reorg — no route paths or logic changed. One ordering subtlety preserved: in `books.js`, `POST /:id/read` is registered before `POST /bulk/read` because both match the same path shape and the `:id/read` handler relies on an explicit `isNaN(bookId) → next()` guard to fall through to the bulk handler — moving `bulk/read` above `:id/read` would break bulk-read. Verified: server boots cleanly, and GET /api/books, /api/authors, /api/authors/:id, /api/highlights(+/random), /api/stats(+/categories+/authors/rankings), /api/achievements, /api/analytics/books, /api/search, POST /api/merge/books, and POST /api/books/bulk/read all responded correctly against the real dev database.
2. `6893191` **perf:** optimized `/api/authors` — replaced N+1 relational queries with batched grouped queries (book counts, highlight counts, levels fetched separately and merged in memory)
3. `787e827` **feat:** dynamic book XP based on pages/genre; smarter cover fetching with a manual refresh option
4. `353ce78` **feat:** title-case normalization for tags/genres + backfill script
5. `d31f367` / `ad8adf0` **feat:** Analytics page — reading timeline chart, new charting components, dedicated API endpoint
6. Earlier: merge portal, Goodreads import, achievements system, multi-author/multi-genre migrations, author demographics — see `git log` for full history (50 commits total)

## Known issues / cleanup candidates

- **Cleanup:** `server/scripts/profile-authors.js` is a leftover benchmark script used while optimizing `/api/authors` (commit `6893191`). Safe to delete now that the optimization has shipped, unless you want to keep it around for future query profiling.
- Stray local files seen in a recent working copy (`debug_absolute.log`, `debug_final.log`) aren't tracked in git — fine to `.gitignore` or delete if they reappear.
- **`.gitignore` exists locally but has never been committed.** A real, correctly-written `.gitignore` sits in the project folder, but it was never `git add`ed — so as far as GitHub/git history is concerned it doesn't exist yet, and it's currently doing nothing. Worth committing at some point as basic housekeeping (separate from the CSV question below).

## Open questions / not yet decided

- **iPhone access:** undecided. Options to weigh when this comes up: responsive/mobile-friendly web view via Safari (simplest, no new build), a PWA (installable, offline-ish, still just a web view under the hood), or a native app (most work, best experience). No default direction chosen — discuss tradeoffs fresh when it's time to act on this.

## Reviewed, no action needed

- **Personal data (readwise-data.csv, Goodreads export CSV) is tracked in git and the repo is public.** Reviewed 2026-08-13 — decided this is not a concern (contents are just book titles and quotes, nothing sensitive). Repo stays public, no history rewrite planned. Revisit only if that judgment changes later.
- **Direct Kindle highlight import (skip My Clippings.txt).** Discussed 2026-08-13. There is no official Amazon API for Kindle highlights — the only paths are scraping Amazon's `read.amazon.com/notebook` page (what Readwise's own auto-sync does under the hood), either manually per-book (e.g. the Bookcision bookmarklet: https://readwise.io/bookcision) or via a scripted bulk scraper (e.g. https://github.com/parroty/kindle-your-highlights, https://github.com/ryangreenberg/kindle-exporter). All options are unofficial, fragile to Amazon markup changes, and sit in a gray area re: ToS for automation. Decided not worth pursuing right now — sticking with the manual Clippings.txt import. Revisit if the manual step becomes enough of an annoyance to justify the fragility, or if Amazon ever ships an official export/API.

## Recently fixed

- ✅ `server.js` route-file split — done, see Recently worked on above.
- ✅ `Authors.jsx` missing `Link` import — added, verified live against the running dev server (908 real authors, list view renders with zero console errors)
- ✅ Duplicate `highlights` route in `App.jsx` — removed
- ✅ Real project `README.md` written (setup instructions, scripts reference, project structure, feature list) — replaces the default Vite/React boilerplate

## Next steps (candidates, not yet prioritized)

- Commit the existing `.gitignore` (housekeeping — see Known Issues)
- (Longer-term / open) iPhone access strategy
- **Quote card Copy + Share.** Requested 2026-08-13. Current state, found on inspection (not just "not wired up" — worth remembering the nuance):
  - `src/pages/BookDetail.jsx` (~line 619-620): the per-highlight "Share" and "Copy" buttons have no `onClick` at all — fully dead.
  - `src/components/HighlightCard.jsx` (used on the Highlights page and the Home "Daily Inspiration" widget): the Share button *is* wired up — it calls `POST /api/export/image` and downloads a PNG — but the backend, `server/services/image-generator.js`, is a stub left over from a V1 decision to disable image generation (`node-canvas` install issues at the time). It returns an empty buffer, so today it silently downloads a broken/empty file.
  - No Copy button exists on `HighlightCard.jsx` at all.
  - **Scope for next session:** (1) add clipboard Copy wherever it's missing — straightforward, no backend involved; (2) decide how to actually generate quote images now — retry `node-canvas`, or use an alternative (e.g. an SVG-based renderer, or a browser/headless-canvas approach) — before anything else here can work; (3) once image generation works, design multiple templates/style options for the shared image, per request.

## How to keep this doc useful

Update this file at the end of any session where something meaningfully shipped, was discovered, or was decided — new features, bugs found, architecture decisions, abandoned approaches. Keep the "known issues" and "next steps" sections honest and current; stale entries here are worse than no doc at all.
