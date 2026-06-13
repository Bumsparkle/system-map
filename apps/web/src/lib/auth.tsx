import type { Session, User } from '@supabase/supabase-js'
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { authEnabled, supabase } from './supabaseClient'

type AuthResult = { error: string | null }

type AuthState = {
  enabled: boolean
  loading: boolean
  session: Session | null
  user: User | null
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  // Only block on the initial session lookup when auth is actually on.
  const [loading, setLoading] = useState(authEnabled)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    enabled: authEnabled,
    loading,
    session,
    user: session?.user ?? null,
    signIn: async (email, password) => {
      if (!supabase) return { error: 'Auth is not configured.' }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    },
    signUp: async (email, password) => {
      if (!supabase) return { error: 'Auth is not configured.' }
      const { error } = await supabase.auth.signUp({ email, password })
      return { error: error?.message ?? null }
    },
    signOut: async () => {
      await supabase?.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
