// Single place that reads all env vars.
// When migrating to AWS: update values here, nothing else changes.
function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

export const config = {
  app: {
    url: optional('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    env: optional('NODE_ENV', 'development'),
  },

  supabase: {
    url: optional('NEXT_PUBLIC_SUPABASE_URL'),
    // New key format (sb_publishable_xxx / sb_secret_xxx) — replaces legacy anon/service_role
    // Legacy anon/service_role keys still work until end of 2026 but new projects get the new format
    publishableKey: optional('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    secretKey: optional('SUPABASE_SECRET_KEY'),
  },

  // AWS RDS — populated when migrating away from Supabase
  database: {
    url: optional('DATABASE_URL'),
  },

  // AWS S3 — populated when migrating away from Supabase Storage
  aws: {
    region: optional('AWS_REGION', 'ap-south-1'),
    accessKeyId: optional('AWS_ACCESS_KEY_ID'),
    secretAccessKey: optional('AWS_SECRET_ACCESS_KEY'),
    s3Bucket: optional('AWS_S3_BUCKET'),
    cognitoUserPoolId: optional('AWS_COGNITO_USER_POOL_ID'),
    cognitoClientId: optional('AWS_COGNITO_CLIENT_ID'),
  },

  razorpay: {
    keyId: optional('RAZORPAY_KEY_ID'),
    keySecret: optional('RAZORPAY_KEY_SECRET'),
    webhookSecret: optional('RAZORPAY_WEBHOOK_SECRET'),
  },

  email: {
    // Resend today, SES tomorrow — provider is chosen in lib/notifications/email.ts
    resendApiKey: optional('RESEND_API_KEY'),
    fromAddress: optional('EMAIL_FROM', 'noreply@propitz.com'),
    sesRegion: optional('AWS_SES_REGION', 'ap-south-1'),
  },

  platform: {
    feeRatePct: parseFloat(optional('PLATFORM_FEE_PCT', '1.5')),
    exitFeeRatePct: parseFloat(optional('EXIT_FEE_PCT', '2.0')),
    managementFeeRatePct: parseFloat(optional('MANAGEMENT_FEE_PCT', '1.0')),
  },
} as const
