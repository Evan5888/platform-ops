import type { MovementLine } from '../lib/movement'
import { USER_SEGMENTS, type UserSegment } from '../lib/types'

const SHORT: Record<UserSegment, string> = {
  新充用户: '新充',
  首充用户: '首充',
  老用户: '老用户',
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `+${formatCount(delta)}`
  if (delta < 0) return formatCount(delta)
  return '持平'
}

export function Movement({ lines }: { lines: MovementLine[] }) {
  return (
    <section className="movement" data-testid="user-movement" aria-label="日环比由什么带动">
      <header>
        <h3>日环比由什么带动</h3>
        <p>只比较相邻两个墨西哥自然日里已经导入的人数。缺的一天不会当成零，也不会编一个原因。</p>
      </header>
      <div className="movement-list">
        {lines.map((line) => (
          <article key={`${line.platformId}-${line.status}`} data-testid={`movement-${line.platformId}`} data-status={line.status}>
            {lines.length > 1 && <h4>{line.platformName}</h4>}
            <p className="movement-text">{line.text}</p>
            {line.parts && line.parts.length > 0 && (
              <ol>
                {USER_SEGMENTS.filter((segment) => line.parts?.some((part) => part.segment === segment)).map((segment) => {
                  const part = line.parts?.find((item) => item.segment === segment)
                  if (!part) return null
                  return (
                    <li key={segment}>
                      <span>{SHORT[segment]}</span>
                      <strong className={part.delta < 0 ? 'neg' : undefined}>{deltaLabel(part.delta)}</strong>
                    </li>
                  )
                })}
              </ol>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
