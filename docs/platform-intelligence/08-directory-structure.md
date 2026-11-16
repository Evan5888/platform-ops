# 推荐目录结构

新代码放在仓库里的独立目录，不改现有 `src/`。现有 `src/` 是运营看板。

```text
platform-intelligence/
  apps/
    web/                 网页。React、TypeScript、Tailwind、shadcn、ECharts
    api/                 FastAPI。导入、校验、查询、归因
  packages/
    contracts/           网页和服务共用的指标名、请求和响应类型
  data/                  本机 DuckDB 和 Parquet。不提交进 Git
  tests/
    fixtures/            少量可公开的迷你表格，用来测解析
    metrics/             用真实日报的固定日期做对账。真实文件只在本机读取
docs/platform-intelligence/   这组规划文档
```

服务内部再按职责分开，避免以后把 SQL 写进页面：

```text
apps/api/
  import/        读文件、识别报表、映射、预览
  store/         批次、Parquet、DuckDB
  metrics/       读登记卡并计算
  attribution/   只使用已对账等式
  notes/         分析记录
```

网页内部按页面分开：

```text
apps/web/src/
  shell/         平台切换、日期、左侧导航、主题
  overview/
  movement/
  users/
  payments/
  games/
  data-center/
  metric-catalog/
  notes/
```

真实日报可以继续放在现在的 `src/data/reports/`，作为看板的附带文件。新系统的测试如果要读它们，只读不搬。不要把同一份经营数据再复制进一个会提交的新目录。

`data/` 目录放数据库文件和导入副本，必须进忽略列表。分析笔记如果存在 DuckDB 里，也在这个目录，不进 Git。
