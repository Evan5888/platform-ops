# 墨西哥平台运营

每日一次的运营台。数字只来自导入的 CSV 或 Excel，不连接后台，也不会显示估算。

## 运行

```bash
cd /agent
npm install
npm run dev
```

打开 http://127.0.0.1:5173

## 收件夹

固定文件夹：

`/cursor/stores/bc-93ae83e4-a329-4f86-98a1-8b6b50ccefa7/internal/dashboard-inbox`

把导出文件放进去，在页面上刷新收件夹，再点导入。聊天里收到的文件用「选择文件」。导入结果保存在这个浏览器的 localStorage。

换文件夹时设置环境变量 `DASHBOARD_INBOX`。

## 页面

- 平台对照：Afun-MX 与 Betroia 同一数据日期并排。平台名单在 `src/data/platforms.ts`。
- 用户：新充用户、首充用户、老用户。
- 游戏与厂商：按厂商和游戏列出文件里的指标。

数据日期是墨西哥自然日。当天结束后再过 3 小时，这一天才进入可导入窗口。

列名示例见 `samples/daily-export-format.csv`。该文件没有业务数字。
