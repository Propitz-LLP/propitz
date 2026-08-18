'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updatePasswordAction } from '../actions'

export function ResetPasswordForm({ email }: { email?: string | null }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    const fd = new FormData()
    fd.set('password', password)
    startTransition(async () => {
      const res = await updatePasswordAction(fd)
      if (res?.error) { setError(res.error); return }
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-12 bg-white">
      <div className="w-full max-w-sm">
        <div className="mb-1" style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--navy)' }}>
          Set your password
        </div>
        <div className="mb-6" style={{ fontSize: 14, color: 'var(--slate-light)' }}>
          Choose a password to finish setting up your account.
        </div>

        {done ? (
          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(31,143,75,0.1)', color: 'var(--green)' }}>
            ✓ Password set. Taking you to your dashboard…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {email && (
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email" value={email} disabled readOnly autoComplete="username"
                  className="form-input" style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>
            )}
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
                ⚠ {error}{' '}
                <Link href="/login" style={{ color: 'var(--red)', textDecoration: 'underline' }}>Back to sign in</Link>
              </div>
            )}

            <button
              type="submit" disabled={isPending}
              className="w-full py-3 rounded-lg text-sm font-semibold"
              style={{ background: isPending ? 'var(--navy-mid)' : 'var(--navy)', color: '#fff', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.8 : 1 }}
            >
              {isPending ? 'Saving…' : 'Set password →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
