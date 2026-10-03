# 11. Use Vitest as the test runner, with GitHub Actions CI

## Status

Accepted (2026-09-28)

## Context

BooksHQ has no automated test suite. Several areas of the codebase have already proven fragile in practice and were only caught by manual, live debugging rather than a regression test: the Google Books → Open Library cover-fetch fallback chain ([ADR 0006](0006-cover-fetching-google-books-primary-open-library-fallback.md)), the import book-matching cascade ([ADR 0010](0010-import-book-matching-strategy.md)), and a likely bug in `server/services/gamification.js` (jsonb arrays used as single-object keys when awarding category XP) noted in `CLAUDE.md` but not yet fixed or covered by a test.

The project is an ESM codebase (`package.json` has `"type": "module"`) and the frontend already depends on Vite. A test runner needed to be chosen before writing the suite.

## Decision

Use **Vitest** as the test runner, and wire it into **GitHub Actions** to run on every push and pull request.

Alternatives considered:

- **Jest** — the most established option, with the largest ecosystem and community knowledge base. Historically requires extra configuration (`ts-jest`, `babel-jest`, or experimental VM modules flags) to work cleanly with `"type": "module"` projects, since it was originally built assuming CommonJS. Would have worked, but with more setup friction than necessary given the alternative below.
- **`node:test`** — Node's built-in test runner, zero dependencies. Legitimate and lightweight, but has a thinner feature set (weaker built-in mocking, no built-in coverage reporting without wiring in a separate tool like `c8`) and doesn't share any config with the project's existing Vite setup.
- **Vitest (chosen)** — native ESM support with no extra configuration, reuses the frontend's existing Vite config (resolve/alias/plugin setup) rather than maintaining a second, separate transform pipeline, and has built-in TypeScript support with no extra config — relevant since `server/database/schema.ts` and `drizzle.config.ts` are already TypeScript and more of the codebase is expected to convert over time. Its API is deliberately Jest-compatible (`describe`/`it`/`expect`, with `vi` in place of `jest` for mocking), so it's a low-friction choice without giving up transferable, widely-applicable testing knowledge.

## Consequences

- Adds `vitest` (and likely `@vitest/coverage-v8` or similar for coverage reporting) as a new dev dependency and a `npm test` / `npm run test:ci` script.
- A GitHub Actions workflow will run the suite on every push/PR, giving BooksHQ CI for the first time.
- Initial test-writing priority follows the fragile areas named in Context: the cover-fetcher fallback chain, the import book-matching cascade, and the gamification XP calculation (which should also get its underlying bug fixed as part of writing its test, not just documented).
- Because Vitest's API mirrors Jest's, switching away from Vitest later (e.g. if a specific project need actually required Jest, such as a plugin with no Vitest equivalent) would mean relatively low rewrite cost for the test files themselves — mostly the runner/config layer would change, not the test code.
- No test suite existed before this decision, so there is no existing test debt to migrate — this is a clean adoption, not a migration.
