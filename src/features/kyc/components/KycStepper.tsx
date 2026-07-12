'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Section, Field } from '@/components/ui/FormFields'
import { saveKycStepAction, uploadKycDocumentAction, submitKycAction } from '../actions'
import { KYC_DOC_TYPES, KYC_DOC_LABELS } from '../schemas'
import type { Investor, KycSubmission, KycDocType } from '@/types'

const STEP_LABELS = ['Account', 'Identity', 'Bank', 'Documents', 'Review']

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border-strong)',
  borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: '#fff',
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{msg}</div>
}

function Banner({ kind, children }: { kind: 'amber' | 'red'; children: React.ReactNode }) {
  const color = kind === 'amber' ? 'var(--amber, #B7791F)' : 'var(--red)'
  const bg = kind === 'amber' ? 'var(--amber-bg, rgba(183,121,31,0.1))' : 'var(--red-bg, #FDECEC)'
  return (
    <div style={{
      padding: '12px 18px', marginBottom: 20, borderRadius: 10,
      background: bg, border: `1px solid ${color}33`, color, fontSize: 13.5, fontWeight: 500,
    }}>
      {children}
    </div>
  )
}

export function KycStepper({ investor, submission, showGateBanner }: {
  investor: Investor
  submission: KycSubmission | null
  showGateBanner?: boolean
}) {
  const isResubmit = investor.kycStatus === 'Rejected'
  const [step, setStep] = useState(submission?.currentStep ?? 1)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Step 1
  const [phone, setPhone] = useState(investor.phone ?? '')
  const [investorType, setInvestorType] = useState(investor.type)
  // Step 2
  const [fullLegalName, setFullLegalName] = useState(submission?.fullLegalName ?? '')
  const [pan, setPan] = useState(submission?.pan ?? '')
  const [dob, setDob] = useState(submission?.dob ?? '')
  const [aadhaar, setAadhaar] = useState('')
  const [gender, setGender] = useState(submission?.gender ?? '')
  const [address, setAddress] = useState(submission?.address ?? '')
  // Step 3
  const [accountHolderName, setAccountHolderName] = useState(submission?.accountHolderName ?? '')
  const [accountNumber, setAccountNumber] = useState(submission?.bankAccount ?? '')
  const [accountNumberConfirm, setAccountNumberConfirm] = useState(submission?.bankAccount ?? '')
  const [ifsc, setIfsc] = useState(submission?.ifsc ?? '')
  const [bankName, setBankName] = useState(submission?.bankName ?? '')
  const [accountType, setAccountType] = useState(submission?.accountType ?? 'Savings')
  const [ifscLookup, setIfscLookup] = useState<string | null>(null)
  // Step 4
  const [docs, setDocs] = useState<Partial<Record<KycDocType, { name: string; size: number }>>>(
    Object.fromEntries(
      (submission?.documents ?? []).map(d => [d.type, {
        name: d.storagePath.split('/').pop() ?? d.type,
        size: d.sizeBytes,
      }]),
    ),
  )
  const [uploading, setUploading] = useState<KycDocType | null>(null)
  // Step 5
  const [consent, setConsent] = useState(false)

  const err = (field: string) => errors[field]?.[0]

  function saveStep(stepNo: 1 | 2 | 3, fields: Record<string, string>) {
    setErrors({})
    setFormError(null)
    const fd = new FormData()
    Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
    startTransition(async () => {
      const result = await saveKycStepAction(stepNo, fd)
      if (result?.error) {
        if (typeof result.error === 'object' && '_form' in result.error) {
          setFormError((result.error as Record<string, string[]>)._form[0])
        } else {
          setErrors(result.error as Record<string, string[]>)
        }
      } else {
        setStep(stepNo + 1)
        window.scrollTo({ top: 0 })
      }
    })
  }

  async function lookupIfsc(code: string) {
    setIfscLookup(null)
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) return
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${code}`)
      if (!res.ok) { setIfscLookup('IFSC not found — check the code'); return }
      const data = await res.json()
      setBankName(data.BANK ?? '')
      setIfscLookup(`${data.BANK} — ${data.BRANCH}, ${data.CITY}`)
    } catch {
      setIfscLookup(null) // lookup is a convenience; validation happens server-side
    }
  }

  function uploadDoc(docType: KycDocType, file: File | null) {
    if (!file) return
    setFormError(null)
    setUploading(docType)
    const fd = new FormData()
    fd.set('docType', docType)
    fd.set('file', file)
    startTransition(async () => {
      const result = await uploadKycDocumentAction(fd)
      setUploading(null)
      if (result?.error) {
        setFormError(typeof result.error === 'string' ? result.error : 'Upload failed')
      } else {
        setDocs(prev => ({ ...prev, [docType]: { name: file.name, size: file.size } }))
      }
    })
  }

  function submit() {
    setFormError(null)
    startTransition(async () => {
      const result = await submitKycAction()
      if (result?.error) {
        setFormError(typeof result.error === 'string' ? result.error : 'Submission failed')
      } else {
        router.refresh() // server re-renders the page as the status tracker
      }
    })
  }

  const allDocsUploaded = KYC_DOC_TYPES.every(t => docs[t])

  const navButtons = (onNext: () => void, nextLabel = 'Save & Continue →') => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
      {step > 1 ? (
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          disabled={isPending}
          style={{
            padding: '10px 22px', borderRadius: 8, fontSize: 13.5,
            border: '1px solid var(--border-strong)', color: 'var(--navy)',
            background: '#fff', cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      ) : <span />}
      <button
        type="button"
        onClick={onNext}
        disabled={isPending}
        style={{
          padding: '10px 26px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
          background: isPending ? 'var(--navy-mid)' : 'var(--gold)',
          color: 'var(--navy)', border: 'none',
          cursor: isPending ? 'not-allowed' : 'pointer',
        }}
      >
        {isPending ? 'Saving…' : nextLabel}
      </button>
    </div>
  )

  return (
    <div className="max-w-[720px] mx-auto px-6 py-10">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--navy)', marginBottom: 4 }}>
        KYC Verification
      </h1>
      <p style={{ fontSize: 13.5, color: 'var(--slate-light)', marginBottom: 24 }}>
        Complete verification once to invest in any property. Takes about 5 minutes.
      </p>

      {showGateBanner && (
        <Banner kind="amber">Complete KYC verification to start investing.</Banner>
      )}
      {isResubmit && submission?.notes && (
        <Banner kind="red">
          <strong>Your previous submission was rejected:</strong> {submission.notes}
          <br />Fix the issues below and resubmit.
        </Banner>
      )}
      {formError && <Banner kind="red">{formError}</Banner>}

      {/* Progress rail */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1
          const state = n < step ? 'done' : n === step ? 'current' : 'todo'
          return (
            <div key={label} style={{ flex: i === STEP_LABELS.length - 1 ? '0 0 auto' : 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 64 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  background: state === 'done' ? 'var(--green)' : state === 'current' ? 'var(--gold)' : 'var(--surface-2)',
                  color: state === 'todo' ? 'var(--slate-light)' : state === 'done' ? '#fff' : 'var(--navy)',
                  border: state === 'todo' ? '2px solid var(--border-strong)' : 'none',
                }}>
                  {state === 'done' ? '✓' : n}
                </div>
                <span style={{
                  fontSize: 10.5, marginTop: 5,
                  color: state === 'todo' ? 'var(--slate-light)' : 'var(--navy)',
                  fontWeight: state === 'current' ? 700 : 500,
                }}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, marginBottom: 18, borderRadius: 1,
                  background: n < step ? 'var(--green)' : 'var(--border)',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Account confirmation ── */}
      {step === 1 && (
        <Section title="Confirm your account details">
          <Field label="Name">
            <input className="form-input" value={investor.name} disabled style={{ opacity: 0.7 }} />
          </Field>
          <Field label="Email">
            <input className="form-input" value={investor.email} disabled style={{ opacity: 0.7 }} />
          </Field>
          <Field label="Mobile Number" required>
            <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" />
            <FieldError msg={err('phone')} />
          </Field>
          <Field label="Investor Type" required hint="Only Individual — Resident Indian is fully supported in this release.">
            <select value={investorType} onChange={e => setInvestorType(e.target.value as Investor['type'])} style={selectStyle}>
              <option>Individual - Resident Indian</option>
              <option>Individual - NRI</option>
              <option>HUF</option>
              <option>Corporate Entity</option>
            </select>
          </Field>
          {navButtons(() => saveStep(1, { phone, investorType }), 'Confirm & Continue →')}
        </Section>
      )}

      {/* ── Step 2: Identity ── */}
      {step === 2 && (
        <Section title="Identity details">
          <Field label="Full Legal Name" required hint="Exactly as printed on your PAN card">
            <input className="form-input" value={fullLegalName} onChange={e => setFullLegalName(e.target.value)} />
            <FieldError msg={err('fullLegalName')} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="PAN" required>
              <input className="form-input" value={pan} onChange={e => setPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
              <FieldError msg={err('pan')} />
            </Field>
            <Field label="Date of Birth" required>
              <input className="form-input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
              <FieldError msg={err('dob')} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Aadhaar Number" required hint="Only the last 4 digits are stored, per UIDAI guidelines.">
              <input
                className="form-input" inputMode="numeric" value={aadhaar}
                onChange={e => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="12-digit Aadhaar"
              />
              <FieldError msg={err('aadhaar')} />
            </Field>
            <Field label="Gender" required>
              <select value={gender} onChange={e => setGender(e.target.value)} style={selectStyle}>
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <FieldError msg={err('gender')} />
            </Field>
          </div>
          <Field label="Residential Address" required>
            <textarea
              className="form-input" rows={3} value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="House / street, locality, city, state, PIN"
              style={{ resize: 'vertical' }}
            />
            <FieldError msg={err('address')} />
          </Field>
          {navButtons(() => saveStep(2, { fullLegalName, pan, dob, aadhaar, gender, address }))}
        </Section>
      )}

      {/* ── Step 3: Bank details ── */}
      {step === 3 && (
        <Section title="Bank details" badge="Distributions are paid here">
          <Field label="Account Holder Name" required>
            <input className="form-input" value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} />
            <FieldError msg={err('accountHolderName')} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Account Number" required>
              <input className="form-input" inputMode="numeric" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))} />
              <FieldError msg={err('accountNumber')} />
            </Field>
            <Field label="Confirm Account Number" required>
              <input className="form-input" inputMode="numeric" value={accountNumberConfirm} onChange={e => setAccountNumberConfirm(e.target.value.replace(/\D/g, ''))} />
              {accountNumberConfirm && accountNumber !== accountNumberConfirm && (
                <FieldError msg="Account numbers do not match" />
              )}
              <FieldError msg={err('accountNumberConfirm')} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="IFSC Code" required hint={ifscLookup ?? 'Bank and branch appear after you enter the code'}>
              <input
                className="form-input" value={ifsc}
                onChange={e => setIfsc(e.target.value.toUpperCase())}
                onBlur={e => lookupIfsc(e.target.value)}
                placeholder="e.g. HDFC0001234" maxLength={11}
              />
              <FieldError msg={err('ifsc')} />
            </Field>
            <Field label="Account Type" required>
              <select value={accountType} onChange={e => setAccountType(e.target.value)} style={selectStyle}>
                <option>Savings</option>
                <option>Current</option>
              </select>
            </Field>
          </div>
          <Field label="Bank Name" required>
            <input className="form-input" value={bankName} onChange={e => setBankName(e.target.value)} />
            <FieldError msg={err('bankName')} />
          </Field>
          {navButtons(() => saveStep(3, { accountHolderName, accountNumber, accountNumberConfirm, ifsc, bankName, accountType }))}
        </Section>
      )}

      {/* ── Step 4: Documents ── */}
      {step === 4 && (
        <Section title="Upload documents" badge="PDF, JPG or PNG · max 5 MB">
          {KYC_DOC_TYPES.map(docType => {
            const uploaded = docs[docType]
            const isUploading = uploading === docType
            return (
              <div
                key={docType}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', marginBottom: 12, borderRadius: 10,
                  border: `1.5px ${uploaded ? 'solid var(--green)' : 'dashed var(--border-strong)'}`,
                  background: uploaded ? 'var(--green-bg, rgba(45,125,90,0.06))' : 'transparent',
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }}>
                    {uploaded ? '✓ ' : ''}{KYC_DOC_LABELS[docType]}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--slate-light)', marginTop: 2 }}>
                    {isUploading
                      ? 'Uploading…'
                      : uploaded
                      ? `${uploaded.name} · ${(uploaded.size / 1024).toFixed(0)} KB`
                      : docType === 'selfie' ? 'A clear photo of your face' : 'Not uploaded yet'}
                  </div>
                </div>
                <label style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                  background: uploaded ? '#fff' : 'var(--navy)',
                  color: uploaded ? 'var(--navy)' : '#fff',
                  border: uploaded ? '1px solid var(--border-strong)' : 'none',
                  cursor: isUploading ? 'wait' : 'pointer',
                }}>
                  {uploaded ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    capture={docType === 'selfie' ? 'user' : undefined}
                    onChange={e => uploadDoc(docType, e.target.files?.[0] ?? null)}
                    disabled={isUploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )
          })}
          {navButtons(() => {
            if (!allDocsUploaded) { setFormError('Upload all four documents to continue.'); return }
            setStep(5)
            window.scrollTo({ top: 0 })
          }, 'Continue →')}
        </Section>
      )}

      {/* ── Step 5: Review & submit ── */}
      {step === 5 && (
        <Section title="Review & submit">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', fontSize: 13.5, marginBottom: 18 }}>
            {[
              ['Full Legal Name', fullLegalName],
              ['PAN', pan],
              ['Date of Birth', dob],
              ['Aadhaar', aadhaar ? `XXXX XXXX ${aadhaar.slice(-4)}` : submission?.aadhaarMasked ?? ''],
              ['Gender', gender],
              ['Mobile', phone],
              ['Account Holder', accountHolderName],
              ['Account Number', accountNumber],
              ['IFSC', ifsc],
              ['Bank', bankName],
              ['Account Type', accountType],
              ['Address', address],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--slate-light)' }}>{label}</div>
                <div style={{ color: 'var(--navy)', fontWeight: 500 }}>{value || '—'}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>Documents</div>
            {KYC_DOC_TYPES.map(t => (
              <div key={t} style={{ fontSize: 13, color: docs[t] ? 'var(--green)' : 'var(--red)', padding: '2px 0' }}>
                {docs[t] ? '✓' : '✗'} {KYC_DOC_LABELS[t]}
              </div>
            ))}
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--slate)', marginBottom: 18, cursor: 'pointer' }}>
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              I confirm the information provided is accurate and I consent to Propitz verifying my
              identity and bank details for KYC compliance as required under applicable regulations.
            </span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setStep(4)}
              disabled={isPending}
              style={{
                padding: '10px 22px', borderRadius: 8, fontSize: 13.5,
                border: '1px solid var(--border-strong)', color: 'var(--navy)',
                background: '#fff', cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isPending || !consent}
              style={{
                padding: '11px 30px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                background: !consent || isPending ? 'var(--surface-2)' : 'var(--gold)',
                color: !consent || isPending ? 'var(--slate-light)' : 'var(--navy)',
                border: 'none', cursor: !consent || isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? 'Submitting…' : 'Submit for Verification →'}
            </button>
          </div>
        </Section>
      )}
    </div>
  )
}
