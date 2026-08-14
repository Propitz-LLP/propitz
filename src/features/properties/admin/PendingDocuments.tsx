'use client'

import { useRef, useState } from 'react'

export interface PendingDoc {
  id: string
  label: string
  file: File
}

const DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const DOC_MAX_BYTES = 4 * 1024 * 1024 // 4 MB

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', border: '1px solid var(--border-strong)',
  borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: '#fff', width: '100%',
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 4,
}

function fileIcon(name: string): string {
  return /\.(jpe?g|png|webp)$/i.test(name) ? '🖼️' : '📄'
}

// Collects documents to attach while creating a new property. Files are held in
// state and uploaded by the parent form once the property (and its id) exists.
export function PendingDocuments({
  value,
  onChange,
}: {
  value: PendingDoc[]
  onChange: (docs: PendingDoc[]) => void
}) {
  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function add() {
    setError(null)
    if (!label.trim()) { setError('Enter a label'); return }
    if (!file) { setError('Choose a file to add'); return }
    if (!DOC_MIME.includes(file.type)) { setError('Only PDF or image files (JPEG, PNG, WebP) are allowed'); return }
    if (file.size > DOC_MAX_BYTES) { setError('File must be under 4 MB'); return }
    onChange([...value, { id: crypto.randomUUID(), label: label.trim(), file }])
    setLabel('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function remove(id: string) {
    onChange(value.filter(d => d.id !== id))
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <h2 className="font-display text-xl text-navy">Property Documents</h2>
        <span className="badge badge-amber" style={{ flexShrink: 0 }}>🔒 Private · signed-URL access</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--slate-light)', marginBottom: 20 }}>
        Upload property documents for this listing. Added here, they upload automatically when you save the property.
      </p>

      {value.length > 0 && (
        <table className="data-table" style={{ marginBottom: 20 }}>
          <thead>
            <tr>
              <th>Document</th>
              <th>File</th>
              <th className="num"></th>
            </tr>
          </thead>
          <tbody>
            {value.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600, color: 'var(--navy)' }}>
                  <span style={{ fontSize: 18, marginRight: 8 }}>{fileIcon(d.file.name)}</span>
                  {d.label}
                </td>
                <td style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>{d.file.name}</td>
                <td className="num">
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 12.5, fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Add document
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={labelStyle}>Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder="e.g. Title Report — Aug 2026"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <label style={labelStyle}>File</label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: 13 }}
            />
          </div>
          <button
            type="button"
            onClick={add}
            style={{
              padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border-strong)', cursor: 'pointer',
              background: '#fff', color: 'var(--navy)', fontSize: 14, fontWeight: 600,
            }}
          >
            + Add
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--slate-light)', marginTop: 10 }}>
          PDF or image (JPEG, PNG, WebP), up to 4 MB each. Visible to investors on the property detail page.
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  )
}
