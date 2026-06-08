import { getStorageProvider, storage } from './index'
import { createDocument } from '@/lib/db/documents'

export async function uploadKycDocument(
  investorId: string,
  submissionId: string,
  docType: string,
  file: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const provider = getStorageProvider()
  const path = `${investorId}/${submissionId}/${docType}/${filename}`
  return provider.upload(storage.buckets.kycDocs, path, file, contentType)
}

export async function getKycDocumentUrl(investorId: string, path: string): Promise<string> {
  const provider = getStorageProvider()
  return provider.getSignedUrl(storage.buckets.kycDocs, path, 900) // 15 min for admin review
}
