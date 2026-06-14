'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

/**
 * Reads ?created=<name> or ?updated=<name> from the URL,
 * shows a green banner, auto-dismisses after 4s, then cleans the URL.
 */
export function SuccessBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const created = searchParams.get('created')
  const updated = searchParams.get('updated')
  const message = created
    ? `✓ "${decodeURIComponent(created)}" was added successfully.`
    : updated
    ? `✓ "${decodeURIComponent(updated)}" was updated successfully.`
    : null

  const [visible, setVisible] = useState(!!message)

  // Clean the query param from the URL without triggering a navigation
  useEffect(() => {
    if (!message) return
    setVisible(true)
    // Remove the param from the URL (replace so it doesn't pollute browser history)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.delete('created')
    params.delete('updated')
    const clean = params.size > 0 ? `${pathname}?${params}` : pathname
    router.replace(clean, { scroll: false })

    // Auto-dismiss after 4s
    const timer = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(timer)
  }, [message]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || !message) return null

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        marginBottom: 20,
        borderRadius: 10,
        background: 'var(--green-bg)',
        border: '1px solid rgba(45,125,90,0.25)',
        color: 'var(--green)',
        fontSize: 13.5,
        fontWeight: 500,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <span>{message}</span>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--green)',
          fontSize: 18,
          lineHeight: 1,
          padding: '0 4px',
          opacity: 0.7,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
