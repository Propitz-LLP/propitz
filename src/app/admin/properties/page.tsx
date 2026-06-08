import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { listAllProperties } from '@/lib/db/properties'
import { PropertyTable } from '@/features/properties/admin/PropertyTable'

export default async function AdminPropertiesPage() {
  await requireAdmin()
  const properties = await listAllProperties()
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--navy)', marginBottom: 4 }}>
            Properties
          </h1>
          <p style={{ fontSize: 13, color: 'var(--slate-light)' }}>{properties.length} total</p>
        </div>
        <Link
          href="/admin/properties/new"
          style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
            background: 'var(--gold)', color: 'var(--navy)', textDecoration: 'none',
          }}
        >
          + Add Property
        </Link>
      </div>
      <PropertyTable properties={properties} />
    </div>
  )
}
