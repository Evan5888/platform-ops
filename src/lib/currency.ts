import type { Currency } from './types'

export function currencyLabel(currency: Currency): string {
  return currency === 'MXN' ? '墨西哥比索' : '美金'
}

export function otherCurrency(currency: Currency): Currency {
  return currency === 'MXN' ? 'USD' : 'MXN'
}

export function currencyFromFilename(name: string): Currency | null {
  const hasMx = /mxn|peso|比索/i.test(name)
  const hasUs = /usd|dollar|美金|美元/i.test(name)
  if (hasMx === hasUs) return null
  return hasMx ? 'MXN' : 'USD'
}

export function matchCurrency(value: string): Currency | null {
  const token = value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\u3000]+/g, '')
  if (['mxn', '墨西哥比索', '比索', 'peso', 'pesos', 'mxp'].includes(token)) return 'MXN'
  if (['usd', '美金', '美元', 'dollar', 'dollars', 'usdollar'].includes(token)) return 'USD'
  return null
}

export function formatRate(rate: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 6 }).format(rate)
}

/** 用该平台已保存的「1 美金 = ? 比索」换算。没有汇率就返回 null，不估一个数。 */
export function convertMoney(amount: number, from: Currency, to: Currency, mxnPerUsd: number | null): number | null {
  if (!Number.isFinite(amount)) return null
  if (from === to) return amount
  if (mxnPerUsd == null || !(mxnPerUsd > 0) || !Number.isFinite(mxnPerUsd)) return null
  if (from === 'MXN' && to === 'USD') return amount / mxnPerUsd
  return amount * mxnPerUsd
}
