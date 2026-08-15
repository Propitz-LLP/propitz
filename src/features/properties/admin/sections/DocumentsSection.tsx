'use client'

import { usePropertyForm } from './PropertyFormContext'
import { PendingDocuments } from '../PendingDocuments'
import { DocumentsPanel } from '../DocumentsPanel'
import { SectionFooter } from './SectionFooter'

export function DocumentsSection() {
  const f = usePropertyForm()
  return (
    <>
      {f.isEdit
        ? <DocumentsPanel property={f.property!} documents={f.documents ?? []} embedded />
        : <PendingDocuments value={f.pendingDocs} onChange={f.setPendingDocs} embedded />}

      <SectionFooter current="documents" />
    </>
  )
}
