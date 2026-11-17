import { useState } from 'react'
import { useFilters } from '../state/Filters'

const preview = [
  ['2026-03-01', '1000', '80', '240', '24000'],
  ['2026-03-02', '1020', '85', '243', '24300'],
  ['2026-03-03', '1040', '80', '246', '24600'],
]

const mapping = [
  ['日期', '业务日期'],
  ['活跃人数', '活跃人数（DAU）'],
  ['注册人数', '注册人数'],
  ['充值人数', '充值人数'],
  ['首充人数', '首充人数'],
  ['新充人数', '新充人数'],
  ['充值金额', '充值金额'],
  ['投注金额', '投注金额'],
]

export function DataCenter() {
  const filters = useFilters()
  const [selected, setSelected] = useState(filters.batches[0]?.id ?? 'ok')
  const batch = filters.batches.find((item) => item.id === selected) ?? filters.batches[0]
  if (!batch) return null
  return (
    <section data-testid="page-data">
      <h1 className="text-2xl font-semibold">数据中心</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">这里是导入流程的界面。文件不会被读取，也不会写入指标。正式导入沿用墨西哥自然日结束后再过 3 小时的窗口。这一页还不会按这个规则拦文件。</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-2">
          {filters.batches.map((item) => (
            <button key={item.id} type="button" data-testid={`batch-${item.id}`} className={`mb-1 w-full rounded-xl px-3 py-3 text-left ${item.id === batch.id ? 'bg-[var(--accent-soft)]' : ''}`} onClick={() => setSelected(item.id)}>
              <span className="block text-sm">{item.name}</span>
              <span className="text-xs text-[var(--muted)]">{item.status}</span>
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">{batch.name}</h2>
              <p className="text-sm text-[var(--muted)]">{batch.type} · {batch.days} 天 · {batch.summary}</p>
            </div>
            {batch.status === '待确认' ? (
              <button type="button" data-testid="confirm-batch" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white" onClick={() => filters.confirmBatch(batch.id)}>
                确认
              </button>
            ) : (
              <span className="rounded-full bg-[var(--bg)] px-3 py-1 text-sm">{batch.status}</span>
            )}
          </div>
          <h3 className="mt-5 text-sm font-medium">预览</h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                {['日期', '活跃人数（DAU）', '注册人数', '充值人数', '充值金额'].map((cell) => <th key={cell} className="py-1 font-normal">{cell}</th>)}
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row[0]} className="border-t border-[var(--line)]">
                  {row.map((cell) => <td key={cell} className="py-1 tabular-nums">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="mt-5 text-sm font-medium">字段映射</h3>
          <ul className="mt-2 text-sm">
            {mapping.map(([from, to]) => (
              <li key={from} className="border-t border-[var(--line)] py-1">{from} → {to}</li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-medium">校验</h3>
          <ul className="mt-2 text-sm leading-6">
            <li>{batch.droppedTotal ? '总计行已丢弃。' : '没有总计行。'}</li>
            <li className={batch.status === '等式未通过' ? 'text-[var(--down)]' : ''}>
              {batch.status === '等式未通过' ? '充值人数不等于首充人数加老用户充值人数。归因不会使用这条。' : '充值人数 = 首充人数 + 老用户充值人数。'}
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
