import { useCallback, useEffect, useMemo, useState } from 'react'
import { Figures, MetricValue, RateGap } from './components/Figures'
import { Hint } from './components/Hint'
import { ImportDialog } from './components/ImportDialog'
import { Movement } from './components/Movement'
import { oldUserNote, ReportSeries } from './components/SeriesChart'
import { reportBundle } from './data/bundled'
import { marketSummary, platforms } from './data/platforms'
import { currencyLabel, formatRate } from './lib/currency'
import { latestReadyDataDate } from './lib/dates'
import { fetchInbox } from './lib/inbox'
import { userMovement } from './lib/movement'
import { openingDate, withBundled } from './lib/reports'
import { applyImport, applyRates, clearScope, loadStore, saveStore, scopeHasData } from './lib/storage'
import type { Currency, InboxSnapshot, ParsedBundle, ParsedRateRow, StoreData } from './lib/types'
import { slicesFor, visibleSlices, type PlatformSlice } from './lib/view'

const latestReady = latestReadyDataDate()
const rangeStart = reportBundle.start ?? latestReady

const PAGES = [
  { id: 'home', label: '首页' },
  { id: 'users', label: '用户' },
  { id: 'games', label: '游戏与厂商' },
] as const

type PageId = (typeof PAGES)[number]['id']

function platformLabel(id: string): string {
  return platforms.find((item) => item.id === id)?.name ?? id
}

function clampDate(value: string): string {
  if (value > latestReady) return latestReady
  return value
}

export function App() {
  const [store, setStore] = useState<StoreData>(() => loadStore())
  const [platformId, setPlatformId] = useState('all')
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('MXN')
  const [from, setFrom] = useState(rangeStart)
  const [to, setTo] = useState(() => openingDate(latestReady, reportBundle.end))
  const [importOpen, setImportOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [page, setPage] = useState<PageId>('home')
  const [inbox, setInbox] = useState<InboxSnapshot>({ status: 'loading' })

  const reloadInbox = useCallback(() => {
    setInbox((current) => (current.status === 'ready' ? current : { status: 'loading' }))
    void fetchInbox()
      .then((data) => setInbox({ status: 'ready', ...data }))
      .catch(() => setInbox({ status: 'error', message: '收件夹暂时读不到。' }))
  }, [])

  useEffect(() => {
    reloadInbox()
  }, [reloadInbox])

  useEffect(() => {
    setConfirmClear(false)
  }, [to, platformId])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [page])

  const viewStore = useMemo(() => withBundled(store, reportBundle), [store])
  const slices = useMemo(() => slicesFor(viewStore, to, displayCurrency), [viewStore, to, displayCurrency])
  const shown = useMemo(() => visibleSlices(slices, platformId), [slices, platformId])
  const movement = useMemo(() => userMovement(viewStore, to, platformId, displayCurrency), [viewStore, to, platformId, displayCurrency])
  const hasScope = scopeHasData(store, to, platformId)
  const market = marketSummary(platforms)

  function commit(next: StoreData): string | null {
    const error = saveStore(next)
    setStore(next)
    return error
  }

  function onFrom(value: string) {
    if (!value) return
    const next = clampDate(value)
    setFrom(next)
    if (next > to) setTo(next)
  }

  function onTo(value: string) {
    if (!value) return
    const next = clampDate(value)
    setTo(next)
    if (next < from) setFrom(next)
  }

  function replacing(bundle: ParsedBundle): string | null {
    const userKeys = new Set(bundle.users.map((row) => `${row.platformId}|${row.date}|${row.currency}`))
    const gameKeys = new Set(bundle.games.map((row) => `${row.platformId}|${row.date}|${row.currency}`))
    const parts: string[] = []
    if (store.users.some((row) => userKeys.has(`${row.platformId}|${row.date}|${row.currency}`))) parts.push('用户')
    if (store.games.some((row) => gameKeys.has(`${row.platformId}|${row.date}|${row.currency}`))) parts.push('游戏与厂商')
    if (parts.length === 0) return null
    return `将替换同一平台、同一数据日期、同一币种里已导入的${parts.join('和')}。`
  }

  function replacingRates(rows: ParsedRateRow[]): string | null {
    const names = rows.filter((row) => store.rates[row.platformId]).map((row) => platformLabel(row.platformId))
    if (names.length === 0) return null
    return `将替换 ${names.join('、')} 已保存的汇率。`
  }

  function onApply(bundle: ParsedBundle, sourceName: string): string | null {
    const error = commit(applyImport(store, bundle, sourceName, new Date().toISOString()))
    if (error) return error
    const ids = [...new Set([...bundle.users, ...bundle.games].map((row) => row.platformId))]
    const dates = [...new Set([...bundle.users, ...bundle.games].map((row) => row.date))]
    const currencies = [...new Set([...bundle.users, ...bundle.games].map((row) => currencyLabel(row.currency)))]
    if (dates.length === 1) {
      setFrom(dates[0])
      setTo(dates[0])
    }
    setPlatformId(ids.length === 1 ? ids[0] : 'all')
    setPage(bundle.games.length > 0 && bundle.users.length === 0 ? 'games' : 'users')
    setStatus(`已写入 ${ids.map(platformLabel).join('、')} · ${dates.join('、')} · ${currencies.join('、')}。`)
    return null
  }

  function onApplyRates(rows: ParsedRateRow[], sourceName: string): string | null {
    const error = commit(applyRates(store, rows, sourceName, new Date().toISOString()))
    if (error) return error
    const saved = rows.map((row) => `${platformLabel(row.platformId)} 1 美金 = ${formatRate(row.mxnPerUsd)} 比索`)
    setStatus(`已保存汇率：${saved.join('、')}。`)
    return null
  }

  function onClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    const error = commit(clearScope(store, to, platformId))
    setConfirmClear(false)
    setStatus(error)
  }

  const scopeName = platformId === 'all' ? '全部平台' : platformLabel(platformId)

  return (
    <div className="shell" data-latest={latestReady} data-currency={displayCurrency} data-page={page}>
      <aside className="sidebar" data-testid="sidebar" aria-label="侧栏">
        <div className="brand">
          <p className="eyebrow">
            <span className="rule" />
            {market}市场
          </p>
          <h1>运营看板</h1>
        </div>

        <nav className="side-nav" aria-label="栏目">
          {PAGES.map((item) => (
            <button key={item.id} type="button" aria-current={page === item.id ? 'page' : undefined} data-testid={`nav-${item.id}`} onClick={() => setPage(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="side-platforms" role="radiogroup" aria-label="平台">
          <p className="side-label">平台</p>
          <button type="button" role="radio" aria-checked={platformId === 'all'} data-testid="platform-all" onClick={() => setPlatformId('all')}>
            汇总对照
          </button>
          {platforms.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={platformId === item.id}
              data-testid={`platform-${item.id}`}
              onClick={() => setPlatformId(item.id)}
            >
              <i style={{ background: item.accent }} />
              {item.name}
            </button>
          ))}
        </div>
      </aside>

      <div className="workspace">
        <header className="fnbar" data-testid="function-bar" aria-label="功能栏">
          <label className="date-field">
            <span>开始</span>
            <span className="date-face">
              <strong>{from}</strong>
              <input type="date" value={from} max={latestReady} data-testid="range-from" onChange={(event) => onFrom(event.target.value)} />
            </span>
          </label>
          <label className="date-field">
            <span>结束</span>
            <span className="date-face">
              <strong>{to}</strong>
              <input type="date" value={to} max={latestReady} data-testid="range-to" onChange={(event) => onTo(event.target.value)} />
            </span>
          </label>

          <div className="fn-currency">
            <span>币种</span>
            <div className="currency" role="radiogroup" aria-label="显示币种">
              <button type="button" role="radio" aria-checked={displayCurrency === 'MXN'} data-testid="currency-mxn" onClick={() => setDisplayCurrency('MXN')}>
                墨西哥比索
                <small>MXN</small>
              </button>
              <button type="button" role="radio" aria-checked={displayCurrency === 'USD'} data-testid="currency-usd" onClick={() => setDisplayCurrency('USD')}>
                美金
                <small>USD</small>
              </button>
            </div>
          </div>

          <div className="rates" data-testid="rate-board" aria-label="汇率">
            <span>
              1 美金兑比索
              <Hint text="各平台日报金额列的中位数。人数不换算。" />
            </span>
            {platforms.map((item) => {
              const rate = viewStore.rates[item.id]
              const verdict = reportBundle.verdicts[item.id]
              const unstable = verdict && !verdict.stable
              return (
                <p key={item.id} className="rate-line">
                  <em>{item.name}</em>
                  {rate ? (
                    <strong data-testid={`rate-${item.id}`}>{formatRate(rate.mxnPerUsd)}</strong>
                  ) : (
                    <strong className="rate-empty" data-testid={`rate-${item.id}`}>
                      {unstable ? '不稳定' : '未到'}
                      {unstable && <Hint text="各列比值差得开，不压成一个数。" />}
                    </strong>
                  )}
                </p>
              )
            })}
          </div>

          <button type="button" className="solid" data-testid="open-import" onClick={() => setImportOpen(true)}>
            导入
          </button>
        </header>

        <main className="canvas">
          {status && (
            <p className="status" role="status">
              {status}
              <button type="button" className="text-btn" onClick={() => setStatus(null)}>
                关闭
              </button>
            </p>
          )}

          {page === 'home' && (
            <section className="block page" data-testid="page-home" aria-label="首页">
              <div className="block-head">
                <h2>首页</h2>
              </div>
              <div className="spread">
                {shown.map((slice) => (
                  <HomeCard key={slice.platform.id} slice={slice} />
                ))}
              </div>
              <ReportSeries platformId={platformId} currency={displayCurrency} from={from} to={to} showTable={false} />
            </section>
          )}

          {page === 'users' && (
            <section className="block page" id="users" data-testid="section-users" data-state={shown.some((slice) => slice.hasUsers) ? 'ready' : 'empty'}>
              <div className="block-head">
                <h2>用户</h2>
              </div>
              <Movement lines={movement} />
              {shown.some((slice) => slice.hasUsers) ? (
                shown.map((slice) =>
                  slice.hasUsers ? (
                    <UserBlock key={slice.platform.id} slice={slice} titled={shown.length > 1} />
                  ) : (
                    <p key={slice.platform.id} className="quiet">
                      {slice.platform.name} 暂无
                    </p>
                  ),
                )
              ) : (
                <p className="quiet">暂无</p>
              )}
              <ReportSeries platformId={platformId} currency={displayCurrency} from={from} to={to} />
              {hasScope && (
                <button type="button" className="text-btn danger" onClick={onClear}>
                  {confirmClear ? `确认清除 ${scopeName} ${to}` : '清除此日'}
                </button>
              )}
            </section>
          )}

          {page === 'games' && (
            <section className="block page" id="games" data-testid="section-games" data-state={shown.some((slice) => slice.hasGames) ? 'ready' : 'empty'}>
              <div className="block-head">
                <h2>游戏与厂商</h2>
              </div>
              {shown.some((slice) => slice.hasGames) ? (
                shown.map((slice) =>
                  slice.hasGames ? (
                    <GameBlock key={slice.platform.id} slice={slice} titled={shown.length > 1} />
                  ) : (
                    <p key={slice.platform.id} className="quiet">
                      {slice.platform.name} 暂无
                    </p>
                  ),
                )
              ) : (
                <p className="quiet">暂无</p>
              )}
            </section>
          )}
        </main>
      </div>

      {importOpen && (
        <ImportDialog
          platforms={platforms}
          initialPlatformId={platformId === 'all' ? platforms[0].id : platformId}
          initialDate={to}
          latestReadyDate={latestReady}
          inbox={inbox}
          onRefreshInbox={reloadInbox}
          replacing={replacing}
          replacingRates={replacingRates}
          onClose={() => setImportOpen(false)}
          onApply={onApply}
          onApplyRates={onApplyRates}
        />
      )}
    </div>
  )
}

function HomeCard({ slice }: { slice: PlatformSlice }) {
  return (
    <article className="summary" data-testid={`summary-${slice.platform.id}`} data-state={slice.hasUsers ? 'ready' : 'empty'} style={{ borderTopColor: slice.platform.accent }}>
      <header>
        <h3>{slice.platform.name}</h3>
      </header>
      {slice.hasUsers ? (
        <div className="metric-grid">
          {slice.segments.map((segment) => (
            <SegmentTile key={segment.segment} slice={slice} segment={segment} />
          ))}
        </div>
      ) : (
        <p className="quiet">暂无</p>
      )}
    </article>
  )
}

function SegmentTile({ slice, segment }: { slice: PlatformSlice; segment: PlatformSlice['segments'][number] }) {
  const note = segment.segment === '老用户' ? oldUserNote(slice.platform.id) : null
  const hasNumbers = segment.metrics && (Object.keys(segment.metrics).length > 0 || segment.needsRateKeys.length > 0)
  return (
    <div>
      <p className="seg">
        {segment.segment}
        {note && <Hint text={note} />}
      </p>
      {hasNumbers ? (
        <Figures metrics={segment.metrics ?? {}} keys={slice.userMetricKeys} currency={slice.displayCurrency} needsRate={segment.needsRateKeys} />
      ) : (
        <p className="dash">—</p>
      )}
    </div>
  )
}

function UserBlock({ slice, titled }: { slice: PlatformSlice; titled: boolean }) {
  return (
    <div className="sheet">
      {titled && <h3 className="sheet-title">{slice.platform.name}</h3>}
      <div className="segments">
        {slice.segments.map((segment) => (
          <article key={segment.segment}>
            <header>
              <h3>
                {segment.segment}
                {segment.segment === '老用户' && oldUserNote(slice.platform.id) && <Hint text={oldUserNote(slice.platform.id) ?? ''} />}
              </h3>
            </header>
            {segment.metrics && (Object.keys(segment.metrics).length > 0 || segment.needsRateKeys.length > 0) ? (
              <Figures metrics={segment.metrics} keys={slice.userMetricKeys} currency={slice.displayCurrency} needsRate={segment.needsRateKeys} />
            ) : (
              <p className="dash">—</p>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}

function GameBlock({ slice, titled }: { slice: PlatformSlice; titled: boolean }) {
  return (
    <div className="sheet">
      {titled && <h3 className="sheet-title">{slice.platform.name}</h3>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>厂商</th>
              <th>游戏</th>
              {slice.gameMetricKeys.map((key) => (
                <th key={key} className="num">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.games.map((game) => (
              <tr key={`${game.provider}-${game.game}`}>
                <td>{game.provider}</td>
                <td className="game-name">{game.game}</td>
                {slice.gameMetricKeys.map((key) => (
                  <td key={key} className="num">
                    {game.needsRateKeys.includes(key) ? (
                      <RateGap />
                    ) : typeof game.metrics[key] === 'number' ? (
                      <MetricValue metricKey={key} value={game.metrics[key]} currency={slice.displayCurrency} />
                    ) : (
                      <span className="blank">空</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="game-cards">
        {slice.games.map((game) => (
          <article key={`${game.provider}-${game.game}`}>
            <p>{game.provider}</p>
            <h3>{game.game}</h3>
            <Figures metrics={game.metrics} keys={slice.gameMetricKeys} currency={slice.displayCurrency} needsRate={game.needsRateKeys} />
          </article>
        ))}
      </div>
    </div>
  )
}
