import { describePlatform, platforms, type Platform } from '../data/platforms'
import { convertMoney } from './currency'
import { collectMetricKeys, metricKind, orderMetricKeys, sumMetrics } from './metrics'
import { USER_SEGMENTS, type Currency, type GameRow, type MetricMap, type StoreData, type UserRow, type UserSegment } from './types'

export type SegmentView = {
  segment: UserSegment
  rowCount: number
  metrics: Record<string, number> | null
  needsRateKeys: string[]
}

export type GameView = {
  provider: string
  game: string
  rowCount: number
  metrics: Record<string, number>
  needsRateKeys: string[]
  source: Currency | null
}

export type PlatformSlice = {
  platform: Platform
  displayCurrency: Currency
  rate: number | null
  segments: SegmentView[]
  userMetricKeys: string[]
  userSource: Currency | null
  userConverted: boolean
  userNeedsRate: boolean
  games: GameView[]
  gameMetricKeys: string[]
  gameNeedsRateKeys: string[]
  gameTotals: Record<string, number>
  gameSource: Currency | null
  gameConverted: boolean
  gameNeedsRate: boolean
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

function presentMetrics(metrics: MetricMap, source: Currency, display: Currency, rate: number | null): { metrics: MetricMap; needsRateKeys: string[] } {
  if (source === display) return { metrics, needsRateKeys: [] }
  const next: MetricMap = {}
  const needsRateKeys: string[] = []
  for (const [key, value] of Object.entries(metrics)) {
    if (metricKind(key) !== 'money') {
      next[key] = value
      continue
    }
    const converted = convertMoney(value, source, display, rate)
    if (converted == null) needsRateKeys.push(key)
    else next[key] = converted
  }
  return { metrics: next, needsRateKeys }
}

function projectRows<T extends { currency: Currency; metrics: MetricMap }>(
  rows: T[],
  display: Currency,
  rate: number | null,
): { metrics: MetricMap | null; needsRateKeys: string[]; source: Currency | null; rowCount: number } {
  if (rows.length === 0) return { metrics: null, needsRateKeys: [], source: null, rowCount: 0 }
  const native = rows.filter((row) => row.currency === display)
  const used = native.length > 0 ? native : rows
  const source = used[0]?.currency ?? null
  if (!source) return { metrics: null, needsRateKeys: [], source: null, rowCount: 0 }
  const presented = presentMetrics(sumMetrics(used.map((row) => row.metrics)), source, display, rate)
  return { metrics: presented.metrics, needsRateKeys: presented.needsRateKeys, source, rowCount: used.length }
}

function buildSlice(platform: Platform, users: UserRow[], games: GameRow[], display: Currency, rate: number | null): PlatformSlice {
  const grouped = new Map<UserSegment, UserRow[]>()
  for (const row of users) {
    const list = grouped.get(row.segment) ?? []
    list.push(row)
    grouped.set(row.segment, list)
  }
  const projectedSegments = USER_SEGMENTS.map((segment) => ({
    segment,
    ...projectRows(grouped.get(segment) ?? [], display, rate),
  }))
  const segments: SegmentView[] = projectedSegments.map((projected) => ({
    segment: projected.segment,
    rowCount: projected.rowCount,
    metrics: projected.metrics,
    needsRateKeys: projected.needsRateKeys,
  }))
  const segmentSources = projectedSegments.flatMap((projected) => (projected.source ? [projected.source] : []))

  const gameGroups = new Map<string, GameRow[]>()
  for (const row of games) {
    const key = `${row.provider}\n${row.game}`
    const list = gameGroups.get(key) ?? []
    list.push(row)
    gameGroups.set(key, list)
  }
  const gameViews: GameView[] = [...gameGroups.entries()]
    .map(([, rows]) => {
      const projected = projectRows(rows, display, rate)
      return {
        provider: blankLabel(rows[0]?.provider ?? '', '（未写厂商）'),
        game: blankLabel(rows[0]?.game ?? '', '（未写游戏）'),
        rowCount: projected.rowCount,
        metrics: projected.metrics ?? {},
        needsRateKeys: projected.needsRateKeys,
        source: projected.source,
      }
    })
    .sort((a, b) => a.provider.localeCompare(b.provider, 'zh') || a.game.localeCompare(b.game, 'zh'))

  const gameNeedsRateKeys = orderMetricKeys(gameViews.flatMap((game) => game.needsRateKeys))
  const blockedTotals = new Set(gameNeedsRateKeys)
  const gameTotals: Record<string, number> = {}
  for (const game of gameViews) {
    for (const [key, value] of Object.entries(game.metrics)) {
      if (blockedTotals.has(key)) continue
      gameTotals[key] = (gameTotals[key] ?? 0) + value
    }
  }

  const userNeeds = segments.flatMap((segment) => segment.needsRateKeys)
  const userSource = new Set(segmentSources).size === 1 ? segmentSources[0] ?? null : null
  const gameSources = gameViews.flatMap((game) => (game.source ? [game.source] : []))
  const gameSource = new Set(gameSources).size === 1 ? gameSources[0] ?? null : null
  const convertedMoney = (metrics: MetricMap | null, source: Currency | null) =>
    Boolean(source && source !== display && metrics && Object.keys(metrics).some((key) => metricKind(key) === 'money'))
  const userConverted = projectedSegments.some((projected) => convertedMoney(projected.metrics, projected.source))
  const gameConverted = gameViews.some((game) => convertedMoney(game.metrics, game.source))

  return {
    platform,
    displayCurrency: display,
    rate,
    segments,
    userMetricKeys: orderMetricKeys([...collectMetricKeys(segments.map((segment) => segment.metrics)), ...userNeeds]),
    userSource,
    userConverted,
    userNeedsRate: userNeeds.length > 0,
    games: gameViews,
    gameMetricKeys: orderMetricKeys([...collectMetricKeys(gameViews.map((game) => game.metrics)), ...gameNeedsRateKeys]),
    gameNeedsRateKeys,
    gameTotals,
    gameSource,
    gameConverted,
    gameNeedsRate: gameNeedsRateKeys.length > 0,
    providerCount: new Set(gameViews.map((game) => game.provider).filter((provider) => provider !== '（未写厂商）')).size,
    sources: [...new Set([...users, ...games].map((row) => row.sourceName).filter(Boolean))],
    importedAt: latestStamp([...users, ...games]),
    hasUsers: users.length > 0,
    hasGames: games.length > 0,
  }
}

export function slicesFor(store: StoreData, date: string, display: Currency): PlatformSlice[] {
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
    return buildSlice(platform, users, games, display, store.rates[id]?.mxnPerUsd ?? null)
  })
}

export function visibleSlices(slices: PlatformSlice[], platformId: string): PlatformSlice[] {
  if (platformId === 'all') return slices
  return slices.filter((slice) => slice.platform.id === platformId)
}
