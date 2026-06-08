import { requireAuth } from '@/lib/auth'
import { getDocumentsByInvestor } from '@/lib/db/documents'
import { DocumentList } from '@/features/documents/components/DocumentList'

export default async function DocumentsPage() {
  const user = await requireAuth()
  const documents = await getDocumentsByInvestor(user.id)
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-navy mb-1">Documents</h1>
        <p className="text-sm text-slate-400">Investment agreements, certificates & statements</p>
      </div>
      <DocumentList documents={documents} />
    </div>
  )
}
