// All notification DB access lives here.
// To migrate to RDS: swap the Supabase clients for a Drizzle/pg client. Query shapes stay the same.
//
// Reads and mark-read run through the RLS-bound client (createClient) — the
// own-row policies key on auth.uid(), which matches, so an investor only ever
// sees/updates their own rows even if a bug passed the wrong id. Inserts come
// from admin/system flows via the service-role client.

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Notification } from '@/types'

interface InsertNotification {
  id: string
  investorId: string
  type: Notification['type']
  title: string
  body: string
  link?: string | null
}

export async function insertNotification(entry: InsertNotification): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase.from('notifications').insert({
    id: entry.id,
    investorId: entry.investorId,
    type: entry.type,
    title: entry.title,
    body: entry.body,
    link: entry.link ?? null,
  })
  if (error) throw new Error(`notification insert failed: ${error.message}`)
}

// Recent notifications for the signed-in investor, newest first. Bell shows up
// to `limit` without pagination (S7-05: max 50 shown).
export async function listNotifications(investorId: string, limit = 50): Promise<Notification[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('investorId', investorId)
    .order('createdAt', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as Notification[]
}

export async function countUnread(investorId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('investorId', investorId)
    .is('readAt', null)
  if (error) throw new Error(error.message)
  return count ?? 0
}

// Mark one notification read. Scoped to the investor id as well as the row id so
// a mismatched pair is a no-op (RLS would block a cross-investor update anyway).
export async function markRead(id: string, investorId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ readAt: new Date().toISOString() })
    .eq('id', id)
    .eq('investorId', investorId)
    .is('readAt', null)
  if (error) throw new Error(error.message)
}

export async function markAllRead(investorId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ readAt: new Date().toISOString() })
    .eq('investorId', investorId)
    .is('readAt', null)
  if (error) throw new Error(error.message)
}
