import { Link } from 'react-router-dom'
import { formatDelta, formatPct } from '../lib/format'
import { addDays, displayValue, isCount, metricKeys, platformById, rowOn } from '../mock/demo'
import { useFilters } from '../state/Filters'

export function Movement() {
  const filters = useFilters()
  const platform = platformById(filters.platformId)
  const today = rowOn(filters.platformId, filters.to)
  const yesterday = rowOn(filters.platformId, addDays(filters.to, -1))
  return (
    <section data-testid="page-movement">
      <h1 className="text-2xl font-semibold">{platform.name} · 波动</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">对比结束日和前一个演示日。点一行进入该指标。</p>
      {!today || !yesterday ? (
        <p className="mt-4 text-[var(--muted)]">没有相邻的两个演示日，不计算波动。</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="px-4 py-3 font-normal">指标</th>
                <th className="px-4 py-3 font-normal">前一日</th>
                <th className="px-4 py-3 font-normal">结束日</th>
                <th className="px-4 py-3 font-normal">差额</th>
                <th className="px-4 py-3 font-normal">百分比</th>
              </tr>
            </thead>
            <tbody>
              {metricKeys.map((key) => {
                const money = !isCount(key)
                const show = (value: number) => formatDelta(displayValue(value, key, filters.currency, platform.demoRate), money).replace(/^\+/, '')
                const delta = today[key] - yesterday[key]
                const pct = yesterday[key] === 0 ? null : delta / yesterday[key]
                return (
                  <tr key={key} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3">
                      <Link to={`/analysis/${encodeURIComponent(key)}`} className="text-[var(--accent)]">{key}</Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{show(yesterday[key])}</td>
                    <td className="px-4 py-3 tabular-nums">{show(today[key])}</td>
                    <td className={`px-4 py-3 tabular-nums ${delta < 0 ? 'text-[var(--down)]' : 'text-[var(--up)]'}`}>{formatDelta(displayValue(delta, key, filters.currency, platform.demoRate), money)}</td>
                    <td className="px-4 py-3 tabular-nums">{pct == null ? '—' : formatPct(pct)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
