import { formatMetric, metricKind } from '../lib/metrics'

export function MetricValue({ metricKey, value, currency }: { metricKey: string; value: number; currency: string }) {
  const negative = value < 0
  if (metricKind(metricKey) === 'money') {
    const amount = new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
    return (
      <span className={negative ? 'neg' : undefined}>
        {amount}
        <span className="unit">{currency}</span>
      </span>
    )
  }
  return <span className={negative ? 'neg' : undefined}>{formatMetric(metricKey, value, currency)}</span>
}

export function Figures({
  metrics,
  keys,
  currency,
}: {
  metrics: Record<string, number>
  keys: string[]
  currency: string
}) {
  return (
    <dl className="figures">
      {keys.map((key) => {
        const value = metrics[key]
        const missing = typeof value !== 'number' || !Number.isFinite(value)
        return (
          <div key={key}>
            <dt>{key}</dt>
            <dd>
              {missing ? (
                <span className="blank" title="文件里这一格是空的">
                  空
                </span>
              ) : (
                <MetricValue metricKey={key} value={value} currency={currency} />
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export function InlineFigures({
  metrics,
  keys,
  currency,
}: {
  metrics: Record<string, number>
  keys: string[]
  currency: string
}) {
  return (
    <p className="inline-figures">
      {keys.map((key) => (
        <span key={key}>
          <span className="k">{key}</span>
          <MetricValue metricKey={key} value={metrics[key]} currency={currency} />
        </span>
      ))}
    </p>
  )
}
