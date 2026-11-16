import { isIsoDate } from './dates'
import { USER_SEGMENTS, type Currency, type GameRow, type ParsedBundle, type ParsedRateRow, type PlatformRate, type StoreData, type UserRow, type UserSegment } from './types'

const STORAGE_KEY = 'mx-ops-dashboard.v1'

export function emptyStore(): StoreData {
  return { version: 2, users: [], games: [], rates: {} }
}

function isMetrics(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((item) => typeof item === 'number' && Number.isFinite(item))
}

function isSegment(value: unknown): value is UserSegment {
  return typeof value === 'string' && USER_SEGMENTS.includes(value as UserSegment)
}

function isCurrency(value: unknown): value is Currency {
  return value === 'MXN' || value === 'USD'
}

function isUserRow(value: unknown): value is UserRow {
  if (!value || typeof value !== 'object') return false
  const row = value as UserRow
  return (
    isIsoDate(row.date) &&
    typeof row.platformId === 'string' &&
    isSegment(row.segment) &&
    isCurrency(row.currency) &&
    isMetrics(row.metrics) &&
    typeof row.sourceName === 'string' &&
    typeof row.importedAt === 'string'
  )
}

function isGameRow(value: unknown): value is GameRow {
  if (!value || typeof value !== 'object') return false
  const row = value as GameRow
  return (
    isIsoDate(row.date) &&
    typeof row.platformId === 'string' &&
    typeof row.provider === 'string' &&
    typeof row.game === 'string' &&
    isCurrency(row.currency) &&
    isMetrics(row.metrics) &&
    typeof row.sourceName === 'string' &&
    typeof row.importedAt === 'string'
  )
}

function isRate(value: unknown): value is PlatformRate {
  if (!value || typeof value !== 'object') return false
  const rate = value as PlatformRate
  return (
    typeof rate.mxnPerUsd === 'number' &&
    rate.mxnPerUsd > 0 &&
    Number.isFinite(rate.mxnPerUsd) &&
    typeof rate.sourceName === 'string' &&
    typeof rate.importedAt === 'string' &&
    (rate.asOf === null || (typeof rate.asOf === 'string' && isIsoDate(rate.asOf)))
  )
}

function takeCurrency(value: unknown, legacy: boolean): Currency | null {
  if (isCurrency(value)) return value
  return legacy ? 'MXN' : null
}

function normalizeUser(value: unknown, legacy: boolean): UserRow[] {
  if (!value || typeof value !== 'object') return []
  const row = value as UserRow
  const currency = takeCurrency(row.currency, legacy)
  if (!currency) return []
  const next = { ...row, currency }
  return isUserRow(next) ? [next] : []
}

function normalizeGame(value: unknown, legacy: boolean): GameRow[] {
  if (!value || typeof value !== 'object') return []
  const row = value as GameRow
  const currency = takeCurrency(row.currency, legacy)
  if (!currency) return []
  const next = { ...row, currency }
  return isGameRow(next) ? [next] : []
}

function sanitizeRates(value: unknown): Record<string, PlatformRate> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const rates: Record<string, PlatformRate> = {}
  for (const [id, rate] of Object.entries(value)) {
    if (isRate(rate)) rates[id] = rate
  }
  return rates
}

export function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as { version?: number; users?: unknown; games?: unknown; rates?: unknown }
    if (parsed.version !== 1 && parsed.version !== 2) return emptyStore()
    const legacy = parsed.version === 1
    return {
      version: 2,
      users: Array.isArray(parsed.users) ? parsed.users.flatMap((row) => normalizeUser(row, legacy)) : [],
      games: Array.isArray(parsed.games) ? parsed.games.flatMap((row) => normalizeGame(row, legacy)) : [],
      rates: legacy ? {} : sanitizeRates(parsed.rates),
    }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: StoreData): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    return null
  } catch {
    return '浏览器存不下这份导入。可以清除较早的日期后再试。'
  }
}

function scopeKey(row: { platformId: string; date: string; currency: Currency }): string {
  return `${row.platformId}|${row.date}|${row.currency}`
}

export function applyImport(store: StoreData, bundle: ParsedBundle, sourceName: string, importedAt: string): StoreData {
  const userKeys = new Set(bundle.users.map(scopeKey))
  const gameKeys = new Set(bundle.games.map(scopeKey))
  return {
    version: 2,
    users: [
      ...store.users.filter((row) => bundle.users.length === 0 || !userKeys.has(scopeKey(row))),
      ...bundle.users.map((row) => ({ ...row, sourceName, importedAt })),
    ],
    games: [
      ...store.games.filter((row) => bundle.games.length === 0 || !gameKeys.has(scopeKey(row))),
      ...bundle.games.map((row) => ({ ...row, sourceName, importedAt })),
    ],
    rates: store.rates,
  }
}

export function applyRates(store: StoreData, rows: ParsedRateRow[], sourceName: string, importedAt: string): StoreData {
  const rates = { ...store.rates }
  for (const row of rows) {
    if (!(row.mxnPerUsd > 0) || !Number.isFinite(row.mxnPerUsd)) continue
    rates[row.platformId] = {
      mxnPerUsd: row.mxnPerUsd,
      sourceName,
      importedAt,
      asOf: row.asOf,
    }
  }
  return { ...store, version: 2, rates }
}

export function clearScope(store: StoreData, date: string, platformId: string | 'all'): StoreData {
  const matches = (id: string) => platformId === 'all' || id === platformId
  return {
    version: 2,
    users: store.users.filter((row) => !(row.date === date && matches(row.platformId))),
    games: store.games.filter((row) => !(row.date === date && matches(row.platformId))),
    rates: store.rates,
  }
}

export function scopeHasData(store: StoreData, date: string, platformId: string | 'all'): boolean {
  const matches = (id: string) => platformId === 'all' || id === platformId
  return store.users.some((row) => row.date === date && matches(row.platformId)) || store.games.some((row) => row.date === date && matches(row.platformId))
}
