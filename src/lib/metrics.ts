export const METRIC_ORDER = [
  '人数',
  '充值人数',
  '充值笔数',
  '充值金额',
  '提现人数',
  '提现笔数',
  '提现金额',
  '投注人数',
  '注单数',
  '投注金额',
  '有效投注',
  '派彩金额',
  '输赢',
  '优惠金额',
]

const COUNT_KEYS = new Set([
  '人数',
  '充值人数',
  '充值笔数',
  '提现人数',
  '提现笔数',
  '投注人数',
  '注单数',
])

export function metricKind(key: string): 'count' | 'money' | 'number' {
  if (COUNT_KEYS.has(key) || /人数|笔数|注单|次数/.test(key)) return 'count'
  if (/额|金|输赢|投注|派彩|彩金/.test(key) || /ggr|bet|payout|bonus|withdraw|deposit/i.test(key)) return 'money'
  return 'number'
}

export function formatMetric(key: string, value: number, currency: string): string {
  if (!Number.isFinite(value)) return '空'
  if (metricKind(key) === 'count') {
    return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(Math.round(value))
  }
  if (metricKind(key) === 'money') {
    const amount = new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
    return `${amount} ${currency}`
  }
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(value)
}

export function orderMetricKeys(keys: Iterable<string>): string[] {
  const present = new Set(keys)
  const known = METRIC_ORDER.filter((key) => present.has(key))
  const extra = [...present].filter((key) => !known.includes(key)).sort((a, b) => a.localeCompare(b, 'zh'))
  return [...known, ...extra]
}

export function collectMetricKeys(maps: Array<Record<string, number> | null | undefined>): string[] {
  const keys: string[] = []
  for (const map of maps) {
    if (!map) continue
    keys.push(...Object.keys(map))
  }
  return orderMetricKeys(keys)
}

export function summaryMetricKeys(keys: string[], limit = 3): { shown: string[]; hidden: number } {
  const priority = ['人数', '充值金额', '提现金额', '投注金额', '输赢', '派彩金额', '注单数', '有效投注']
  const ordered = [...priority.filter((key) => keys.includes(key)), ...keys.filter((key) => !priority.includes(key))]
  return { shown: ordered.slice(0, limit), hidden: Math.max(0, ordered.length - limit) }
}

export function sumMetrics(rows: Array<Record<string, number>>): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      totals[key] = (totals[key] ?? 0) + value
    }
  }
  return totals
}
