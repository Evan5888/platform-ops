import { isIsoDate } from './dates'
import { USER_SEGMENTS, type GameRow, type StoreData, type UserRow, type UserSegment } from './types'
import type { ParsedBundle } from './types'

const STORAGE_KEY = 'mx-ops-dashboard.v1'

export function emptyStore(): StoreData {
  return { version: 1, users: [], games: [] }
}

function isMetrics(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((item) => typeof item === 'number' && Number.isFinite(item))
}

function isSegment(value: unknown): value is UserSegment {
  return typeof value === 'string' && USER_SEGMENTS.includes(value as UserSegment)
}

function isUserRow(value: unknown): value is UserRow {
  if (!value || typeof value !== 'object') return false
  const row = value as UserRow
  return isIsoDate(row.date) && typeof row.platformId === 'string' && isSegment(row.segment) && isMetrics(row.metrics) && typeof row.sourceName === 'string' && typeof row.importedAt === 'string'
}

function isGameRow(value: unknown): value is GameRow {
  if (!value || typeof value !== 'object') return false
  const row = value as GameRow
  return isIsoDate(row.date) && typeof row.platformId === 'string' && typeof row.provider === 'string' && typeof row.game === 'string' && isMetrics(row.metrics) && typeof row.sourceName === 'string' && typeof row.importedAt === 'string'
}

export function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<StoreData>
    if (parsed.version !== 1) return emptyStore()
    return {
      version: 1,
      users: Array.isArray(parsed.users) ? parsed.users.filter(isUserRow) : [],
      games: Array.isArray(parsed.games) ? parsed.games.filter(isGameRow) : [],
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

function scopeKey(row: { platformId: string; date: string }): string {
  return `${row.platformId}|${row.date}`
}

export function applyImport(store: StoreData, bundle: ParsedBundle, sourceName: string, importedAt: string): StoreData {
  const userKeys = new Set(bundle.users.map(scopeKey))
  const gameKeys = new Set(bundle.games.map(scopeKey))
  return {
    version: 1,
    users: [
      ...store.users.filter((row) => bundle.users.length === 0 || !userKeys.has(scopeKey(row))),
      ...bundle.users.map((row) => ({ ...row, sourceName, importedAt })),
    ],
    games: [
      ...store.games.filter((row) => bundle.games.length === 0 || !gameKeys.has(scopeKey(row))),
      ...bundle.games.map((row) => ({ ...row, sourceName, importedAt })),
    ],
  }
}

export function clearScope(store: StoreData, date: string, platformId: string | 'all'): StoreData {
  const matches = (id: string) => platformId === 'all' || id === platformId
  return {
    version: 1,
    users: store.users.filter((row) => !(row.date === date && matches(row.platformId))),
    games: store.games.filter((row) => !(row.date === date && matches(row.platformId))),
  }
}

export function scopeHasData(store: StoreData, date: string, platformId: string | 'all'): boolean {
  const matches = (id: string) => platformId === 'all' || id === platformId
  return store.users.some((row) => row.date === date && matches(row.platformId)) || store.games.some((row) => row.date === date && matches(row.platformId))
}
