export const USER_SEGMENTS = ['新充用户', '首充用户', '老用户'] as const

export type UserSegment = (typeof USER_SEGMENTS)[number]

export type MetricMap = Record<string, number>

export type UserRow = {
  date: string
  platformId: string
  segment: UserSegment
  metrics: MetricMap
  sourceName: string
  importedAt: string
}

export type GameRow = {
  date: string
  platformId: string
  provider: string
  game: string
  metrics: MetricMap
  sourceName: string
  importedAt: string
}

export type StoreData = {
  version: 1
  users: UserRow[]
  games: GameRow[]
}

export type ParsedUser = Omit<UserRow, 'sourceName' | 'importedAt'>
export type ParsedGame = Omit<GameRow, 'sourceName' | 'importedAt'>

export type ParsedBundle = {
  users: ParsedUser[]
  games: ParsedGame[]
  errors: string[]
  notices: string[]
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
