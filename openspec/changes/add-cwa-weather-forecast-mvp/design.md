# Design

## Context

已確認的 MVP 資料來源為 CWA `F-D0047-091`。其目前實際回應是縣市層級位置與預報元素，而非可用於鄉鎮選擇的完整鄉鎮資料；因此本設計以來源實際可驗證的縣市資料為邊界。動機與功能範圍見 `proposal.md`。

## Goals / Non-Goals

**Goals:**

- 建立可重複執行的縣市預報同步，保留最近一次成功資料與每次同步結果。
- 將來源位置正規化為穩定的縣市代碼與名稱，供資料庫、查詢 API 與地圖使用。
- 在不將 CWA 或資料庫寫入憑證傳送到瀏覽器的前提下，提供繁體中文縣市預報探索介面。
- 支援可觀察、可手動重試且不重複建立版本的排程同步。

**Non-Goals:**

- 鄉鎮選擇、鄉鎮地圖邊界或以鄉鎮為單位的預報資料。
- `O-A0003-001` 觀測資料、測站標記與三十分鐘觀測排程。
- Windy、Folium、FastAPI、Redis、SQLite 或常駐後端服務。
- 一般使用者帳號、收藏地點、日出／日落與公開資料寫入 API。

## Decisions

### 1. Use GitHub Actions, Python, and Supabase PostgreSQL for county forecast ingestion

The scheduled workflow runs a Python command every six hours after the CWA publication window and supports manual dispatch. The CWA API key exists only in GitHub Actions Secrets; the ingestion program writes through a server-side Supabase/PostgreSQL connection. Vercel does not run a persistent scheduler.

This matches the course Python data-processing requirement and avoids depending on Vercel's ephemeral filesystem or paid Cron capability. The schedule uses UTC and a non-zero minute offset to reduce the chance of retrieving stale source data.

### 2. Represent source locations as counties or cities, never fabricated townships

The synchronizer reads the source `Geocode` and `LocationName` and uses the stable county or city code as the location identity. Database locations, historical versions, current projections, and query results all use this county-level identity. The system MUST NOT copy a county name into a fabricated township field to satisfy an older schema.

If the existing schema has separate county and township columns, a forward-only migration will replace it with an unambiguous county location representation. No successful production forecast data exists yet, so development data can be safely converted or cleared by the migration.

### 3. Separate current data, immutable versions, and raw source responses

The database retains `locations`, `sync_runs`, `forecast_versions`, `forecast_records`, `current_forecasts`, and protected `raw_payloads`. Source update time is preferred for version detection; a canonical normalized-content checksum is the fallback. A successful duplicate adds only a sync record. A failed sync does not change the current forecast but retains an already received raw response for protected diagnosis.

### 4. Make Next.js/Vercel the query boundary and Leaflet the county-map renderer

Next.js server-side code reads normalized forecasts and returns counties, forecasts, and freshness data. Browsers receive neither CWA credentials nor Supabase write credentials. Leaflet loads versioned Taiwan county GeoJSON and joins forecast locations by official administrative code. A user can select a county, date or date range, and temperature, precipitation probability, ultraviolet, or wind layers.

Missing data remains visibly unavailable. Township GeoJSON and township controls are not MVP scope.

### 5. Use one shared administrator secret with a server-side session for the MVP

An administrative route verifies a password only on the server against a Vercel environment secret. A successful verification issues a short-lived, signed, HttpOnly, Secure session cookie. Protected routes may inspect raw payloads or initiate manual synchronization; public clients cannot trigger writes or access write credentials.

## Risks / Trade-offs

- [CWA field names or weather-element shapes change] → Use case-compatible defensive parsing, retain raw payloads, and test against fixtures plus an authorized live response.
- [Free GitHub schedules are delayed] → Keep sync idempotent, retain the last successful forecast, and offer authenticated manual retry.
- [County names and map labels differ] → Join only with official administrative codes and report unmatched locations through validation.
- [Free Supabase projects have size limits] → Retain one current projection and bounded raw/history data, with documented re-sync procedures.
- [A shared administrator password has limited auditability] → Limit access to trusted operators, use a strong secret and short session; defer individual accounts to a future change.

## Migration Plan

1. Apply a county-location schema migration and verify development data can be safely converted or cleared.
2. Update the parser and tests using a retained `F-D0047-091` response, then complete one development Supabase sync.
3. Run the GitHub Actions workflow manually and verify successful data plus failed-run raw payload retention.
4. Deploy the query API, county GeoJSON, and public dashboard; verify county selection, layers, table, and stale state.
5. If ingestion becomes faulty, disable the workflow or admin trigger, retain the prior `current_forecasts`, correct the parser, and re-run synchronization. Version history avoids destructive rollback.
