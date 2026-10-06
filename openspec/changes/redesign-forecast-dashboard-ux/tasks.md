# Tasks

## 1. Dashboard selection and presentation foundations

- [x] 1.1 Add typed helpers that derive available 12-hour map periods, select the next upcoming period, derive a selected county's complete detail range, and filter records by exact period; verify unit tests cover future, fallback, missing, and Taiwan-date boundary cases.
- [x] 1.2 Add a weather-code presentation mapper and indicator-specific chart-series helpers for temperature, precipitation probability, ultraviolet index, and wind speed; verify unit tests cover supported codes, unknown-code fallback, units, and null values.
- [x] 1.3 Add the selected icon solution for map controls and weather presentation, and verify the dependency or local assets are available to the production frontend build.

## 2. Map-first interaction

- [x] 2.1 Refactor the Leaflet forecast map to accept an active 12-hour period, selected county, and selection callback; render selection highlighting, unavailable counties, and updated tooltips, then verify component or integration tests cover clicking a county and changing a period.
- [x] 2.2 Implement the map hero overlays for icon-supported indicator controls, date-and-period navigation, legend, lower-left freshness status, and lower-right selected-county summary; verify fresh, stale, no-selection, and missing-value states render with accessible labels.
- [x] 2.3 Update the dashboard shell so map selection is primary, the accessible county selector remains synchronized, selected ranges are populated from returned forecasts, and detail navigation uses reduced-motion-aware scrolling; verify tests cover map-driven and fallback-driven selection flows.

## 3. Indicator-linked detail experience

- [x] 3.1 Replace the temperature-only detail visualization with one indicator-linked chart that renders highest/lowest temperature, precipitation probability, ultraviolet index, or wind speed as appropriate; verify a multi-period fixture updates the chart without losing county or date selection.
- [x] 3.2 Redesign the forecast table to use weather-code icons with accessible short labels and compact metric presentation instead of verbose weather descriptions; verify supported, unknown, and unavailable weather values render correctly.
- [x] 3.3 Preserve Traditional Chinese loading, empty, error, and stale states through the redesigned map and details layout; verify state tests retain the last successful forecast view after a failed refresh.

## 4. Responsive visual system and documentation

- [ ] 4.1 Apply the deep-blue/indigo, map-first visual system with limited high-contrast translucent panels for desktop and narrow viewports; verify a manual responsive check shows no horizontal page overflow and usable map controls at mobile width.
- [ ] 4.2 Update the README dashboard guide to explain map selection, the 12-hour period navigator, indicator-linked chart, freshness control, and accessible fallback selector; verify the instructions match a local preview.

## 5. Integration verification

- [x] 5.1 Run the frontend test suite, lint, client-secret check, and production build; verify all commands pass.
- [ ] 5.2 Perform a populated-data acceptance check for map selection, date/period navigation, all four indicator charts, summary card, weather icons, stale status, keyboard fallback, and narrow-viewport behavior; record the results in project documentation.
