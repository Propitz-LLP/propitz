'use server'

import { requireAdmin } from '@/lib/auth'
import { createProperty, updateProperty } from '@/lib/db/properties'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { propertySchema } from './schemas'
import type { Property } from '@/types'

export async function createPropertyAction(formData: FormData) {
  await requireAdmin()

  const raw = Object.fromEntries(formData.entries())
  const parsed = propertySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const property = await createProperty(parsed.data as Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'subscribedUnits'>)

  revalidatePath('/admin/properties')
  redirect(`/admin/properties?created=${encodeURIComponent(property.name)}`)
}

export async function updatePropertyAction(id: string, formData: FormData) {
  await requireAdmin()

  const raw = Object.fromEntries(formData.entries())
  const parsed = propertySchema.partial().safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await updateProperty(id, parsed.data)
  revalidatePath('/admin/properties')
  revalidatePath(`/admin/properties/${id}/edit`)
  return { success: true }
}

export async function publishPropertyAction(id: string) {
  await requireAdmin()
  await updateProperty(id, { status: 'Open' })
  revalidatePath('/admin/properties')
  revalidatePath('/properties')
  return { success: true }
}
