# Spec Delta

## Purpose

此能力提供一致且可篩選的預報資料介面，讓 Vercel 網站能取得地點選項、未來預報與資料新鮮度，而不需了解 CWA 原始 JSON 結構。

## ADDED Requirements

### Requirement: County and town discovery
The system SHALL provide the available counties and the towns belonging to a selected county from the latest stored forecast data.

#### Scenario: User selects a county with forecast towns
- **WHEN** a client requests towns for a county represented in the latest forecast
- **THEN** the system returns only towns belonging to that county

#### Scenario: User requests an unavailable county
- **WHEN** a client requests towns for a county that is not represented in the latest forecast
- **THEN** the system returns an empty result or a clear not-found response without exposing upstream errors

### Requirement: Forecast retrieval and filtering
The system SHALL provide latest forecast records filtered by county, optional town, and optional forecast date or date range. Returned records SHALL include their valid period, supported forecast fields, and the latest successful source update or fetch time.

#### Scenario: Town and date range forecast query
- **WHEN** a client requests a known county, town, and date range within the stored forecast period
- **THEN** the system returns that town's forecast records whose valid periods overlap the requested range

#### Scenario: Query has no matching forecast
- **WHEN** filters do not match any stored forecast record
- **THEN** the system returns an empty result with a successful, machine-readable response

### Requirement: Data freshness visibility
The system SHALL expose the last successful forecast synchronization time and the state of the most recent synchronization attempt.

#### Scenario: Latest synchronization succeeded
- **WHEN** the most recent synchronization succeeds
- **THEN** clients receive the successful update time and a fresh status

#### Scenario: Latest synchronization failed after prior success
- **WHEN** the most recent synchronization fails but prior forecast data exists
- **THEN** clients receive the prior successful update time and a stale status

