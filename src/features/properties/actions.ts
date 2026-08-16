'use server'

import { put, del } from '@vercel/blob'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { recordNotification } from '@/lib/notifications/inapp'
import { createProperty, updateProperty, getPropertyByIdAdmin, propertyHasActivity, deletePropertyAdmin, recordValuationAtomic } from '@/lib/db/properties'
import { getOwnershipsByProperty } from '@/lib/db/ownerships'
import { createDocument, getDocumentsByProperty } from '@/lib/db/documents'
import { uploadPropertyDocument, deletePropertyDocumentFile } from '@/lib/storage/property-docs'
import { fmtRupees } from '@/lib/format'
import { revalidatePath } from 'next/cache'
import {
  propertySchema,
  valuationSchema,
  propertyDocumentSchema,
  draftPropertySchema,
  isPropertyComplete,
  type PropertyCompletenessValues,
} from './schemas'
import type { Property, DocumentType } from '@/types'

const DEFAULT_COVER_GRADIENT = 'linear-gradient(135deg,#1B3057,#2A4A7A)'

// FormData scalars → typed values. Empty/absent numbers collapse to 0, which is
// the "not filled yet" state for our numeric columns (see isPropertyComplete).
function numOf(v: FormDataEntryValue | null | undefined): number {
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}
function strOf(v: FormDataEntryValue | null | undefined): string {
  return typeof v === 'string' ? v.trim() : ''
}

// Extract just the fields that drive the completeness check from a form payload.
function completenessFromForm(raw: Record<string, FormDataEntryValue>): PropertyCompletenessValues {
  return {
    name: strOf(raw.name),
    slug: strOf(raw.slug),
    city: strOf(raw.city),
    district: strOf(raw.district),
    state: strOf(raw.state),
    assetType: strOf(raw.assetType),
    description: strOf(raw.description),
    totalValuation: numOf(raw.totalValuation),
    totalUnits: numOf(raw.totalUnits),
    unitPrice: numOf(raw.unitPrice),
    minInvestmentUnits: numOf(raw.minInvestmentUnits),
    holdingPeriod: strOf(raw.holdingPeriod),
    lockInPeriod: strOf(raw.lockInPeriod),
  }
}

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

// Create always yields a Draft (createProperty forces status='Draft'). Only the
// property's identity (name + slug) is required up front — every other field can
// be left blank and filled in later from the edit screen. Missing NOT-NULL
// columns get safe zero/empty fallbacks so the row inserts cleanly. Publishing
// is a separate, completeness-gated step (see publishPropertyAction).
export async function createPropertyAction(formData: FormData) {
  const admin = await requireAdmin()

  const uploaded = await uploadImage(formData, String(formData.get('slug') ?? 'property'))
  if (uploaded && 'error' in uploaded) return { error: uploaded.error }

  const raw = Object.fromEntries(formData.entries())

  const parsed = draftPropertySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const hasArea = strOf(raw.totalArea) !== '' && numOf(raw.totalArea) > 0
  const draft = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    city: strOf(raw.city),
    district: strOf(raw.district),
    state: strOf(raw.state),
    pinCode: strOf(raw.pinCode) || undefined,
    // Empty until the admin picks one; the enum is enforced only when publishing.
    assetType: strOf(raw.assetType) as Property['assetType'],
    description: strOf(raw.description),
    totalValuation: numOf(raw.totalValuation),
    totalUnits: Math.trunc(numOf(raw.totalUnits)),
    unitPrice: numOf(raw.unitPrice),
    rentalYieldPct: numOf(raw.rentalYieldPct),
    capitalGrowthPct: numOf(raw.capitalGrowthPct),
    holdingPeriod: strOf(raw.holdingPeriod),
    lockInPeriod: strOf(raw.lockInPeriod),
    minInvestmentUnits: Math.max(0, Math.trunc(numOf(raw.minInvestmentUnits))),
    totalArea: hasArea ? numOf(raw.totalArea) : undefined,
    areaUnit: hasArea ? (strOf(raw.areaUnit) as Property['areaUnit']) : undefined,
    imageUrl: uploaded ? uploaded.url : undefined,
    coverEmoji: strOf(raw.coverEmoji) || '🏢',
    coverGradient: strOf(raw.coverGradient) || DEFAULT_COVER_GRADIENT,
    status: 'Draft' as const,
  }

  const property = await createProperty(draft)

  await recordAudit({
    actor: admin,
    action: 'property.create',
    entityType: 'property',
    entityId: property.id,
    before: null,
    after: { name: property.name, slug: property.slug, status: property.status },
  })

  revalidatePath('/admin/properties')
  return { success: true, name: property.name, id: property.id }
}

export async function updatePropertyAction(id: string, formData: FormData) {
  const admin = await requireAdmin()

  const uploaded = await uploadImage(formData, String(formData.get('slug') ?? 'property'))
  if (uploaded && 'error' in uploaded) return { error: uploaded.error }

  const raw = Object.fromEntries(formData.entries())
  if (uploaded) (raw as Record<string, unknown>).imageUrl = uploaded.url

  // Publishing requires every mandatory section complete — checked against the
  // full submitted values, before blanks are dropped below.
  if ((raw.status === 'Open' || raw.status === 'Fully Subscribed')
      && !isPropertyComplete(completenessFromForm(raw))) {
    return { error: { status: ['Complete all required sections before publishing.'] } }
  }

  // An emptied area field means "clear it" — null the columns explicitly.
  const clears: Record<string, null> = {}
  if (raw.totalArea === '') {
    delete raw.totalArea
    delete raw.areaUnit
    clears.totalArea = null
    clears.areaUnit = null
  }

  // Draft-tolerant save: a section-by-section save sends every field, including
  // ones the admin hasn't reached yet (blank holdingPeriod, description, …).
  // Drop blank scalars so `.partial()` leaves those columns untouched instead of
  // failing their `min(1)` / positive validators. Completeness is gated above.
  for (const key of Object.keys(raw)) {
    if (raw[key] === '') delete raw[key]
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

const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const DOC_MAX_BYTES = 4 * 1024 * 1024 // 4 MB — stays under Vercel's request body limit
// Property documents no longer carry a user-chosen type; the label identifies them.
// The `documents.type` column is NOT NULL, so persist a single catch-all value.
const DEFAULT_PROPERTY_DOC_TYPE: DocumentType = 'Due Diligence Report'

// Upload a property-level document (title report, due diligence, brochure) to the
// private property-documents bucket and record it against the property. Version
// auto-increments per document type.
export async function uploadPropertyDocumentAction(propertyId: string, formData: FormData) {
  const admin = await requireAdmin()

  const property = await getPropertyByIdAdmin(propertyId)
  if (!property) return { error: { _form: ['Property not found'] } }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: { file: ['Choose a file to upload'] } }
  }
  if (!DOC_TYPES.includes(file.type)) {
    return { error: { file: ['Only PDF or image files (JPEG, PNG, WebP) are allowed'] } }
  }
  if (file.size > DOC_MAX_BYTES) {
    return { error: { file: ['File must be under 4 MB'] } }
  }

  const parsed = propertyDocumentSchema.safeParse({
    label: formData.get('label'),
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  // Version = next in sequence for this property.
  const existing = await getDocumentsByProperty(propertyId)
  const version = existing.length + 1

  const buffer = Buffer.from(await file.arrayBuffer())
  const storagePath = await uploadPropertyDocument(propertyId, DEFAULT_PROPERTY_DOC_TYPE, file.name, buffer, file.type)

  const doc = await createDocument({
    investorId: null,
    propertyId,
    type: DEFAULT_PROPERTY_DOC_TYPE,
    label: parsed.data.label,
    storagePath,
    issuedAt: new Date().toISOString(),
    version,
  })

  await recordAudit({
    actor: admin,
    action: 'document.upload',
    entityType: 'document',
    entityId: doc.id,
    before: null,
    after: { propertyId, type: doc.type, label: doc.label, version: doc.version },
  })

  revalidatePath(`/admin/properties/${propertyId}/edit`)
  revalidatePath(`/properties/${property.slug}`)
  return { success: true }
}

// Remove a property-level document — deletes the stored file and the row.
export async function deletePropertyDocumentAction(documentId: string) {
  const admin = await requireAdmin()

  const { getDocumentById, deleteDocument } = await import('@/lib/db/documents')
  const doc = await getDocumentById(documentId)
  if (!doc || doc.investorId !== null || !doc.propertyId) {
    return { error: 'Document not found' }
  }

  await deletePropertyDocumentFile(doc.storagePath).catch(() => {})
  await deleteDocument(documentId)

  await recordAudit({
    actor: admin,
    action: 'document.delete',
    entityType: 'document',
    entityId: documentId,
    before: { propertyId: doc.propertyId, type: doc.type, label: doc.label, version: doc.version },
    after: null,
  })

  const property = await getPropertyByIdAdmin(doc.propertyId)
  revalidatePath(`/admin/properties/${doc.propertyId}/edit`)
  if (property) revalidatePath(`/properties/${property.slug}`)
  return { success: true }
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
  if (!existing) return { error: 'Property not found' }

  // Never publish an incomplete listing, whichever entry point triggered it.
  if (!isPropertyComplete(existing)) {
    return { error: 'Complete all required sections before publishing.' }
  }

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
