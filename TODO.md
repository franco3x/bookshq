# BooksHQ To-Do

The task list for BooksHQ. Background and reasoning live in `CLAUDE.md` and `docs/adr/`; this file is just what's left to do. Check items off with `[x]` and move them to **Done** with the date.

## Quick fixes

All done 2026-09-28 — see Done below for what each one turned into.

## Data cleanup

- [ ] Merge *The Millionaire Next Door (Millionaire Set Book 2)* (book 3642) into book 2343 using the Merge Portal
- [ ] Run "Recalculate stats" to clear a few stray XP from a test highlight created and deleted on 2026-09-27
- [ ] Re-refresh covers that got the lower-quality Open Library image while Google Books was rate-limited

## Bugs

- [ ] `server/services/gamification.js` (~lines 68, 85-86): `genre`, `race` and `nationality` are lists (JSONB arrays) but are used as single values when awarding category XP on highlight import

## Testing

- [ ] Try "Import from plugged-in Kindle" (Import → Kindle Sync) with the real Kindle connected. So far it's only been tested with no Kindle attached

## Features

- [ ] **Redesign the app's look**: the current aesthetic doesn't feel right. Pick a direction first (reference apps or screenshots you like), then restyle through the shared CSS variables (`--bg-secondary`, `--accent-primary`, etc.) so it applies app-wide. Worth doing before the Quote card presets, since those reuse the app's colors and fonts
- [ ] **Quote card Share**: spec in `CLAUDE.md`, rendering approach in ADR 0007. Remaining build order:
  - [ ] satori + resvg rendering with one style preset at one aspect ratio, to prove the approach
  - [ ] the remaining presets and aspect ratios
  - [ ] the Share modal, used by both `HighlightCard.jsx` and `BookDetail.jsx`
  - [ ] update ADR 0007's status to Accepted once it works (or supersede it if the approach changes)
- [ ] **Manual "Add Highlight" form**: type or paste a highlight in directly, for sources with no import
- [ ] **iPhone access**: undecided (responsive web, PWA, or native). Write an ADR once decided

## Docs

- [ ] Optional: add decision dates to the Status lines of ADRs 0001–0008, as 0009 and 0010 have

## Done

- [x] 2026-09-27: Architecture Decision Records set up in `docs/adr/` (0001–0010, with index)
- [x] 2026-09-27: Kindle Sync bookmarklet and plugged-in Kindle import (first sync: 336 new highlights, 7 new books)
- [x] 2026-09-27: Copy buttons on `HighlightCard.jsx` and `BookDetail.jsx` (Quote card, step 1)
- [x] 2026-09-28: Removed the `DEBUG` `console.log` lines from `handleCopy` in `BookDetail.jsx`
- [x] 2026-09-28: Moved `debug-copy.mjs` / `verify-copy.mjs` into `server/scripts/`, alongside the project's other one-off scripts
- [x] 2026-09-28: Added `src/utils/quote.js` (`formatQuote`, `highlightAuthorName`, `bookAuthorName`), used by both Copy buttons — fixed a real bug in the process: `BookDetail.jsx` showed "Unknown Author" for books with a legacy author but no `book_authors` rows (e.g. books 3638–3640) because it only checked the `authors` array
- [x] 2026-09-28: Both Copy handlers now catch a failed clipboard write and show a brief "Copy failed" state instead of failing silently
- [x] 2026-09-28: Added a comment above `POST /:id/read` in `server/routes/books.js` explaining the ordering requirement, matching what ADR 0003 already claimed
- [x] 2026-09-28: Deleted `server/scripts/profile-authors.js`, `debug_absolute.log`, `debug_final.log`
