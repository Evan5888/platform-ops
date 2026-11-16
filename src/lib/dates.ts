export const MEXICO_TZ = 'America/Mexico_City'

/** 墨西哥自然日结束后再过 3 小时，该日数据才进入可导入窗口。 */
export const WINDOW_LAG_HOURS = 3

export function mexicoClock(now: Date): { date: string; hour: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: MEXICO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]))
  let hour = Number(parts.hour)
  if (!Number.isFinite(hour) || hour === 24) hour = 0
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
  }
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
}

/** 最近一个已经走完「自然日 + 3 小时」的墨西哥数据日期。 */
export function latestReadyDataDate(now = new Date()): string {
  const { date, hour } = mexicoClock(now)
  return hour < WINDOW_LAG_HOURS ? addDays(date, -2) : addDays(date, -1)
}

export function weekdayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('zh-CN', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatStamp(iso: string): string {
  const formatted = new Intl.DateTimeFormat('zh-CN', {
    timeZone: MEXICO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
  return `${formatted}（墨西哥）`
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
}
