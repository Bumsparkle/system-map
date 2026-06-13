import { useAuth } from '@/lib/auth'
import type { ReactNode } from 'react'
import { LoginPage } from './LoginPage'

/**
 * Gates the app behind authentication when it's enabled. When auth is off
 * (local dev without Supabase, or the static demo) children render directly.
 * While the initial session is resolving we show a minimal splash to avoid a
 * flash of the login screen for already-signed-in users.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { enabled, loading, session } = useAuth()

  if (!enabled) return <>{children}</>
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-ink-subtle">Loading…</p>
      </div>
    )
  }
  if (!session) return <LoginPage />
  return <>{children}</>
}
