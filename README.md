# CWA 天氣預報網站

以 CWA `F-D0047-091` 鄉鎮預報為資料來源的台灣天氣預報網站。MVP 使用
Python 執行資料同步、Supabase PostgreSQL 保存版本化預報，並由 Next.js/Vercel
提供繁體中文的查詢與地圖介面。

## 專案結構

- `web/`：Next.js 前端與 server-side query routes。
- `ingestion/`：CWA 預報同步 Python 套件。
- `supabase/migrations/`：唯一可信的資料庫 schema 歷程。
- `supabase/tests/database/`：使用 pgTAP 的資料庫測試。
- `openspec/changes/add-cwa-weather-forecast-mvp/`：本次變更的設計與任務追蹤。

## 資料庫權限模型

瀏覽器不直接連接 Supabase 的 forecast tables。`anon` 與
`authenticated` 角色沒有 forecast tables 的讀寫權限，也無法讀取
`raw_payloads`。公開查詢會經由 Next.js server routes；只有部署環境的
server-side `service_role` 可以執行同步、讀取 raw payload 或更新預報資料。

不要將 `SUPABASE_SERVICE_ROLE_KEY`、Database Password、CWA API key 或
Supabase Personal Access Token 放進 Git、`NEXT_PUBLIC_*` 變數或瀏覽器程式碼。
可參考根目錄與 `web/` 下的 `.env.example` 範本。

## 本機資料庫開發

### 前置需求

- Docker Desktop 已啟動，且 Linux engine 顯示 running。
- Node.js / npm 可用；Windows PowerShell 請使用 `npx.cmd`。
- 已在專案根目錄執行過 `npx.cmd supabase@latest init`。

### 啟動、套用 schema 與測試

在專案根目錄執行：

```powershell
npx.cmd supabase@latest start
npx.cmd supabase@latest db reset
npx.cmd supabase@latest test db
```

`db reset` 會**刪除本機 Supabase 資料**，再依時間戳順序重跑
`supabase/migrations/`；僅限本機開發環境。`test db` 會執行
`supabase/tests/database/` 的 pgTAP 測試。預期目前有 2 個測試檔、29 個測試。

資料表與目的如下：

- `locations`：縣市／鄉鎮的穩定代碼與顯示名稱。
- `sync_runs`：每次同步的狀態、時間、checksum 與錯誤摘要。
- `forecast_versions`、`forecast_records`：不可變的來源版本與預報期間記錄。
- `current_forecasts`：最新成功版本的快速查詢投影。
- `raw_payloads`：僅供管理操作檢視的 CWA 原始回應。
- `sync_locks`：阻止同時執行兩次預報同步的租約鎖。

## 推送 migration 至 Supabase 雲端

先建立 Supabase project，並將本機目錄連結到它。`<PROJECT_REF>` 可從
Dashboard 的 project URL 取得。

```powershell
npx.cmd supabase@latest login
npx.cmd supabase@latest link --project-ref <PROJECT_REF>
npx.cmd supabase@latest db push --dry-run
npx.cmd supabase@latest db push
npx.cmd supabase@latest migration list
```

只有 `supabase/migrations/` 中的新 migration 可以變更遠端 schema。不要在
Dashboard SQL Editor 或 Table Editor 直接建立／修改 schema，否則本機 migration
歷程會和遠端的 `supabase_migrations.schema_migrations` 失去同步。

## 回復與重新同步原則

### Schema 回復

- 已推送至雲端的 migration 不要修改或刪除。
- 若 schema 有問題，建立新的「向前修正」migration，再依序執行
  `db push --dry-run` 和 `db push`。
- 不要對 production 使用 `supabase db reset --linked`；它會刪除遠端資料。
- 先用 `npx.cmd supabase@latest migration list` 確認本機與遠端版本；若不一致，
  先停止並檢查是否有人在 Dashboard 直接改過 schema。

### 預報資料回復

- 若同步或 parser 有問題，停用排程／手動同步入口，不要清空
  `current_forecasts`。
- 修正 parser 後再執行一次同步；只有內容變更時才會建立新的
  `forecast_versions`，因此既有成功版本可保留。
- 實際的 `cwa-weather-sync` 重新同步命令會在 ingestion 功能完成後加入本節。

## 目前狀態

資料庫 schema、完整性約束、同步鎖與 RLS 已實作並通過本機 pgTAP 測試。CWA
資料擷取、排程、Next.js 查詢 routes 與公開 dashboard 尚在實作中。
