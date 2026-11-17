export function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value)
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export function formatMetric(value: number, money: boolean): string {
  return money ? formatMoney(value) : formatCount(value)
}

export function formatPct(value: number): string {
  const text = `${Math.abs(value * 100).toFixed(2)}%`
  if (value > 0) return `+${text}`
  if (value < 0) return `-${text}`
  return '0.00%'
}

export function formatDelta(value: number, money: boolean): string {
  const text = formatMetric(Math.abs(value), money)
  if (value > 0) return `+${text}`
  if (value < 0) return `-${text}`
  return text
}
