import assert from 'node:assert/strict'
import { platforms } from '../src/data/platforms.ts'
import { latestReadyDataDate } from '../src/lib/dates.ts'
import { parseExportFile } from '../src/lib/parse.ts'

assert.equal(latestReadyDataDate(new Date('2026-11-16T11:17:00Z')), '2026-11-15')
assert.equal(latestReadyDataDate(new Date('2026-11-16T08:30:00Z')), '2026-11-14')
assert.equal(latestReadyDataDate(new Date('2026-11-16T09:00:00Z')), '2026-11-15')

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
})
assert.equal(future.users.length, 0)
assert.ok(future.errors.length > 0)

console.log('self-check ok')
