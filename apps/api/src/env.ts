import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

// Load the monorepo-root .env regardless of cwd.
const here = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(here, '../../../.env') })

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().default(3001),
  // Hosts (Render/Fly/etc.) inject PORT; prefer it over API_PORT when present.
  PORT: z.coerce.number().int().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // logo.dev publishable token for vendor logos (spec v1.2). Optional — when
  // absent, logo fetches return null and nodes fall back to the type icon.
  LOGO_DEV_TOKEN: z.string().optional(),
  // '1' ⇒ return logo.dev URLs directly instead of mirroring to disk — for
  // hosts without a persistent volume (the publishable token is client-safe).
  LOGO_DEV_DIRECT: z.string().optional(),
  // Supabase Auth: when both are set, every /api route requires a valid bearer
  // JWT. When absent (local dev), the API runs in a single-user no-auth mode.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  // Stand-in user id for that no-auth dev mode (also used to own seeded data).
  DEV_USER_ID: z.string().optional(),
  // Anthropic API key for AI suggestions (POST /api/diagrams/:id/suggest).
  // Optional — when absent the endpoint returns 503 and the UI hides the action.
  ANTHROPIC_API_KEY: z.string().optional(),
})

export const env = envSchema.parse(process.env)
