// Emails proof of the E2E test run after Playwright finishes.
//
// Parses test-results/results.xml (JUnit), renders an inline HTML summary,
// attaches the raw JUnit XML, and sends via the app's existing email provider
// (lib/notifications/email.ts → Resend). Runs whether tests passed or failed,
// so the email itself is the proof-of-run.
//
// The full browsable report stays local at playwright-report/index.html
// (open with: npx playwright show-report). Playwright's HTML report is a
// multi-file folder, so it isn't attached — the JUnit XML is the portable proof.
//
// Run: npm run test:report   (or automatically via `npm test`)

import { config as loadEnv } from 'dotenv'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

// Local runs read .env.test; on CI these come from the environment (GitHub
// secrets) and the file is absent — dotenv silently no-ops, which is fine.
loadEnv({ path: '.env.test' })

const JUNIT_PATH = resolve('test-results/results.xml')
// Screenshot proof captured by the specs via proof() — kept in sync with
// SCREENSHOTS_DIR in e2e/helpers.ts.
const SCREENSHOTS_DIR = resolve('screenshots')
// TEST_REPORT_TO may list several recipients, separated by ',' or ';'. Resend
// wants an array (it does not parse separators), so split and pass an array.
const TO = (process.env.TEST_REPORT_TO || process.env.TEST_INVESTOR_EMAIL || '')
  .split(/[;,]/)
  .map((addr) => addr.trim())
  .filter(Boolean)
const DRY_RUN = process.argv.includes('--dry-run')

interface Case {
  name: string
  suite: string
  status: 'passed' | 'failed' | 'skipped'
  failureMsg?: string
}

// Minimal, dependency-free JUnit parse. Playwright emits <testsuites> with
// <testcase> children; a failed case has a <failure>, skipped has <skipped/>.
function parseJUnit(xml: string): Case[] {
  const cases: Case[] = []
  const caseRe = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g
  const attr = (s: string, k: string) => s.match(new RegExp(`${k}="([^"]*)"`))?.[1] ?? ''
  let m: RegExpExecArray | null
  while ((m = caseRe.exec(xml))) {
    const attrs = m[1]
    const body = m[3] ?? ''
    let status: Case['status'] = 'passed'
    let failureMsg: string | undefined
    if (/<failure\b|<error\b/.test(body)) {
      status = 'failed'
      failureMsg = body.match(/<failure\b[^>]*message="([^"]*)"/)?.[1]
    } else if (/<skipped\b/.test(body)) {
      status = 'skipped'
    }
    cases.push({
      name: attr(attrs, 'name'),
      suite: attr(attrs, 'classname'),
      status,
      failureMsg: failureMsg ? decodeEntities(failureMsg) : undefined,
    })
  }
  return cases
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#10;/g, ' ')
    .replace(/&amp;/g, '&')
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderSummary(cases: Case[]): string {
  const pass = cases.filter((c) => c.status === 'passed').length
  const fail = cases.filter((c) => c.status === 'failed').length
  const skip = cases.filter((c) => c.status === 'skipped').length
  const icon = { passed: '✅', failed: '❌', skipped: '⏭️' } as const

  const rows = cases
    .map(
      (c) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${icon[c.status]}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#555;">${esc(c.suite)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${esc(c.name)}${
          c.failureMsg
            ? `<div style="color:#c0392b;font-size:12px;margin-top:2px;">${esc(c.failureMsg)}</div>`
            : ''
        }</td>
      </tr>`,
    )
    .join('')

  return `
    <p style="font-size:14px;">
      <strong>${pass}</strong> passed ·
      <strong style="color:${fail ? '#c0392b' : '#555'}">${fail}</strong> failed ·
      <strong>${skip}</strong> skipped
      <span style="color:#888;"> (${cases.length} total)</span>
    </p>
    <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:13px;">
      <thead>
        <tr style="text-align:left;color:#888;">
          <th style="padding:6px 10px;"></th>
          <th style="padding:6px 10px;">Suite</th>
          <th style="padding:6px 10px;">Test</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#888;font-size:12px;margin-top:16px;">
      Full browsable report: run <code>npx playwright show-report</code> locally.
      JUnit XML attached.
    </p>`
}

interface Shot {
  name: string // human caption derived from the file stem
  cid: string // Content-ID referenced by the inline <img>
  filename: string
  content: Buffer
}

// Collect the PNG proof screenshots, sorted for a stable order in the email.
function collectScreenshots(): Shot[] {
  if (!existsSync(SCREENSHOTS_DIR)) return []
  return readdirSync(SCREENSHOTS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort()
    .map((f) => {
      const stem = basename(f, '.png')
      return {
        name: stem.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        // A stable, unique CID per screenshot for the inline <img src="cid:…">.
        cid: `shot-${stem}`,
        filename: f,
        content: readFileSync(resolve(SCREENSHOTS_DIR, f)),
      }
    })
}

// Render the screenshots as an inline gallery. Images reference the attachments
// by Content-ID so they display in the email body (not just as downloads).
function renderGallery(shots: Shot[]): string {
  if (shots.length === 0) {
    return `<p style="color:#888;font-size:12px;margin-top:16px;">No screenshot proof captured this run.</p>`
  }
  const cards = shots
    .map(
      (s) => `
      <div style="margin:0 0 20px;">
        <div style="font-family:sans-serif;font-size:12px;color:#555;margin-bottom:4px;">${esc(s.name)}</div>
        <img src="cid:${s.cid}" alt="${esc(s.name)}"
             style="max-width:100%;border:1px solid #ddd;border-radius:6px;display:block;" />
      </div>`,
    )
    .join('')
  return `
    <h3 style="font-family:sans-serif;font-size:15px;margin:24px 0 12px;">Screenshot proof (${shots.length})</h3>
    ${cards}`
}

async function main() {
  if (!existsSync(JUNIT_PATH)) {
    console.error(`\n  ✗ No results at ${JUNIT_PATH}. Run "npm run test:e2e" first.\n`)
    process.exit(1)
  }

  const xml = readFileSync(JUNIT_PATH, 'utf8')
  const cases = parseJUnit(xml)
  const passed = cases.every((c) => c.status !== 'failed') && cases.length > 0
  const shots = collectScreenshots()
  const summaryHtml = renderSummary(cases) + renderGallery(shots)

  if (DRY_RUN) {
    console.log('\n[dry-run] Recipient(s):', TO.length ? TO.join(', ') : '(none set)')
    console.log('[dry-run] Overall:', passed ? 'PASSED' : 'FAILED')
    console.log(`[dry-run] Screenshots: ${shots.length}${shots.length ? ' (' + shots.map((s) => s.filename).join(', ') + ')' : ''}`)
    console.log('[dry-run] Summary HTML written to test-results/report-email.html\n')
    const { writeFileSync } = await import('node:fs')
    writeFileSync('test-results/report-email.html', summaryHtml)
    return
  }

  if (TO.length === 0) {
    console.warn('\n  ⚠ No TEST_REPORT_TO set — skipping email. Summary:\n')
    console.log(cases.map((c) => `    ${c.status.toUpperCase()}  ${c.name}`).join('\n'), '\n')
    return
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('\n  ⚠ No RESEND_API_KEY set — cannot send. Overall:', passed ? 'PASSED' : 'FAILED', '\n')
    return
  }

  // Import the app's email module (compiled on the fly by tsx via the @ alias
  // resolved through tsconfig paths).
  const { sendTestReport } = await import('../src/lib/notifications/email')
  // Screenshots first (inline, referenced by CID from the gallery), then the
  // JUnit XML as the machine-readable record.
  const attachments = [
    ...shots.map((s) => ({ filename: s.filename, content: s.content, contentId: s.cid })),
    { filename: 'results.xml', content: Buffer.from(xml, 'utf8') },
  ]
  await sendTestReport(TO, passed, summaryHtml, attachments)
  console.log(
    `\n  ✓ Test report emailed to ${TO.join(', ')} (overall: ${passed ? 'PASSED' : 'FAILED'}, ${shots.length} screenshot${shots.length === 1 ? '' : 's'}).\n`,
  )
}

main().catch((e) => {
  // Never let the reporting step mask the actual test outcome — log and exit 0.
  console.error('\n  ⚠ Report email failed:', e instanceof Error ? e.message : e, '\n')
})
