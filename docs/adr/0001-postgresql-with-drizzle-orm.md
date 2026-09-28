# 1. Use PostgreSQL with Drizzle ORM

## Status

Accepted

## Context

BooksHQ needed a database and an ORM/query layer from the start of the project. This is a single-user, self-hosted book-tracking app (see `README.md`), not a multi-tenant SaaS product, so the usual scaling/concurrency pressures that drive database selection didn't strongly apply here.

## Decision

Use PostgreSQL as the database and Drizzle ORM as the query/schema layer (`server/database/schema.ts`).

No formal evaluation of alternatives (SQLite, MySQL) or alternative ORMs (Prisma, TypeORM, raw SQL) was carried out. Postgres + Drizzle was chosen as a familiar, commonly-used, low-friction combination to get started with.

## Consequences

- Postgres gives the project native JSONB support, which the schema leans on heavily (see ADR 0002) for demographic fields on `authors` (race, nationality, vocation) and originally for `books.genre`/`books.tags`.
- Drizzle's TypeScript-first, SQL-like query style has kept the codebase's DB code readable and let migrations be generated directly from schema changes (`npm run db:generate` / `db:migrate` / `db:push`).
- Because this wasn't a deliberate evaluation against alternatives, there's no documented tradeoff analysis to fall back on if a future need (e.g. actually needing SQLite's zero-config simplicity, or Prisma's tooling) makes the current stack feel like a poor fit. If that day comes, it's a fresh decision, not a revisit of settled reasoning.
- Since this is a self-hosted single-user app, Postgres's typical advantages over SQLite (concurrent writers, network access, richer feature set) are not being exercised for their usual reasons — they just happen to be available.
