import { Link } from 'react-router-dom'
import { Hint } from '../components/Hint'
import { formatMetric } from '../lib/format'
import { displayValue, isCount, metricLabel, platformById, rowOn, type MetricKey } from '../mock/demo'
import { useFilters } from '../state/Filters'

function useToday() {
  const filters = useFilters()
  const platform = platformById(filters.platformId)
  const today = rowOn(filters.platformId, filters.to)
  const show = (key: MetricKey) => {
    if (!today) return '—'
    return formatMetric(displayValue(today[key], key, filters.currency, platform.demoRate), !isCount(key))
  }
  return { filters, platform, today, show }
}

function Figure({ label, value }: { label: MetricKey; value: string }) {
  return (
    <Link to={`/analysis/${encodeURIComponent(label)}`} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 no-underline">
      <p className="text-sm text-[var(--muted)]">{metricLabel(label)}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </Link>
  )
}

export function UsersPage() {
  const { platform, today, show } = useToday()
  const mismatch = today ? today.充值人数 - today.新充人数 : null
  return (
    <section data-testid="page-users">
      <h1 className="text-2xl font-semibold">{platform.name} · 用户</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Figure label="新充人数" value={show('新充人数')} />
        <Figure label="首充人数" value={show('首充人数')} />
        <Figure label="老用户充值人数" value={show('老用户充值人数')} />
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        老用户没有金额列。
        <Hint text="不能用充值人数减新充人数当作老用户。演示里这两者也不相等。" />
      </p>
      {today && mismatch != null && (
        <p className="mt-2 text-sm tabular-nums text-[var(--muted)]">
          充值人数 {show('充值人数')}，减去新充人数后是 {mismatch}，老用户充值人数是 {today.老用户充值人数}。
        </p>
      )}
    </section>
  )
}

export function PaymentsPage() {
  const { platform, show } = useToday()
  return (
    <section data-testid="page-payments">
      <h1 className="text-2xl font-semibold">{platform.name} · 支付</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Figure label="充值金额" value={show('充值金额')} />
        <Figure label="提现金额" value={show('提现金额')} />
        <Figure label="KOL工资" value={show('KOL工资')} />
        <Figure label="充提差" value={show('充提差')} />
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        充提差 = 充值金额 − 提现金额 + KOL工资
        <Hint text="KOL工资是付给网红达人的钱，通过平台账户发给他们提现。算式已在现有日报逐日对过。这里的数是演示。" />
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">没有支付通道日报，不拆通道。</p>
    </section>
  )
}

export function GamesPage() {
  const { platform, show } = useToday()
  return (
    <section data-testid="page-games">
      <h1 className="text-2xl font-semibold">{platform.name} · 游戏</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Figure label="投注金额" value={show('投注金额')} />
        <Figure label="返奖金额" value={show('返奖金额')} />
        <Figure label="公司输赢" value={show('公司输赢')} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-normal">厂商</th>
              <th className="px-4 py-3 font-normal">游戏</th>
              <th className="px-4 py-3 font-normal">投注金额</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-6 text-[var(--muted)]" colSpan={3}>没有游戏明细报表</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
