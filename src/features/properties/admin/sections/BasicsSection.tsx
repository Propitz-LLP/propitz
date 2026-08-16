'use client'

import { Field, rowStyle } from '@/components/ui/FormFields'
import { AREA_UNITS } from '../../schemas'
import { usePropertyForm } from './PropertyFormContext'
import { FieldError, selectStyle } from './shared'
import { SectionFooter } from './SectionFooter'

export function BasicsSection() {
  const f = usePropertyForm()
  return (
    <>
      <Field label="Property Name" required>
        <input className="form-input" value={f.name} onChange={e => f.handleNameChange(e.target.value)} placeholder="e.g. Brigade Metropolis Phase 2" />
        <FieldError msg={f.err('name')} />
      </Field>

      <Field label="URL Slug" required hint="Auto-generated from name. Lowercase letters, numbers and hyphens only.">
        <input
          className="form-input"
          value={f.slug}
          onChange={e => { f.setSlug(e.target.value); f.setSlugEdited(true) }}
          placeholder="e.g. brigade-metropolis-phase-2"
        />
        <FieldError msg={f.err('slug')} />
      </Field>

      <Field label="Town / City / Village" required>
        <input className="form-input" value={f.city} onChange={e => f.setCity(e.target.value)} placeholder="e.g. Koramangala, Bengaluru" />
      </Field>

      <div style={rowStyle}>
        <Field label="District" required>
          <input className="form-input" value={f.district} onChange={e => f.setDistrict(e.target.value)} placeholder="e.g. Bengaluru Urban" />
        </Field>
        <Field label="State" required>
          <input className="form-input" value={f.state} onChange={e => f.setState(e.target.value)} placeholder="e.g. Karnataka" />
        </Field>
      </div>

      <div style={rowStyle}>
        <Field label="Pin Code">
          <input className="form-input" value={f.pinCode} onChange={e => f.setPinCode(e.target.value)} placeholder="560001" maxLength={6} />
        </Field>
        <Field label="Asset Type" required>
          <select value={f.assetType} onChange={e => f.setAssetType(e.target.value)} style={selectStyle}>
            <option value="">Select type…</option>
            <option value="Commercial">Commercial</option>
            <option value="Residential">Residential</option>
            <option value="Land">Land</option>
          </select>
          <FieldError msg={f.err('assetType')} />
        </Field>
      </div>

      <Field label="Total Area">
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              className="form-input"
              type="number"
              value={f.totalArea}
              onChange={e => f.setTotalArea(e.target.value)}
              placeholder="e.g. 2400"
              min="0"
              step="any"
            />
            {f.areaWords && (
              <div style={{ fontSize: 11, color: 'var(--slate-light)', paddingLeft: 2, fontStyle: 'italic' }}>
                {f.areaWords}
              </div>
            )}
          </div>
          <select
            value={f.areaUnit}
            onChange={e => f.setAreaUnit(e.target.value as typeof f.areaUnit)}
            style={{ ...selectStyle, width: 'auto', minWidth: 110 }}
          >
            {AREA_UNITS.map(u => (
              <option key={u} value={u}>
                {u === 'sqft' ? 'sq ft' : u === 'sqm' ? 'sq m' : u === 'sqyd' ? 'sq yd' : u.charAt(0).toUpperCase() + u.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <Field label="Display Emoji" hint="Single emoji shown on property cards.">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{
            fontSize: 28, width: 48, height: 48, background: 'var(--surface-2)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--border)', flexShrink: 0,
          }}>
            {f.emoji || '🏢'}
          </span>
          <input className="form-input" value={f.emoji} onChange={e => f.setEmoji(e.target.value)} maxLength={4} style={{ flex: 1 }} />
        </div>
      </Field>

      <Field label="Property Image" hint="Optional. JPEG, PNG or WebP up to 4 MB. Shown on property cards instead of the emoji.">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {f.imagePreview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.imagePreview}
                alt="Property preview"
                style={{
                  width: 96, height: 64, objectFit: 'cover', borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              />
              {!f.imageFile && f.property?.imageUrl && (
                <a
                  href={f.property.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--navy-mid)', textAlign: 'center' }}
                >
                  View full size ↗
                </a>
              )}
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={e => f.handleImageChange(e.target.files?.[0] ?? null)}
              style={{ fontSize: 13 }}
            />
            {f.imageFile && (
              <button
                type="button"
                onClick={() => f.handleImageChange(null)}
                style={{
                  alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0,
                  fontSize: 12, color: 'var(--red)', cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Remove selected image
              </button>
            )}
          </div>
        </div>
        <FieldError msg={f.err('image')} />
      </Field>

      <SectionFooter current="basics" />
    </>
  )
}
