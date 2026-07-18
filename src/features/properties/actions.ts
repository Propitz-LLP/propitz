'use server'

import { put, del } from '@vercel/blob'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { createProperty, updateProperty, getPropertyByIdAdmin, propertyHasActivity, deletePropertyAdmin } from '@/lib/db/properties'
import { revalidatePath } from 'next/cache'
import { propertySchema } from './schemas'
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
  await requireAdmin()

  const uploaded = await uploadImage(formData, String(formData.get('slug') ?? 'property'))
  if (uploaded && 'error' in uploaded) return { error: uploaded.error }

  const raw = Object.fromEntries(formData.entries())
  if (uploaded) (raw as Record<string, unknown>).imageUrl = uploaded.url
  const parsed = propertySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const property = await createProperty(parsed.data as Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'subscribedUnits'>)

  revalidatePath('/admin/properties')
  return { success: true, name: property.name }
}

export async function updatePropertyAction(id: string, formData: FormData) {
  await requireAdmin()

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

  // Replacing the image? Remove the old blob so it doesn't orphan.
  if (uploaded) {
    const existing = await getPropertyByIdAdmin(id)
    if (existing?.imageUrl) await del(existing.imageUrl).catch(() => {})
  }

  await updateProperty(id, { ...parsed.data, ...clears } as Partial<Property>)
  revalidatePath('/admin/properties')
  revalidatePath(`/admin/properties/${id}/edit`)
  return { success: true }
}

export async function deletePropertyAction(id: string) {
  await requireAdmin()

  const property = await getPropertyByIdAdmin(id)
  if (!property) return { error: 'Property not found' }

  if (await propertyHasActivity(id)) {
    return { error: 'This property has investor activity and cannot be deleted. Set it to Closed instead.' }
  }

  if (property.imageUrl) await del(property.imageUrl).catch(() => {})
  await deletePropertyAdmin(id)

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
  await requireAdmin()
  await updateProperty(id, { status: 'Open' })
  revalidatePath('/admin/properties')
  revalidatePath('/properties')
  return { success: true }
}
