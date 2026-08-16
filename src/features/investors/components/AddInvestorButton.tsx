'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AddInvestorDialog } from './AddInvestorDialog'

// "Add Investor" button that opens the popup; refreshes the list on success.
export function AddInvestorButton({ label = '+ Add Investor' }: { label?: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
          background: 'var(--gold)', color: 'var(--navy)', border: 'none', cursor: 'pointer',
        }}
      >
        {label}
      </button>
      <AddInvestorDialog open={open} onClose={() => setOpen(false)} onCreated={() => router.refresh()} />
    </>
  )
}
