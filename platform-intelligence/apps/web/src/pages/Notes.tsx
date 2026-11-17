import { useState } from 'react'
import { platformById, rowOn } from '../mock/demo'
import { useFilters } from '../state/Filters'

export function Notes() {
  const filters = useFilters()
  const platform = platformById(filters.platformId)
  const today = rowOn(filters.platformId, filters.to)
  const [metric, setMetric] = useState('充值人数')
  const [conclusion, setConclusion] = useState('')
  const [followUp, setFollowUp] = useState('')
  return (
    <section data-testid="page-notes">
      <h1 className="text-2xl font-semibold">分析记录</h1>
      <form
        className="mt-4 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!conclusion.trim()) return
          const evidence = today ? `${platform.name} ${filters.to} 的演示快照。笔记不改总览数字。` : '没有结束日'
          filters.addNote({ platformId: filters.platformId, date: filters.to, metric, conclusion: conclusion.trim(), followUp: followUp.trim(), evidence })
          setConclusion('')
          setFollowUp('')
        }}
      >
        <label className="text-sm">
          指标
          <input className="mt-1 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" value={metric} onChange={(event) => setMetric(event.target.value)} />
        </label>
        <label className="text-sm">
          结论
          <textarea className="mt-1 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" rows={3} value={conclusion} onChange={(event) => setConclusion(event.target.value)} />
        </label>
        <label className="text-sm">
          待跟进
          <input className="mt-1 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" value={followUp} onChange={(event) => setFollowUp(event.target.value)} />
        </label>
        <button type="submit" className="justify-self-start rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white">保存</button>
      </form>
      <ul className="mt-4 space-y-3">
        {filters.notes.length === 0 && <li className="text-sm text-[var(--muted)]">还没有记录。保存的内容只留在这次打开的页面里。</li>}
        {filters.notes.map((note) => (
          <li key={note.id} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-sm">
            <p className="font-medium">{platformById(note.platformId).name} · {note.date} · {note.metric}</p>
            <p className="mt-2">{note.conclusion}</p>
            {note.followUp && <p className="mt-1 text-[var(--muted)]">待跟进：{note.followUp}</p>}
            <p className="mt-2 text-[var(--muted)]">证据：{note.evidence}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
