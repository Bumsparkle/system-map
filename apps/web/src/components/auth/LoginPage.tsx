import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'
import { type FormEvent, useState } from 'react'

type Mode = 'signin' | 'signup'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email.trim(), password)
    setBusy(false)
    if (error) {
      setError(error)
      return
    }
    // With email confirmation disabled, sign-up signs the user straight in. If
    // it's left on, no session is returned and they must confirm via email.
    if (mode === 'signup') {
      setNotice('Check your email to confirm your account, then sign in.')
      setMode('signin')
      setPassword('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="h-5 w-5 rounded-[5px] bg-accent" />
          <span className="font-semibold tracking-tight">System Map</span>
        </div>

        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">
            {mode === 'signin' ? 'Sign in' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-ink-subtle">
            {mode === 'signin'
              ? 'Welcome back. Enter your details to continue.'
              : 'Start mapping your systems in seconds.'}
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {notice && <p className="text-sm text-ink-muted">{notice}</p>}

            <Button type="submit" disabled={busy} className="mt-1 w-full">
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-ink-subtle">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            className="font-medium text-accent hover:underline"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setNotice(null)
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
