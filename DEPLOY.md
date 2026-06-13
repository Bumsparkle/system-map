# Deploying System Map (Vercel + Supabase)

The production app runs entirely on two platforms:

- **Vercel** — serves the web app (static Vite build) **and** the API (Fastify as
  a serverless function under `/api`), same origin.
- **Supabase** — Postgres **and** Auth (email/password). Every API route requires
  a valid Supabase JWT; data is scoped per user via `companies.owner_id`.

The GitHub Pages demo (`VITE_DEMO=1`) is unaffected — it stays a read-only,
no-backend showcase. This guide is only for the real hosted app.

---

## 1. Supabase

1. Create a project at <https://supabase.com> (note the **database password**).
2. **Settings → API** — copy:
   - **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
3. **Settings → Database → Connection string** — you need two:
   - **Transaction pooler** (port `6543`, host `…pooler.supabase.com`) → this is
     `DATABASE_URL` for Vercel. Our DB client sets `prepare:false` for it.
   - **Direct connection** (port `5432`, host `db.<ref>.supabase.co`) → use this
     only for migrations/seeding from your machine (DDL).
4. **Authentication → Providers → Email** — turn **"Confirm email" OFF** so
   sign-up logs the user straight in (no SMTP needed). Leave it on only if you've
   configured email delivery.
5. Apply the schema using the **direct** connection:
   ```bash
   DATABASE_URL='postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres' \
     pnpm --filter @system-map/api db:migrate
   ```
6. *(Optional)* Give your own account the demo diagrams. Sign up in the app
   first, grab your user id from **Authentication → Users**, then seed with it as
   the owner:
   ```bash
   export DATABASE_URL='…:5432/postgres'        # direct connection
   export DEV_USER_ID='<your-supabase-user-id>'  # seeds owned by you
   export LOGO_DEV_TOKEN='pk_…'                   # for vendor logos
   pnpm --filter @system-map/api db:seed
   pnpm --filter @system-map/api db:seed:atlantic
   ```
   Skip this to start with an empty workspace.

---

## 2. Vercel

1. <https://vercel.com> → **Add New → Project** → import this repo. The root
   `vercel.json` already sets the build (`pnpm --filter @system-map/web build`),
   the output (`apps/web/dist`), the `/api` function, and the SPA fallback — leave
   the framework preset as **Other**.
2. **Settings → Environment Variables** (Production + Preview):

   | Variable | Value | Used by |
   |---|---|---|
   | `DATABASE_URL` | Supabase **transaction pooler** string (`:6543`) | API (runtime) |
   | `SUPABASE_URL` | Supabase Project URL | API (verify JWT) |
   | `SUPABASE_ANON_KEY` | Supabase anon key | API (verify JWT) |
   | `LOGO_DEV_TOKEN` | `pk_…` (your logo.dev token) | API (vendor logos) |
   | `LOGO_DEV_DIRECT` | `1` | API (no disk on serverless) |
   | `VITE_SUPABASE_URL` | Supabase Project URL | Web build (login) |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Web build (login) |

   Leave `VITE_API_URL` **unset** — the web app calls the API on the same origin.
   (`NODE_ENV=production` is set by Vercel automatically.)
3. **Deploy.** Subsequent pushes to `main` redeploy automatically.

---

## 3. Verify

- Visit the Vercel URL → you should see the **sign-in screen**.
- Sign up → you land on an empty dashboard (or the seeded diagrams if you ran
  step 1.6 with your user id).
- Create a company + diagram, edit, reload → changes persist.
- `https://<app>.vercel.app/api/…` with no token returns `401`; `/health` is `200`.

## Troubleshooting

- **Everything 401s after login** — `SUPABASE_URL`/`SUPABASE_ANON_KEY` on the API
  must match the project that issued the token (same project as the `VITE_` pair).
- **DB connection errors / "prepared statement" errors** — `DATABASE_URL` on
  Vercel must be the **transaction pooler** (`:6543`), not the direct connection.
- **Function build fails resolving workspace imports** — ensure the Vercel
  install command is `pnpm install --frozen-lockfile` (set in `vercel.json`).
