import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { env } from '../env'

let client: SupabaseClient | null = null

/** True when Supabase Auth is wired up (production). False in local no-auth dev. */
export function supabaseConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
}

/**
 * Server-side Supabase client used only to validate bearer tokens via
 * auth.getUser(jwt). The anon key is sufficient for that and is safe on the
 * server; no session is persisted (each request carries its own token).
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      throw new Error('Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY)')
    }
    client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
