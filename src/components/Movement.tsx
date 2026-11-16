import { Hint } from './Hint'
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
  const visible = lines.filter((line) => line.parts && line.parts.length > 0)
  if (visible.length === 0) return null
  return (
    <section className="movement" data-testid="user-movement" aria-label="较前一日">
      <header>
        <h3>
          较前一日
          <Hint text="和前一个墨西哥自然日比较。没有人数的分类不计入，也不当成 0。" />
        </h3>
      </header>
      <div className="movement-list">
        {visible.map((line) => (
          <article key={line.platformId} data-testid={`movement-${line.platformId}`} data-status={line.status}>
            {visible.length > 1 && <h4>{line.platformName}</h4>}
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
          </article>
        ))}
      </div>
    </section>
  )
}
