# Proposal

## Why

The current dashboard treats the map, filters, status, and forecast details as disconnected blocks. Users cannot select a county from the map, cannot tell which 12-hour forecast period the map represents, and see only a temperature chart plus a text-heavy table. A map-first, modern weather-dashboard experience is needed so the one-week forecast is easier and more engaging to explore.

## What Changes

- Redesign the public dashboard around a large, interactive Taiwan forecast map with a modern deep-blue/indigo weather-dashboard visual language and responsive layout.
- Move forecast freshness and last-successful-update information into a non-obstructive map control at the lower left.
- Replace the primary county dropdown flow with map-driven county selection, while retaining an accessible search or selector fallback.
- Make map selection highlight the county, select its complete available forecast range, and smoothly move the user to that county's detailed forecast.
- Add a clearly labelled date-and-period navigator that defaults the map to the next upcoming 12-hour forecast period while retaining the selected county's full available range for details.
- Replace the "highest temperature" map label with "temperature" and add icon-supported indicator controls for temperature, precipitation probability, ultraviolet index, and wind speed.
- Synchronize the selected map indicator with its corresponding primary forecast chart.
- Add an on-map selected-county summary card and replace verbose weather descriptions in the detail table with weather-code-based icons and accessible short labels.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `forecast-dashboard`: Define map-first county selection, explicit 12-hour map-period navigation, synchronized indicator visualizations, on-map status and selection feedback, weather icon presentation, and responsive modern dashboard behavior.

## Impact

- Affects `web/src/components/dashboard-shell.tsx`, `forecast-map.tsx`, `forecast-details.tsx`, presentation helpers, dashboard controls, and their tests.
- May add a lightweight icon dependency or reusable local SVG icon components; no CWA credential, Supabase schema, ingestion cadence, or public data model change is required.
- Existing `/api/locations`, `/api/forecasts`, and `/api/freshness` stay the public data boundary; implementation should avoid unnecessary per-county browser requests where practical.
