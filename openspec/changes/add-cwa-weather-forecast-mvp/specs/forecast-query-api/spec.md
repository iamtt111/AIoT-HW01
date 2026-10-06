# Spec Delta

## Purpose

定義 Vercel 伺服器端公開查詢介面，使瀏覽器可取得可用縣市、縣市預報與資料新鮮度，而不接觸來源或寫入憑證。

## ADDED Requirements

### Requirement: County discovery
The system SHALL provide the available counties and cities represented in the latest stored forecast data.

#### Scenario: Client requests available counties
- **WHEN** a client requests forecast locations
- **THEN** the system returns each available county or city once with its stable code and display name

#### Scenario: No current forecasts exist
- **WHEN** a client requests forecast locations before any successful synchronization
- **THEN** the system returns an empty, machine-readable result without exposing upstream errors

### Requirement: County forecast retrieval and filtering
The system SHALL provide latest forecast records filtered by county or city and optional forecast date or date range. Returned records SHALL include their valid period, supported forecast fields, and the latest successful source update or fetch time.

#### Scenario: County and date range forecast query
- **WHEN** a client requests a known county and date range within the stored forecast period
- **THEN** the system returns that county's forecast records whose valid periods overlap the requested range

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
