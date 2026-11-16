import * as XLSX from 'xlsx'
import { platforms as defaultPlatforms, type Platform } from '../data/platforms'
import { isIsoDate } from './dates'
import { type ParsedBundle, type ParsedGame, type ParsedUser, type UserSegment } from './types'

export type ParseArgs = {
  filename: string
  buffer: ArrayBuffer
  platforms?: Platform[]
  fallbackPlatformId: string
  fallbackDate: string
  preferFileValues: boolean
  latestReadyDate: string
}

type SheetMatrix = {
  name: string
  rows: Array<{ rowNumber: number; cells: unknown[] }>
  headers: string[]
}

const ignoredHeaders = new Set(
  ['备注', '说明', '币种', '货币', 'note', 'notes', 'remark', 'remarks', 'currency'].map(normToken),
)

export function normToken(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\u3000]+/g, '')
}

const headerFields = new Map<string, string>()

function alias(name: string, field: string) {
  headerFields.set(normToken(name), field)
}

;[
  ['分区', 'section'],
  ['数据分区', 'section'],
  ['section', 'section'],
  ['日期', 'date'],
  ['数据日期', 'date'],
  ['统计日期', 'date'],
  ['date', 'date'],
  ['平台', 'platform'],
  ['站点', 'platform'],
  ['品牌', 'platform'],
  ['platform', 'platform'],
  ['用户类型', 'segment'],
  ['用户分层', 'segment'],
  ['分层', 'segment'],
  ['segment', 'segment'],
  ['usertype', 'segment'],
  ['usersegment', 'segment'],
  ['用户', 'segment_or_count'],
  ['厂商', 'provider'],
  ['游戏厂商', 'provider'],
  ['供应商', 'provider'],
  ['provider', 'provider'],
  ['vendor', 'provider'],
  ['游戏', 'game'],
  ['游戏名称', 'game'],
  ['游戏名', 'game'],
  ['game', 'game'],
  ['gamename', 'game'],
  ['人数', '人数'],
  ['用户数', '人数'],
  ['users', '人数'],
  ['充值人数', '充值人数'],
  ['充值笔数', '充值笔数'],
  ['充值金额', '充值金额'],
  ['充值', '充值金额'],
  ['存款', '充值金额'],
  ['存款金额', '充值金额'],
  ['deposit', '充值金额'],
  ['depositamount', '充值金额'],
  ['recharge', '充值金额'],
  ['提现人数', '提现人数'],
  ['提现笔数', '提现笔数'],
  ['提现金额', '提现金额'],
  ['提现', '提现金额'],
  ['取款', '提现金额'],
  ['取款金额', '提现金额'],
  ['withdraw', '提现金额'],
  ['withdrawal', '提现金额'],
  ['投注人数', '投注人数'],
  ['投注金额', '投注金额'],
  ['投注', '投注金额'],
  ['下注金额', '投注金额'],
  ['bet', '投注金额'],
  ['betamount', '投注金额'],
  ['有效投注', '有效投注'],
  ['validbet', '有效投注'],
  ['派彩金额', '派彩金额'],
  ['派彩', '派彩金额'],
  ['payout', '派彩金额'],
  ['输赢', '输赢'],
  ['游戏输赢', '输赢'],
  ['平台输赢', '输赢'],
  ['ggr', '输赢'],
  ['winloss', '输赢'],
  ['注单数', '注单数'],
  ['注单', '注单数'],
  ['bets', '注单数'],
  ['优惠金额', '优惠金额'],
  ['彩金', '优惠金额'],
  ['bonus', '优惠金额'],
].forEach(([name, field]) => alias(name, field))

const segmentAliases = new Map<string, UserSegment>()
;[
  ['新充用户', '新充用户'],
  ['新充', '新充用户'],
  ['新存款用户', '新充用户'],
  ['newdeposit', '新充用户'],
  ['newdepositusers', '新充用户'],
  ['首充用户', '首充用户'],
  ['首充', '首充用户'],
  ['首次充值', '首充用户'],
  ['首次充值用户', '首充用户'],
  ['firstdeposit', '首充用户'],
  ['firstdepositusers', '首充用户'],
  ['老用户', '老用户'],
  ['老客', '老用户'],
  ['老客户', '老用户'],
  ['returning', '老用户'],
  ['returningusers', '老用户'],
  ['existingusers', '老用户'],
  ['oldusers', '老用户'],
].forEach(([name, segment]) => segmentAliases.set(normToken(name), segment as UserSegment))

function matchSection(value: string): 'user' | 'game' | null {
  const token = normToken(value)
  if (['用户', '用户数据', '用户日报', 'user', 'users'].some((item) => normToken(item) === token)) return 'user'
  if (
    ['游戏', '游戏与厂商', '游戏厂商', '厂商与游戏', 'game', 'games', 'provider', 'providers'].some(
      (item) => normToken(item) === token,
    )
  ) {
    return 'game'
  }
  return null
}

function matchSegment(value: string): UserSegment | null {
  return segmentAliases.get(normToken(value)) ?? null
}

function matchPlatform(value: string, list: Platform[]): Platform | undefined {
  const token = normToken(value)
  return list.find(
    (item) => normToken(item.id) === token || normToken(item.name) === token || item.aliases.some((aliasName) => normToken(aliasName) === token),
  )
}

function cellText(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const year = value.getUTCFullYear()
    const month = String(value.getUTCMonth() + 1).padStart(2, '0')
    const day = String(value.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return String(value).replace(/^\uFEFF/, '').trim()
}

export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value instanceof Date) return null
  const text = cellText(value)
  if (!text || text === '-' || text === '—' || text === '–') return null
  const negative = /^\(.*\)$/.test(text)
  const cleaned = text
    .replace(/[()]/g, '')
    .replace(/[$￥,\s\u00a0]/g, '')
    .replace(/MXN|mxn|RMB|CNY/g, '')
  if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) return null
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) return null
  return negative ? -Math.abs(parsed) : parsed
}

export function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear()
    const month = String(value.getUTCMonth() + 1).padStart(2, '0')
    const day = String(value.getUTCDate()).padStart(2, '0')
    const iso = `${year}-${month}-${day}`
    return isIsoDate(iso) ? iso : null
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000)
    return parseDate(utc)
  }
  const text = cellText(value)
  const matched = text.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
  if (!matched) return null
  const iso = `${matched[1]}-${matched[2].padStart(2, '0')}-${matched[3].padStart(2, '0')}`
  return isIsoDate(iso) ? iso : null
}

function decodeCsv(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer).replace(/^\uFEFF/, '')
  const broken = (utf8.match(/\uFFFD/g) ?? []).length
  if (broken === 0) return utf8
  try {
    return new TextDecoder('gbk').decode(buffer).replace(/^\uFEFF/, '')
  } catch {
    return utf8
  }
}

function detectDelimiter(text: string): ',' | ';' | '\t' {
  const line = text.split(/\r?\n/).find((item) => item.trim() && !item.trim().startsWith('#')) ?? ''
  const count = (needle: string) => {
    let total = 0
    let quoted = false
    for (const char of line) {
      if (char === '"') quoted = !quoted
      else if (!quoted && char === needle) total += 1
    }
    return total
  }
  const commas = count(',')
  const semis = count(';')
  const tabs = count('\t')
  if (tabs > commas && tabs >= semis) return '\t'
  if (semis > commas) return ';'
  return ','
}

export function parseCsvMatrix(text: string): unknown[][] {
  const delimiter = detectDelimiter(text)
  const rows: unknown[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const source = text.replace(/^\uFEFF/, '')
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') quoted = true
    else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') {
      cell += char
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function isCommentRow(cells: unknown[]): boolean {
  const first = cellText(cells[0] ?? '')
  if (!first.startsWith('#')) return false
  return cells.slice(1).every((cell) => cellText(cell) === '')
}

function isBlankRow(cells: unknown[]): boolean {
  return cells.every((cell) => cellText(cell) === '')
}

function matrixToSheet(name: string, matrix: unknown[][]): SheetMatrix | null {
  const headerIndex = matrix.findIndex((cells) => !isBlankRow(cells) && !isCommentRow(cells))
  if (headerIndex < 0) return null
  const headers = (matrix[headerIndex] ?? []).map((cell) => cellText(cell))
  const rows = matrix.slice(headerIndex + 1).flatMap((cells, offset) => {
    if (isBlankRow(cells) || isCommentRow(cells)) return []
    return [{ rowNumber: headerIndex + offset + 2, cells }]
  })
  return { name, headers, rows }
}

function readCsvSheets(buffer: ArrayBuffer, filename: string): SheetMatrix[] {
  const sheet = matrixToSheet(filename, parseCsvMatrix(decodeCsv(buffer)))
  return sheet ? [sheet] : []
}

function readExcelSheets(buffer: ArrayBuffer): SheetMatrix[] {
  const book = XLSX.read(buffer, { type: 'array', cellDates: true })
  return book.SheetNames.flatMap((name) => {
    const sheet = book.Sheets[name]
    if (!sheet) return []
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null })
    const parsed = matrixToSheet(name, matrix)
    return parsed ? [parsed] : []
  })
}

export function parseExportFile(args: ParseArgs): ParsedBundle {
  const list = args.platforms ?? defaultPlatforms
  const users: ParsedUser[] = []
  const games: ParsedGame[] = []
  const errors: string[] = []
  const notices: string[] = []
  const seenNotices = new Set<string>()
  const note = (message: string) => {
    if (seenNotices.has(message)) return
    seenNotices.add(message)
    notices.push(message)
  }

  const csv = /\.csv$/i.test(args.filename)
  const sheets = csv ? readCsvSheets(args.buffer, args.filename) : readExcelSheets(args.buffer)
  if (sheets.length === 0) {
    return { users, games, errors: ['文件里没有表头或数据行。第一行需要是列名。'], notices }
  }

  for (const sheet of sheets) {
    const sheetHint = matchSection(sheet.name)
    const seenHeaders = new Set<string>()
    for (const header of sheet.headers) {
      if (!header) continue
      const token = normToken(header)
      if (seenHeaders.has(token)) note(`重复列：${header}`)
      seenHeaders.add(token)
    }

    for (const line of sheet.rows) {
      const where = sheets.length > 1 ? `${sheet.name} 第 ${line.rowNumber} 行` : `第 ${line.rowNumber} 行`
      const metrics: Record<string, number> = {}
      let rowFailed = false
      const fail = (message: string) => {
        errors.push(message)
        rowFailed = true
      }
      let sectionText = ''
      let dateValue: unknown
      let platformValue: unknown
      let segmentValue: unknown
      let provider = ''
      let game = ''
      let looseUser: unknown

      sheet.headers.forEach((header, index) => {
        if (!header) return
        const value = line.cells[index]
        const field = headerFields.get(normToken(header))
        if (!field) {
          if (ignoredHeaders.has(normToken(header))) return
          if (cellText(value) === '') return
          const numeric = parseNumber(value)
          if (numeric == null) {
            note(`未使用的文本列：${header}`)
            return
          }
          metrics[header.trim()] = numeric
          return
        }
        if (field === 'section') sectionText = cellText(value)
        else if (field === 'date') dateValue = value
        else if (field === 'platform') platformValue = value
        else if (field === 'segment') segmentValue = value
        else if (field === 'segment_or_count') looseUser = value
        else if (field === 'provider') provider = cellText(value)
        else if (field === 'game') game = cellText(value)
        else if (cellText(value) !== '') {
          const numeric = parseNumber(value)
          if (numeric == null) fail(`${where} 的「${header}」不是数字`)
          else metrics[field] = numeric
        }
      })

      if (looseUser != null && cellText(looseUser) !== '') {
        const asSegment = matchSegment(cellText(looseUser))
          if (asSegment) segmentValue = cellText(looseUser)
          else {
            const numeric = parseNumber(looseUser)
            if (numeric == null) fail(`${where} 的「用户」既不是用户类型，也不是人数`)
            else metrics['人数'] = numeric
          }
      }

      let section = sectionText ? matchSection(sectionText) : null
      if (sectionText && !section) {
        fail(`${where} 的分区无法识别：${sectionText}`)
        continue
      }
      const segmentText = cellText(segmentValue)
      const hasSegment = segmentText !== ''
      const hasGame = provider !== '' || game !== ''
      if (!section) {
        if (hasSegment && hasGame) {
          fail(`${where} 同时写了用户类型和游戏，请加「分区」列（用户 / 游戏）`)
          continue
        }
        if (hasSegment) section = 'user'
        else if (hasGame) section = 'game'
        else if (sheetHint) section = sheetHint
        else {
          fail(`${where} 无法判断属于用户还是游戏`)
          continue
        }
      }

      const fileDateText = cellText(dateValue)
      let date = args.fallbackDate
      if (args.preferFileValues && fileDateText !== '') {
        const parsed = parseDate(dateValue)
        if (!parsed) {
          fail(`${where} 的日期无法识别`)
          continue
        }
        date = parsed
      }
      if (!isIsoDate(date)) {
        fail(`${where} 缺少有效数据日期`)
        continue
      }
      if (date > args.latestReadyDate) {
        fail(`${where} 的数据日期 ${date} 还没到导入窗口（墨西哥自然日结束后 3 小时）`)
        continue
      }

      const filePlatformText = cellText(platformValue)
      let platformId = args.fallbackPlatformId
      if (args.preferFileValues && filePlatformText !== '') {
        const matched = matchPlatform(filePlatformText, list)
        if (!matched) {
          fail(`${where} 的平台无法识别：${filePlatformText}`)
          continue
        }
        platformId = matched.id
      }
      if (!platformId) {
        fail(`${where} 缺少平台`)
        continue
      }
      if (rowFailed) continue

      if (section === 'user') {
        const segment = matchSegment(segmentText)
        if (!segment) {
          fail(segmentText ? `${where} 的用户类型无法识别：${segmentText}` : `${where} 缺少用户类型（新充用户、首充用户、老用户）`)
          continue
        }
        if (hasGame) note('用户行里的厂商或游戏不会进入游戏表。游戏请另起一行，并把分区写成「游戏」。')
        users.push({ date, platformId, segment, metrics })
        continue
      }

      if (!hasGame) {
        fail(`${where} 缺少厂商或游戏`)
        continue
      }
      if (hasSegment) note('游戏行里的用户类型不会进入用户表。')
      games.push({ date, platformId, provider, game, metrics })
    }
  }

  if (users.length === 0 && games.length === 0 && errors.length === 0) {
    errors.push('没有可导入的数据行。')
  }

  return { users, games, errors, notices }
}
