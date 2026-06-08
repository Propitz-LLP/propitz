'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/features/auth/actions'
import type { AuthUser } from '@/types'

const INVESTOR_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/properties', label: 'Properties' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/documents', label: 'Documents' },
]

export function TopNav({ user, variant }: { user: AuthUser; variant: 'investor' | 'admin' }) {
  const pathname = usePathname()

  const initials = user.email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()

  return (
    <nav
      style={{
        background: 'var(--navy)',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        gap: 32,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <Link
        href={variant === 'admin' ? '/admin/dashboard' : '/dashboard'}
        style={{ textDecoration: 'none', flexShrink: 0 }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: 'var(--gold)',
            letterSpacing: '0.03em',
          }}
        >
          Propitz
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            marginLeft: 6,
            fontStyle: 'italic',
          }}
        >
          {variant === 'admin' ? 'Admin' : 'Investor Portal'}
        </span>
      </Link>

      {/* Investor nav links — only in investor variant */}
      {variant === 'investor' && (
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {INVESTOR_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Spacer for admin */}
      {variant === 'admin' && <div style={{ flex: 1 }} />}

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Notification bell */}
        <button
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 18,
            position: 'relative',
          }}
          title="Notifications"
        >
          🔔
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              background: 'var(--gold)',
              borderRadius: '50%',
            }}
          />
        </button>

        {/* Avatar + dropdown */}
        <div style={{ position: 'relative' }}>
          <form action={logoutAction}>
            <button
              type="submit"
              title={`${user.email} — click to sign out`}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'var(--gold)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--navy)',
              }}
            >
              {initials}
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
