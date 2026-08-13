# BooksHQ — Project Tracker

_Last updated: 2026-08-13 (fixed Authors.jsx Link import + duplicate highlights route)_

This is a living doc so future sessions (with me or with Claude Code) don't have to reconstruct project state from scratch. Update it whenever a work session wraps up with something meaningfully done or discovered.

## Stack

- **Frontend:** React 18 + Vite, React Router, Tailwind CSS, Recharts, Framer Motion
- **Backend:** Node.js + Express (all routes currently live in one file: `server/server.js`, ~1080 lines)
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

1. `6893191` **perf:** optimized `/api/authors` — replaced N+1 relational queries with batched grouped queries (book counts, highlight counts, levels fetched separately and merged in memory)
2. `787e827` **feat:** dynamic book XP based on pages/genre; smarter cover fetching with a manual refresh option
3. `353ce78` **feat:** title-case normalization for tags/genres + backfill script
4. `d31f367` / `ad8adf0` **feat:** Analytics page — reading timeline chart, new charting components, dedicated API endpoint
5. Earlier: merge portal, Goodreads import, achievements system, multi-author/multi-genre migrations, author demographics — see `git log` for full history (50 commits total)

## Known issues / cleanup candidates

- **Cleanup:** `server/scripts/profile-authors.js` is a leftover benchmark script used while optimizing `/api/authors` (commit `6893191`). Safe to delete now that the optimization has shipped, unless you want to keep it around for future query profiling.
- **Architecture:** all ~32 API routes live in one 1080-line `server/server.js`. No route-file split has actually been started (the `server/routes/` folder some tooling shows is just an empty, untracked local directory — not part of any commit). Worth deciding whether to split by resource (`books.js`, `authors.js`, `highlights.js`, etc.) as the file keeps growing, or leave it as-is.
- Stray local files seen in a recent working copy (`debug_absolute.log`, `debug_final.log`) aren't tracked in git — fine to `.gitignore` or delete if they reappear.
- **No `.gitignore` in the repo at all.** `node_modules`, `dist`, and `.env` happen to not be tracked, but there's no safety net stopping any of them from getting committed by accident. Worth adding one.
- **Personal data is committed to the repo:** `readwise-data.csv` (~5.5MB, full Readwise highlights export) and `data/imports/goodreads/goodreads_library_export.csv` (Goodreads library export) are both tracked in git and pushed to GitHub. Worth deciding whether that's intentional (fine if the repo is private and this is just sample/seed data) or something to remove from tracking — note that even after removing them going forward, they'd still exist in git history unless that's rewritten.

## Open questions / not yet decided

- **iPhone access:** undecided. Options to weigh when this comes up: responsive/mobile-friendly web view via Safari (simplest, no new build), a PWA (installable, offline-ish, still just a web view under the hood), or a native app (most work, best experience). No default direction chosen — discuss tradeoffs fresh when it's time to act on this.

## Recently fixed

- ✅ `Authors.jsx` missing `Link` import — added, verified live against the running dev server (908 real authors, list view renders with zero console errors)
- ✅ Duplicate `highlights` route in `App.jsx` — removed
- ✅ Real project `README.md` written (setup instructions, scripts reference, project structure, feature list) — replaces the default Vite/React boilerplate

## Next steps (candidates, not yet prioritized)

- Decide on the `server.js` route-split question before the file grows further
- Add a `.gitignore` and decide what to do about the two personal-data CSVs already committed (see Known Issues)
- (Longer-term / open) iPhone access strategy
- **Quote card Copy + Share.** Requested 2026-08-13. Current state, found on inspection (not just "not wired up" — worth remembering the nuance):
  - `src/pages/BookDetail.jsx` (~line 619-620): the per-highlight "Share" and "Copy" buttons have no `onClick` at all — fully dead.
  - `src/components/HighlightCard.jsx` (used on the Highlights page and the Home "Daily Inspiration" widget): the Share button *is* wired up — it calls `POST /api/export/image` and downloads a PNG — but the backend, `server/services/image-generator.js`, is a stub left over from a V1 decision to disable image generation (`node-canvas` install issues at the time). It returns an empty buffer, so today it silently downloads a broken/empty file.
  - No Copy button exists on `HighlightCard.jsx` at all.
  - **Scope for next session:** (1) add clipboard Copy wherever it's missing — straightforward, no backend involved; (2) decide how to actually generate quote images now — retry `node-canvas`, or use an alternative (e.g. an SVG-based renderer, or a browser/headless-canvas approach) — before anything else here can work; (3) once image generation works, design multiple templates/style options for the shared image, per request.

## How to keep this doc useful

Update this file at the end of any session where something meaningfully shipped, was discovered, or was decided — new features, bugs found, architecture decisions, abandoned approaches. Keep the "known issues" and "next steps" sections honest and current; stale entries here are worse than no doc at all.
