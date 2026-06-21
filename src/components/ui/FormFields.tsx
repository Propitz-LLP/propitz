import type { CSSProperties, ReactNode } from 'react'

export const fieldStyle: CSSProperties = { marginBottom: 18 }
export const rowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }

export function Section({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-header">
        <span className="card-title">{title}</span>
        {badge && <span className="badge badge-amber" style={{ fontSize: 11 }}>{badge}</span>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

export function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: ReactNode
}) {
  return (
    <div style={fieldStyle}>
      <label className="form-label">
        {label} {required && <span style={{ color: 'var(--red)' }}>*</span>}
      </label>
      {children}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  )
}
