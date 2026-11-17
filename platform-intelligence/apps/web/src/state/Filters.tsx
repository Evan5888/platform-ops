import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEMO_END, DEMO_START, type Currency, type PlatformId } from '../mock/demo'

export type BatchStatus = '已确认' | '待确认' | '等式未通过' | '已确认（仅原型）'

export type Batch = {
  id: string
  name: string
  type: string
  status: BatchStatus
  days: number
  droppedTotal: boolean
  summary: string
}

const initialBatches: Batch[] = [
  { id: 'ok', name: '演示-平台日报.csv', type: '平台日汇总', status: '已确认', days: 14, droppedTotal: true, summary: '14 个演示日，总计行已丢弃。' },
  { id: 'pending', name: '演示-待确认.csv', type: '平台日汇总', status: '待确认', days: 3, droppedTotal: true, summary: '等待确认。确认只改变这个页面上的状态。' },
  { id: 'fail', name: '演示-等式未通过.csv', type: '平台日汇总', status: '等式未通过', days: 1, droppedTotal: true, summary: '演示：充值人数与首充加老用户充值人数不一致。' },
]

export type Note = {
  id: string
  platformId: PlatformId
  date: string
  metric: string
  conclusion: string
  followUp: string
  evidence: string
}

type Filters = {
  platformId: PlatformId
  setPlatformId: (id: PlatformId) => void
  from: string
  to: string
  setFrom: (value: string) => void
  setTo: (value: string) => void
  currency: Currency
  setCurrency: (value: Currency) => void
  dark: boolean
  setDark: (value: boolean) => void
  batches: Batch[]
  confirmBatch: (id: string) => void
  notes: Note[]
  addNote: (note: Omit<Note, 'id'>) => void
}

const FiltersContext = createContext<Filters | null>(null)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [platformId, setPlatformId] = useState<PlatformId>('afun-mx')
  const [from, setFromState] = useState(DEMO_START)
  const [to, setToState] = useState(DEMO_END)
  const [currency, setCurrency] = useState<Currency>('MXN')
  const [dark, setDarkState] = useState(false)
  const [batches, setBatches] = useState(initialBatches)
  const [notes, setNotes] = useState<Note[]>([])

  const value = useMemo<Filters>(() => ({
    platformId,
    setPlatformId,
    from,
    to,
    setFrom: (next) => {
      setFromState(next)
      if (next > to) setToState(next)
    },
    setTo: (next) => {
      setToState(next)
      if (next < from) setFromState(next)
    },
    currency,
    setCurrency,
    dark,
    setDark: (next) => {
      setDarkState(next)
      document.documentElement.classList.toggle('dark', next)
    },
    batches,
    confirmBatch: (id) => {
      setBatches((current) => current.map((batch) => (batch.id === id && batch.status === '待确认' ? { ...batch, status: '已确认（仅原型）' } : batch)))
    },
    notes,
    addNote: (note) => setNotes((current) => [{ ...note, id: `${current.length + 1}` }, ...current]),
  }), [platformId, from, to, currency, dark, batches, notes])

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}

export function useFilters(): Filters {
  const value = useContext(FiltersContext)
  if (!value) throw new Error('filters')
  return value
}
