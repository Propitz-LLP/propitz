'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type SidebarItem = {
  href: string
  icon: string
  label: string
  badge?: number
}

type SidebarSection = {
  title: string
  items: SidebarItem[]
}

const SECTIONS: SidebarSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    title: 'Management',
    items: [
      { href: '/admin/transactions', icon: '⏳', label: 'Transactions' },
      { href: '/admin/kyc', icon: '👥', label: 'KYC Review' },
      { href: '/admin/properties', icon: '🏢', label: 'Properties' },
      { href: '/admin/distributions', icon: '💰', label: 'Distributions' },
      { href: '/admin/documents', icon: '📁', label: 'Documents' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { href: '/admin/analytics', icon: '📈', label: 'Analytics' },
      { href: '/admin/audit', icon: '📋', label: 'Audit Logs' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--navy)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        paddingTop: 20,
        paddingBottom: 20,
        overflowY: 'auto',
      }}
    >
      {SECTIONS.map(section => (
        <div key={section.title}>
          {/* Section heading */}
          <div
            style={{
              padding: '12px 16px 4px',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 600,
            }}
          >
            {section.title}
          </div>

          {/* Items */}
          {section.items.map(item => {
            const active = pathname === item.href ||
              (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 20px',
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                  borderLeft: `3px solid ${active ? 'var(--gold)' : 'transparent'}`,
                  fontSize: 13.5,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 17, width: 20, textAlign: 'center' }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span
                    style={{
                      background: 'var(--gold)',
                      color: 'var(--navy)',
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 99,
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}
    </aside>
  )
}
