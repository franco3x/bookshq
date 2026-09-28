# 3. Split server.js into per-resource route files

## Status

Accepted

## Context

`server/server.js` originally contained all ~32 API routes inline, growing to roughly 1080 lines. This made the file hard to navigate and mixed app-setup concerns (dotenv, cors, JSON middleware) with route/business logic for every resource in the app.

## Decision

Split `server.js` into per-resource route files under `server/routes/`: `books.js`, `authors.js`, `highlights.js`, `merge.js`, `analytics.js`, `achievements.js`, `stats.js`, `search.js`, `import.js`, `export.js`, `admin.js`, `health.js`. Each file exports an Express `Router`. `server.js` itself now only does app setup and mounts each router with `app.use('/api/<resource>', router)`.

This was a pure reorganization — no route paths or handler logic were changed as part of the split.

One ordering subtlety had to be preserved during the split: in `books.js`, `POST /:id/read` is registered *before* `POST /bulk/read`, because both match a similar path shape and the `:id/read` handler relies on an explicit `isNaN(bookId) → next()` guard to fall through to the bulk handler. Registering `bulk/read` first would break bulk-read, since `:id` would greedily match the literal string `bulk`.

## Consequences

- Each resource's routes are now easy to find and reason about in isolation, and the project is easier to onboard into (for a future contributor or future Claude Code session) without reading a 1000+ line file.
- The routing library's path-matching order dependency (the `:id/read` vs `bulk/read` subtlety) is now a *cross-cutting* concern that lives inside a single route file rather than being one ordering decision among many in one giant file — it's more contained, but still an implicit trap for anyone reordering routes in `books.js` without knowing why the order matters. This is called out in code comments and in this ADR specifically so it isn't silently broken later.
- Verified after the split: server boots cleanly, and all previously-existing endpoints across every resource group respond correctly against the real dev database (spot-checked comprehensively at the time of the change).
