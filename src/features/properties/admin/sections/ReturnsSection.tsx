'use client'

import { Field, rowStyle } from '@/components/ui/FormFields'
import { usePropertyForm } from './PropertyFormContext'
import { SectionFooter } from './SectionFooter'

export function ReturnsSection() {
  const f = usePropertyForm()
  return (
    <>
      <div style={rowStyle}>
        <Field label="Rental Yield (% p.a.)" hint="Annual income from rentals as % of investment">
          <input className="form-input" type="number" step="0.1" value={f.yieldPct} onChange={e => f.setYieldPct(e.target.value)} placeholder="e.g. 9.5" />
        </Field>
        <Field label="Capital Growth (% p.a.)" hint="Expected annual property value appreciation">
          <input className="form-input" type="number" step="0.1" value={f.growthPct} onChange={e => f.setGrowthPct(e.target.value)} placeholder="e.g. 8.0" />
        </Field>
      </div>
      <div style={rowStyle}>
        <Field label="Holding Period" required hint="Expected investment duration before exit">
          <input className="form-input" value={f.holdingPeriod} onChange={e => f.setHoldingPeriod(e.target.value)} placeholder="e.g. 5–7 years" />
        </Field>
        <Field label="Lock-in Period" required hint="Minimum hold before resale is permitted">
          <input className="form-input" value={f.lockInPeriod} onChange={e => f.setLockInPeriod(e.target.value)} placeholder="e.g. 3 years" />
        </Field>
      </div>

      <SectionFooter current="returns" />
    </>
  )
}
