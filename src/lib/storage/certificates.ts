import { getStorageProvider, storage } from './index'
import { createDocument } from '@/lib/db/documents'
import type { Ownership, Property, Investor } from '@/types'

// PDF generation happens here — renderer imported lazily to avoid edge runtime issues
async function generateCertificatePdf(
  investor: Investor,
  property: Property,
  ownership: Ownership,
): Promise<Buffer> {
  // Lazy import — @react-pdf/renderer is large and Node-only
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { CertificateTemplate } = await import('@/features/documents/components/CertificateTemplate')
  const { createElement } = await import('react')

  // CertificateTemplate must return a <Document> element from @react-pdf/renderer
  const element = createElement(CertificateTemplate as any, { investor, property, ownership })
  return renderToBuffer(element as any) as Promise<Buffer>
}

export async function generateAndStoreCertificate(
  investor: Investor,
  property: Property,
  ownership: Ownership,
): Promise<string> {
  const provider = getStorageProvider()

  const pdf = await generateCertificatePdf(investor, property, ownership)
  const filename = `certificate-${property.slug}-${ownership.acquiredDate}.pdf`
  const path = `${investor.id}/${property.id}/${filename}`

  await provider.upload(storage.buckets.certificates, path, pdf, 'application/pdf')

  // Record in documents table
  await createDocument({
    investorId: investor.id,
    propertyId: property.id,
    type: 'Ownership Certificate',
    label: `Ownership Certificate — ${property.name}`,
    storagePath: path,
    issuedAt: new Date().toISOString(),
    version: 1,
  })

  return path
}

export async function getCertificateUrl(path: string): Promise<string> {
  const provider = getStorageProvider()
  return provider.getSignedUrl(storage.buckets.certificates, path, 3600)
}
