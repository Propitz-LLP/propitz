import type { CSSProperties } from 'react'

export const selectStyle: CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border-strong)',
  borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: '#fff',
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{msg}</div>
}
