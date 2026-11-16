import { useCallback, useEffect, useMemo, useState } from 'react'
import { Figures, InlineFigures, MetricValue } from './components/Figures'
import { ImportDialog } from './components/ImportDialog'
import { marketSummary, platforms } from './data/platforms'
import { formatStamp, latestReadyDataDate, weekdayLabel } from './lib/dates'
import { fetchInbox } from './lib/inbox'
import { summaryMetricKeys } from './lib/metrics'
import { applyImport, clearScope, loadStore, saveStore, scopeHasData } from './lib/storage'
import type { InboxSnapshot, ParsedBundle, StoreData } from './lib/types'
import { slicesFor, visibleSlices, type PlatformSlice } from './lib/view'

const latestReady = latestReadyDataDate()

function platformLabel(id: string): string {
  return platforms.find((item) => item.id === id)?.name ?? id
}

export function App() {
  const [store, setStore] = useState<StoreData>(() => loadStore())
  const [platformId, setPlatformId] = useState('all')
  const [date, setDate] = useState(latestReady)
  const [dateNote, setDateNote] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
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
  }, [date, platformId])

  const slices = useMemo(() => slicesFor(store, date), [store, date])
  const shown = useMemo(() => visibleSlices(slices, platformId), [slices, platformId])
  const hasScope = scopeHasData(store, date, platformId)
  const market = marketSummary(platforms)

  function commit(next: StoreData): string | null {
    const error = saveStore(next)
    setStore(next)
    return error
  }

  function onDate(value: string) {
    if (value && value > latestReady) {
      setDate(latestReady)
      setDateNote('这一天的窗口还没到。墨西哥自然日结束后再过 3 小时才能导入。')
      return
    }
    setDateNote(null)
    if (value) setDate(value)
  }

  function replacing(bundle: ParsedBundle): string | null {
    const userKeys = new Set(bundle.users.map((row) => `${row.platformId}|${row.date}`))
    const gameKeys = new Set(bundle.games.map((row) => `${row.platformId}|${row.date}`))
    const parts: string[] = []
    if (store.users.some((row) => userKeys.has(`${row.platformId}|${row.date}`))) parts.push('用户')
    if (store.games.some((row) => gameKeys.has(`${row.platformId}|${row.date}`))) parts.push('游戏与厂商')
    if (parts.length === 0) return null
    return `将替换同一平台、同一数据日期里已导入的${parts.join('和')}。`
  }

  function onApply(bundle: ParsedBundle, sourceName: string): string | null {
    const error = commit(applyImport(store, bundle, sourceName, new Date().toISOString()))
    if (error) return error
    const ids = [...new Set([...bundle.users, ...bundle.games].map((row) => row.platformId))]
    const dates = [...new Set([...bundle.users, ...bundle.games].map((row) => row.date))]
    if (dates.length === 1) setDate(dates[0])
    setPlatformId(ids.length === 1 ? ids[0] : 'all')
    const skipped = bundle.errors.length > 0 ? `已跳过 ${bundle.errors.length} 行。` : ''
    setStatus(`已写入 ${ids.map(platformLabel).join('、')} · ${dates.join('、')}。用户 ${bundle.users.length} 行，游戏 ${bundle.games.length} 行。${skipped}`)
    return null
  }

  function onClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    const error = commit(clearScope(store, date, platformId))
    setConfirmClear(false)
    setStatus(error ?? '已清除这个浏览器里的当日导入。收件夹里的文件还在。')
  }

  const scopeName = platformId === 'all' ? '全部平台' : platformLabel(platformId)

  return (
    <div className="page" data-latest={latestReady}>
      <header className="masthead">
        <div>
          <p className="eyebrow">
            <span className="rule" />
            {market}市场
          </p>
          <h1>平台运营</h1>
          <p className="lede">每个墨西哥自然日结束后再过 3 小时导入一次。这里只显示文件里有的数字，不连接后台。</p>
        </div>
        <p className="window" data-testid="latest-ready">
          最近可导入
          <strong>{latestReady}</strong>
        </p>
      </header>

      <div className="controls">
        <div className="switch" role="radiogroup" aria-label="平台">
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
              {item.name}
            </button>
          ))}
        </div>
        <label className="date-field">
          <span>数据日期</span>
          <span className="date-face">
            <strong>{date}</strong>
            <input type="date" value={date} max={latestReady} data-testid="view-date" onChange={(event) => onDate(event.target.value)} />
          </span>
          <em>{weekdayLabel(date)}</em>
        </label>
        <button type="button" className="solid" data-testid="open-import" onClick={() => setImportOpen(true)}>
          导入文件
        </button>
      </div>
      {dateNote && <p className="note">{dateNote}</p>}
      <p className="inbox-line">
        {inbox.status === 'ready' && inbox.files.length === 0 && '收件夹没有文件'}
        {inbox.status === 'ready' && inbox.files.length > 0 && `收件夹 ${inbox.files.length} 个文件`}
        {inbox.status === 'error' && inbox.message}
        {inbox.status === 'loading' && '正在读取收件夹'}
        <button type="button" className="text-btn" onClick={reloadInbox} data-testid="inbox-refresh-page">
          刷新
        </button>
      </p>

      {status && (
        <p className="status" role="status">
          {status}
          <button type="button" className="text-btn" onClick={() => setStatus(null)}>
            关闭
          </button>
        </p>
      )}

      <section className="block" aria-label="平台对照">
        <div className="block-head">
          <h2>
            <span>对照</span>
            {date}
          </h2>
          <p>同一数据日期，{platforms.map((item) => item.name).join(' 与 ')} 并排。下方展开{scopeName}。</p>
        </div>
        <div className="spread">
          {slices.map((slice) => (
            <SummaryCard key={slice.platform.id} slice={slice} />
          ))}
        </div>
      </section>

      <section className="block" data-testid="section-users" data-state={shown.some((slice) => slice.hasUsers) ? 'ready' : 'empty'}>
        <div className="block-head">
          <h2>
            <span>01</span>用户
          </h2>
          <p>新充用户、首充用户、老用户。只列出导入文件里出现的指标。</p>
        </div>
        {shown.some((slice) => slice.hasUsers) ? (
          shown.map((slice) =>
            slice.hasUsers ? (
              <UserBlock key={slice.platform.id} slice={slice} titled={shown.length > 1} />
            ) : (
              <p key={slice.platform.id} className="missing">
                {slice.platform.name} 这一天没有用户文件
              </p>
            ),
          )
        ) : (
          <EmptyPanel
            title="这一天还没有用户数据"
            body="从聊天保存导出文件后导入，或把 CSV / Excel 放进收件夹再导入。没有文件，就不会出现人数或金额。"
            items={['新充用户', '首充用户', '老用户']}
            onImport={() => setImportOpen(true)}
          />
        )}
      </section>

      <section className="block" data-testid="section-games" data-state={shown.some((slice) => slice.hasGames) ? 'ready' : 'empty'}>
        <div className="block-head">
          <h2>
            <span>02</span>游戏与厂商
          </h2>
          <p>按厂商和游戏列出文件中的指标。</p>
        </div>
        {shown.some((slice) => slice.hasGames) ? (
          shown.map((slice) =>
            slice.hasGames ? (
              <GameBlock key={slice.platform.id} slice={slice} titled={shown.length > 1} />
            ) : (
              <p key={slice.platform.id} className="missing">
                {slice.platform.name} 这一天没有游戏文件
              </p>
            ),
          )
        ) : (
          <EmptyPanel
            title="这一天还没有游戏与厂商数据"
            body="导入后按厂商和游戏展开。不会用估算填上投注或输赢。"
            items={['厂商', '游戏']}
            onImport={() => setImportOpen(true)}
          />
        )}
      </section>

      <footer className="colophon">
        <p>数字保存在这个浏览器。换浏览器或清除站点数据后，需要重新导入。收件夹里的文件不会自动删除。</p>
        {hasScope && (
          <button type="button" className="text-btn danger" onClick={onClear}>
            {confirmClear ? `确认清除 ${scopeName} ${date}` : '清除此日'}
          </button>
        )}
        {confirmClear && <p>只清除浏览器里的导入，不删除收件夹文件。</p>}
      </footer>

      {importOpen && (
        <ImportDialog
          platforms={platforms}
          initialPlatformId={platformId === 'all' ? platforms[0].id : platformId}
          initialDate={date}
          latestReadyDate={latestReady}
          inbox={inbox}
          onRefreshInbox={reloadInbox}
          replacing={replacing}
          onClose={() => setImportOpen(false)}
          onApply={onApply}
        />
      )}
    </div>
  )
}

function SummaryCard({ slice }: { slice: PlatformSlice }) {
  const ready = slice.hasUsers || slice.hasGames
  const userKeys = summaryMetricKeys(slice.userMetricKeys, 3)
  const gameKeys = summaryMetricKeys(slice.gameMetricKeys, 2)
  return (
    <article className="summary" data-testid={`summary-${slice.platform.id}`} data-state={ready ? 'ready' : 'empty'} style={{ borderTopColor: slice.platform.accent }}>
      <header>
        <h3>{slice.platform.name}</h3>
        <span>{ready ? '已导入' : '未导入'}</span>
      </header>
      {!ready && <p className="quiet">这一天还没有文件。导入后才会出现数字。</p>}
      {ready && !slice.hasUsers && <p className="quiet">用户未导入</p>}
      {ready && slice.hasUsers && (
        <div className="summary-users">
          {slice.segments.map((segment) => (
            <div key={segment.segment}>
              <p className="seg">{segment.segment}</p>
              {segment.metrics ? (
                <InlineFigures metrics={segment.metrics} keys={userKeys.shown} currency={slice.platform.currency} />
              ) : (
                <p className="quiet">当日文件没有这一类</p>
              )}
            </div>
          ))}
          {userKeys.hidden > 0 && <p className="quiet">其余用户指标在下方</p>}
        </div>
      )}
      {ready && slice.hasGames && (
        <div className="summary-games">
          <p className="seg">
            {slice.providerCount} 家厂商 · {slice.games.length} 个游戏
          </p>
          {gameKeys.shown.length > 0 && <InlineFigures metrics={slice.gameTotals} keys={gameKeys.shown} currency={slice.platform.currency} />}
        </div>
      )}
      {ready && !slice.hasGames && <p className="quiet">游戏未导入</p>}
      {ready && slice.importedAt && (
        <p className="source">
          {slice.sources.join('、')} · {formatStamp(slice.importedAt)}
        </p>
      )}
    </article>
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
              <h3>{segment.segment}</h3>
              {segment.rowCount > 1 && <p>文件中有 {segment.rowCount} 行，已合计</p>}
            </header>
            {segment.metrics && Object.keys(segment.metrics).length > 0 ? (
              <Figures metrics={segment.metrics} keys={slice.userMetricKeys} currency={slice.platform.currency} />
            ) : (
              <p className="quiet">{segment.metrics ? '这一类没有数字列' : '当日文件没有这一类'}</p>
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
                    {typeof game.metrics[key] === 'number' ? (
                      <MetricValue metricKey={key} value={game.metrics[key]} currency={slice.platform.currency} />
                    ) : (
                      <span className="blank" title="文件里这一格是空的">
                        空
                      </span>
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
            <Figures metrics={game.metrics} keys={slice.gameMetricKeys} currency={slice.platform.currency} />
          </article>
        ))}
      </div>
    </div>
  )
}

function EmptyPanel({ title, body, items, onImport }: { title: string; body: string; items: string[]; onImport: () => void }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <button type="button" className="text-link" onClick={onImport}>
        导入文件
      </button>
    </div>
  )
}
