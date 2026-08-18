'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { createInvestorAction } from '../actions'

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{msg}</div>
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 4,
}

// Popup to add an investor with minimal details (name, email, phone). KYC and
// bank details are added later. Controlled by the parent (open/onClose); calls
// onCreated after a successful create.
export function AddInvestorDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (investor: { id: string; name: string }) => void
}) {
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [isPending, startTransition] = useTransition()

  if (!open || typeof document === 'undefined') return null

  const err = (f: string) => errors[f]?.[0]

  function reset() {
    setName(''); setEmail(''); setPhone(''); setErrors({})
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    const fd = new FormData()
    fd.set('name', name); fd.set('email', email); fd.set('phone', phone)
    startTransition(async () => {
      const res = await createInvestorAction(fd)
      if (res?.error) { setErrors(res.error as Record<string, string[]>); return }
      if (res?.success) {
        onCreated?.({ id: (res as { id: string }).id, name: (res as { name: string }).name })
        reset()
        onClose()
      }
    })
  }

  // Rendered via a portal to document.body so it escapes any surrounding <form>
  // (e.g. the property edit form) — otherwise the dialog's submit would bubble
  // to the outer form instead of createInvestorAction.
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,30,56,0.45)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{ width: '100%', maxWidth: 460, padding: 0, overflow: 'hidden' }}
      >
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="card-title">Add Investor</span>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: 20, lineHeight: 1, color: 'var(--slate-light)', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 12.5, color: 'var(--slate-light)', margin: 0 }}>
              Add basic details now. KYC and bank details can be completed later.
            </p>

            <div>
              <label style={labelStyle}>Full Name <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ananya Sharma" autoFocus />
              <FieldError msg={err('name')} />
            </div>

            <div>
              <label style={labelStyle}>Email <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
              <FieldError msg={err('email')} />
            </div>

            <div>
              <label style={labelStyle}>Phone <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 415 555 0123" />
              <div style={{ fontSize: 11.5, color: 'var(--slate-light)', marginTop: 3 }}>
                Include the country code (e.g. +1, +44, +91).
              </div>
              <FieldError msg={err('phone')} />
            </div>

            <FieldError msg={err('_form')} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            <button
              type="button" onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, background: '#fff', color: 'var(--navy)', border: '1px solid var(--border-strong)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isPending}
              style={{
                padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
                background: isPending ? 'var(--navy-mid)' : 'var(--gold)', color: 'var(--navy)',
                border: 'none', cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? 'Adding…' : 'Add Investor'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
