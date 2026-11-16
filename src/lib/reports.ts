import { parseCsvMatrix } from './parse'
import type { Currency, PlatformRate, StoreData, UserRow } from './types'

export type ReportFile = {
  platformId: string
  currency: Currency
  filename: string
  csv: string
}

export type SeriesPoint = {
  date: string
  platformId: string
  currency: Currency
  新充人数: number | null
  新充金额: number | null
  首充人数: number | null
  首充金额: number | null
}

export type RateVerdict = {
  platformId: string
  stable: boolean
  mxnPerUsd: number | null
  pairs: number
  min: number | null
  max: number | null
  maxRelativeGap: number | null
}

export type OldUserVerdict = {
  platformId: string
  derived: boolean
  days: number
  matchedDays: number
  missingColumn: '老用户充值金额'
  note: string
}

export type ReportBundle = {
  users: UserRow[]
  rates: Record<string, PlatformRate>
  verdicts: Record<string, RateVerdict>
  points: SeriesPoint[]
  oldUsers: Record<string, OldUserVerdict>
  start: string | null
  end: string | null
}

const MONEY_BAND = 0.005

function parseCell(value: string): number | null {
  const text = value.trim().replace(/,/g, '')
  if (!text || text === '-' || text === '—' || text === '–' || text.endsWith('%')) return null
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function isMoneyColumn(name: string): boolean {
  const lower = name.toLowerCase()
  return name.includes('金额') || name.includes('工资') || name.includes('输赢') || name.includes('成本') || lower.includes('arppu')
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? null
  const left = sorted[mid - 1]
  const right = sorted[mid]
  if (left == null || right == null) return null
  return (left + right) / 2
}

type Table = {
  headers: string[]
  rows: Array<Record<string, string>>
}

function readTable(csv: string): Table {
  const matrix = parseCsvMatrix(csv.replace(/^\uFEFF/, ''))
  const headerIndex = matrix.findIndex((cells) => cells.some((cell) => String(cell).trim()))
  if (headerIndex < 0) return { headers: [], rows: [] }
  const headers = (matrix[headerIndex] ?? []).map((cell) => String(cell).replace(/^\uFEFF/, '').trim())
  const rows = matrix.slice(headerIndex + 1).flatMap((cells) => {
    const date = String(cells[0] ?? '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return []
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = String(cells[index] ?? '').trim()
    })
    return [row]
  })
  return { headers, rows }
}

function oldUserVerdict(platformId: string, rows: Array<Record<string, string>>): OldUserVerdict {
  let days = 0
  let matchedDays = 0
  for (const row of rows) {
    const depositors = parseCell(row['充值人数'] ?? '')
    const fresh = parseCell(row['新充人数'] ?? '')
    const listed = parseCell(row['老用户充值人数'] ?? '')
    if (depositors == null || fresh == null || listed == null) continue
    days += 1
    if (depositors - fresh === listed && depositors - fresh >= 0 && listed >= 0) matchedDays += 1
  }
  const derived = days > 0 && matchedDays === days
  const note = derived
    ? '老用户人数用文件里的「老用户充值人数」。缺少「老用户充值金额」，金额留空。'
    : `缺少「老用户充值金额」。充值人数 − 新充人数 与「老用户充值人数」在 ${matchedDays}/${days} 天相等，所以不把差额当成老用户人数。`
  return { platformId, derived, days, matchedDays, missingColumn: '老用户充值金额', note }
}

function rateVerdict(platformId: string, mxnRows: Array<Record<string, string>>, usdRows: Array<Record<string, string>>, headers: string[]): RateVerdict {
  const money = headers.filter(isMoneyColumn)
  const usdByDate = new Map(usdRows.map((row) => [row['日期'], row]))
  const ratios: number[] = []
  for (const row of mxnRows) {
    const other = usdByDate.get(row['日期'] ?? '')
    if (!other) continue
    for (const column of money) {
      const pesos = parseCell(row[column] ?? '')
      const dollars = parseCell(other[column] ?? '')
      if (pesos == null || dollars == null || pesos === 0 || dollars === 0) continue
      ratios.push(pesos / dollars)
    }
  }
  const mid = median(ratios)
  if (mid == null || !(mid > 0)) {
    return { platformId, stable: false, mxnPerUsd: null, pairs: 0, min: null, max: null, maxRelativeGap: null }
  }
  const min = Math.min(...ratios)
  const max = Math.max(...ratios)
  const maxRelativeGap = Math.max(...ratios.map((ratio) => Math.abs(ratio - mid) / mid))
  const stable = maxRelativeGap <= MONEY_BAND
  return {
    platformId,
    stable,
    mxnPerUsd: stable ? mid : null,
    pairs: ratios.length,
    min,
    max,
    maxRelativeGap,
  }
}

function metricRow(file: ReportFile, date: string, segment: UserRow['segment'], metrics: UserRow['metrics']): UserRow | null {
  if (Object.keys(metrics).length === 0) return null
  return {
    date,
    platformId: file.platformId,
    segment,
    currency: file.currency,
    metrics,
    sourceName: file.filename,
    importedAt: '',
  }
}

export function parseReports(files: ReportFile[]): ReportBundle {
  const users: UserRow[] = []
  const points: SeriesPoint[] = []
  const grouped = new Map<string, { mxn: Table | null; usd: Table | null }>()
  for (const file of files) {
    const table = readTable(file.csv)
    const slot = grouped.get(file.platformId) ?? { mxn: null, usd: null }
    if (file.currency === 'MXN') slot.mxn = table
    else slot.usd = table
    grouped.set(file.platformId, slot)
    const verdict = oldUserVerdict(file.platformId, table.rows)
    for (const row of table.rows) {
      const date = row['日期'] ?? ''
      const freshCount = parseCell(row['新充人数'] ?? '')
      const freshMoney = parseCell(row['新充金额'] ?? '')
      const firstCount = parseCell(row['首充人数'] ?? '')
      const firstMoney = parseCell(row['首充金额'] ?? '')
      points.push({
        date,
        platformId: file.platformId,
        currency: file.currency,
        新充人数: freshCount,
        新充金额: freshMoney,
        首充人数: firstCount,
        首充金额: firstMoney,
      })
      const freshMetrics: UserRow['metrics'] = {}
      if (freshCount != null) freshMetrics['人数'] = freshCount
      if (freshMoney != null) freshMetrics['充值金额'] = freshMoney
      const firstMetrics: UserRow['metrics'] = {}
      if (firstCount != null) firstMetrics['人数'] = firstCount
      if (firstMoney != null) firstMetrics['充值金额'] = firstMoney
      const fresh = metricRow(file, date, '新充用户', freshMetrics)
      const first = metricRow(file, date, '首充用户', firstMetrics)
      if (fresh) users.push(fresh)
      if (first) users.push(first)
      if (verdict.derived) {
        const listed = parseCell(row['老用户充值人数'] ?? '')
        if (listed != null) {
          const old = metricRow(file, date, '老用户', { 人数: listed })
          if (old) users.push(old)
        }
      }
    }
  }

  const rates: Record<string, PlatformRate> = {}
  const verdicts: Record<string, RateVerdict> = {}
  const oldUsers: Record<string, OldUserVerdict> = {}
  for (const [platformId, tables] of grouped) {
    if (tables.mxn && tables.usd) {
      const verdict = rateVerdict(platformId, tables.mxn.rows, tables.usd.rows, tables.mxn.headers)
      verdicts[platformId] = verdict
      if (verdict.stable && verdict.mxnPerUsd != null) {
        rates[platformId] = {
          mxnPerUsd: verdict.mxnPerUsd,
          sourceName: `日报金额列中位数 · ${verdict.pairs} 对`,
          importedAt: '',
          asOf: null,
        }
      }
    }
    if (tables.mxn) oldUsers[platformId] = oldUserVerdict(platformId, tables.mxn.rows)
  }

  const dates = points.map((point) => point.date).sort()
  return {
    users,
    rates,
    verdicts,
    points,
    oldUsers,
    start: dates[0] ?? null,
    end: dates[dates.length - 1] ?? null,
  }
}

export function openingDate(latestReady: string, end: string | null): string {
  if (!end) return latestReady
  return end < latestReady ? end : latestReady
}

export function withBundled(store: StoreData, bundle: ReportBundle): StoreData {
  const occupied = new Set(bundle.users.map((row) => `${row.platformId}|${row.date}|${row.currency}|${row.segment}`))
  return {
    version: 2,
    users: [...bundle.users, ...store.users.filter((row) => !occupied.has(`${row.platformId}|${row.date}|${row.currency}|${row.segment}`))],
    games: store.games,
    rates: { ...store.rates, ...bundle.rates },
  }
}
