// Storage abstraction — the ONLY place that knows about Supabase Storage.
// To migrate to AWS S3: rewrite getStorageProvider() to return an S3Provider.
// All callers (kyc-docs.ts, certificates.ts) stay the same.

import { createAdminClient } from '@/lib/supabase/server'

export interface StorageProvider {
  upload(bucket: string, path: string, file: Buffer, contentType: string): Promise<string>
  getSignedUrl(bucket: string, path: string, expiresInSeconds?: number): Promise<string>
  delete(bucket: string, path: string): Promise<void>
}

// ── Supabase Storage implementation ──────────────────────────

class SupabaseStorageProvider implements StorageProvider {
  async upload(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
    const supabase = await createAdminClient()
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: true })
    if (error) throw new Error(`Storage upload failed: ${error.message}`)
    return path
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
    const supabase = await createAdminClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds)
    if (error || !data) throw new Error(`Failed to get signed URL: ${error?.message}`)
    return data.signedUrl
  }

  async delete(bucket: string, path: string): Promise<void> {
    const supabase = await createAdminClient()
    const { error } = await supabase.storage.from(bucket).remove([path])
    if (error) throw new Error(`Storage delete failed: ${error.message}`)
  }
}

// ── AWS S3 implementation (stub — fill in when migrating) ────
//
// import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
// import { config } from '@/lib/config'
//
// class S3StorageProvider implements StorageProvider {
//   private client = new S3Client({ region: config.aws.region })
//
//   async upload(bucket: string, path: string, file: Buffer, contentType: string) {
//     await this.client.send(new PutObjectCommand({ Bucket: bucket, Key: path, Body: file, ContentType: contentType }))
//     return path
//   }
//
//   async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600) {
//     const cmd = new GetObjectCommand({ Bucket: bucket, Key: path })
//     return getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds })
//   }
//
//   async delete(bucket: string, path: string) {
//     await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }))
//   }
// }

export function getStorageProvider(): StorageProvider {
  // Switch here when migrating:
  // if (config.aws.s3Bucket) return new S3StorageProvider()
  return new SupabaseStorageProvider()
}

export const storage = {
  buckets: {
    kycDocs: 'kyc-documents',
    certificates: 'certificates',
    propertyImages: 'property-images',
  },
}
