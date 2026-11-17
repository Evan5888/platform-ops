import { Link } from 'react-router-dom'
import { Hint } from '../components/Hint'
import { Trend } from '../components/Trend'
import { formatMetric, formatPct } from '../lib/format'
import { addDays, displayValue, isCount, metricLabel, platformById, rowOn, rowsBetween, type MetricKey } from '../mock/demo'
import { useFilters } from '../state/Filters'

const top: MetricKey[] = ['活跃人数', '注册人数', '首充人数']
const userKeys: MetricKey[] = ['新充人数', '充值人数', '充值金额']
const gameKeys: MetricKey[] = ['投注金额', '返奖金额', '公司输赢']

export function Overview() {
  const filters = useFilters()
  const platform = platformById(filters.platformId)
  const today = rowOn(filters.platformId, filters.to)
  const yesterday = rowOn(filters.platformId, addDays(filters.to, -1))
  const range = rowsBetween(filters.platformId, filters.from, filters.to)
  const weekStart = addDays(filters.to, -6)
  const week = rowsBetween(filters.platformId, weekStart, filters.to)

  function shown(key: MetricKey, value: number): string {
    return formatMetric(displayValue(value, key, filters.currency, platform.demoRate), !isCount(key))
  }

  return (
    <section data-testid="page-overview">
      <h1 className="mb-4 text-2xl font-semibold">{platform.name} · 数据看板</h1>
      {!today ? (
        <p className="text-[var(--muted)]">这一段没有演示数据。</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {top.map((key) => {
              const current = today[key]
              const previous = yesterday?.[key]
              const pct = previous == null || previous === 0 ? null : (current - previous) / previous
              return (
                <Link key={key} to={`/analysis/${encodeURIComponent(key)}`} data-testid={`kpi-${key}`} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 no-underline">
                  <p className="text-sm text-[var(--muted)]">{metricLabel(key)}</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">{shown(key, current)}</p>
                  <p className={`mt-2 text-sm ${pct == null ? 'text-[var(--muted)]' : pct < 0 ? 'text-[var(--down)]' : 'text-[var(--up)]'}`}>{pct == null ? '较前一日 —' : `较前一日 ${formatPct(pct)}`}</p>
                </Link>
              )
            })}
          </div>
          <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <h2 className="mb-2 text-base font-medium">活跃人数（DAU）</h2>
            <Trend labels={range.map((row) => row.date.slice(5))} series={[{ name: '活跃人数（DAU）', data: range.map((row) => row.活跃人数) }]} />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <h2 className="text-base font-medium">
                用户
                <Hint text="过去七天是结束日往前最多七个已有日期的相加，不是去重人数。缺的日期不加 0。" />
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {userKeys.map((key) => {
                  const total = week.reduce((sum, row) => sum + row[key], 0)
                  return (
                    <Link key={key} to={`/analysis/${encodeURIComponent(key)}`} className="rounded-xl px-2 py-2 no-underline hover:bg-[var(--accent-soft)]">
                      <p className="text-xs text-[var(--muted)]">{metricLabel(key)}</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">{shown(key, today[key])}</p>
                      <p className="text-xs text-[var(--muted)]">结束日</p>
                      <p className="mt-2 tabular-nums">{shown(key, total)}</p>
                      <p className="text-xs text-[var(--muted)]">过去七天 · {week.length} 天</p>
                    </Link>
                  )
                })}
              </div>
            </section>
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <h2 className="text-base font-medium">游戏</h2>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {gameKeys.map((key) => (
                  <Link key={key} to={`/analysis/${encodeURIComponent(key)}`} className="rounded-xl px-2 py-2 no-underline hover:bg-[var(--accent-soft)]">
                    <p className="text-xs text-[var(--muted)]">{metricLabel(key)}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{shown(key, today[key])}</p>
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-sm text-[var(--muted)]">没有游戏明细报表</p>
            </section>
          </div>
        </>
      )}
    </section>
  )
}
