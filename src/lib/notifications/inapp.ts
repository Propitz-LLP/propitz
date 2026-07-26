// In-app notification write path — the ONLY place feature code creates a
// notification. Lives alongside email.ts under the notifications concern.
// To migrate to a push/websocket service: rewrite this file only.
//
// Unlike recordAudit (compliance-critical, throws on failure), recordNotification
// is a best-effort follow-up like the paired email: callers wrap it in
// .catch(() => {}) so a missed bell entry never rolls back the real action.

import { insertNotification } from '@/lib/db/notifications'
import type { NotificationType } from '@/types'

interface RecordNotificationInput {
  investorId: string
  type: NotificationType
  title: string
  body: string
  link?: string
}

export async function recordNotification(input: RecordNotificationInput): Promise<void> {
  await insertNotification({
    id: crypto.randomUUID(),
    investorId: input.investorId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? null,
  })
}
