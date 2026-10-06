# Proposal

## Why

目前專案只有需求與早期的觀測站／Windy 設計，尚未具備可部署、可重複更新且可查詢的一週天氣預報產品。需要先完成以 CWA 全臺鄉鎮一週預報為核心的 MVP，讓使用者能在 Vercel 網站探索未來七天的縣市與鄉鎮預報，而資料可安全地定期同步並持久保存。

## What Changes

- 新增以 `F-D0047-091` 為唯一 MVP 上游來源的 Python 預報同步流程，依來源的六小時更新週期執行。
- 將 CWA 原始回應、正規化地點資料、最新預報與歷史預報快照保存至 Supabase PostgreSQL；只有來源發布時間或內容改變時才新增快照。
- 新增供 Vercel 前端使用的預報查詢介面，支援縣市、鄉鎮及預報有效日期篩選，並公開資料新鮮度資訊。
- 建立繁體中文 Vercel 儀表板，使用 Leaflet 顯示可切換預報指標的台灣地圖，以及縣市至鄉鎮選擇、日期篩選、最高／最低溫折線圖與預報表格。
- 新增受保護的 Dev / Admin 操作，可檢視原始 JSON 並手動觸發同步；不得向一般使用者或瀏覽器公開 CWA API Key。
- 將即時測站觀測、Folium、日出／日落、SQLite 線上持久化與 Windy Map API 排除在本 change 的 MVP 範圍之外。

## Capabilities

### New Capabilities

- `forecast-data-sync`: 從 CWA 一週預報資料集擷取、驗證、正規化、去重及保存預報版本。
- `forecast-query-api`: 依地點與日期提供預報資料、地點選項與新鮮度資訊的查詢介面。
- `forecast-dashboard`: 提供繁體中文 Leaflet 地圖、篩選控制項、溫度趨勢與預報表格的公開網站。
- `admin-forecast-operations`: 保護原始資料檢視與手動同步等僅限管理者的操作。

### Modified Capabilities

- 無；此專案尚無既有 capability specs。

## Impact

- 新增 Python 同步與資料驗證模組、資料庫 schema／migration、GitHub Actions 六小時排程，以及 Vercel 前端與資料存取層。
- 需要 Supabase 專案、CWA API Key、GitHub Actions Secrets、Vercel 環境變數與管理路由認證設定。
- 需要前端地圖與圖表相依套件；資料同步流程需能在失敗時保留最後成功的資料並回報錯誤。
