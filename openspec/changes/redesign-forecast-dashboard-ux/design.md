# Design

## Context

The existing client component owns independent area, date range, indicator, detail-record, and map-record state. The map uses Leaflet GeoJSON styling and only supplies tooltips; its map data is assembled by issuing one forecast request per available area. Detail visualization has a temperature-only chart, while the CWA-backed record model already exposes precipitation probability, ultraviolet index, wind speed, weather code, and valid start/end times. See `proposal.md` for motivation and the delta spec for user-visible behavior.

## Goals / Non-Goals

**Goals:**

- Establish one dashboard selection model that keeps the selected county, active 12-hour map period, date range, map summary, and primary chart coherent.
- Preserve the current server-side credential boundary and existing forecast record semantics.
- Make all interactions keyboard-accessible and usable on desktop and narrow mobile viewports.

**Non-Goals:**

- Adding real-time observation data, a new CWA dataset, a map provider account, or persistent user preferences.
- Altering Supabase schema, forecast ingestion, six-hour synchronization, or forecast version retention.
- Creating a full weather-code localization service; unsupported codes retain an accessible generic weather presentation.

## Decisions

### 1. Treat map period and detail range as distinct but coordinated selection state

The dashboard will hold a selected area code, a complete detail date range, an active map-period identity, and an active indicator. On initial data load, the active map period is the first valid period at or after the current time; if none remains, it is the earliest available period. Selecting a county derives its earliest and latest available dates for the detail range without replacing the active map period. A date/period rail exposes available day and day/night periods and changes both the active map period and applicable detail scope.

This prevents the current ambiguous behavior where the map silently uses the first record in a range. A single date range alone was rejected because one day can contain two distinct 12-hour forecasts.

### 2. Use map clicks as the primary selector with an accessible fallback

The Leaflet GeoJSON layer will receive click and keyboard-equivalent fallback actions that update the shared selection model. The selected feature gets a distinct outline and fill treatment. The shell scrolls the detail section into view with reduced-motion awareness after a successful map selection. A labelled native selector or search remains available for keyboard and assistive-technology users and drives the same selection callback.

This retains geographic discovery while avoiding a map-only interaction that would exclude keyboard users.

### 3. Render visual map controls as React overlays and use semantic data colors

The map hero will provide icon-supported indicator chips, a compact date/period rail, a lower-left freshness control, a legend, and a lower-right selected-county summary card. The page uses a deep-blue/indigo background and limited translucent panels; forecast data colors remain semantic and legible instead of inheriting arbitrary decorative palette colors. A lightweight icon set or local SVG components will provide control and weather icons; every icon-only control requires a text label or accessible name.

React overlays are preferred over depending on Leaflet control DOM APIs because they share React state, are simpler to test, and remain responsive.

### 4. Use one indicator-driven chart component

The chart component accepts the same indicator state as the map. Temperature uses highest/lowest line series; precipitation uses a probability-oriented series; ultraviolet and wind each use their available numeric series. The selected indicator control changes both the map and chart, while the full detailed table remains visible below.

This avoids four permanently expanded charts that would weaken the map-first hierarchy and make mobile scanning difficult.

### 5. Convert weather codes into compact, accessible table presentation

Weather table cells use a weather-code-to-icon/short-label mapper. The icon has an accessible name, and the compact label remains available for unsupported codes or users who do not identify icons visually. Verbose source descriptions are not the primary table rendering.

## Risks / Trade-offs

- [A county has no record for the active map period] → Render the county as unavailable and do not fabricate a value; keep its available detail range when selected.
- [CWA valid periods cross local-calendar boundaries] → Derive all navigation labels and filters from returned valid times in the Taiwan locale/time zone, preserving exact period identifiers internally.
- [Map data requires many browser requests] → Reuse loaded records, cancel stale requests, and assess a batched server-side query only if profiling shows the existing public boundary is inadequate.
- [Automatic scrolling disorients some users] → Respect reduced-motion preferences and move focus to a labelled detail heading after a keyboard-initiated selection.
- [Translucent overlays reduce contrast over tiles] → Use opaque fallback backgrounds and verify text, controls, and data colors against their actual map backgrounds.

## Migration Plan

1. Add presentation helpers and component tests for selection, period derivation, indicator series, and weather-code rendering.
2. Replace the dashboard layout and map interactions behind the existing public API responses.
3. Validate desktop and narrow-viewport states with populated, missing-value, stale, and empty fixtures.
4. Deploy as a normal Vercel frontend release. Roll back by redeploying the previous frontend build; no data migration is required.
