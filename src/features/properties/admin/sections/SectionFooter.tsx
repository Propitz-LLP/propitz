'use client'

import { usePropertyForm, nextOf, type SeqKey } from './PropertyFormContext'

const btnStyle: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
  background: 'var(--gold)', color: 'var(--navy)', border: 'none', cursor: 'pointer',
}

// Footer for a section body: a uniform "Save & continue" that persists the draft
// and opens the next section — or, on the last section, saves and finishes.
export function SectionFooter({ current }: { current: SeqKey }) {
  const { saving, persist } = usePropertyForm()
  const next = nextOf(current)
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
      <button
        type="button"
        onClick={() => (next ? persist(next, false) : persist(null, true))}
        disabled={saving}
        style={{ ...btnStyle, opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Saving…' : 'Save & continue →'}
      </button>
    </div>
  )
}
