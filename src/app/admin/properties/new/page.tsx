import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { PropertyForm } from '@/features/properties/admin/PropertyForm'

export default async function NewPropertyPage() {
  await requireAdmin()
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--navy)', marginBottom: 4 }}>
            Add Property
          </h1>
          <p style={{ fontSize: 13, color: 'var(--slate-light)' }}>
            Properties start in Draft status until published
          </p>
        </div>
        <Link
          href="/admin/properties"
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border-strong)',
            color: 'var(--navy)', textDecoration: 'none', background: '#fff',
          }}
        >
          ← Back to Properties
        </Link>
      </div>
      <PropertyForm />
    </div>
  )
}
