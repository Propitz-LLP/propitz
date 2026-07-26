'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markNotificationReadAction, markAllReadAction } from '../actions'
import type { Notification } from '@/types'

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[]
  unreadCount: number
}) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function openItem(n: Notification) {
    startTransition(async () => {
      if (!n.readAt) await markNotificationReadAction(n.id)
      setOpen(false)
      if (n.link) router.push(n.link)
      else router.refresh()
    })
  }

  function markAll() {
    startTransition(async () => {
      await markAllReadAction()
      router.refresh()
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)', fontSize: 18, position: 'relative',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16,
              padding: '0 4px', background: 'var(--gold)', color: 'var(--navy)',
              borderRadius: 8, fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div
            style={{
              position: 'absolute', top: 44, right: 0, width: 340, maxHeight: 440,
              background: '#fff', borderRadius: 12, border: '1px solid var(--border-strong)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.18)', zIndex: 61, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAll}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--slate-light)', fontSize: 12, fontWeight: 600,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--slate-light)', fontSize: 13 }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>🔔</div>
                  You&apos;re all caught up.
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                      padding: '12px 16px', border: 'none', borderBottom: '1px solid var(--border)',
                      background: n.readAt ? '#fff' : 'var(--surface-2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      {!n.readAt && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, marginTop: 5 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 13 }}>{n.title}</div>
                        <div style={{ color: 'var(--slate-light)', fontSize: 12.5, marginTop: 2 }}>{n.body}</div>
                        <div style={{ color: 'var(--slate-light)', fontSize: 11, marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
