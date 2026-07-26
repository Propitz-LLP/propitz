'use server'

import { put, del } from '@vercel/blob'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { recordNotification } from '@/lib/notifications/inapp'
import { createProperty, updateProperty, getPropertyByIdAdmin, propertyHasActivity, deletePropertyAdmin, recordValuationAtomic } from '@/lib/db/properties'
import { getOwnershipsByProperty } from '@/lib/db/ownerships'
import { fmtRupees } from '@/lib/format'
import { revalidatePath } from 'next/cache'
import { propertySchema, valuationSchema } from './schemas'
import type { Property } from '@/types'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const IMAGE_MAX_BYTES = 4 * 1024 * 1024 // 4 MB — stays under Vercel's request body limit

/**
 * Pops the `image` file out of the FormData (so zod parsing sees only scalar
 * fields) and uploads it to Vercel Blob. Returns the public URL, null when no
 * file was provided, or a field-error object on validation failure.
 */
async function uploadImage(formData: FormData, slug: string): Promise<
  { url: string } | { error: Record<string, string[]> } | null
> {
  const file = formData.get('image')
  formData.delete('image')
  if (!(file instanceof File) || file.size === 0) return null

  if (!IMAGE_TYPES.includes(file.type)) {
    return { error: { image: ['Only JPEG, PNG or WebP images are allowed'] } }
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { error: { image: ['Image must be under 4 MB'] } }
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const blob = await put(`properties/${slug}-${Date.now()}.${ext}`, file, { access: 'public' })
  return { url: blob.url }
}

export async function createPropertyAction(formData: FormData) {
  const admin = await requireAdmin()

  const uploaded = await uploadImage(formData, String(formData.get('slug') ?? 'property'))
  if (uploaded && 'error' in uploaded) return { error: uploaded.error }

  const raw = Object.fromEntries(formData.entries())
  if (uploaded) (raw as Record<string, unknown>).imageUrl = uploaded.url
  const parsed = propertySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const property = await createProperty(parsed.data as Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'subscribedUnits'>)

  await recordAudit({
    actor: admin,
    action: 'property.create',
    entityType: 'property',
    entityId: property.id,
    before: null,
    after: { name: property.name, slug: property.slug, status: property.status },
  })

  revalidatePath('/admin/properties')
  return { success: true, name: property.name }
}

export async function updatePropertyAction(id: string, formData: FormData) {
  const admin = await requireAdmin()

  const uploaded = await uploadImage(formData, String(formData.get('slug') ?? 'property'))
  if (uploaded && 'error' in uploaded) return { error: uploaded.error }

  const raw = Object.fromEntries(formData.entries())
  if (uploaded) (raw as Record<string, unknown>).imageUrl = uploaded.url

  // An emptied area field means "clear it" — strip before Zod (empty string
  // fails number coercion) and null the columns explicitly.
  const clears: Record<string, null> = {}
  if (raw.totalArea === '') {
    delete raw.totalArea
    delete raw.areaUnit
    clears.totalArea = null
    clears.areaUnit = null
  }

  const parsed = propertySchema.partial().safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  // Snapshot the pre-edit row for the audit trail (and to clean up the old blob).
  const existing = await getPropertyByIdAdmin(id)

  // Replacing the image? Remove the old blob so it doesn't orphan.
  if (uploaded && existing?.imageUrl) await del(existing.imageUrl).catch(() => {})

  await updateProperty(id, { ...parsed.data, ...clears } as Partial<Property>)

  await recordAudit({
    actor: admin,
    action: 'property.update',
    entityType: 'property',
    entityId: id,
    before: existing ? { name: existing.name, status: existing.status, unitPrice: existing.unitPrice } : null,
    after: { changedFields: Object.keys({ ...parsed.data, ...clears }) },
  })

  revalidatePath('/admin/properties')
  revalidatePath(`/admin/properties/${id}/edit`)
  return { success: true }
}

export async function deletePropertyAction(id: string) {
  const admin = await requireAdmin()

  const property = await getPropertyByIdAdmin(id)
  if (!property) return { error: 'Property not found' }

  if (await propertyHasActivity(id)) {
    return { error: 'This property has investor activity and cannot be deleted. Set it to Closed instead.' }
  }

  if (property.imageUrl) await del(property.imageUrl).catch(() => {})
  await deletePropertyAdmin(id)

  await recordAudit({
    actor: admin,
    action: 'property.delete',
    entityType: 'property',
    entityId: id,
    before: { name: property.name, slug: property.slug, status: property.status },
    after: null,
  })

  revalidatePath('/admin/properties')
  revalidatePath('/properties')
  return { success: true, name: property.name }
}

// 15-min signed URL for a property-level document (due diligence, title report, …)
export async function getPropertyDocumentUrlAction(documentId: string) {
  await requireAuth()
  const { getDocumentById } = await import('@/lib/db/documents')
  const doc = await getDocumentById(documentId)
  if (!doc || doc.investorId !== null || !doc.propertyId) {
    return { error: 'Document not found' }
  }
  const { getStorageProvider, storage } = await import('@/lib/storage')
  const url = await getStorageProvider().getSignedUrl(storage.buckets.propertyDocs, doc.storagePath, 900)
  return { url }
}

export async function publishPropertyAction(id: string) {
  const admin = await requireAdmin()
  const existing = await getPropertyByIdAdmin(id)
  await updateProperty(id, { status: 'Open' })
  await recordAudit({
    actor: admin,
    action: 'property.publish',
    entityType: 'property',
    entityId: id,
    before: { status: existing?.status ?? null },
    after: { status: 'Open' },
  })
  revalidatePath('/admin/properties')
  revalidatePath('/properties')
  return { success: true }
}

// Revalue a property: writes a new valuation_history row, updates the current
// unit price, and audits the change — all atomically in record_valuation_atomic.
// Because portfolio value is computed live from property.unitPrice, this IS the
// cascade; the only follow-up is notifying holders (best-effort).
export async function updateValuationAction(propertyId: string, formData: FormData) {
  const admin = await requireAdmin()

  const parsed = valuationSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const property = await getPropertyByIdAdmin(propertyId)
  if (!property) return { error: { _form: ['Property not found'] } }

  const { previousPrice } = await recordValuationAtomic(
    propertyId,
    parsed.data.unitPrice,
    parsed.data.quarter,
    admin.email,
  )

  // Notify every current holder of the new valuation — best-effort, outside the
  // committed price change (a missed bell entry must not fail the revaluation).
  const changePct = previousPrice > 0
    ? ((parsed.data.unitPrice - previousPrice) / previousPrice) * 100
    : 0
  const direction = parsed.data.unitPrice >= previousPrice ? 'up' : 'down'
  const ownerships = await getOwnershipsByProperty(propertyId)
  await Promise.all(
    ownerships
      .filter(o => o.units > 0)
      .map(o =>
        recordNotification({
          investorId: o.investorId,
          type: 'valuation.updated',
          title: 'Valuation updated',
          body: `${property.name} is now ${fmtRupees(parsed.data.unitPrice)}/unit (${direction} ${Math.abs(changePct).toFixed(1)}% from ${fmtRupees(previousPrice)}). Your portfolio value has been updated.`,
          link: `/properties/${property.slug}`,
        }).catch(() => {}),
      ),
  )

  revalidatePath('/admin/properties')
  revalidatePath(`/admin/properties/${property.slug}/edit`)
  revalidatePath(`/properties/${property.slug}`)
  revalidatePath('/dashboard')
  return { success: true, previousPrice }
}
