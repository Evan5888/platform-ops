import { describePlatform, platforms } from '../data/platforms'
import { reportBundle } from '../data/bundled'
import type { SeriesPoint } from '../lib/reports'
import type { Currency } from '../lib/types'

type Key = '新充人数' | '新充金额' | '首充人数' | '首充金额'

const COUNT_SERIES: Array<{ key: Key; label: string; color: string }> = [
  { key: '新充人数', label: '新充人数', color: '#1493c7' },
  { key: '首充人数', label: '首充人数', color: '#0c4a66' },
]

const MONEY_SERIES: Array<{ key: Key; label: string; color: string }> = [
  { key: '新充金额', label: '新充金额', color: '#1493c7' },
  { key: '首充金额', label: '首充金额', color: '#0c4a66' },
]

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value)
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function Chart({
  title,
  points,
  series,
  money,
  showTable,
}: {
  title: string
  points: SeriesPoint[]
  series: Array<{ key: Key; label: string; color: string }>
  money: boolean
  showTable: boolean
}) {
  const width = 640
  const height = 168
  const pad = { l: 8, r: 8, t: 16, b: 22 }
  const values = points.flatMap((point) => series.map((item) => point[item.key])).filter((value): value is number => typeof value === 'number')
  const max = Math.max(...values, 0)
  const span = points.length > 1 ? points.length - 1 : 1
  const xAt = (index: number) => pad.l + (index * (width - pad.l - pad.r)) / span
  const yAt = (value: number) => pad.t + (1 - (max === 0 ? 0 : value / max)) * (height - pad.t - pad.b)
  const ticks = [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]].filter(
    (point, index, list): point is SeriesPoint => Boolean(point) && list.findIndex((item) => item?.date === point.date) === index,
  )
  return (
    <figure className="series-chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {series.map((item) => {
          const line = points
            .map((point, index) => {
              const value = point[item.key]
              if (typeof value !== 'number') return null
              return `${xAt(index)},${yAt(value)}`
            })
            .filter(Boolean)
            .join(' ')
          return <polyline key={item.key} points={line} fill="none" stroke={item.color} strokeWidth="2" />
        })}
        {ticks.map((point) => {
          const index = points.findIndex((item) => item.date === point.date)
          return (
            <text key={point.date} x={xAt(index)} y={height - 4} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}>
              {point.date.slice(5)}
            </text>
          )
        })}
      </svg>
      <p className="legend">
        {series.map((item) => (
          <span key={item.key}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </p>
      {showTable && <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              {series.map((item) => (
                <th key={item.key} className="num">
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((point) => (
              <tr key={point.date}>
                <td>{point.date}</td>
                {series.map((item) => {
                  const value = point[item.key]
                  return (
                    <td key={item.key} className="num">
                      {typeof value === 'number' ? (money ? formatMoney(value) : formatCount(value)) : <span className="blank">空</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </figure>
  )
}

export function ReportSeries({
  platformId,
  currency,
  from,
  to,
  showTable = true,
}: {
  platformId: string
  currency: Currency
  from: string
  to: string
  showTable?: boolean
}) {
  const ids = platformId === 'all' ? platforms.map((item) => item.id) : [platformId]
  const blocks = ids.flatMap((id) => {
    const points = reportBundle.points
      .filter((point) => point.platformId === id && point.currency === currency && point.date >= from && point.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date))
    if (points.length === 0) return []
    return [{ id, name: describePlatform(id).name, points }]
  })
  if (blocks.length === 0) return <p className="quiet">暂无</p>
  return (
    <div className="series" data-testid="report-series">
      {blocks.map((block) => (
        <div key={block.id} className="series-platform">
          {blocks.length > 1 && <h4>{block.name}</h4>}
          <div className="series-grid">
            <Chart title={`${block.name} 人数`} points={block.points} series={COUNT_SERIES} money={false} showTable={showTable} />
            <Chart title={`${block.name} 金额`} points={block.points} series={MONEY_SERIES} money showTable={showTable} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function oldUserNote(platformId: string): string | null {
  const verdict = reportBundle.oldUsers[platformId]
  if (!verdict || verdict.derived) return null
  return verdict.note
}
