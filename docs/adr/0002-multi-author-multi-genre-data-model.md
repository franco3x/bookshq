# 2. Multi-author via junction table, multi-genre/tags via JSONB arrays

## Status

Accepted

## Context

Books in a real library often have more than one author (co-authored books, anthologies) and more than one genre or tag. The original schema had a single `books.authorId` foreign key and no multi-genre support. Two different modeling approaches were used to add this support, and they are *not* symmetric — it's worth documenting why, since a future reader will reasonably ask "why does one of these use a proper relational join and the other just uses an array column?"

## Decision

- **Authors:** added a `book_authors` junction table for proper many-to-many support between `books` and `authors`. The legacy `books.authorId` single-author FK was *kept* rather than removed, for backward compatibility with existing code/queries that expect a single primary author.
- **Genre and tags:** modeled as JSONB array columns directly on `books` (`books.genre`, `books.tags`), not as their own normalized tables with junctions.

The reasoning behind the asymmetry: author records are identity-bearing and benefit from dedup and canonical records (the same author appearing consistently across many books, with their own demographic enrichment data, achievements, and XP levels tied to that identity). Genres and tags are comparatively free-form, descriptive labels attached to a book — they don't need the same canonical/dedup rigor, and the app has never needed to query "relationally" across them (e.g. no genre-entity detail page, no genre-level foreign keys elsewhere). A junction table for genre would have added schema complexity without an accompanying feature that needed it.

## Consequences

- Multi-author support (`book_authors`) enables per-author XP/levels, achievement tracking, and demographic-dimension gamification (ADR 0004) to work correctly for co-authored books, and supports proper duplicate-author merging in the Merge Portal.
- Keeping `books.authorId` as a legacy field avoids a large one-time migration/refactor of every place in the codebase that reads a book's single author, at the cost of two parallel sources of truth for "who wrote this book" that must be kept in sync (see the author-update logic in `server/routes/books.js`, which explicitly sets `authorId` to the first entry in `authorIds` whenever authors are updated).
- Genre/tag JSONB arrays are simple to read/write and required no new tables, but they can't be queried relationally (e.g. no efficient "all books tagged X" query using a proper index/join — genre-based stats and achievements work by scanning/grouping in application code instead) and don't support their own dedup/normalization beyond the title-case backfill script already built for this purpose.
- If a future feature needs genre as a first-class relational entity (e.g. a genre detail/browse page, genre-level metadata beyond a label), this decision would need to be revisited — likely a new ADR superseding this one for the genre side specifically, since the author side's tradeoffs would remain valid on their own.
