'use client'

import { useState, useTransition } from 'react'
import { inviteInvestorAction } from '../actions'
import { Field } from '@/components/ui/FormFields'

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{msg}</div>
}

// Investors self-register, so "adding" one is really inviting them: email a
// signup link (or copy it to share). No account is created here — the investor
// sets their own password, confirms email, and completes KYC.
export function InviteInvestorPanel({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const err = (f: string) => errors[f]?.[0]

  function copyLink() {
    const trimmed = email.trim()
    const url = `${window.location.origin}/login?mode=signup${trimmed ? `&email=${encodeURIComponent(trimmed)}` : ''}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setSentTo(null)
    const fd = new FormData()
    fd.set('email', email)
    startTransition(async () => {
      const res = await inviteInvestorAction(fd)
      if (res?.error) { setErrors(res.error as Record<string, string[]>); return }
      if (res?.success) setSentTo(email.trim())
    })
  }

  return (
    <form onSubmit={sendInvite} style={{ maxWidth: compact ? undefined : 560 }}>
      <Field label="Investor email" required hint="They’ll get a link to create their account, confirm their email, and complete KYC.">
        <input
          className="form-input"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setSentTo(null) }}
          placeholder="name@example.com"
        />
        <FieldError msg={err('email')} />
        <FieldError msg={err('_form')} />
      </Field>

      {sentTo && (
        <div style={{
          fontSize: 12.5, padding: '9px 12px', borderRadius: 8, marginBottom: 12,
          background: 'rgba(31,143,75,0.1)', color: 'var(--green)',
        }}>
          ✓ Invite sent to {sentTo}. They’ll appear here once they sign up and are KYC-approved.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '11px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: isPending ? 'var(--navy-mid)' : 'var(--gold)', color: 'var(--navy)',
            border: 'none', cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Sending…' : 'Send invite →'}
        </button>
        <button
          type="button"
          onClick={copyLink}
          style={{
            padding: '11px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
            background: '#fff', color: 'var(--navy)', border: '1px solid var(--border-strong)', cursor: 'pointer',
          }}
        >
          {copied ? '✓ Link copied' : 'Copy signup link'}
        </button>
      </div>
    </form>
  )
}
