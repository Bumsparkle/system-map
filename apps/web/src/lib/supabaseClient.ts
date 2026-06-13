import { type SupabaseClient, createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const DEMO = import.meta.env.VITE_DEMO === '1'

/**
 * Auth is enabled only when Supabase is configured AND this isn't the static
 * demo build. Local dev without these env vars (and the GitHub Pages demo) run
 * unauthenticated, matching the API's no-auth dev mode.
 */
export const authEnabled = Boolean(url && anonKey) && !DEMO

// The client persists the session in localStorage and refreshes tokens itself.
export const supabase: SupabaseClient | null = authEnabled
  ? createClient(url as string, anonKey as string)
  : null

/** Bearer header for the current session, or {} when unauthenticated. */
export async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
