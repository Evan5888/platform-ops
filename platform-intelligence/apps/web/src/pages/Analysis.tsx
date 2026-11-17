import { Link, useParams } from 'react-router-dom'
import { Trend } from '../components/Trend'
import { formatDelta, formatMetric, formatPct } from '../lib/format'
import { addDays, computedOf, displayValue, driversFor, gapFor, isCount, metricKeys, metricLabel, platformById, rowOn, rowsBetween, type MetricKey } from '../mock/demo'
import { useFilters } from '../state/Filters'

function isMetric(value: string): value is MetricKey {
  return (metricKeys as readonly string[]).includes(value)
}

export function Analysis() {
  const params = useParams()
  const key = params.metric && isMetric(params.metric) ? params.metric : null
  const filters = useFilters()
  const platform = platformById(filters.platformId)
  if (!key) return <p>没有这个指标。</p>
  const today = rowOn(filters.platformId, filters.to)
  const yesterday = rowOn(filters.platformId, addDays(filters.to, -1))
  const range = rowsBetween(filters.platformId, filters.from, filters.to)
  const money = !isCount(key)
  const show = (value: number) => formatMetric(displayValue(value, key, filters.currency, platform.demoRate), money)

  if (!today) return <p className="text-[var(--muted)]">这一段没有演示数据。</p>
  const current = today[key]
  const previous = yesterday?.[key]
  const delta = previous == null ? null : current - previous
  const pct = previous == null || previous === 0 ? null : (current - previous) / previous
  const drivers = yesterday ? driversFor(key, yesterday, today) : []
  const computed = computedOf(today, key)
  const gaps = gapFor(key)

  return (
    <section data-testid="page-analysis">
      <p className="text-sm text-[var(--muted)]">
        <Link to="/" className="text-[var(--accent)]">总览</Link>
        <span> / {platform.name}</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{metricLabel(key)}</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="当期" value={show(current)} />
        <Stat label="对比期" value={previous == null ? '—' : show(previous)} />
        <Stat label="差额" value={delta == null ? '—' : formatDelta(displayValue(delta, key, filters.currency, platform.demoRate), money)} />
        <Stat label="百分比" value={pct == null ? '—' : formatPct(pct)} />
      </div>
      <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <Trend labels={range.map((row) => row.date.slice(5))} series={[{ name: key, data: range.map((row) => displayValue(row[key], key, filters.currency, platform.demoRate)) }]} />
      </div>
      <section className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="text-base font-medium">可量化的驱动</h2>
        {drivers.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">这个指标没有已核对的加法拆分。</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="py-2 font-normal">分项</th>
                <th className="py-2 font-normal">对比期</th>
                <th className="py-2 font-normal">当期</th>
                <th className="py-2 font-normal">差额</th>
                <th className="py-2 font-normal">占父项差额</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.label} className="border-t border-[var(--line)]">
                  <td className="py-2">{driver.label}</td>
                  <td className="py-2 tabular-nums">{formatMetric(driver.previous, driver.basisMoney)}</td>
                  <td className="py-2 tabular-nums">{formatMetric(driver.current, driver.basisMoney)}</td>
                  <td className="py-2 tabular-nums">{formatDelta(driver.delta, money)}</td>
                  <td className="py-2 tabular-nums">{driver.share == null ? '—' : formatPct(driver.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="text-base font-medium">对账</h2>
        <p className="mt-2 text-sm">原列 {show(current)}</p>
        <p className={`mt-1 text-sm ${computed != null && computed !== current ? 'text-[var(--down)]' : ''}`}>
          重算 {computed == null ? '这个指标没有重算式' : show(computed)}
        </p>
      </section>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Layer title="已核对的变化" body={delta == null ? '没有前一日，不算变化。' : `${metricLabel(key)} 差额 ${formatDelta(displayValue(delta, key, filters.currency, platform.demoRate), money)}。这是演示日，不是业务结论。`} />
        <Layer title="可量化的驱动" body={drivers.length === 0 ? '没有已核对的分项。' : drivers.map((driver) => driver.label).join('、')} />
        <Layer title="可能的业务假设" body="系统不自动写业务原因。要记录的话，写到分析记录里，并标成未经证实。" />
        <Layer title="尚待验证" body={gaps.length === 0 ? '以现有演示字段，没有更细的维度。' : `需要${gaps.join('、')}。没有这张表之前，不拆占比。`} />
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function Layer({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
    </section>
  )
}
