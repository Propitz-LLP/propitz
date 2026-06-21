/** Formats a rupee amount into compact Indian notation (Cr / L). */
export function fmtRupees(n: number): string {
  if (!n || isNaN(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

/** Converts a string to a URL-safe slug. */
export function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function intToWords(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
  if (n < 1_000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + intToWords(n % 100) : '')
  if (n < 1_00_000) return intToWords(Math.floor(n / 1_000)) + ' thousand' + (n % 1_000 ? ' ' + intToWords(n % 1_000) : '')
  if (n < 1_00_00_000) return intToWords(Math.floor(n / 1_00_000)) + ' lakh' + (n % 1_00_000 ? ' ' + intToWords(n % 1_00_000) : '')
  return intToWords(Math.floor(n / 1_00_00_000)) + ' crore' + (n % 1_00_00_000 ? ' ' + intToWords(n % 1_00_00_000) : '')
}

/**
 * Converts a number to English words using Indian numbering (lakh, crore).
 * Handles decimals by spelling out each digit after "point".
 */
export function toWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ''
  if (n === 0) return 'zero'
  const [intPart, decPart] = n.toString().split('.')
  const intWords = intToWords(parseInt(intPart, 10))
  if (!decPart) return intWords
  const decWords = decPart.split('').map(d => ONES[parseInt(d)] || 'zero').join(' ')
  return `${intWords} point ${decWords}`
}
