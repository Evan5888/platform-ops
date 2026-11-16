import { useEffect, useId, useState } from 'react'
import type { Platform } from '../data/platforms'
import { currencyFromFilename, currencyLabel } from '../lib/currency'
import { fetchInboxFile, formatBytes } from '../lib/inbox'
import { parseExportFile, parseRateFile, type RateFileResult } from '../lib/parse'
import type { Currency, InboxSnapshot, ParsedBundle, ParsedRateRow } from '../lib/types'

const MAX_BYTES = 25 * 1024 * 1024

type Props = {
  platforms: Platform[]
  initialPlatformId: string
  initialDate: string
  latestReadyDate: string
  inbox: InboxSnapshot
  onRefreshInbox: () => void
  replacing: (bundle: ParsedBundle) => string | null
  replacingRates: (rows: ParsedRateRow[]) => string | null
  onClose: () => void
  onApply: (bundle: ParsedBundle, sourceName: string) => string | null
  onApplyRates: (rows: ParsedRateRow[], sourceName: string) => string | null
}

export function ImportDialog({
  platforms,
  initialPlatformId,
  initialDate,
  latestReadyDate,
  inbox,
  onRefreshInbox,
  replacing,
  replacingRates,
  onClose,
  onApply,
  onApplyRates,
}: Props) {
  const titleId = useId()
  const [platformId, setPlatformId] = useState(initialPlatformId)
  const [date, setDate] = useState(initialDate)
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [currencyHint, setCurrencyHint] = useState<string | null>(null)
  const [preferFile, setPreferFile] = useState(true)
  const [filename, setFilename] = useState('')
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)
  const [preview, setPreview] = useState<ParsedBundle | null>(null)
  const [rateFile, setRateFile] = useState<Extract<RateFileResult, { kind: 'rate' }> | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [reading, setReading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!buffer || !filename) {
      setPreview(null)
      setRateFile(null)
      return
    }
    try {
      const rated = parseRateFile({ filename, buffer, platforms })
      if (rated.kind === 'rate') {
        setRateFile(rated)
        setPreview(null)
        setParseError(null)
        return
      }
      setRateFile(null)
      if (!currency) {
        setPreview(null)
        setParseError(null)
        return
      }
      setPreview(
        parseExportFile({
          filename,
          buffer,
          platforms,
          fallbackPlatformId: platformId,
          fallbackDate: date,
          preferFileValues: preferFile,
          latestReadyDate,
          currency,
        }),
      )
      setParseError(null)
    } catch {
      setPreview(null)
      setRateFile(null)
      setParseError('这个文件无法读取。请确认它是 CSV 或 Excel。')
    }
  }, [buffer, filename, platformId, date, preferFile, latestReadyDate, platforms, currency])

  async function useFile(nextName: string, nextBuffer: ArrayBuffer) {
    if (nextBuffer.byteLength > MAX_BYTES) {
      setFilename('')
      setBuffer(null)
      setParseError('文件超过 25 MB，请先拆开再导入。')
      return
    }
    const hinted = currencyFromFilename(nextName)
    setCurrency(hinted)
    setCurrencyHint(hinted ? `按文件名识别为${currencyLabel(hinted)}。` : null)
    setApplyError(null)
    setFilename(nextName)
    setBuffer(nextBuffer)
  }

  async function onPick(file: File | null) {
    if (!file) return
    await useFile(file.name, await file.arrayBuffer())
  }

  async function onInbox(name: string) {
    setReading(name)
    setParseError(null)
    try {
      await useFile(name, await fetchInboxFile(name))
    } catch {
      setParseError(`读不到收件夹里的 ${name}`)
    } finally {
      setReading(null)
    }
  }

  async function copyFolder(folder: string) {
    try {
      await navigator.clipboard.writeText(folder)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  function chooseCurrency(next: Currency) {
    setCurrency(next)
    setCurrencyHint(null)
  }

  const good = (preview?.users.length ?? 0) + (preview?.games.length ?? 0)
  const replaceNote = preview && good > 0 ? replacing(preview) : null
  const rateReplace = rateFile && rateFile.rates.length > 0 ? replacingRates(rateFile.rates) : null
  const dates = [...new Set(preview ? [...preview.users, ...preview.games].map((row) => row.date) : [])]
  const platformNames = [
    ...new Set(
      (preview ? [...preview.users, ...preview.games].map((row) => row.platformId) : []).map(
        (id) => platforms.find((item) => item.id === id)?.name ?? id,
      ),
    ),
  ]
  const needsCurrency = Boolean(filename && buffer && !rateFile && !currency)

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="import-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">
          <span className="rule" />
          文件
        </p>
        <h2 id={titleId}>导入每日导出</h2>
        <p className="dialog-lead">
          聊天里收到的文件，从这里选择。也可以先放进收件夹，再点使用。这里不登录后台，也不会编造数字。
        </p>

        <div className="form-grid">
          <label>
            <span>平台</span>
            <select value={platformId} onChange={(event) => setPlatformId(event.target.value)} data-testid="import-platform">
              {platforms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <small>文件里没写平台时，归入这里。</small>
          </label>
          <label>
            <span>数据日期</span>
            <span className="date-face">
              <strong>{date}</strong>
              <input
                type="date"
                value={date}
                max={latestReadyDate}
                onChange={(event) => setDate(event.target.value)}
                data-testid="import-date"
              />
            </span>
            <small>文件里没写日期时，使用这一天。</small>
          </label>
        </div>

        <fieldset className="currency-field">
          <legend>文件币种</legend>
          <div className="currency" role="radiogroup" aria-label="文件币种">
            <button type="button" role="radio" aria-checked={currency === 'MXN'} data-testid="import-currency-mxn" onClick={() => chooseCurrency('MXN')}>
              墨西哥比索
            </button>
            <button type="button" role="radio" aria-checked={currency === 'USD'} data-testid="import-currency-usd" onClick={() => chooseCurrency('USD')}>
              美金
            </button>
          </div>
          <small>
            {rateFile
              ? '这是汇率文件，按 1 美金兑比索读取，不用选数据币种。'
              : currencyHint ?? (needsCurrency ? '文件没有标明币种，请选择。不会替你假定。' : '文件里的币种列优先。没写时用这里的选择。')}
          </small>
        </fieldset>

        <label className="check">
          <input type="checkbox" checked={preferFile} onChange={(event) => setPreferFile(event.target.checked)} />
          <span>优先使用文件里的平台、日期和币种</span>
        </label>

        <label className="file-pick">
          <span>选择文件</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            data-testid="import-file"
            onChange={(event) => void onPick(event.target.files?.[0] ?? null)}
          />
        </label>

        <section className="inbox-block">
          <header>
            <h3>收件夹</h3>
            <button type="button" className="text-btn" onClick={onRefreshInbox} data-testid="inbox-refresh">
              刷新
            </button>
          </header>
          {inbox.status === 'loading' && <p className="quiet">正在读取收件夹。</p>}
          {inbox.status === 'error' && <p className="quiet">{inbox.message} 仍可以直接选择本机文件。</p>}
          {inbox.status === 'ready' && (
            <>
              <p className="folder">
                {inbox.folder}
                <button type="button" className="text-btn" onClick={() => void copyFolder(inbox.folder)}>
                  {copied ? '已复制' : '复制路径'}
                </button>
              </p>
              {inbox.files.length === 0 ? (
                <p className="quiet">收件夹里还没有 CSV 或 Excel。放进去之后点刷新。</p>
              ) : (
                <ul className="inbox-files">
                  {inbox.files.map((file) => (
                    <li key={file.name}>
                      <div>
                        <strong>{file.name}</strong>
                        <span>
                          {formatBytes(file.bytes)} · {file.modifiedAt.slice(0, 16).replace('T', ' ')}
                        </span>
                      </div>
                      <button type="button" className="text-btn" disabled={reading === file.name} onClick={() => void onInbox(file.name)} data-testid={`inbox-use-${file.name}`}>
                        {reading === file.name ? '读取中' : '使用'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {filename && <p className="chosen">当前文件 · {filename}</p>}
        {parseError && <p className="warn">{parseError}</p>}
        {needsCurrency && <p className="quiet">先选择墨西哥比索或美金，再看预览。</p>}
        {rateFile && (
          <div className="preview" data-testid="rate-preview">
            <p>汇率文件 · 1 美金兑墨西哥比索。空着的格子不会写入。</p>
            {rateFile.rates.length === 0 && <p>没有可写入的汇率，已保存的汇率保持空白。</p>}
            {rateFile.rates.map((row) => (
              <p key={row.platformId}>
                {platforms.find((item) => item.id === row.platformId)?.name ?? row.platformId} · 1 美金 = {row.mxnPerUsd} 比索
                {row.asOf ? ` · ${row.asOf}` : ''}
              </p>
            ))}
            {rateReplace && <p>{rateReplace}</p>}
            {rateFile.notices.map((item) => (
              <p key={item} className="quiet">
                {item}
              </p>
            ))}
            {rateFile.errors.length > 0 && (
              <ul className="warn-list">
                {rateFile.errors.slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {preview && (
          <div className="preview" data-testid="import-preview">
            <p>
              用户 {preview.users.length} 行 · 游戏 {preview.games.length} 行
              {dates.length > 0 && ` · ${dates.join('、')}`}
              {platformNames.length > 0 && ` · ${platformNames.join('、')}`}
            </p>
            {replaceNote && <p>{replaceNote}</p>}
            {preview.notices.slice(0, 3).map((item) => (
              <p key={item} className="quiet">
                {item}
              </p>
            ))}
            {preview.errors.length > 0 && (
              <ul className="warn-list">
                {preview.errors.slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {preview.errors.length > 6 && <li>另有 {preview.errors.length - 6} 条</li>}
              </ul>
            )}
          </div>
        )}

        <details className="columns">
          <summary>可以识别的列</summary>
          <p>
            日期、平台、币种（墨西哥比索或美金）、分区（用户或游戏）、用户类型（新充用户、首充用户、老用户）、厂商、游戏，以及人数、充值金额、提现金额、投注金额、派彩金额、输赢、注单数。
            多出来的数字列会按原列名显示。汇率文件单独放：平台、汇率。汇率是 1 美金可兑换的墨西哥比索，空着就不写入。
          </p>
        </details>

        {applyError && <p className="warn">{applyError}</p>}

        <div className="dialog-actions">
          <button type="button" className="text-btn" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="solid"
            data-testid="import-confirm"
            disabled={rateFile ? rateFile.rates.length === 0 : !preview || good === 0}
            onClick={() => {
              if (rateFile) {
                if (rateFile.rates.length === 0) return
                const error = onApplyRates(rateFile.rates, filename || '汇率文件')
                setApplyError(error)
                if (!error) onClose()
                return
              }
              if (!preview || good === 0) return
              const error = onApply(preview, filename || '导入文件')
              setApplyError(error)
              if (!error) onClose()
            }}
          >
            {rateFile
              ? '保存汇率'
              : preview && preview.errors.length > 0 && good > 0
                ? `导入有效的 ${good} 行`
                : '确认导入'}
          </button>
        </div>
      </div>
    </div>
  )
}
