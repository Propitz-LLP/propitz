// Email abstraction — the ONLY place that sends email.
// To migrate to AWS SES: implement SesEmailProvider and switch getEmailProvider().

import { config } from '@/lib/config'

export interface EmailAttachment {
  filename: string
  content: Buffer
  // When set, the attachment is referenced inline from the HTML via
  // <img src="cid:<contentId>"> instead of appearing as a download. Used by the
  // E2E report to embed screenshot proof directly in the email body.
  contentId?: string
}

export interface EmailPayload {
  // A single address or several — Resend accepts an array (up to 50); SES uses
  // ToAddresses[] too. Env-provided lists are split before reaching here.
  to: string | string[]
  subject: string
  html: string
  attachments?: EmailAttachment[]
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
      attachments: payload.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        // Resend maps content_id → the MIME Content-ID header, letting the HTML
        // reference the image inline with src="cid:<id>".
        ...(a.contentId ? { content_id: a.contentId } : {}),
      })),
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
//       Destination: { ToAddresses: [payload.to].flat() },
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

export async function sendKycReceived(to: string, name: string): Promise<void> {
  await provider.send({
    to,
    subject: 'KYC submission received — Propitz',
    html: `<p>Hi ${name},</p><p>We have received your KYC submission. Our team will review it within 24–48 hours and notify you once verification is complete.</p>`,
  })
}

export async function sendInvestorInvite(to: string, signupUrl: string): Promise<void> {
  await provider.send({
    to,
    subject: 'You’re invited to invest on Propitz',
    html: `<p>Hello,</p>
<p>You’ve been invited to create your investor account on Propitz. Click below to get started — you’ll set your own password, confirm your email, and complete a quick KYC.</p>
<p><a href="${signupUrl}" style="display:inline-block;padding:10px 18px;background:#1B3057;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Create your account →</a></p>
<p>Or paste this link into your browser:<br>${signupUrl}</p>`,
  })
}

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

// ── E2E test-run report ───────────────────────────────────────
// Proof-of-run email sent after the Playwright suite (see e2e/report-email.ts).
// summaryHtml is a pre-rendered results table (may embed <img src="cid:…">
// referencing the inline screenshot attachments). attachments carries the JUnit
// XML plus any screenshot-proof PNGs (those set contentId for inline rendering).
export async function sendTestReport(
  to: string | string[],
  passed: boolean,
  summaryHtml: string,
  attachments?: EmailAttachment[],
): Promise<void> {
  const badge = passed
    ? '<span style="background:#1e7d4f;color:#fff;padding:4px 10px;border-radius:4px;">PASSED</span>'
    : '<span style="background:#c0392b;color:#fff;padding:4px 10px;border-radius:4px;">FAILED</span>'
  await provider.send({
    to,
    subject: `${passed ? '✅' : '❌'} Propitz E2E tests — ${passed ? 'passed' : 'FAILED'}`,
    html: `<p>Propitz end-to-end smoke test run: ${badge}</p>${summaryHtml}`,
    attachments: attachments?.length ? attachments : undefined,
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
