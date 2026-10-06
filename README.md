# CWA 台灣縣市天氣預報

使用中央氣象署（CWA）開放資料建置的台灣縣市天氣預報網站。使用者可選擇縣市與
日期範圍，在互動式地圖查看最高溫、降雨機率、紫外線與風速，並閱讀溫度趨勢與各
預報時段的詳細資料。

## Live Demo

[https://aiot-hw01.vercel.app/](https://aiot-hw01.vercel.app/)

## 主要功能

- 依縣市及日期／日期範圍查詢 CWA 預報。
- Leaflet 台灣縣市地圖，支援最高溫、降雨機率、紫外線、風速四種圖層。
- 選取縣市的最高／最低溫趨勢圖與預報明細表。
- 顯示最新同步狀態、最後成功更新時間，以及空資料、錯誤與過期資料狀態。
- 保留目前預報、不可變歷史版本、同步紀錄與受保護的原始 API 回應。

## 資料來源與更新頻率

- 資料集：CWA Open Data `F-D0047-091` 縣市預報。
- 同步方式：GitHub Actions 執行 Python 同步程式，抓取、正規化並寫入 Supabase。
- CWA 發布時機：台灣時間 `05:30`、`11:30`、`17:30`、`23:30`。
- 排程：每 **6 小時** 一次，並在發布後 5 分鐘抓取；UTC `03:35`、`09:35`、`15:35`、
  `21:35`，換算台灣時間為 `11:35`、`17:35`、`23:35`、隔日 `05:35`。
- 網站會在每次頁面／API 請求時讀取最新已成功同步的資料，並非即時觀測站資料。
- GitHub Actions 的免費排程可能延遲；若最近一次同步失敗，網站保留前一次成功資料並
  顯示最後成功時間。

## 技術棧

| 領域 | 技術 |
| --- | --- |
| 前端與伺服器端 API | Next.js 16、React 19、TypeScript、App Router |
| 樣式 | Tailwind CSS 4 |
| 地圖 | Leaflet、React Leaflet、GeoJSON |
| 圖表與日期處理 | Recharts、date-fns |
| 資料處理 | Python 3.12、httpx、psycopg、python-dotenv |
| 資料庫 | Supabase PostgreSQL、PostgREST、pgTAP |
| 自動化 | GitHub Actions、OpenSpec |
| 部署 | Vercel |

## 專案結構

```text
web/                         Next.js 儀表板與 server-side 唯讀 API
ingestion/                   CWA 抓取、解析與 PostgreSQL 同步程式
supabase/migrations/         Supabase schema 與前向 migration
supabase/tests/database/     pgTAP 資料庫測試
.github/workflows/           六小時預報同步 workflow
openspec/changes/            OpenSpec 規格、設計與任務紀錄
```

## 本機執行

### 1. 啟動網站

在 `web/.env.local` 建立以下伺服器端環境變數：

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

接著執行：

```powershell
cd web
npm.cmd install
npm.cmd run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。`SUPABASE_SECRET_KEY` 僅供
Next.js route handlers 使用；不得加入 `NEXT_PUBLIC_` 前綴、提交到 Git，或放入瀏覽器
端程式碼。

### 2. 本機資料庫與 migration

需先啟動 Docker Desktop 的 Linux engine：

```powershell
npx.cmd supabase@latest start
npx.cmd supabase@latest db reset
npx.cmd supabase@latest test db
```

`db reset` 會重建**本機**資料庫並清除其中資料，不應對已含重要資料的遠端專案執行。

將 migration 推送到已連結的遠端 Supabase 專案前，先檢查預覽：

```powershell
npx.cmd supabase@latest db push --dry-run
npx.cmd supabase@latest db push
npx.cmd supabase@latest migration list
```

### 3. 手動執行同步程式

Python 程式需要 CWA API key 與 PostgreSQL connection string：

```powershell
py -3.12 -m pip install ./ingestion
$env:CWA_API_KEY = '<your-cwa-api-key>'
$env:SUPABASE_DB_URL = '<transaction-pooler-postgresql-uri>'
py -3.12 -m cwa_weather_ingestion
```

`SUPABASE_DB_URL` 使用 Supabase **Transaction pooler** 的 PostgreSQL URI，供短生命週期
的 GitHub Actions 同步工作使用；它不是 Vercel 網站使用的 `SUPABASE_URL`。

## 部署與環境變數

### Vercel

將 `web/` 設為 Root Directory，並在 Preview 與 Production 設定：

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

不要在 Vercel 設定 `CWA_API_KEY` 或 `SUPABASE_DB_URL`；公開網站只負責讀取已同步的資料。

### GitHub Actions

在 repository 的 `Settings` → `Secrets and variables` → `Actions` 建立：

```text
CWA_API_KEY
SUPABASE_DB_URL
```

`cwa-forecast-sync.yml` 使用這兩個 secret 執行同步。手動更新可到 GitHub Actions 的
**Synchronize CWA forecast** workflow 選擇 **Run workflow**。

## 驗證

```powershell
# Database
npx.cmd supabase@latest test db

# Python
cd ingestion
py -3.12 -m unittest discover -s tests -v

# Frontend
cd ../web
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run check:client-secrets
```

## 安全注意事項

- 不要提交 `.env`、`.env.local`、CWA API key、Supabase secret key、資料庫密碼或 GitHub token。
- CWA API key 與 `SUPABASE_DB_URL` 只存在 GitHub Actions Secrets。
- `SUPABASE_SECRET_KEY` 僅存在本機未提交檔案與 Vercel server-side environment variables。
- 瀏覽器只會呼叫 Next.js 公開讀取 API，不會取得 CWA 或 Supabase 的寫入權限。

## 目前驗證狀態

本機已驗證 22 個 Python 測試（含 PostgreSQL 整合測試）、ESLint、15 個前端測試、
production build 與 client-secret bundle 檢查。公開 API 已確認可回傳 22 個縣市、日期
篩選結果及溫度、降雨機率、紫外線與風速欄位。

管理員操作功能依 OpenSpec Task 6 延後，尚未實作或部署。
