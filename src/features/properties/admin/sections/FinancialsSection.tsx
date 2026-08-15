'use client'

import { Field, rowStyle } from '@/components/ui/FormFields'
import { usePropertyForm } from './PropertyFormContext'
import { FieldError } from './shared'
import { SectionFooter } from './SectionFooter'

export function FinancialsSection() {
  const f = usePropertyForm()
  return (
    <>
      <div style={rowStyle}>
        <Field label="Total Valuation (₹)" required hint="Full amount in rupees (e.g. 12Cr = 120000000)">
          <input
            className="form-input" type="number" value={f.totalVal}
            onChange={e => f.handleValuationChange(e.target.value)}
            placeholder="e.g. 120000000"
          />
          {f.valuationWords && <div style={{ fontSize: 11, color: 'var(--slate-light)', paddingLeft: 2, fontStyle: 'italic', marginTop: 4 }}>{f.valuationWords}</div>}
          <FieldError msg={f.err('totalValuation')} />
        </Field>
        <Field label="Total Units" required>
          <input
            className="form-input" type="number" value={f.totalUnits}
            onChange={e => f.handleTotalUnitsChange(e.target.value)}
            placeholder="e.g. 1000" min="1"
          />
        </Field>
      </div>

      <div style={rowStyle}>
        <Field label="Unit Price (₹)" required hint="Auto-calculated from valuation ÷ units">
          <input
            className="form-input" type="number" value={f.unitPrice}
            onChange={e => f.setUnitPrice(e.target.value)}
            placeholder="Auto-calculated"
          />
          {f.unitPriceWords && <div style={{ fontSize: 11, color: 'var(--slate-light)', paddingLeft: 2, fontStyle: 'italic', marginTop: 4 }}>{f.unitPriceWords}</div>}
        </Field>
        <Field
          label="Min. Investment Units" required
          hint={f.previewUnitPrice > 0 && f.previewMinUnits > 0
            ? `Min. investment: ₹${(f.previewUnitPrice * f.previewMinUnits).toLocaleString('en-IN')}`
            : 'Number of units an investor must buy minimum'}
        >
          <input
            className="form-input" type="number" value={f.minUnits}
            onChange={e => f.setMinUnits(e.target.value)}
            placeholder="e.g. 10" min="1"
          />
        </Field>
      </div>

      <SectionFooter current="financials" />
    </>
  )
}
