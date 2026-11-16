import { describePlatform, platforms } from '../data/platforms'
import { addDays } from './dates'
import { USER_SEGMENTS, type Currency, type StoreData, type UserRow, type UserSegment } from './types'

const SHORT: Record<UserSegment, string> = {
  新充用户: '新充',
  首充用户: '首充',
  老用户: '老用户',
}

export type MovementPart = {
  segment: UserSegment
  delta: number
}

export type MovementLine = {
  platformId: string
  platformName: string
  status: 'no-file' | 'no-count' | 'no-history' | 'explained'
  text: string
  parts: MovementPart[] | null
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
}

function phrase(delta: number): string {
  if (delta > 0) return `增加 ${formatCount(delta)}`
  if (delta < 0) return `减少 ${formatCount(Math.abs(delta))}`
  return '持平'
}

function leadPhrase(parts: MovementPart[]): string {
  const max = Math.max(...parts.map((part) => Math.abs(part.delta)))
  if (max === 0) {
    return parts.length === USER_SEGMENTS.length ? '三类相对前一日都没有变化。' : '这些分类相对前一日都没有变化。'
  }
  const leads = parts.filter((part) => Math.abs(part.delta) === max)
  return `变动主要来自${leads.map((part) => SHORT[part.segment]).join('和')}。`
}

function segmentCount(rows: UserRow[], segment: UserSegment, prefer: Currency): number | null {
  const matching = rows.filter((row) => row.segment === segment)
  const order: Currency[] = [prefer, prefer === 'MXN' ? 'USD' : 'MXN']
  for (const currency of order) {
    const chosen = matching.filter((row) => row.currency === currency && typeof row.metrics['人数'] === 'number')
    if (chosen.length === 0) continue
    return chosen.reduce((sum, row) => sum + row.metrics['人数'], 0)
  }
  return null
}

function platformIds(store: StoreData, date: string, previous: string, platformId: string): string[] {
  if (platformId !== 'all') return [platformId]
  const known = new Set(platforms.map((item) => item.id))
  const extras = new Set<string>()
  for (const row of store.users) {
    if ((row.date === date || row.date === previous) && !known.has(row.platformId)) extras.add(row.platformId)
  }
  return [...platforms.map((item) => item.id), ...[...extras].sort()]
}

function lineFor(store: StoreData, platformId: string, date: string, previous: string, prefer: Currency): MovementLine {
  const name = describePlatform(platformId).name
  const todayRows = store.users.filter((row) => row.platformId === platformId && row.date === date)
  const yesterdayRows = store.users.filter((row) => row.platformId === platformId && row.date === previous)
  const base = { platformId, platformName: name }

  if (todayRows.length === 0) {
    return {
      ...base,
      status: 'no-file',
      text: '这一天还没有用户文件，看不出日环比由谁带动。',
      parts: null,
    }
  }

  const todayCounts = USER_SEGMENTS.map((segment) => segmentCount(todayRows, segment, prefer))
  if (todayCounts.every((value) => value == null)) {
    return {
      ...base,
      status: 'no-count',
      text: '这一天的用户文件里没有「人数」，不能判断新充、首充、老用户谁在变化。',
      parts: null,
    }
  }

  const sides = USER_SEGMENTS.map((segment) => ({
    segment,
    today: segmentCount(todayRows, segment, prefer),
    yesterday: segmentCount(yesterdayRows, segment, prefer),
  }))
  const compared = sides.flatMap((side) => {
    if (side.today == null || side.yesterday == null) return []
    return [{ segment: side.segment, delta: side.today - side.yesterday }]
  })

  if (compared.length === 0) {
    return {
      ...base,
      status: 'no-history',
      text: `已有这一天的人数，但 ${previous} 没有可对照的人数。历史不够，不推测原因。`,
      parts: null,
    }
  }

  const total = compared.reduce((sum, part) => sum + part.delta, 0)
  const detail = compared.map((part) => `${SHORT[part.segment]}${phrase(part.delta)}`).join('，')
  const missingNote = sides
    .filter((side) => side.today == null || side.yesterday == null)
    .map((side) =>
      side.today == null && side.yesterday == null
        ? `${SHORT[side.segment]}没有人数，没有计入，也不当成 0。`
        : `${SHORT[side.segment]}缺少相邻一天的人数，没有计入，也不当成 0。`,
    )
    .join('')
  const scopeWord = missingNote ? '可比人数' : '人数'
  return {
    ...base,
    status: 'explained',
    text: `较 ${previous}，${scopeWord}合计${phrase(total)}。${detail}。${leadPhrase(compared)}${missingNote}`,
    parts: compared,
  }
}

export function userMovement(store: StoreData, date: string, platformId: string, prefer: Currency): MovementLine[] {
  const previous = addDays(date, -1)
  const lines = platformIds(store, date, previous, platformId).map((id) => lineFor(store, id, date, previous, prefer))
  if (lines.every((line) => line.status === 'no-file')) {
    return [
      {
        platformId,
        platformName: platformId === 'all' ? '全部平台' : lines[0]?.platformName ?? platformId,
        status: 'no-file',
        text: '还没有导入的用户人数，所以不说明日环比来自新充、首充还是老用户。需要相邻两个墨西哥自然日。',
        parts: null,
      },
    ]
  }
  return lines
}
