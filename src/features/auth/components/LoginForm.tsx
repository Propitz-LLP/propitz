'use client'

import { useState, useTransition } from 'react'
import { loginAction, signUpAction } from '../actions'

type Tab = 'investor' | 'admin'
type Mode = 'signin' | 'signup'

const DEMO_EMAILS: Record<Tab, string> = {
  investor: 'dhananjayak@yahoo.com',
  admin: 'dhananjayak.propitz@yahoo.com',
}

export function LoginForm() {
  const [tab, setTab] = useState<Tab>('investor')
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState(DEMO_EMAILS.investor)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function switchTab(t: Tab) {
    setTab(t)
    setEmail(DEMO_EMAILS[t])
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)

    startTransition(async () => {
      const action = mode === 'signup' ? signUpAction : loginAction
      const result = await action(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="grid grid-cols-2 min-h-screen">

      {/* ── Left panel ─────────────────────────────────────────── */}
      <div
        className="flex flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)' }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--gold)' }}>
            Propitz
            <span
              className="block mt-1"
              style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}
            >
              Fractional Ownership Platform
            </span>
          </div>
        </div>

        <div>
          <div
            className="mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 42, color: '#fff' }}
          >
            Own a piece of{' '}
            <em style={{ color: 'var(--gold)' }}>prime</em>{' '}
            real estate
          </div>
          <p className="mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
            India's most transparent fractional real estate investment platform. Start from ₹10 lakhs.
          </p>
          <ul className="space-y-2">
            {[
              'SEBI-compliant fractional ownership',
              'Real-time NAV tracking & P&L dashboard',
              'Quarterly distributions & exit liquidity',
              'KYC-verified, legally-structured investments',
              'Curated Grade-A commercial & residential properties',
            ].map(f => (
              <li key={f} className="flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
                <span style={{ color: 'var(--gold)', fontSize: 10 }}>✦</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          © 2026 Propitz Technology Pvt Ltd · SEBI Registered · All investments subject to market risk
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="flex items-center justify-center p-12 bg-white">
        <div className="w-full max-w-sm">

          <div
            className="mb-1"
            style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--navy)' }}
          >
            {mode === 'signup' ? 'Create account' : 'Welcome back'}
          </div>
          <div className="mb-6" style={{ fontSize: 14, color: 'var(--slate-light)' }}>
            {mode === 'signup'
              ? 'Start your investment journey'
              : 'Sign in to your investor account'}
          </div>

          {/* Role tabs — only on sign in */}
          {mode === 'signin' && (
            <div className="flex mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
              {(['investor', 'admin'] as Tab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className="flex-1 py-2 text-sm font-medium capitalize transition-all"
                  style={{
                    color: tab === t ? 'var(--navy)' : 'var(--slate-light)',
                    borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {t === 'investor' ? 'Investor' : 'Admin'}
                </button>
              ))}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="form-input"
              />
              {mode === 'signin' && (
                <div className="text-right mt-1">
                  <span className="text-xs cursor-pointer" style={{ color: 'var(--gold)' }}>
                    Forgot password?
                  </span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(192,57,43,0.2)' }}
              >
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: isPending ? 'var(--navy-mid)' : 'var(--navy)',
                color: '#fff',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.8 : 1,
              }}
            >
              {isPending
                ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
                : mode === 'signup' ? 'Create account →' : 'Sign in →'}
            </button>
          </form>

          {/* Mode toggle */}
          <div className="mt-5 text-center text-sm" style={{ color: 'var(--slate-light)' }}>
            {mode === 'signin' ? (
              <>
                New investor?{' '}
                <span
                  className="font-medium cursor-pointer"
                  style={{ color: 'var(--gold)' }}
                  onClick={() => { setMode('signup'); setError(null); setEmail(''); setPassword('') }}
                >
                  Create account
                </span>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <span
                  className="font-medium cursor-pointer"
                  style={{ color: 'var(--gold)' }}
                  onClick={() => { setMode('signin'); setError(null); setEmail(DEMO_EMAILS.investor); setPassword('') }}
                >
                  Sign in
                </span>
              </>
            )}
          </div>

          {/* Demo hint */}
          <div
            className="mt-7 p-4 rounded-lg"
            style={{ background: 'var(--gold-pale)', border: '1px solid rgba(201,168,76,0.3)' }}
          >
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--amber)' }}>
              🎭 DEMO — click a tab to prefill email
            </div>
            <div className="text-xs leading-relaxed space-y-1" style={{ color: 'var(--slate)' }}>
              <div>
                <strong>Investor:</strong>{' '}
                <span style={{ color: 'var(--navy)' }}>dhananjayak@yahoo.com</span>
              </div>
              <div>
                <strong>Admin:</strong>{' '}
                <span style={{ color: 'var(--navy)' }}>dhananjayak.propitz@yahoo.com</span>
              </div>
              <div className="mt-1 pt-1" style={{ borderTop: '1px solid rgba(201,168,76,0.25)', color: 'var(--slate-light)' }}>
                Use your Supabase password to sign in
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
