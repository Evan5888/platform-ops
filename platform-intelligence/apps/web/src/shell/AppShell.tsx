import { NavLink, Outlet } from 'react-router-dom'
import { Hint } from '../components/Hint'
import { DEMO_END, DEMO_START, platformById } from '../mock/demo'
import { useFilters } from '../state/Filters'

const links = [
  { to: '/', label: '总览', end: true },
  { to: '/movement', label: '波动' },
  { to: '/users', label: '用户' },
  { to: '/payments', label: '支付' },
  { to: '/games', label: '游戏' },
  { to: '/data', label: '数据中心' },
  { to: '/metrics', label: '指标口径' },
  { to: '/notes', label: '分析记录' },
]

export function AppShell() {
  const filters = useFilters()
  const platform = platformById(filters.platformId)
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-2">
            <p className="text-lg font-semibold tracking-tight">经营分析</p>
            <p className="text-xs text-[var(--warn)]">演示</p>
          </div>
          <div className="flex rounded-full bg-[var(--bg)] p-1" role="radiogroup" aria-label="平台">
            {(['afun-mx', 'betroia'] as const).map((id) => (
              <button key={id} type="button" role="radio" aria-checked={filters.platformId === id} data-testid={`platform-${id}`} className={`rounded-full px-4 py-1.5 text-sm ${filters.platformId === id ? 'bg-[var(--accent)] text-white' : ''}`} onClick={() => filters.setPlatformId(id)}>
                {platformById(id).name}
              </button>
            ))}
          </div>
          <label className="text-sm text-[var(--muted)]">
            开始
            <input className="ml-2 rounded-full border border-[var(--line)] bg-transparent px-3 py-1" type="date" min={DEMO_START} max={DEMO_END} value={filters.from} data-testid="range-from" onChange={(event) => filters.setFrom(event.target.value)} />
          </label>
          <label className="text-sm text-[var(--muted)]">
            结束
            <input className="ml-2 rounded-full border border-[var(--line)] bg-transparent px-3 py-1" type="date" min={DEMO_START} max={DEMO_END} value={filters.to} data-testid="range-to" onChange={(event) => filters.setTo(event.target.value)} />
          </label>
          <div className="flex rounded-full border border-[var(--line)] p-1 text-sm" role="radiogroup" aria-label="币种">
            {(['MXN', 'USD'] as const).map((item) => (
              <button key={item} type="button" role="radio" aria-checked={filters.currency === item} data-testid={`currency-${item}`} className={`rounded-full px-3 py-1 ${filters.currency === item ? 'bg-[var(--accent)] text-white' : ''}`} onClick={() => filters.setCurrency(item)}>
                {item === 'MXN' ? '比索' : '美金'}
              </button>
            ))}
          </div>
          <p className="text-sm text-[var(--muted)]" data-testid="rate">
            1 美金 = {platform.demoRate.toFixed(2)} 比索
            <Hint text="这是演示汇率，用来看切换效果。不是日报算出来的中位数。人数不换算。" />
          </p>
          <button type="button" className="ml-auto rounded-full border border-[var(--line)] px-3 py-1 text-sm" onClick={() => filters.setDark(!filters.dark)}>
            {filters.dark ? '浅色' : '深色'}
          </button>
          <NavLink to="/data" className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm text-white no-underline">
            导入
          </NavLink>
        </div>
      </header>
      <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="border-b border-[var(--line)] bg-[var(--panel)] p-3 md:border-b-0 md:border-r" aria-label="页面">
          <p className="mb-2 px-2 text-xs text-[var(--muted)]">{platform.market}</p>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} data-testid={`nav-${link.label}`} className={({ isActive }) => `mb-1 block rounded-xl px-3 py-2 text-sm no-underline ${isActive ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink)]'}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <main className="px-4 py-4 md:px-6">
          <p className="mb-4 rounded-2xl bg-[var(--warn-bg)] px-4 py-2 text-sm text-[var(--warn)]" data-testid="demo-banner">
            演示数据。下面的数字是为了看布局编的，不是 Afun-MX 或 Betroia 的日报。
          </p>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
