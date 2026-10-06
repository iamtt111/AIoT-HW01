# Spec Delta

## Purpose

定義以繁體中文呈現 CWA 縣市預報的互動式公開儀表板，讓使用者能選擇縣市與時間範圍並理解預報值與資料狀態。

## ADDED Requirements

### Requirement: Traditional Chinese county forecast dashboard
The public dashboard SHALL present labels, messages, dates, weather information, and the latest forecast update status in Traditional Chinese.

#### Scenario: User opens the dashboard
- **WHEN** the dashboard loads successfully
- **THEN** it displays a Traditional Chinese title and the timestamp or state of the latest forecast data

### Requirement: County and date selection
The dashboard SHALL allow a user to choose an available county or city and a forecast date or date range.

#### Scenario: County is selected
- **WHEN** a user selects an available county or city
- **THEN** the dashboard requests and displays forecast data only for that location

#### Scenario: User changes the forecast date scope
- **WHEN** a user selects an available forecast date or date range
- **THEN** the dashboard refreshes the displayed records to the selected time scope

### Requirement: Interactive county forecast map
The dashboard SHALL render an interactive Taiwan county map with a selectable forecast indicator layer. It SHALL support at least temperature, precipitation probability, ultraviolet index, and wind indicator selections when data is available.

#### Scenario: User switches the displayed forecast indicator
- **WHEN** a user selects an available forecast indicator
- **THEN** the map updates its county visual encoding and legend to identify the selected indicator and its values

#### Scenario: Map data is unavailable for an indicator
- **WHEN** the selected indicator is unavailable for a county or date
- **THEN** the dashboard marks it as unavailable rather than showing an invented value

### Requirement: Forecast detail visualization
The dashboard SHALL show a highest and lowest temperature trend and a tabular forecast detail for the selected county or city and date scope.

#### Scenario: Multi-day county forecast is selected
- **WHEN** forecast data exists for a selected county or city across multiple days
- **THEN** the dashboard displays a highest/lowest temperature trend and a table of the returned periods

### Requirement: User-visible unavailable and stale states
The dashboard SHALL display a comprehensible Traditional Chinese loading, empty, error, or stale-data state without discarding the last successfully loaded forecast view.

#### Scenario: Sync status is stale
- **WHEN** the data query reports that the latest sync failed after a prior success
- **THEN** the dashboard shows the last successful update time and identifies the data as stale
