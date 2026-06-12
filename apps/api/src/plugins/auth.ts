import type { FastifyReply, FastifyRequest } from 'fastify'
import { DEV_USER_ID } from '../lib/devUser'
import { HttpError } from '../lib/errors'
import { getSupabase, supabaseConfigured } from '../lib/supabase'

export type AuthUser = { id: string; email: string | null }

// Make req.user available + typed on every /api route (set by authHook).
declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
}

const DEV_USER: AuthUser = { id: DEV_USER_ID, email: 'dev@local' }

/**
 * onRequest hook for the /api scope. In production (Supabase configured) it
 * requires a valid `Authorization: Bearer <supabase-jwt>` and sets req.user from
 * it; an invalid/absent token is a 401. In local no-auth dev it injects a fixed
 * dev user so the app stays usable offline. CORS preflights are skipped.
 */
export async function authHook(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (req.method === 'OPTIONS') return

  if (!supabaseConfigured()) {
    req.user = DEV_USER
    return
  }

  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!token) throw new HttpError(401, 'Not authenticated')

  const { data, error } = await getSupabase().auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'Not authenticated')

  req.user = { id: data.user.id, email: data.user.email ?? null }
}
