'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setPasswordAndLoginAction } from '../actions'

export function ResetPasswordForm({ email: initialEmail }: { email?: string | null }) {
  const [email, setEmail] = useState(initialEmail ?? '')
  const emailLocked = !!initialEmail
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email) { setError('Enter your email address'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    const fd = new FormData()
    fd.set('email', email)
    fd.set('password', password)
    startTransition(async () => {
      const res = await setPasswordAndLoginAction(fd)
      if (res?.error) { setError(res.error); return }
      router.push('/dashboard')
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-12 bg-white">
      <div className="w-full max-w-sm">
        <div className="mb-1" style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--navy)' }}>
          Change / Reset password
        </div>
        <div className="mb-6" style={{ fontSize: 14, color: 'var(--slate-light)' }}>
          Set a new password for your account, then you’ll be signed in.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              disabled={emailLocked} readOnly={emailLocked} required autoComplete="username"
              placeholder="name@example.com" className="form-input"
              style={emailLocked ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
            />
          </div>
          <div>
            <label className="form-label">New password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required minLength={8} autoComplete="new-password"
              placeholder="At least 8 characters" className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Confirm password</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              required minLength={8} autoComplete="new-password"
              placeholder="Re-enter your password" className="form-input"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--red-bg, #FDECEC)', color: 'var(--red)', border: '1px solid rgba(192,57,43,0.2)' }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit" disabled={isPending}
            className="w-full py-3 rounded-lg text-sm font-semibold"
            style={{ background: isPending ? 'var(--navy-mid)' : 'var(--navy)', color: '#fff', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.8 : 1 }}
          >
            {isPending ? 'Saving…' : 'Set password & sign in →'}
          </button>

          <div className="text-center text-sm" style={{ color: 'var(--slate-light)' }}>
            <Link href="/login" style={{ color: 'var(--gold)' }}>Back to sign in</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
