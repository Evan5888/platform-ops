export const USER_SEGMENTS = ['新充用户', '首充用户', '老用户'] as const

export type UserSegment = (typeof USER_SEGMENTS)[number]

export type Currency = 'MXN' | 'USD'

export type MetricMap = Record<string, number>

export type UserRow = {
  date: string
  platformId: string
  segment: UserSegment
  currency: Currency
  metrics: MetricMap
  sourceName: string
  importedAt: string
}

export type GameRow = {
  date: string
  platformId: string
  provider: string
  game: string
  currency: Currency
  metrics: MetricMap
  sourceName: string
  importedAt: string
}

/** 1 美金可兑换的墨西哥比索。没有文件之前不放数字。 */
export type PlatformRate = {
  mxnPerUsd: number
  sourceName: string
  importedAt: string
  asOf: string | null
}

export type StoreData = {
  version: 2
  users: UserRow[]
  games: GameRow[]
  rates: Record<string, PlatformRate>
}

export type ParsedUser = Omit<UserRow, 'sourceName' | 'importedAt'>
export type ParsedGame = Omit<GameRow, 'sourceName' | 'importedAt'>

export type ParsedBundle = {
  users: ParsedUser[]
  games: ParsedGame[]
  errors: string[]
  notices: string[]
}

export type ParsedRateRow = {
  platformId: string
  mxnPerUsd: number
  asOf: string | null
}

export type InboxFile = {
  name: string
  bytes: number
  modifiedAt: string
}

export type InboxSnapshot =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; folder: string; files: InboxFile[] }
