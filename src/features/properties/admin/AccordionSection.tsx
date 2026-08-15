'use client'

import type { CSSProperties, ReactNode } from 'react'

export type SectionChipStatus = 'complete' | 'partial' | 'empty' | 'optional' | 'locked'

const CHIP: Record<SectionChipStatus, { label: string; className?: string; style?: CSSProperties }> = {
  complete: { label: 'Complete', className: 'badge badge-green' },
  partial:  { label: 'Partial',  className: 'badge badge-amber' },
  empty:    { label: 'Empty',    style: { background: 'var(--surface-2)', color: 'var(--slate-light)', border: '1px solid var(--border)' } },
  optional: { label: 'Optional', style: { background: 'var(--surface-2)', color: 'var(--slate-light)', border: '1px solid var(--border)' } },
  locked:   { label: 'Locked',   style: { background: 'var(--surface-2)', color: 'var(--slate-light)', border: '1px solid var(--border)' } },
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ flexShrink: 0, transition: 'transform 0.15s ease', transform: open ? 'rotate(90deg)' : 'none' }}
    >
      <path d="M9 6l6 6-6 6" stroke="var(--slate-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatusChip({ status }: { status: SectionChipStatus }) {
  const c = CHIP[status]
  return (
    <span
      className={c.className}
      style={{ fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap', ...(c.style ?? {}), ...(c.style ? { borderRadius: 999, padding: '2px 9px', fontWeight: 600 } : {}) }}
    >
      {c.label}
    </span>
  )
}

// A collapsible form section for the property accordion. The header always shows
// the section's number, title, a live status chip, and a one-line summary of
// what's filled in — so the collapsed stack doubles as a progress checklist.
export function AccordionSection({
  index,
  title,
  badge,
  status,
  summary,
  open,
  onToggle,
  locked,
  lockedNote,
  anchorId,
  children,
}: {
  index: number
  title: string
  badge?: string
  status: SectionChipStatus
  summary: string
  open: boolean
  onToggle: () => void
  locked?: boolean
  lockedNote?: string
  anchorId?: string
  children: ReactNode
}) {
  return (
    <div
      id={anchorId}
      className="card"
      style={{ marginBottom: 12, overflow: 'hidden', padding: 0, opacity: locked ? 0.65 : 1, scrollMarginTop: 80 }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
          padding: '14px 18px', background: open ? 'var(--surface-2)' : 'transparent',
          border: 'none', cursor: 'pointer',
        }}
      >
        <Chevron open={open} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
              {index}. {title}
            </span>
            {badge && (
              <span className="badge badge-amber" style={{ fontSize: 10, flexShrink: 0 }}>{badge}</span>
            )}
          </span>
          <span style={{
            fontSize: 12, color: 'var(--slate-light)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {summary}
          </span>
        </span>
        <StatusChip status={status} />
      </button>

      {open && (
        <div style={{ padding: '4px 18px 18px' }}>
          {locked
            ? <p style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>{lockedNote}</p>
            : children}
        </div>
      )}
    </div>
  )
}
