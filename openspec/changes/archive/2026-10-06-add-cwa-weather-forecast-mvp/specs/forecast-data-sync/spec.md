# Spec Delta

## Purpose

定義 CWA 縣市預報的同步、正規化、版本保存與失敗復原行為，使公開網站始終可使用最近成功的可驗證資料。

## ADDED Requirements

### Requirement: Six-hour county forecast synchronization
The system SHALL retrieve `F-D0047-091` at a six-hour cadence and SHALL record the source dataset identifier, source publication or update time when available, fetch time, and sync outcome for every attempt.

#### Scenario: Successful scheduled synchronization
- **WHEN** the scheduled forecast synchronization runs and CWA returns a valid dataset
- **THEN** the system records a successful sync outcome and makes the normalized county forecasts available to downstream queries

#### Scenario: Source request or validation fails
- **WHEN** CWA cannot be reached, returns an invalid response, or returns no valid normalized county forecast periods
- **THEN** the system records a failed sync outcome, retains the most recently successful forecast for public queries, and retains any received raw response for protected diagnosis

### Requirement: Normalized county forecast records
The system SHALL retain the official county or city identity for each `F-D0047-091` location, including its stable source geographic code and display name. It SHALL retain the forecast valid time, weather phenomenon, precipitation probability, temperature values, apparent temperature, ultraviolet index, and wind information whenever supplied by the source.

#### Scenario: Source contains a complete county forecast
- **WHEN** a source location contains a geographic code, location name, valid period, and supported weather elements
- **THEN** the system stores values under the corresponding normalized county identity and forecast valid period

#### Scenario: Optional weather element is absent
- **WHEN** a supported optional weather element is absent or explicitly unavailable in a source record
- **THEN** the system preserves the county forecast record and represents only that element as unavailable

### Requirement: Latest forecast and version history
The system SHALL maintain a latest county forecast view and a separate immutable history of changed forecast source versions. The system MUST NOT create a new history version when the incoming source version and normalized content are unchanged.

#### Scenario: New source version changes forecast content
- **WHEN** a successful synchronization has a new source update time or different normalized content
- **THEN** the system updates the latest forecast and creates one new historical snapshot

#### Scenario: Duplicate source version is fetched
- **WHEN** a successful synchronization has the same source version and normalized content as the latest stored version
- **THEN** the system updates sync metadata without creating another historical snapshot
