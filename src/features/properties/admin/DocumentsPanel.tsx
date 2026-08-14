'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  uploadPropertyDocumentAction,
  deletePropertyDocumentAction,
  getPropertyDocumentUrlAction,
} from '../actions'
import type { Property, InvestorDocument } from '@/types'

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', border: '1px solid var(--border-strong)',
  borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: '#fff', width: '100%',
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 4,
}
const errStyle: React.CSSProperties = { color: 'var(--red)', fontSize: 12, marginTop: 3 }

function fileIcon(path: string): string {
  return /\.(jpe?g|png|webp)$/i.test(path) ? '🖼️' : '📄'
}

export function DocumentsPanel({
  property,
  documents,
}: {
  property: Property
  documents: InvestorDocument[]
}) {
  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [opening, setOpening] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const err = (f: string) => errors[f]?.[0]

  function handleUpload() {
    setErrors({})
    if (!file) {
      setErrors({ file: ['Choose a file to upload'] })
      return
    }
    const fd = new FormData()
    fd.set('label', label)
    fd.set('file', file)
    startTransition(async () => {
      const res = await uploadPropertyDocumentAction(property.id, fd)
      if (res?.error) {
        setErrors(res.error as Record<string, string[]>)
        return
      }
      setLabel('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    })
  }

  function open(doc: InvestorDocument) {
    setOpening(doc.id)
    startTransition(async () => {
      const res = await getPropertyDocumentUrlAction(doc.id)
      setOpening(null)
      if ('url' in res && res.url) window.open(res.url, '_blank', 'noopener')
    })
  }

  function remove(doc: InvestorDocument) {
    if (!window.confirm(`Delete “${doc.label}”? This cannot be undone.`)) return
    setDeleting(doc.id)
    startTransition(async () => {
      const res = await deletePropertyDocumentAction(doc.id)
      setDeleting(null)
      if (res?.error) {
        setErrors({ _form: [typeof res.error === 'string' ? res.error : 'Delete failed'] })
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <h2 className="font-display text-xl text-navy">Property Documents</h2>
        <span className="badge badge-amber" style={{ flexShrink: 0 }}>🔒 Private · signed-URL access</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--slate-light)', marginBottom: 20 }}>
        Upload property documents for this listing. Each is stored privately and shared with investors via secure 15-minute links.
      </p>

      {documents.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--slate-light)', marginBottom: 20 }}>No documents uploaded yet.</p>
      ) : (
        <table className="data-table" style={{ marginBottom: 20 }}>
          <thead>
            <tr>
              <th>Document</th>
              <th className="num">Ver</th>
              <th>Uploaded</th>
              <th className="num"></th>
            </tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc.id}>
                <td>
                  <button
                    onClick={() => open(doc)}
                    disabled={opening === doc.id}
                    title="Opens via a secure link valid for 15 minutes"
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      color: 'var(--navy)', fontWeight: 600, fontSize: 13.5,
                      display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{fileIcon(doc.storagePath)}</span>
                    {doc.label}{opening === doc.id ? ' · Opening…' : ''}
                  </button>
                </td>
                <td className="num">v{doc.version}</td>
                <td style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>
                  {new Date(doc.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="num">
                  <button
                    onClick={() => remove(doc)}
                    disabled={deleting === doc.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 12.5, fontWeight: 600 }}
                  >
                    {deleting === doc.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Upload new
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={labelStyle}>Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleUpload() } }}
              placeholder="e.g. Title Report — Aug 2026"
              style={inputStyle}
            />
            {err('label') && <div style={errStyle}>{err('label')}</div>}
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
            {err('file') && <div style={errStyle}>{err('file')}</div>}
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isPending}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: isPending ? 'default' : 'pointer',
              background: 'var(--navy)', color: '#fff', fontSize: 14, fontWeight: 600, opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--slate-light)', marginTop: 10 }}>
          PDF or image (JPEG, PNG, WebP), up to 4 MB. Visible to investors on the property detail page.
        </div>
        {err('_form') && <div style={{ ...errStyle, marginTop: 8 }}>{err('_form')}</div>}
      </div>
    </div>
  )
}
