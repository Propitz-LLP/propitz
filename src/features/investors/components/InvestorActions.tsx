'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteInvestorAction } from '../actions'
import type { KycStatus } from '@/types'

const editStyle: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', borderRadius: 6,
  border: '1px solid var(--border-strong)', color: 'var(--navy)',
  textDecoration: 'none', background: '#fff',
}
const deleteStyle: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', borderRadius: 6,
  border: '1px solid rgba(190,60,60,0.35)', color: 'var(--red)',
  background: '#fff', cursor: 'pointer',
}
const confirmStyle: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', borderRadius: 6,
  background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer',
}
const cancelStyle: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', borderRadius: 6,
  border: '1px solid var(--border-strong)', color: 'var(--navy)',
  background: '#fff', cursor: 'pointer',
}

export function InvestorActions({ id, kycStatus, canDelete }: {
  id: string
  kycStatus: KycStatus
  canDelete: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteInvestorAction(id)
      if (res?.error) {
        setError(res.error)
        setConfirming(false)
        return
      }
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      {kycStatus === 'Not Started' && (
        <Link href={`/admin/investors/${id}/kyc`} style={editStyle}>Edit</Link>
      )}

      {canDelete && (confirming ? (
        <>
          <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 500 }}>Delete?</span>
          <button onClick={handleDelete} disabled={isPending} style={{ ...confirmStyle, opacity: isPending ? 0.7 : 1 }}>
            {isPending ? 'Deleting…' : 'Confirm'}
          </button>
          <button onClick={() => setConfirming(false)} disabled={isPending} style={cancelStyle}>Cancel</button>
        </>
      ) : (
        <button onClick={() => { setConfirming(true); setError(null) }} style={deleteStyle}>Delete</button>
      ))}

      {error && (
        <span style={{ fontSize: 11.5, color: 'var(--red)', width: '100%', textAlign: 'right' }}>{error}</span>
      )}
    </div>
  )
}
