# BooksHQ

A personal book-tracking app — a self-hosted alternative to Readwise. Import your reading history from Goodreads and your highlights from Readwise, then track books, authors, and highlights in one place with a gamified leveling/achievement system built on top.

This is a single-user, local-only app: it's meant to be run on your own machine and viewed in a browser, not deployed for multiple users.

## Features

- **Library tracking** — books, authors, and highlights, with support for multiple authors and multiple genres per book
- **Imports** — bring in your existing library from a Goodreads export, and highlights from a Readwise CSV export
- **Author enrichment** — pulls demographic data (gender, race, nationality, vocation, birth/death year, bio) from Wikidata
- **Gamification** — XP and levels at three layers: an overall reader level, a level per author, and levels per category (genre, gender, race, nationality), plus a full achievement system
- **Merge portal** — find and merge duplicate books/authors, with automatic duplicate-detection suggestions
- **Cover fetching** — automatic book cover and genre lookup, with manual refresh
- **Analytics & stats** — charts for reading activity over time and breakdowns by category
- **Obsidian export** — export highlights out to Obsidian

## Tech stack

- **Frontend:** React 18 + Vite, React Router, Tailwind CSS, Recharts, Framer Motion
- **Backend:** Node.js + Express
- **Database:** PostgreSQL via Drizzle ORM
- **Other:** csv-parse (Readwise import), adm-zip, date-fns, multer

## Setup

### Prerequisites

- Node.js 18+
- A PostgreSQL database (local install, or any hosted Postgres)

### Install

```bash
npm install
```

### Configure the database

Create a `.env` file in the project root with your database connection string:

```
DATABASE_URL=postgres://user:password@localhost:5432/bookshq
```

Then run the migrations to set up the schema:

```bash
npm run db:migrate
```

### Run it

```bash
npm run dev
```

This starts both the Express API server and the Vite dev server together (via `concurrently`). Open the URL Vite prints (typically `http://localhost:5173`) in your browser.

### Importing your library

Once the app is running, use the in-app import flows (Settings page) to bring in a Goodreads library export and/or a Readwise highlights CSV export.

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Runs the API server and frontend dev server together |
| `npm run client` | Frontend dev server only (Vite) |
| `npm run server` | Backend API server only (with auto-restart via nodemon) |
| `npm run build` | Production frontend build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:push` | Push the schema directly to the database (skips migration files) |
| `npm run db:studio` | Open Drizzle Studio, a GUI for browsing/editing the database |

## Project structure

```
server/
  server.js              API routes (Express)
  database/              Drizzle schema, DB connection, migration runner
  services/               Business logic — imports, enrichment, gamification, stats, etc.
  scripts/                One-off/maintenance scripts (backfills, debug tools, migrations)
src/
  pages/                  Top-level routed pages
  components/             Reusable UI components
  utils/                  Frontend API client and helpers
drizzle/                  Generated SQL migrations
data/imports/              Sample/reference import files
learning/                  Personal coding curriculum used while building this project (historical, not app code)
```

## Project tracker

See [`CLAUDE.md`](./CLAUDE.md) for current project status: what's built, known issues, and what's next. It's kept up to date as a living doc rather than duplicating that information here.
