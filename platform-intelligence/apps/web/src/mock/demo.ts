export const DEMO_START = '2026-03-01'
export const DEMO_END = '2026-03-14'

export const platforms = [
  { id: 'afun-mx', name: 'Afun-MX', market: '墨西哥', demoRate: 20 },
  { id: 'betroia', name: 'Betroia', market: '墨西哥', demoRate: 10 },
] as const

export type PlatformId = (typeof platforms)[number]['id']
export type Currency = 'MXN' | 'USD'

export const metricKeys = [
  '活跃人数',
  '注册人数',
  '充值人数',
  '首充人数',
  '新充人数',
  '老用户充值人数',
  '充值金额',
  '首充金额',
  '新充金额',
  '提现金额',
  'KOL工资',
  '充提差',
  '投注金额',
  '返奖金额',
  '公司输赢',
] as const

export type MetricKey = (typeof metricKeys)[number]

export type DayRow = { date: string } & Record<MetricKey, number>

const countKeys = new Set<MetricKey>(['活跃人数', '注册人数', '充值人数', '首充人数', '新充人数', '老用户充值人数'])

export function isCount(key: MetricKey): boolean {
  return countKeys.has(key)
}

export function metricLabel(key: MetricKey): string {
  if (key === '活跃人数') return '活跃人数（DAU）'
  if (key === '公司输赢') return '公司输赢（GGR）'
  return key
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
}

function build(platformId: PlatformId): DayRow[] {
  const afun = platformId === 'afun-mx'
  const rows: DayRow[] = []
  for (let i = 0; i < 14; i += 1) {
    const 首充人数 = (afun ? 40 : 20) + (i % 4)
    const 老用户充值人数 = (afun ? 200 : 80) + i * 2
    const 充值人数 = 首充人数 + 老用户充值人数
    const 新充人数 = 首充人数 - (afun ? 8 : 4)
    const 活跃人数 = (afun ? 1000 : 400) + i * 20
    const 注册人数 = (afun ? 80 : 30) + (i % 3) * 5
    const arppu = afun ? 100 : 50
    const 充值金额 = 充值人数 * arppu
    const 首充金额 = 首充人数 * (afun ? 80 : 40)
    const 新充金额 = 新充人数 * (afun ? 60 : 30)
    const 提现金额 = 充值金额 * (afun ? 0.6 : 0.5)
    const KOL工资 = afun && i === 3 ? 500 : 0
    const 充提差 = 充值金额 - 提现金额 + KOL工资
    const 投注金额 = 充值金额 * (afun ? 4 : 3)
    const 返奖金额 = 投注金额 * 0.8
    const 公司输赢 = 投注金额 - 返奖金额
    rows.push({
      date: addDays(DEMO_START, i),
      活跃人数,
      注册人数,
      充值人数,
      首充人数,
      新充人数,
      老用户充值人数,
      充值金额,
      首充金额,
      新充金额,
      提现金额,
      KOL工资,
      充提差,
      投注金额,
      返奖金额,
      公司输赢,
    })
  }
  return rows
}

export const series: Record<PlatformId, DayRow[]> = {
  'afun-mx': build('afun-mx'),
  betroia: build('betroia'),
}

export function platformById(id: PlatformId) {
  return platforms.find((item) => item.id === id) ?? platforms[0]
}

export function rowOn(id: PlatformId, date: string): DayRow | null {
  return series[id].find((row) => row.date === date) ?? null
}

export function rowsBetween(id: PlatformId, from: string, to: string): DayRow[] {
  return series[id].filter((row) => row.date >= from && row.date <= to)
}

export function displayValue(value: number, key: MetricKey, currency: Currency, rate: number): number {
  if (isCount(key) || currency === 'MXN') return value
  return value / rate
}

export type Driver = {
  label: string
  previous: number
  current: number
  delta: number
  share: number | null
  basisMoney: boolean
}

export function driversFor(key: MetricKey, previous: DayRow, current: DayRow): Driver[] {
  const parentDelta = current[key] - previous[key]
  const share = (delta: number) => (parentDelta === 0 ? null : delta / parentDelta)
  if (key === '充值人数') {
    return (['首充人数', '老用户充值人数'] as const).map((label) => {
      const delta = current[label] - previous[label]
      return { label, previous: previous[label], current: current[label], delta, share: share(delta), basisMoney: false }
    })
  }
  if (key === '公司输赢') {
    const bet = current.投注金额 - previous.投注金额
    const payout = previous.返奖金额 - current.返奖金额
    return [
      { label: '投注金额变化', previous: previous.投注金额, current: current.投注金额, delta: bet, share: share(bet), basisMoney: true },
      { label: '返奖金额变化（减去）', previous: previous.返奖金额, current: current.返奖金额, delta: payout, share: share(payout), basisMoney: true },
    ]
  }
  if (key === '充提差') {
    const deposit = current.充值金额 - previous.充值金额
    const withdraw = previous.提现金额 - current.提现金额
    const kol = current.KOL工资 - previous.KOL工资
    return [
      { label: '充值金额变化', previous: previous.充值金额, current: current.充值金额, delta: deposit, share: share(deposit), basisMoney: true },
      { label: '提现金额变化（减去）', previous: previous.提现金额, current: current.提现金额, delta: withdraw, share: share(withdraw), basisMoney: true },
      { label: 'KOL工资变化', previous: previous.KOL工资, current: current.KOL工资, delta: kol, share: share(kol), basisMoney: true },
    ]
  }
  if (key === '充值金额') {
    const prevArppu = previous.充值金额 / previous.充值人数
    const currArppu = current.充值金额 / current.充值人数
    const people = (current.充值人数 - previous.充值人数) * prevArppu
    const ticket = current.充值人数 * (currArppu - prevArppu)
    return [
      { label: '充值人数变化 × 对比期人均', previous: previous.充值人数, current: current.充值人数, delta: people, share: share(people), basisMoney: false },
      { label: '人均充值变化 × 当期人数', previous: prevArppu, current: currArppu, delta: ticket, share: share(ticket), basisMoney: true },
    ]
  }
  return []
}

export function computedOf(row: DayRow, key: MetricKey): number | null {
  if (key === '充值人数') return row.首充人数 + row.老用户充值人数
  if (key === '充提差') return row.充值金额 - row.提现金额 + row.KOL工资
  if (key === '公司输赢') return row.投注金额 - row.返奖金额
  return null
}

export function gapFor(key: MetricKey): string[] {
  if (key === '充值金额' || key === '充值人数' || key === '充提差') return ['支付通道日报']
  if (key === '投注金额' || key === '返奖金额' || key === '公司输赢') return ['游戏与厂商明细']
  if (key === '注册人数' || key === '新充人数' || key === '首充人数') return ['渠道或代理日报']
  return []
}

export function assertDemo(): void {
  for (const id of ['afun-mx', 'betroia'] as const) {
    if (series[id].length !== 14) throw new Error(`${id} days`)
    for (const row of series[id]) {
      if (row.充值人数 !== row.首充人数 + row.老用户充值人数) throw new Error(`${id} ${row.date} depositors`)
      if (row.新充人数 >= row.首充人数) throw new Error(`${id} ${row.date} fresh`)
      if (row.充提差 !== row.充值金额 - row.提现金额 + row.KOL工资) throw new Error(`${id} ${row.date} gap`)
      if (row.公司输赢 !== row.投注金额 - row.返奖金额) throw new Error(`${id} ${row.date} win`)
      if (row.充值金额 / row.充值人数 !== (id === 'afun-mx' ? 100 : 50)) throw new Error(`${id} arppu`)
    }
    const prev = series[id][0]
    const curr = series[id][1]
    if (!prev || !curr) throw new Error('pair')
    const parts = driversFor('充值人数', prev, curr)
    const sum = parts.reduce((total, part) => total + part.delta, 0)
    if (sum !== curr.充值人数 - prev.充值人数) throw new Error(`${id} driver`)
  }
}
