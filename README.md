# CWA 縣市天氣預報 MVP

本專案使用 CWA `F-D0047-091` 縣市預報資料。Python 同步程式會將資料保存到
Supabase PostgreSQL，Next.js 網站以唯讀 API 顯示臺灣縣市地圖、預報趨勢與明細。

## 專案目錄

- `web/`：Next.js 儀表板與伺服器端唯讀 API。
- `ingestion/`：CWA 下載、正規化與 Supabase 同步程式。
- `supabase/migrations/`：資料庫結構與前向 migration。
- `supabase/tests/database/`：資料庫 pgTAP 測試。
- `openspec/changes/add-cwa-weather-forecast-mvp/`：本功能的規格與實作任務。

## 儀表板預覽與使用方式

在 `web/` 目錄建立未提交的 `.env.local`，設定伺服器端讀取所需的
`SUPABASE_URL` 與 `SUPABASE_SECRET_KEY`，再啟動本機預覽：

```powershell
cd web
npm.cmd run dev
```

開啟 `http://localhost:3000` 後，先選擇縣市，再以開始／結束日期限制預報範圍。
空白日期表示不額外限制期間；若輸入的開始日比結束日晚，介面會自動調整為有效
日期範圍。

地圖的「最高溫、降雨機率、紫外線、風速」選單會改變縣市色階及提示框中的數值。
灰色縣市與「無資料」代表 CWA 在該選定範圍未提供那個指標，並非零值。下方折線圖
呈現所選縣市每個回傳預報時段的最高與最低溫；表格則列出完整的天氣、溫度、降雨
機率、紫外線與風速欄位。

資料由 GitHub Actions 每六小時同步一次。若最新同步失敗，儀表板會保留並標示前
一次成功資料及其時間；因此畫面中的資料不保證是即時觀測，也可能晚於 CWA 最新
發布版本。地圖底圖由 OpenStreetMap 提供，縣市界線使用專案內版本化的
`web/public/data/taiwan-counties.geojson`。

## 資料庫與同步

開發用的本機 Supabase 需要 Docker Desktop 的 Linux engine。以下指令會建立或重設
本機資料庫；`db reset` 會刪除本機資料，請勿用在已含重要資料的遠端專案。

```powershell
npx.cmd supabase@latest start
npx.cmd supabase@latest db reset
npx.cmd supabase@latest test db
```

將 migration 推送至已連結的 Supabase 專案前，先確認預覽結果：

```powershell
npx.cmd supabase@latest db push --dry-run
npx.cmd supabase@latest db push
npx.cmd supabase@latest migration list
```

資料表包含目前預報、不可變版本、同步紀錄與受保護原始回應。若同步程式解析或
上游請求失敗，既有的目前預報會保留，方便修正後重新執行同步。

## 驗證

```powershell
cd web
npm.cmd run test
npm.cmd run build
```

Python 同步程式與 CWA API 金鑰只會在受信任的同步環境中執行。請勿將 `.env.local`、
CWA API Key、Supabase secret key、資料庫密碼或 GitHub token 提交至版本庫。
