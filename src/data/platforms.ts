export type Platform = {
  id: string
  name: string
  market: string
  currency: string
  accent: string
  aliases: string[]
}

/**
 * 平台名单。加平台只改这里，页面会跟着长出来。
 * 市场目前都是墨西哥。
 */
export const platforms: Platform[] = [
  {
    id: 'afun-mx',
    name: 'Afun-MX',
    market: 'MX',
    currency: 'MXN',
    accent: '#1493c7',
    aliases: ['afun', 'afunmx', 'afun mx', 'afun-mx'],
  },
  {
    id: 'betroia',
    name: 'Betroia',
    market: 'MX',
    currency: 'MXN',
    accent: '#0e6284',
    aliases: ['betroia mx', 'betroia-mx'],
  },
]

const marketNames: Record<string, string> = {
  MX: '墨西哥',
}

export function marketName(code: string): string {
  return marketNames[code] ?? code
}

export function marketSummary(list: Platform[]): string {
  return [...new Set(list.map((item) => item.market))].map(marketName).join('、')
}

export function platformById(id: string): Platform | undefined {
  return platforms.find((item) => item.id === id)
}

export function describePlatform(id: string): Platform {
  return (
    platformById(id) ?? {
      id,
      name: id,
      market: 'MX',
      currency: 'MXN',
      accent: '#7ea8b8',
      aliases: [],
    }
  )
}
