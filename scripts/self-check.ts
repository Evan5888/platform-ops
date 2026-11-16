import assert from 'node:assert/strict'
import fs from 'node:fs'
import { platforms } from '../src/data/platforms.ts'
import { convertMoney, formatRate } from '../src/lib/currency.ts'
import { latestReadyDataDate } from '../src/lib/dates.ts'
import { userMovement } from '../src/lib/movement.ts'
import { parseReports, withBundled } from '../src/lib/reports.ts'
import { parseExportFile, parseRateFile } from '../src/lib/parse.ts'
import type { StoreData } from '../src/lib/types.ts'
import { slicesFor } from '../src/lib/view.ts'

assert.equal(latestReadyDataDate(new Date('2026-11-16T11:17:00Z')), '2026-11-15')
assert.equal(latestReadyDataDate(new Date('2026-11-16T08:30:00Z')), '2026-11-14')
assert.equal(latestReadyDataDate(new Date('2026-11-16T09:00:00Z')), '2026-11-15')
assert.equal(formatRate(18.67), '18.67')
assert.equal(formatRate(17.4245), '17.42')

const csv = [
  '分区,日期,平台,用户类型,厂商,游戏,人数,充值金额,投注金额,输赢,注单数',
  '用户,2026-11-15,Afun-MX,新充用户,,,4,1800,,,',
  '用户,2026-11-15,Afun-MX,首充用户,,,4,1800,,,',
  '用户,2026-11-15,Afun-MX,老用户,,,11,9600,,,',
  '游戏,2026-11-15,Afun-MX,,PG Soft,虎虎生财,,,2400,300,40',
].join('\n')

const bytes = new TextEncoder().encode(csv)
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
const parsed = parseExportFile({
  filename: 'sample.csv',
  buffer,
  platforms,
  fallbackPlatformId: 'afun-mx',
  fallbackDate: '2026-11-15',
  preferFileValues: true,
  latestReadyDate: '2026-11-15',
  currency: 'MXN',
})

assert.deepEqual(parsed.errors, [])
assert.equal(parsed.users.length, 3)
assert.equal(parsed.users[0]?.metrics['人数'], 4)
assert.equal(parsed.users[0]?.metrics['充值金额'], 1800)
assert.equal(parsed.games[0]?.game, '虎虎生财')
assert.equal(parsed.games[0]?.metrics['投注金额'], 2400)
assert.equal('人数' in parsed.games[0]!.metrics, false)

const future = parseExportFile({
  filename: 'future.csv',
  buffer: new TextEncoder().encode('日期,平台,用户类型,人数\n2026-11-16,Afun-MX,新充用户,1').buffer,
  platforms,
  fallbackPlatformId: 'afun-mx',
  fallbackDate: '2026-11-15',
  preferFileValues: true,
  latestReadyDate: '2026-11-15',
  currency: 'MXN',
})
assert.equal(future.users.length, 0)
assert.ok(future.errors.length > 0)

assert.equal(convertMoney(1800, 'MXN', 'USD', null), null)
assert.equal(convertMoney(1800, 'MXN', 'USD', 18), 100)
assert.equal(convertMoney(100, 'USD', 'MXN', 18), 1800)

const blankRates = parseRateFile({
  filename: 'rates.csv',
  buffer: new TextEncoder().encode('平台,汇率\nAfun-MX,\nBetroia,\n').buffer,
  platforms,
})
assert.equal(blankRates.kind, 'rate')
if (blankRates.kind === 'rate') assert.equal(blankRates.rates.length, 0)

const oneRate = parseRateFile({
  filename: 'rates.csv',
  buffer: new TextEncoder().encode('平台,汇率\nAfun-MX,18.5\nBetroia,\n').buffer,
  platforms,
})
assert.equal(oneRate.kind, 'rate')
if (oneRate.kind === 'rate') {
  assert.equal(oneRate.rates.length, 1)
  assert.equal(oneRate.rates[0]?.platformId, 'afun-mx')
  assert.equal(oneRate.rates[0]?.mxnPerUsd, 18.5)
}

const notRate = parseRateFile({
  filename: 'sample.csv',
  buffer,
  platforms,
})
assert.equal(notRate.kind, 'not-rate')

function row(date: string, segment: '新充用户' | '首充用户' | '老用户', count: number, money: number, currency: 'MXN' | 'USD' = 'MXN') {
  return {
    date,
    platformId: 'afun-mx',
    segment,
    currency,
    metrics: { 人数: count, 充值金额: money },
    sourceName: 'sample.csv',
    importedAt: '2026-11-16T12:00:00.000Z',
  }
}

const store: StoreData = {
  version: 2,
  rates: {},
  games: [],
  users: [row('2026-11-15', '新充用户', 4, 1800), row('2026-11-15', '首充用户', 4, 1800), row('2026-11-15', '老用户', 11, 9600)],
}

const emptyMove = userMovement({ version: 2, users: [], games: [], rates: {} }, '2026-11-15', 'all', 'MXN')
assert.equal(emptyMove.length, 1)
assert.equal(emptyMove[0]?.status, 'no-file')
assert.match(emptyMove[0]?.text ?? '', /不说明/)

const oneDay = userMovement(store, '2026-11-15', 'afun-mx', 'MXN')
assert.equal(oneDay[0]?.status, 'no-history')
assert.match(oneDay[0]?.text ?? '', /不推测原因/)
assert.equal(oneDay[0]?.parts, null)

store.users.push(row('2026-11-14', '新充用户', 0, 0), row('2026-11-14', '老用户', 2, 100))
const partial = userMovement(store, '2026-11-15', 'afun-mx', 'MXN')
assert.equal(partial[0]?.status, 'explained')
assert.match(partial[0]?.text ?? '', /首充缺少相邻一天的人数，没有计入，也不当成 0/)
assert.equal(partial[0]?.parts?.some((part) => part.segment === '首充用户'), false)
assert.equal(partial[0]?.parts?.find((part) => part.segment === '老用户')?.delta, 9)

store.users.push(row('2026-11-14', '首充用户', 5, 100))
const full = userMovement(store, '2026-11-15', 'afun-mx', 'MXN')
assert.equal(full[0]?.text, '较 2026-11-14，人数合计增加 12。新充增加 4，首充减少 1，老用户增加 9。变动主要来自老用户。')

const usdView = slicesFor(store, '2026-11-15', 'USD')
const afun = usdView.find((slice) => slice.platform.id === 'afun-mx')
assert.equal(afun?.segments[0]?.metrics?.['人数'], 4)
assert.equal(afun?.segments[0]?.metrics?.['充值金额'], undefined)
assert.ok(afun?.segments[0]?.needsRateKeys.includes('充值金额'))

store.rates['afun-mx'] = { mxnPerUsd: 18, sourceName: 'rates.csv', importedAt: '2026-11-16T12:00:00.000Z', asOf: null }
const converted = slicesFor(store, '2026-11-15', 'USD').find((slice) => slice.platform.id === 'afun-mx')
assert.equal(converted?.segments[0]?.metrics?.['充值金额'], 100)
assert.equal(converted?.userConverted, true)

store.users.push(row('2026-11-15', '新充用户', 4, 90, 'USD'))
const nativeUsd = slicesFor(store, '2026-11-15', 'USD').find((slice) => slice.platform.id === 'afun-mx')
assert.equal(nativeUsd?.segments[0]?.metrics?.['充值金额'], 90)
assert.equal(nativeUsd?.segments[2]?.metrics?.['充值金额'], 9600 / 18)
assert.equal(nativeUsd?.userConverted, true)
assert.equal(slicesFor(store, '2026-11-15', 'MXN').find((slice) => slice.platform.id === 'afun-mx')?.segments[2]?.metrics?.['充值金额'], 9600)

function reportCsv(name: string) {
  return fs.readFileSync(new URL(`../src/data/reports/${name}`, import.meta.url), 'utf8')
}

const bundle = parseReports([
  { platformId: 'afun-mx', currency: 'MXN', filename: 'afun-mx-mxn.csv', csv: reportCsv('afun-mx-mxn.csv') },
  { platformId: 'afun-mx', currency: 'USD', filename: 'afun-mx-usd.csv', csv: reportCsv('afun-mx-usd.csv') },
  { platformId: 'betroia', currency: 'MXN', filename: 'betroia-mxn.csv', csv: reportCsv('betroia-mxn.csv') },
  { platformId: 'betroia', currency: 'USD', filename: 'betroia-usd.csv', csv: reportCsv('betroia-usd.csv') },
])

assert.equal(bundle.start, '2026-10-01')
assert.equal(bundle.end, '2026-11-15')
assert.equal(new Set(bundle.points.filter((point) => point.platformId === 'afun-mx' && point.currency === 'MXN').map((point) => point.date)).size, 46)
assert.equal(bundle.verdicts['afun-mx']?.stable, true)
assert.equal(bundle.verdicts['afun-mx']?.pairs, 877)
assert.ok(Math.abs((bundle.verdicts['afun-mx']?.mxnPerUsd ?? 0) - 18.67) < 1e-6)
assert.equal(bundle.verdicts['betroia']?.stable, true)
assert.equal(bundle.verdicts['betroia']?.pairs, 874)
assert.ok(Math.abs((bundle.verdicts['betroia']?.mxnPerUsd ?? 0) - 17.4245) < 1e-6)
assert.equal(bundle.oldUsers['afun-mx']?.derived, false)
assert.equal(bundle.oldUsers['afun-mx']?.matchedDays, 0)
assert.equal(bundle.oldUsers['afun-mx']?.missingColumn, '老用户充值金额')
assert.equal(bundle.oldUsers['betroia']?.matchedDays, 0)
assert.equal(bundle.users.some((row) => row.segment === '老用户'), false)

const afunFresh = bundle.users.find((row) => row.platformId === 'afun-mx' && row.date === '2026-11-15' && row.currency === 'MXN' && row.segment === '新充用户')
const afunFirst = bundle.users.find((row) => row.platformId === 'afun-mx' && row.date === '2026-11-15' && row.currency === 'MXN' && row.segment === '首充用户')
const afunFreshUsd = bundle.users.find((row) => row.platformId === 'afun-mx' && row.date === '2026-11-15' && row.currency === 'USD' && row.segment === '新充用户')
assert.equal(afunFresh?.metrics['人数'], 6233)
assert.equal(afunFresh?.metrics['充值金额'], 1199092.24)
assert.equal(afunFirst?.metrics['人数'], 8688)
assert.equal(afunFirst?.metrics['充值金额'], 1558122.74)
assert.equal(afunFreshUsd?.metrics['人数'], 6233)
assert.equal(afunFreshUsd?.metrics['充值金额'], 64225.615)
const afunDay = bundle.points.find((point) => point.platformId === 'afun-mx' && point.date === '2026-11-15' && point.currency === 'MXN')
const betDay = bundle.points.find((point) => point.platformId === 'betroia' && point.date === '2026-11-15' && point.currency === 'MXN')
assert.equal(afunDay?.活跃人数, 391531)
assert.equal(afunDay?.注册人数, 15791)
assert.equal(betDay?.活跃人数, 36358)
assert.equal(betDay?.注册人数, 3315)
assert.equal(betDay?.首充人数, 1719)

const attached = withBundled({ version: 2, users: [], games: [], rates: {} }, bundle)
const attachedMove = userMovement(attached, '2026-11-15', 'afun-mx', 'MXN')
assert.match(attachedMove[0]?.text ?? '', /老用户没有人数，没有计入，也不当成 0/)
assert.equal(attachedMove[0]?.parts?.some((part) => part.segment === '老用户'), false)
assert.equal(attached.games.length, 0)

console.log('self-check ok')
