'use client'

import { Field } from '@/components/ui/FormFields'
import { usePropertyForm } from './PropertyFormContext'
import { FieldError } from './shared'
import { SectionFooter } from './SectionFooter'

export function DescriptionSection() {
  const f = usePropertyForm()
  return (
    <>
      <Field label="Property Description" required>
        <textarea
          className="form-input"
          value={f.description}
          onChange={e => f.setDescription(e.target.value)}
          rows={5}
          placeholder="Describe the property, tenant profile, WALE, location highlights…"
          style={{ resize: 'vertical' }}
        />
        <FieldError msg={f.err('description')} />
      </Field>

      <SectionFooter current="description" />
    </>
  )
}
