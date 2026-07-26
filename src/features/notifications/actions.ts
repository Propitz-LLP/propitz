'use server'

import { requireAuth } from '@/lib/auth'
import { markRead, markAllRead } from '@/lib/db/notifications'
import { revalidatePath } from 'next/cache'

export async function markNotificationReadAction(id: string) {
  const user = await requireAuth()
  await markRead(id, user.id)
  // The bell reads its data in the investor layout (server component) — revalidate
  // so the next render reflects the new unread count.
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function markAllReadAction() {
  const user = await requireAuth()
  await markAllRead(user.id)
  revalidatePath('/', 'layout')
  return { success: true }
}
