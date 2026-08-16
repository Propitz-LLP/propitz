'use client'

import { useState, useTransition } from 'react'
import { getPropertyDocumentUrlAction } from '../actions'
import type { InvestorDocument } from '@/types'

export function PropertyDocuments({ documents }: { documents: InvestorDocument[] }) {
  const [opening, setOpening] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function openDocument(doc: InvestorDocument) {
    setOpening(doc.id)
    startTransition(async () => {
      const result = await getPropertyDocumentUrlAction(doc.id)
      setOpening(null)
      if ('url' in result && result.url) window.open(result.url, '_blank', 'noopener')
    })
  }

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Property Documents</span></div>
      {documents.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: 'var(--slate-light)' }}>
          Due diligence reports and legal documents will appear here once published.
        </div>
      ) : (
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => openDocument(doc)}
              disabled={opening === doc.id}
              title="Opens via a secure link valid for 15 minutes"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 10, textAlign: 'left',
                border: '1px solid var(--border-strong)', background: '#fff',
                cursor: opening === doc.id ? 'wait' : 'pointer', width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>📄</span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }}>{doc.label}</div>
                </div>
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--navy-mid)', fontWeight: 600 }}>
                {opening === doc.id ? 'Opening…' : 'View ↗'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
