export function formatExp(exp) {
  if (!exp) return ''
  const [y, m] = exp.split('-')
  return `${m}/${y}`
}

export function fmtEur(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  return `${n.toFixed(2)} €`
}

export function parseEur(s) {
  const n = Number(String(s ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export function parseIntSafe(s) {
  const n = Number(String(s ?? '').replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? Math.floor(n) : NaN
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.floor((d - today) / (1000 * 60 * 60 * 24))
}

export function expStatus(exp) {
  const d = daysUntil(exp)
  if (d === null) return { dot: 'bg-gray-400', label: '—' }
  if (d < 0) return { dot: 'bg-red-500', label: 'EXPIROVANÉ' }
  if (d <= 60) return { dot: 'bg-orange-500', label: 'Do 2 mesiacov' }
  return { dot: 'bg-green-500', label: 'OK' }
}