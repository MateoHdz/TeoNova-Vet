/** COP sin decimales (totales, bultos completos) */
export function fmtMoney(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n || 0)
}

/** Precio por unidad de venta (g, ml, etc.) — conserva decimales */
export function fmtUnitPrice(n: number, saleUnit?: string): string {
  const u = (saleUnit || '').toLowerCase()
  const small = u === 'g' || u === 'ml'
  let decimals = 0
  if (small) {
    const abs = Math.abs(n || 0)
    if (abs > 0 && abs < 1) decimals = 4
    else if (abs < 10) decimals = 2
    else if (abs < 100) decimals = 1
  } else if (u === 'kg' || u === 'l' || u === 'lb') {
    decimals = (n || 0) % 1 !== 0 ? 2 : 0
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n || 0)
}

/** Acepta "9,6" o "9.6" */
export function parseDecimalInput(v: string): number {
  if (!v || !String(v).trim()) return 0
  const s = String(v).trim().replace(/\s/g, '')
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let normalized = s
  if (lastComma > lastDot) {
    normalized = s.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    normalized = s.replace(/,/g, '')
  } else {
    normalized = s.replace(',', '.')
  }
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

export function roundPrice(n: number, decimals = 4): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}
