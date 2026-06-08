// Streaming CSV export — API route because it returns a non-JSON response
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getTransactions } from '@/lib/db/transactions'
import { getInvestorById } from '@/lib/db/investors'
import { getPropertyById } from '@/lib/db/properties'

export async function GET(request: NextRequest) {
  await requireAdmin()

  const transactions = await getTransactions()

  const rows = [['Ref', 'Date', 'Investor', 'Type', 'Property', 'Gross', 'Fee', 'Net', 'Status']]

  for (const t of transactions) {
    const [investor, property] = await Promise.all([
      getInvestorById(t.investorId),
      t.propertyId ? getPropertyById(t.propertyId) : null,
    ])
    rows.push([
      t.id, t.date,
      investor?.name ?? '—', t.type,
      property?.name ?? '—',
      String(t.gross), String(t.fee), String(t.net),
      t.status,
    ])
  }

  const csv = rows.map(r => r.join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="propitz_transactions_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
