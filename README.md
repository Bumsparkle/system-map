# System Map

A canvas-based tool for diagramming how a company's apps, systems, data, and money fit together — typed flows, layers, and saved views. Built with React Flow, Fastify, and Postgres.

## Stack

- **Web** — React 18 + Vite + TypeScript, React Flow v12, Tailwind v4, TanStack Query, Zustand, React Router v6
- **API** — Fastify + Drizzle ORM + Postgres (postgres-js), Zod
- **Shared** — Zod schemas + inferred types consumed by both apps
- **Tooling** — pnpm workspaces, Turborepo, Biome, Docker Compose (Postgres only)

## Layout

```
apps/web      React app (canvas editor + dashboard)
apps/api      Fastify REST server
packages/shared   Zod schemas + shared types (@system-map/shared)
```

## Getting started

Requires Node 20+, pnpm, and Docker (for Postgres).

```bash
pnpm install

# 1. Start Postgres
pnpm db:up

# 2. Create the schema
pnpm db:migrate

# 3. (optional) Seed a demo company + diagram
pnpm db:seed

# 4. Run both apps (api on :3001, web on :5173)
pnpm dev
```

Then open http://localhost:5173.

Environment is read from the root `.env` (copy `.env.example`). Defaults match `docker-compose.yml`.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run web + api together (Turborepo) |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm lint` / `pnpm lint:fix` | Biome lint |
| `pnpm format` | Biome format |
| `pnpm db:up` / `pnpm db:down` | Start / stop Postgres |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Insert demo data |

## Auth

Production uses **Supabase Auth** (email/password). Every `/api` route requires a
valid bearer JWT, and data is scoped per user via `companies.owner_id`. Locally,
when the Supabase env vars are unset, the API and web app run in a single-user
no-auth mode so you can work offline.

## Deploying

The app is built to host on **Vercel + Supabase** (web + API on Vercel, Postgres
+ Auth on Supabase). See [DEPLOY.md](DEPLOY.md) for the full walkthrough.
