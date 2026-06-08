// Dev seed — ported from prototype's hardcoded data
// Run: npx tsx supabase/seed.ts

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function seed() {
  console.log('Seeding database...')

  // ── Properties ───────────────────────────────────────────────
  const { data: props, error: propsError } = await supabase.from('properties').insert([
    {
      name: 'Prestige Koramangala',
      slug: 'prestige-koramangala',
      city: 'Koramangala, Bengaluru',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pinCode: '560034',
      assetType: 'Commercial',
      description: 'Grade-A commercial complex in the heart of Koramangala\'s tech corridor. Fully leased to Fortune 500 tenants with WALE of 6.3 years.',
      totalValuation: 128000000,
      totalUnits: 1000,
      subscribedUnits: 880,
      unitPrice: 2287,
      rentalYieldPct: 9.2,
      capitalGrowthPct: 7.0,
      holdingPeriod: '5–7 years',
      lockInPeriod: '3 years',
      minInvestmentUnits: 10,
      status: 'Open',
      coverEmoji: '🏢',
      coverGradient: 'linear-gradient(135deg,#1B3057,#2A4A7A)',
    },
    {
      name: 'Lodha Primero BKC',
      slug: 'lodha-primero-bkc',
      city: 'Bandra Kurla Complex, Mumbai',
      district: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400051',
      assetType: 'Residential',
      description: 'Premium residential development in BKC with strong rental demand from financial sector professionals.',
      totalValuation: 245000000,
      totalUnits: 3000,
      subscribedUnits: 900,
      unitPrice: 3950,
      rentalYieldPct: 7.8,
      capitalGrowthPct: 6.5,
      holdingPeriod: '5–7 years',
      lockInPeriod: '3 years',
      minInvestmentUnits: 5,
      status: 'Open',
      coverEmoji: '🏙️',
      coverGradient: 'linear-gradient(135deg,#2D4A2A,#3A6B36)',
    },
    {
      name: 'DLF CyberHub Phase 3',
      slug: 'dlf-cyberhub-phase-3',
      city: 'Sector 24, Gurugram',
      district: 'Gurugram',
      state: 'Haryana',
      pinCode: '122002',
      assetType: 'Commercial',
      description: 'High-yield commercial space in CyberHub, one of NCR\'s most sought-after office destinations.',
      totalValuation: 188000000,
      totalUnits: 2000,
      subscribedUnits: 1580,
      unitPrice: 4700,
      rentalYieldPct: 10.1,
      capitalGrowthPct: 8.5,
      holdingPeriod: '5–7 years',
      lockInPeriod: '3 years',
      minInvestmentUnits: 20,
      status: 'Open',
      coverEmoji: '🏗️',
      coverGradient: 'linear-gradient(135deg,#4A2A1A,#7A3A1B)',
    },
  ]).select()

  if (propsError) { console.error('Failed to seed properties:', propsError); return }
  if (!props) { console.error('Failed to seed properties: no data returned'); return }
  console.log(`✓ ${props.length} properties`)

  // ── Valuation history for first property ─────────────────────
  await supabase.from('valuation_history').insert([
    { propertyId: props[0].id, unitPrice: 2000, quarter: "Q4 '24" },
    { propertyId: props[0].id, unitPrice: 2050, quarter: "Q1 '25" },
    { propertyId: props[0].id, unitPrice: 2120, quarter: "Q2 '25" },
    { propertyId: props[0].id, unitPrice: 2180, quarter: "Q3 '25" },
    { propertyId: props[0].id, unitPrice: 2240, quarter: "Q4 '25" },
    { propertyId: props[0].id, unitPrice: 2287, quarter: "Q1 '26" },
  ])
  console.log('✓ Valuation history')

  console.log('\nSeed complete.')
  console.log('Note: Create investor users via Supabase Auth dashboard, then update their records in the investors table.')
}

seed().catch(console.error)
