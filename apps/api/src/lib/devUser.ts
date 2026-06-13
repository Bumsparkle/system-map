import { env } from '../env.js'

// Stable stand-in user used when Supabase auth isn't configured (local dev).
// Seed scripts assign this id as owner so the seeded workspace is visible in
// no-auth mode; the auth plugin falls back to it for unauthenticated requests.
export const DEV_USER_ID = env.DEV_USER_ID ?? '00000000-0000-0000-0000-000000000000'
