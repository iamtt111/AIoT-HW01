# CWA 臺灣縣市天氣預報

以中央氣象署（CWA）開放資料為來源的互動式臺灣縣市預報網站。網站把最新一次同步完成的預報保存在 Supabase PostgreSQL，前端讀取資料庫提供的 API；一般使用者瀏覽地圖或切換縣市不會直接呼叫 CWA。

## Live Demo

[https://aiot-hw01.vercel.app/](https://aiot-hw01.vercel.app/)

## 功能

- 以 Leaflet 呈現可點擊的臺灣縣市預報地圖。
- 以「溫度、降雨機率、紫外線、風速」四項指標切換地圖色階與詳細圖表。
- 顯示明確的 12 小時預報時段列，預設選取下一個即將到來的時段。
- 點擊地圖縣市後，自動填入該縣市完整的可用預報日期範圍，並移至詳細資訊。
- 提供同步的縣市選單，作為鍵盤與輔助科技可用的替代操作。
- 詳細區顯示與地圖指標連動的圖表，以及使用天氣圖示與短標籤的預報表格。
- 地圖左下角顯示資料更新狀態；若同步失敗，仍保留最後成功的資料。
- 受保護的 `/admin` 路由可檢視同步資訊並手動觸發 GitHub Actions workflow。

## 資料與更新頻率

| 項目 | 說明 |
| --- | --- |
| CWA 資料集 | `F-D0047-091`（一般天氣預報） |
| 資料內容 | 縣市未來一週預報，含 12 小時時段資料 |
| CWA 發布頻率 | 原始資料約每 6 小時發布一次 |
| GitHub Actions 排程 | 每 6 小時一次：UTC `03:35`、`09:35`、`15:35`、`21:35`；約為臺灣時間 `11:35`、`17:35`、`23:35`、`05:35` |
| 使用者查詢 | 僅讀取 Supabase 中已同步的資料，不直接呼叫 CWA API |

排程刻意在常見發布時間後保留緩衝，降低抓到尚未更新版本的機率。也可在 GitHub Actions 的 **Synchronize CWA forecast** 使用手動執行。

## 技術棧

- Frontend：Next.js 16、React 19、TypeScript、Tailwind CSS 4
- 地圖與圖表：Leaflet、React Leaflet、Recharts、Lucide
- Backend boundary：Next.js Route Handlers、PostgREST
- 資料庫：Supabase PostgreSQL
- 擷取與排程：Python 3.12、GitHub Actions
- 資料庫驗證：Supabase CLI、pgTAP
- 規格管理：OpenSpec
- 部署：Vercel

## 使用方式

### 瀏覽儀表板

1. 在地圖頂端選擇要看的指標與 12 小時預報時段。
2. 點擊地圖上的縣市；被選取的縣市會高亮，日期自動改為該縣市完整的預報範圍。
3. 向下查看與目前指標相同的圖表及時段表格。
4. 不使用地圖時，可直接用頁面右上角的「縣市」選單操作。

### 本機啟動前端

在 `web/.env.local` 設定伺服器端環境變數：

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

```powershell
cd web
npm.cmd install
npm.cmd run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

> 請勿使用 `NEXT_PUBLIC_` 前綴公開 Supabase Secret key、CWA API key 或管理員密碼。

### 管理員與手動同步

在 Vercel（Preview 與 Production）設定：

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
ADMIN_PASSWORD=<strong-password>
ADMIN_SESSION_SECRET=<random-secret-at-least-32-characters>
GITHUB_ACTIONS_SYNC_TOKEN=<fine-grained-github-token>
GITHUB_REPOSITORY=<owner>/<repository>
GITHUB_SYNC_REF=main
```

`GITHUB_ACTIONS_SYNC_TOKEN` 需要此 repository 的 **Actions: Read and write** 權限。登入 `/admin` 後可查看最近同步結果與觸發 workflow；憑證不會在前端回傳。

GitHub Actions Secrets 需設定：

```text
CWA_API_KEY
SUPABASE_DB_URL
```

`SUPABASE_DB_URL` 應使用 Supabase **Transaction pooler** PostgreSQL URI，讓 GitHub Actions 的 IPv4 runner 能連線免費方案資料庫。

## 驗證

```powershell
# Database
npx.cmd supabase@latest test db

# Python ingestion
cd ingestion
py -3.12 -m unittest discover -s tests -v

# Frontend
cd ../web
npm.cmd run lint
npm.cmd run test
npm.cmd run check:client-secrets
npm.cmd run build
```

## 專案結構

```text
web/                         Next.js 網站、管理員頁面與 API routes
ingestion/                   CWA 下載、正規化與 PostgreSQL 寫入
supabase/migrations/         Supabase schema migrations
supabase/tests/database/     pgTAP 資料完整性與存取測試
.github/workflows/           六小時同步 workflow
openspec/                    功能規劃與變更紀錄
```
