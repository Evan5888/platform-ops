const rows = [
  ['活跃人数（DAU）', '结束日原列', '直接取列', '已对账为原列', '可以叫 DAU。过去七天仍是每日人数相加'],
  ['注册人数', '结束日原列', '直接取列', '已对账为原列', '不是去重后的多日人数'],
  ['充值人数', '结束日原列', '首充人数 + 老用户充值人数', '等式已在现有日报核对', '不等于新充人数 + 老用户'],
  ['充值金额', '结束日原列', '充值人数 × 人均', '人均需与全量 Arppu 对账', '不能换成渠道金额'],
  ['充提差', '结束日原列', '充值金额 − 提现金额 + KOL工资', '现有日报逐日对上', 'KOL工资是付给网红达人、经平台账户提现的钱'],
  ['公司输赢（GGR）', '结束日原列', '投注金额 − 返奖金额', '本批彩金为 0 时对上', '可以叫 GGR。彩金不为 0 时要再核对'],
  ['老用户充值金额', '没有这一列', '禁止用充值金额减新充金额', '不能用', '留空'],
]

export function Catalog() {
  return (
    <section data-testid="page-metrics">
      <h1 className="text-2xl font-semibold">指标口径</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">口径来自规划里已经核对的规则。页面上的数值仍是演示。</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)]">
              {['指标', '意思', '公式', '状态', '说明'].map((cell) => <th key={cell} className="px-4 py-3 font-normal">{cell}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-[var(--line)]">
                {row.map((cell) => <td key={cell} className="px-4 py-3 align-top">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
