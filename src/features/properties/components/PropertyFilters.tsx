'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const TYPES = ['Commercial', 'Residential', 'Land'] as const

export function PropertyFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('type') ?? ''

  function setType(type: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (type) params.set('type', type)
    else params.delete('type')
    router.replace(params.size > 0 ? `${pathname}?${params}` : pathname, { scroll: false })
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {['', ...TYPES].map(type => (
        <button
          key={type || 'all'}
          onClick={() => setType(type)}
          style={{
            padding: '7px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
            border: active === type ? 'none' : '1px solid var(--border-strong)',
            background: active === type ? 'var(--navy)' : '#fff',
            color: active === type ? '#fff' : 'var(--navy)',
            cursor: 'pointer',
          }}
        >
          {type || 'All'}
        </button>
      ))}
    </div>
  )
}
