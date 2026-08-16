import { getStorageProvider, storage } from './index'

// Property-level legal/compliance documents (title report, due diligence,
// brochure). Private bucket — served to investors only via signed URLs.

export async function uploadPropertyDocument(
  propertyId: string,
  docType: string,
  filename: string,
  file: Buffer,
  contentType: string,
): Promise<string> {
  const provider = getStorageProvider()
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const typeSlug = docType.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const path = `${propertyId}/${typeSlug}/${Date.now()}-${safeName}`
  return provider.upload(storage.buckets.propertyDocs, path, file, contentType)
}

export async function getPropertyDocumentUrl(path: string): Promise<string> {
  return getStorageProvider().getSignedUrl(storage.buckets.propertyDocs, path, 900) // 15 min
}

export async function deletePropertyDocumentFile(path: string): Promise<void> {
  return getStorageProvider().delete(storage.buckets.propertyDocs, path)
}
