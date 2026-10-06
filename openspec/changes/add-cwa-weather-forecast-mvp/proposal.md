# Proposal

## Why

本專案需要先交付可實際同步、查詢與展示的 CWA 天氣預報網站。CWA `F-D0047-091` 的目前回應提供縣市層級資料，因此 MVP 應以該資料實際可提供的縣市預報為準，避免將尚未取得的鄉鎮資料呈現在產品承諾中。

## What Changes

- 使用 CWA `F-D0047-091` 建立縣市層級的預報資料同步管線；每六小時同步一次，並支援手動執行。
- 將原訂的縣市／鄉鎮資料模型、查詢介面與互動控制，限縮為縣市資料模型與縣市選擇。
- 以 Supabase PostgreSQL 保存最新縣市預報、不可變版本歷史、同步紀錄與受保護的原始回應。
- 建立部署在 Vercel 的繁體中文網站，使用 Leaflet 呈現縣市預報圖層、指標圖例、溫度趨勢與預報表格。
- 保留受管理員驗證保護的原始資料檢視與手動同步操作。
- 將鄉鎮預報、鄉鎮 GeoJSON 與縣市後選鄉鎮的互動，列為後續改採支援鄉鎮資料來源時的擴充範圍。

## Capabilities

### New Capabilities

- `forecast-data-sync`: 同步、驗證、正規化與版本化 CWA 縣市預報資料。
- `forecast-query-api`: 提供最新縣市預報、可用縣市與資料新鮮度的伺服器端查詢。
- `forecast-dashboard`: 提供以 Leaflet 呈現縣市預報資訊的繁體中文公開儀表板。
- `admin-forecast-operations`: 保護原始回應檢視與手動同步等管理操作。

### Modified Capabilities

- 無；此專案尚未有已封存的 capability specs。

## Impact

- 會調整 Python 解析與正規化邏輯、Supabase 位置資料表示、Next.js 查詢路由與公開儀表板控制項。
- GitHub Actions 繼續以 Secrets 保存 CWA API Key 與 Supabase 寫入連線；Vercel 只提供公開讀取與管理員受保護操作。
- 需要版本化台灣縣市 GeoJSON 參考資料，而不在 MVP 中納入鄉鎮界線資料。
