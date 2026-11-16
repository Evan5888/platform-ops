import { Hint } from './Hint'
import { reportBundle } from '../data/bundled'
import { addDays } from '../lib/dates'
import { metricKind } from '../lib/metrics'
import type { SeriesPoint } from '../lib/reports'
import type { Currency } from '../lib/types'
import type { PlatformSlice } from '../lib/view'

const KPI = [
  { key: '活跃人数' as const, tone: 'peach' },
  { key: '注册人数' as const, tone: 'lilac' },
  { key: '首充人数' as const, tone: 'sky' },
]

const FLOW = [
  { key: '新充人数' as const, money: false },
  { key: '充值人数' as const, money: false },
  { key: '充值金额' as const, money: true },
]

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value)
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function formatPct(value: number): string {
  const abs = Math.abs(value).toFixed(2)
  if (value > 0) return `+${abs}%`
  if (value < 0) return `-${abs}%`
  return '0.00%'
}

function change(today: number | null, yesterday: number | null): number | null {
  if (today == null || yesterday == null || yesterday === 0) return null
  return ((today - yesterday) / yesterday) * 100
}

function sumOf(points: SeriesPoint[], key: keyof SeriesPoint): number | null {
  let total = 0
  let any = false
  for (const point of points) {
    const value = point[key]
    if (typeof value !== 'number') continue
    total += value
    any = true
  }
  return any ? total : null
}

function Spark({ points, field }: { points: SeriesPoint[]; field: '活跃人数' }) {
  const values = points.map((point) => point[field]).filter((value): value is number => typeof value === 'number')
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const coords = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 72
      const y = 22 - ((value - min) / span) * 18
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg className="spark" viewBox="0 0 72 26" aria-hidden="true">
      <polyline points={coords} fill="none" stroke="#e07a5f" strokeWidth="2" />
    </svg>
  )
}

function ProviderBars({ slice }: { slice: PlatformSlice }) {
  const moneyKey = slice.gameMetricKeys.find((key) => metricKind(key) === 'money')
  if (!slice.hasGames || !moneyKey) return <p className="quiet">暂无</p>
  const totals = new Map<string, number>()
  for (const game of slice.games) {
    const value = game.metrics[moneyKey]
    if (typeof value !== 'number' || game.needsRateKeys.includes(moneyKey)) continue
    totals.set(game.provider, (totals.get(game.provider) ?? 0) + value)
  }
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const whole = rows.reduce((sum, [, value]) => sum + value, 0)
  if (rows.length === 0 || whole === 0) return <p className="quiet">暂无</p>
  return (
    <div className="bars" aria-label={moneyKey}>
      {rows.map(([name, value]) => (
        <div key={name} className="bar-col">
          <div className="bar-track">
            <span style={{ height: `${Math.max(8, (value / whole) * 100)}%` }} />
          </div>
          <strong>{((value / whole) * 100).toFixed(2)}%</strong>
          <em>{name}</em>
        </div>
      ))}
    </div>
  )
}

export function HomeBoard({ platformId, currency, from, to, slice }: { platformId: string; currency: Currency; from: string; to: string; slice: PlatformSlice }) {
  const points = reportBundle.points
    .filter((point) => point.platformId === platformId && point.currency === currency)
    .sort((a, b) => a.date.localeCompare(b.date))
  const today = points.find((point) => point.date === to) ?? null
  const yesterday = points.find((point) => point.date === addDays(to, -1)) ?? null
  const weekStart = addDays(to, -6)
  const week = points.filter((point) => point.date >= weekStart && point.date <= to)
  const range = points.filter((point) => point.date >= from && point.date <= to)
  const stake = today?.投注金额

  return (
    <div className="home-board" data-testid="page-home">
      <section className="panel">
        <h2 className="panel-title">数据看板</h2>
        <div className="kpi-row">
          {KPI.map((item) => {
            const value = today?.[item.key] ?? null
            const delta = change(value, yesterday?.[item.key] ?? null)
            return (
              <article key={item.key} className={`kpi kpi-${item.tone}`}>
                <header>
                  <span>{item.key}</span>
                  {item.key === '活跃人数' && <Spark points={range} field="活跃人数" />}
                </header>
                <strong>{value == null ? '—' : formatCount(value)}</strong>
                {delta == null ? (
                  <em className="flat">—</em>
                ) : (
                  <em className={delta < 0 ? 'down' : delta > 0 ? 'up' : 'flat'}>较昨日 {formatPct(delta)}</em>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <div className="home-split">
        <section className="panel">
          <h2 className="panel-title">
            用户
            <Hint text="当日是结束日期。过去七天把这一天往前数到的日报相加，缺的日期不加 0。人数不换算。" />
          </h2>
          <div className="flow-row">
            {FLOW.map((item) => {
              const day = today?.[item.key] ?? null
              const total = sumOf(week, item.key)
              const show = (value: number | null) => (value == null ? '—' : item.money ? formatMoney(value) : formatCount(value))
              return (
                <article key={item.key}>
                  <span>{item.key}</span>
                  <strong>{show(day)}</strong>
                  <small>当日</small>
                  <b>{show(total)}</b>
                  <small>过去七天 · {week.length} 天</small>
                </article>
              )
            })}
          </div>
        </section>

        <section className="panel">
          <h2 className="panel-title">游戏与厂商</h2>
          <div className="stake">
            <span>投注金额</span>
            <strong>{stake == null ? '—' : formatMoney(stake)}</strong>
            <small>{currency}</small>
          </div>
          <ProviderBars slice={slice} />
        </section>
      </div>
    </div>
  )
}
