# Architecture Decision Records

Each file here records one significant decision about BooksHQ: the situation that prompted it, what was decided, and what follows from it. They explain *why* the code is the way it is, which the code itself can't.

## How these work

- Files are numbered in order: `NNNN-short-title.md`. Numbers are never reused.
- Every ADR uses Nygard's template: **Status**, **Context**, **Decision**, **Consequences**. Alternatives that were considered go in the Decision section.
- **Status** is one of Proposed, Accepted, Deprecated, or "Superseded by ADR NNNN".
- **An accepted ADR is never rewritten.** If a decision changes, write a new ADR that supersedes it, and change only the old one's Status line to point at the new one. The history of *why* things changed is the point. See ADRs 0005 and 0009 for an example.

## When to write one

Write an ADR for decisions that are hard to reverse, shape the data model or architecture, add a dependency, or would surprise someone reading the code. That includes decisions *not* to build something. Open questions (for example, how to support iPhone access) get an ADR once they're decided, not before.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-postgresql-with-drizzle-orm.md) | Use PostgreSQL with Drizzle ORM | Accepted |
| [0002](0002-multi-author-multi-genre-data-model.md) | Multi-author via junction table, multi-genre/tags via JSONB arrays | Accepted |
| [0003](0003-server-route-organization.md) | Split server.js into per-resource route files | Accepted |
| [0004](0004-three-tier-gamification-system.md) | Three-tier gamification system (global, per-author, per-category) | Accepted |
| [0005](0005-import-strategy-csv-only-no-kindle-scraping.md) | Support CSV/txt imports only; do not build direct Kindle scraping | Superseded by 0009 |
| [0006](0006-cover-fetching-google-books-primary-open-library-fallback.md) | Cover fetching: Google Books primary, Open Library fallback | Accepted |
| [0007](0007-quote-card-rendering-satori-plus-resvg.md) | Quote card image rendering: satori + @resvg/resvg-js | Proposed |
| [0008](0008-repo-visibility-public-with-personal-data.md) | Keep the repository public, including personal reading data | Accepted |
| [0009](0009-kindle-sync-via-bookmarklet.md) | Sync Kindle highlights via a bookmarklet on read.amazon.com/notebook | Accepted |
| [0010](0010-import-book-matching-strategy.md) | Import book matching: ASIN, then exact title + author, then fuzzy title with a shared surname | Accepted |
| [0011](0011-vitest-for-testing.md) | Use Vitest as the test runner, with GitHub Actions CI | Accepted |
