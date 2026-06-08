// Email abstraction — the ONLY place that sends email.
// To migrate to AWS SES: implement SesEmailProvider and switch getEmailProvider().

import { config } from '@/lib/config'

export interface EmailPayload {
  to: string
  subject: string
  html: string
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>
}

// ── Resend implementation ────────────────────────────────────

class ResendEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    const { Resend } = await import('resend')
    const resend = new Resend(config.email.resendApiKey)
    const { error } = await resend.emails.send({
      from: config.email.fromAddress,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    })
    if (error) throw new Error(`Email send failed: ${error.message}`)
  }
}

// ── AWS SES implementation (stub — fill in when migrating) ───
//
// import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
//
// class SesEmailProvider implements EmailProvider {
//   private client = new SESClient({ region: config.email.sesRegion })
//
//   async send(payload: EmailPayload): Promise<void> {
//     await this.client.send(new SendEmailCommand({
//       Source: config.email.fromAddress,
//       Destination: { ToAddresses: [payload.to] },
//       Message: {
//         Subject: { Data: payload.subject },
//         Body: { Html: { Data: payload.html } },
//       },
//     }))
//   }
// }

function getEmailProvider(): EmailProvider {
  // Switch here when migrating:
  // if (config.aws.region) return new SesEmailProvider()
  return new ResendEmailProvider()
}

// ── Typed email senders ───────────────────────────────────────

const provider = getEmailProvider()

export async function sendKycApproved(to: string, name: string): Promise<void> {
  await provider.send({
    to,
    subject: 'Your KYC has been approved — Propitz',
    html: `<p>Hi ${name},</p><p>Your KYC verification has been approved. You can now browse and invest in properties on Propitz.</p>`,
  })
}

export async function sendKycRejected(to: string, name: string, reason: string): Promise<void> {
  await provider.send({
    to,
    subject: 'KYC verification update — Propitz',
    html: `<p>Hi ${name},</p><p>Your KYC submission requires attention.</p><p><strong>Reason:</strong> ${reason}</p><p>Please re-submit with the correct documents.</p>`,
  })
}

export async function sendTransactionConfirmed(
  to: string,
  name: string,
  propertyName: string,
  units: number,
  amount: number,
): Promise<void> {
  await provider.send({
    to,
    subject: `Investment confirmed — ${propertyName}`,
    html: `<p>Hi ${name},</p><p>Your investment of <strong>${units} units</strong> in <strong>${propertyName}</strong> has been confirmed. Total amount: ₹${amount.toLocaleString('en-IN')}.</p><p>Your ownership certificate is available in your Documents section.</p>`,
  })
}

export async function sendDistributionCredited(
  to: string,
  name: string,
  propertyName: string,
  amount: number,
  period: string,
): Promise<void> {
  await provider.send({
    to,
    subject: `Distribution credited — ${period}`,
    html: `<p>Hi ${name},</p><p>Your rental distribution of <strong>₹${amount.toLocaleString('en-IN')}</strong> for <strong>${propertyName}</strong> (${period}) has been processed.</p>`,
  })
}

export async function sendTransactionRejected(
  to: string,
  name: string,
  propertyName: string,
  reason: string,
): Promise<void> {
  await provider.send({
    to,
    subject: `Investment update — ${propertyName}`,
    html: `<p>Hi ${name},</p><p>Your investment request for <strong>${propertyName}</strong> could not be processed.</p><p><strong>Reason:</strong> ${reason}</p><p>A refund will be initiated within 5-7 business days.</p>`,
  })
}
