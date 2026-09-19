# Pastel Beauty — PR Performance Dashboard

A private, hosted web app for tracking Pastel Beauty's PR/influencer-seeding sends (fiscal-year performance, recipients, product/shade breakdowns) with named-user login, a real Postgres database, and AI- or template-generated management reports exportable as PDF.

Live at: **https://pastel-beauty-pr-dashboard.vercel.app**

---

## Contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Features](#features)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Project structure](#project-structure)
- [Getting started (local development)](#getting-started-local-development)
- [Environment variables](#environment-variables)
- [Database & migrations](#database--migrations)
- [Scripts reference](#scripts-reference)
- [Deployment (Vercel)](#deployment-vercel)
- [Adding a teammate's login](#adding-a-teammates-login)
- [AI vs. Standard reports](#ai-vs-standard-reports)
- [Known limitations](#known-limitations)

---

## Overview

This started as a single static HTML dashboard (client-side only, data baked into the page, changes kept in `localStorage`). It has since been rebuilt into a real Next.js application:

- Every PR "send" (a gifting package sent to a recipient) is a row in a real Postgres database, not a JSON blob in the page source.
- Access requires signing in with a named account — there's no public page.
- A management report — executive summary, fiscal-year performance, sending trends, top recipients, product/category and shade performance, repeat-recipient analysis, key observations, and suggested areas to review — can be generated on demand from the live data, viewed in-app, regenerated, printed, or downloaded as a PDF.
- Reports can be generated two ways: **AI report** (OpenAI writes the narrative) or **Standard report** (a deterministic, template-based report with no external API call — useful when AI usage limits, cost, or latency are a concern).

## Tech stack

| Concern | Choice |
|---|---|
| Framework | [Next.js](https://nextjs.org/) 16 (App Router, TypeScript) |
| Hosting | [Vercel](https://vercel.com/) |
| Database | Postgres via [Neon](https://neon.tech/) (provisioned through Vercel's native Neon integration) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) + `@vercel/postgres` driver |
| Auth | [NextAuth (Auth.js) v5](https://authjs.dev/), Credentials provider, JWT sessions |
| Charts | [Chart.js](https://www.chartjs.org/) via `react-chartjs-2` |
| AI reports | [OpenAI API](https://platform.openai.com/) |
| PDF export | [`@react-pdf/renderer`](https://react-pdf.org/) (pure-JS, no headless browser) |
| Markdown rendering | `react-markdown` + `remark-gfm` |

## Features

**Dashboard** (`/`)
- KPI strip (sends, units, unique recipients, repeat customers, avg units/send)
- 5 charts: sends/units by fiscal year, units by category, sends over time, top shades, top recipients
- Repeat-customer leaderboard
- Sortable, filterable, paginated table of every PR send
- Add / edit / soft-delete / restore ("Removed rows") a PR send
- CSV export, JSON export/import
- Fiscal-year filter chips, "include test/internal sends" toggle, search

**Auth**
- Named user accounts (email + password, bcrypt-hashed), no self-service signup
- All pages and API routes require a session (enforced in `proxy.ts`, redirects to `/login`)

**Reports** (`/reports`)
- Generate an **AI report** or a **Standard report** (toggle before generating)
- Report history (every generation is kept — "Regenerate" always creates a new report, past ones are never overwritten or lost)
- View in-app with real tables/charts injected next to the narrative (the numbers you see always come straight from the database, never from the AI's text — see [AI vs. Standard reports](#ai-vs-standard-reports))
- Print (browser print dialog, print-optimized stylesheet)
- Download as a real PDF file (server-rendered, not a browser screenshot)

## Architecture

```
Browser ── (session cookie) ──> Next.js App Router
                                   ├─ Server Components / pages (dashboard, reports)
                                   ├─ API routes (/api/pr-records, /api/reports, /api/meta, /api/auth)
                                   └─ proxy.ts (route protection — everything requires login except /login)
                                          │
                                          ▼
                                   lib/db.ts (Drizzle ORM)
                                          │
                                          ▼
                                   Postgres (Neon, via Vercel integration)
```

- **Base data lives in the database** — `pr_records` / `pr_record_products`. There's no more embedded JSON or `localStorage` overlay; the dashboard fetches the full non-deleted record set once per load and does client-side filter/sort/paginate/aggregate, matching the original static dashboard's behavior.
- **Categories/shades are not a fixed enum** — they're derived live from whatever's actually in `pr_record_products` (`GET /api/meta`), exactly like the original app let new categories/shades register themselves from data entry.
- `sendNum`/`isRepeat` (which visit number this is for a recipient, and whether it's a repeat) are **never stored** — recomputed at read time by grouping records by fiscal year + normalized recipient name, ordered by date.
- **Reports are grounded, not hallucinated**: `lib/aggregations.ts` computes the real numbers (totals, %-changes, top recipients, category/shade breakdowns, repeat-vs-new) directly from the database. For AI reports, the OpenAI prompt (`lib/prompt.ts`) is instructed to use *only* those numbers and to write narrative/bullets, never markdown tables — the app renders the actual tables/charts from the same aggregate data separately, so what's displayed is always DB-exact.

## Data model

Four tables (see `lib/schema.ts` for the full Drizzle definitions):

```
users                  named login accounts (bcrypt password hash, no roles yet)
pr_records             one row per PR send: fiscal year, date, recipient, address/phone,
                        is_test flag, notes, total_qty (server-recomputed), is_deleted (soft delete)
pr_record_products     line items for a send: category, shade, quantity
ai_reports             every generated report: report_type ('ai' | 'standard'), model,
                        input_snapshot (the exact aggregate JSON used), content_md, generated_by/at
```

Migrations live in `drizzle/migrations/` and are generated with `drizzle-kit` — see [Database & migrations](#database--migrations).

## Project structure

```
app/
  (app)/               authenticated layout + pages (require login)
    page.tsx           dashboard
    reports/           report list + report detail pages
  api/
    auth/[...nextauth] NextAuth route handler
    pr-records/        CRUD for PR sends (list/create/update/soft-delete/restore/bulk-import)
    meta/              distinct categories/shades
    reports/           list/generate reports, single report, PDF export
  login/               login page
  globals.css          full design system (CSS custom properties, components, print styles)
components/            dashboard UI (KPIs, charts, table, modal, trash panel) + report UI
lib/
  schema.ts            Drizzle schema (source of truth for the DB structure)
  db.ts                Drizzle client
  auth.ts              NextAuth config (Credentials provider, JWT session)
  session.ts           requireUserId() helper for route handlers
  pr-records.ts        server-side data access for PR sends
  reports.ts           server-side data access for ai_reports
  aggregations.ts      the real-number queries that feed both report types
  prompt.ts            AI report system/user prompt construction
  openai.ts            OpenAI SDK call for AI report generation
  standardReport.ts    deterministic (non-AI) report generator
  pdf.tsx              react-pdf report document definition
  validate.ts          request-body validation for PR record writes
  loadEnv.ts           loads .env.local for plain Node scripts (drizzle-kit, scripts/*.ts)
scripts/
  seed-users.ts        creates/updates login accounts (the only way accounts are created)
  extract-legacy-data.ts   one-time: pulled the original static dashboard's embedded data to JSON
  migrate-legacy-data.ts   one-time: loaded that JSON into the real database
  legacy-data.json     the extracted original 179 records (kept for reference/re-migration)
drizzle/migrations/    generated SQL migrations
proxy.ts               route protection (Next.js 16's middleware convention)
```

## Getting started (local development)

Prerequisites: Node.js 20+, npm, and access to this project's Vercel account (`pastel-c671`).

```bash
npm install

# Pull the real environment variables (database connection, auth secret,
# OpenAI key) from Vercel — this project is already linked (.vercel/project.json)
npx vercel env pull .env.local

npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Use an existing seeded account, or create one (see [Adding a teammate's login](#adding-a-teammates-login)).

## Environment variables

See `.env.example` for the authoritative list with setup notes. Summary:

| Variable | Purpose | Required? |
|---|---|---|
| `POSTGRES_URL` | Pooled Postgres connection (app's normal query traffic) | Yes |
| `POSTGRES_URL_NON_POOLING` | Direct/unpooled connection (used for migrations) | Yes, for migrations |
| `AUTH_SECRET` | Signs/encrypts session JWTs | Yes |
| `OPENAI_API_KEY` | Enables AI report generation | No — app works fully without it; "AI report" returns a clear error until set, "Standard report" always works |
| `OPENAI_MODEL` | Overrides the default OpenAI model | No |

All of these except `OPENAI_MODEL` are already set in the linked Vercel project (Production, Preview, and Development) — `vercel env pull` fetches them for local use. Never commit `.env.local` (it's gitignored).

## Database & migrations

Schema changes go through Drizzle:

1. Edit `lib/schema.ts`.
2. `npm run db:generate` — writes a new SQL file to `drizzle/migrations/`.
3. Review the generated SQL.
4. `npm run db:migrate` — applies it to whatever database `POSTGRES_URL_NON_POOLING`/`POSTGRES_URL` point to (the same database used by production — there's a single environment, not separate dev/prod databases, for this project).

`npm run db:studio` opens Drizzle Studio, a browser UI for inspecting the live data.

## Scripts reference

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build / run it |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration from `lib/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database in Drizzle Studio |
| `npm run seed:users` | Create/update login accounts from `scripts/seed-users.ts` |
| `npm run migrate:legacy:extract` | (One-time, historical) re-extract data from the old static HTML file if ever needed |
| `npm run migrate:legacy:data` | (One-time, historical) load `scripts/legacy-data.json` into the database |

## Deployment (Vercel)

This project is linked to Vercel project `pastel-c671/pastel-beauty-pr-dashboard`.

```bash
npx vercel --prod
```

Vercel auto-detects Next.js — no `vercel.json` needed. To change environment variables:

```bash
npx vercel env add <NAME>          # add/update, prompts for the value and target environments
npx vercel env pull .env.local     # sync them locally after a change
```

After adding or changing an env var, redeploy (`npx vercel --prod`) for it to take effect in production.

## Adding a teammate's login

There's intentionally no signup page or admin UI — accounts are created by running a script:

1. Edit `scripts/seed-users.ts`, adding to `DEFAULT_USERS`:
   ```ts
   const DEFAULT_USERS: SeedUser[] = [
     { name: "Their Name", email: "their@email.com", password: "a-strong-password" },
   ];
   ```
2. `npm run seed:users`
3. **Remove what you just added from the file afterward** (it's a plaintext password sitting in a file that could get committed) — the account is already created in the database at this point; the script is safe to re-run with an empty list.

Re-running with an existing email updates that user's name/password (useful for a password reset).

## AI vs. Standard reports

Both produce the same 9 sections (Executive Summary, Fiscal-Year Performance, PR Sending Trends, Top Recipients, Product/Category Performance, Shade Performance, Repeat Recipient Analysis, Key Observations, Suggested Areas to Review) from the same underlying aggregate data, and both go through the same view/regenerate/print/PDF pipeline.

- **AI report** — OpenAI (`lib/openai.ts`) writes the narrative sections. Strictly prompted (`lib/prompt.ts`) to use only the provided numbers and never fabricate statistics, and never to write its own numeric tables (the app renders the real ones). Requires `OPENAI_API_KEY` and costs API usage per generation.
- **Standard report** — `lib/standardReport.ts` fills the same sections with plain, deterministic sentences and bullet points computed directly in code (no LLM call at all). Instant, free, and always available — the reliable fallback when AI usage limits, cost, or downtime are a concern.

## Known limitations

- **`is_test` flagging looks inconsistent in the original data** — e.g. one legacy record is named "...(tester)" but isn't flagged as a test send. Both dashboard KPIs and reports (which exclude test sends by default) inherit this. Worth a manual data-quality pass if precise test/real separation matters.
- **Recipient matching is exact, normalized-string based** (trimmed, lowercased). Near-duplicate names (typos, "Ltd" vs "Ltd.") are treated as different recipients, which can fragment repeat-customer stats. This matches the original static dashboard's behavior; fuzzy matching would be a separate feature.
- **No password-reset or admin UI** — account creation/rotation is a script (`scripts/seed-users.ts`), by design, for a small team.
- **`/api/reports` has no rate limiting** — each "Generate report" click on "AI report" costs real OpenAI usage; there's a UI-level disable-while-generating guard but no server-side quota.
