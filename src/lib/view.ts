import { describePlatform, platforms, type Platform } from '../data/platforms'
import { collectMetricKeys, sumMetrics } from './metrics'
import { USER_SEGMENTS, type GameRow, type StoreData, type UserRow, type UserSegment } from './types'

export type SegmentView = {
  segment: UserSegment
  rowCount: number
  metrics: Record<string, number> | null
}

export type GameView = {
  provider: string
  game: string
  rowCount: number
  metrics: Record<string, number>
}

export type PlatformSlice = {
  platform: Platform
  segments: SegmentView[]
  userMetricKeys: string[]
  games: GameView[]
  gameMetricKeys: string[]
  gameTotals: Record<string, number>
  providerCount: number
  sources: string[]
  importedAt: string | null
  hasUsers: boolean
  hasGames: boolean
}

function blankLabel(value: string, empty: string): string {
  return value.trim() ? value : empty
}

function latestStamp(rows: Array<{ importedAt: string }>): string | null {
  return rows.reduce<string | null>((latest, row) => {
    if (!latest || row.importedAt > latest) return row.importedAt
    return latest
  }, null)
}

function buildSlice(platform: Platform, users: UserRow[], games: GameRow[]): PlatformSlice {
  const grouped = new Map<UserSegment, UserRow[]>()
  for (const row of users) {
    const list = grouped.get(row.segment) ?? []
    list.push(row)
    grouped.set(row.segment, list)
  }
  const segments: SegmentView[] = USER_SEGMENTS.map((segment) => {
    const rows = grouped.get(segment) ?? []
    return {
      segment,
      rowCount: rows.length,
      metrics: rows.length ? sumMetrics(rows.map((row) => row.metrics)) : null,
    }
  })
  const gameGroups = new Map<string, GameRow[]>()
  for (const row of games) {
    const key = `${row.provider}\n${row.game}`
    const list = gameGroups.get(key) ?? []
    list.push(row)
    gameGroups.set(key, list)
  }
  const gameViews: GameView[] = [...gameGroups.entries()]
    .map(([, rows]) => ({
      provider: blankLabel(rows[0]?.provider ?? '', '（未写厂商）'),
      game: blankLabel(rows[0]?.game ?? '', '（未写游戏）'),
      rowCount: rows.length,
      metrics: sumMetrics(rows.map((row) => row.metrics)),
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider, 'zh') || a.game.localeCompare(b.game, 'zh'))

  const allRows = [...users, ...games]
  return {
    platform,
    segments,
    userMetricKeys: collectMetricKeys(segments.map((segment) => segment.metrics)),
    games: gameViews,
    gameMetricKeys: collectMetricKeys(gameViews.map((game) => game.metrics)),
    gameTotals: sumMetrics(gameViews.map((game) => game.metrics)),
    providerCount: new Set(gameViews.map((game) => game.provider).filter((provider) => provider !== '（未写厂商）')).size,
    sources: [...new Set(allRows.map((row) => row.sourceName).filter(Boolean))],
    importedAt: latestStamp(allRows),
    hasUsers: users.length > 0,
    hasGames: games.length > 0,
  }
}

export function slicesFor(store: StoreData, date: string): PlatformSlice[] {
  const known = new Set(platforms.map((item) => item.id))
  const extras = new Set<string>()
  for (const row of [...store.users, ...store.games]) {
    if (row.date === date && !known.has(row.platformId)) extras.add(row.platformId)
  }
  const ordered = [...platforms.map((item) => item.id), ...[...extras].sort()]
  return ordered.map((id) => {
    const platform = describePlatform(id)
    const users = store.users.filter((row) => row.platformId === id && row.date === date)
    const games = store.games.filter((row) => row.platformId === id && row.date === date)
    return buildSlice(platform, users, games)
  })
}

export function visibleSlices(slices: PlatformSlice[], platformId: string): PlatformSlice[] {
  if (platformId === 'all') return slices
  return slices.filter((slice) => slice.platform.id === platformId)
}
