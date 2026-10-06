# Spec Delta

## Purpose

此能力將 CWA 全臺鄉鎮一週預報轉為可追蹤版本的結構化資料，讓網站能可靠顯示最新預報並保留來源改版歷程。

## ADDED Requirements

### Requirement: Six-hour forecast synchronization
The system SHALL retrieve `F-D0047-091` at a six-hour cadence and SHALL record the source dataset identifier, source publication or update time when available, fetch time, and sync outcome for every attempt.

#### Scenario: Successful scheduled synchronization
- **WHEN** the scheduled forecast synchronization runs and CWA returns a valid dataset
- **THEN** the system records a successful sync outcome and makes the normalized forecast available to downstream queries

#### Scenario: Source request fails
- **WHEN** CWA cannot be reached or returns an invalid response
- **THEN** the system records a failed sync outcome and retains the most recently successful forecast for public queries

### Requirement: Normalized location and forecast records
The system SHALL retain the county and town identity for each forecast record and SHALL retain the forecast valid time, weather phenomenon, precipitation probability, temperature values, apparent temperature, ultraviolet index, and wind information whenever supplied by the source.

#### Scenario: Source contains a complete town forecast
- **WHEN** a source location contains a county, town, valid period, and supported weather elements
- **THEN** the system stores values under the corresponding normalized location and forecast valid period

#### Scenario: Optional weather element is absent
- **WHEN** a supported optional weather element is absent or explicitly unavailable in a source record
- **THEN** the system preserves the forecast record and represents only that element as unavailable

### Requirement: Latest forecast and version history
The system SHALL maintain a latest forecast view and a separate immutable history of changed forecast source versions. The system MUST NOT create a new history version when the incoming source version and normalized content are unchanged.

#### Scenario: New source version changes forecast content
- **WHEN** a successful synchronization has a new source update time or different normalized content
- **THEN** the system updates the latest forecast and creates one new historical snapshot

#### Scenario: Duplicate source version is fetched
- **WHEN** a successful synchronization has the same source version and normalized content as the latest stored version
- **THEN** the system updates sync metadata without creating another historical snapshot

