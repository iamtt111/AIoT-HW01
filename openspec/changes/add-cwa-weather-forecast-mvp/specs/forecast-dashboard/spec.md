# Spec Delta

## Purpose

此能力提供繁體中文的台灣一週預報網站，讓一般使用者以地圖、縣市、鄉鎮及日期探索未來天氣資料。

## ADDED Requirements

### Requirement: Taiwanese Chinese forecast dashboard
The public dashboard SHALL present labels, messages, dates, and weather information in Traditional Chinese and SHALL display the latest forecast data update status.

#### Scenario: User opens the dashboard
- **WHEN** the dashboard loads successfully
- **THEN** it displays a Traditional Chinese title and the timestamp or state of the latest forecast data

### Requirement: Location and date selection
The dashboard SHALL allow a user to choose a county, then a town within that county, and to choose a forecast date or date range. Changing a county MUST reset any town selection that does not belong to the new county.

#### Scenario: County is changed
- **WHEN** a user selects a different county
- **THEN** the town control displays only towns in the selected county and removes an incompatible prior town selection

#### Scenario: User selects a town and date
- **WHEN** a user selects an available town and forecast date
- **THEN** the dashboard displays forecast data for that location and date

### Requirement: Interactive forecast map
The dashboard SHALL render an interactive Taiwan map with a selectable forecast indicator layer. It SHALL support at least temperature, precipitation probability, ultraviolet index, and wind indicator selections when data is available.

#### Scenario: User switches the displayed forecast indicator
- **WHEN** a user selects an available forecast indicator
- **THEN** the map updates its visual encoding and legend to identify the selected indicator and its values

#### Scenario: Map data is unavailable for an indicator
- **WHEN** the selected indicator is unavailable for a location or date
- **THEN** the dashboard marks it as unavailable rather than showing an invented value

### Requirement: Forecast detail visualization
The dashboard SHALL show a highest and lowest temperature trend and a tabular forecast detail for the selected location and date scope.

#### Scenario: Multi-day town forecast is selected
- **WHEN** forecast data exists for a selected town across multiple days
- **THEN** the dashboard displays a highest/lowest temperature trend and a table of the returned periods

### Requirement: User-visible unavailable and stale states
The dashboard SHALL display a comprehensible Traditional Chinese loading, empty, error, or stale-data state without discarding the last successfully loaded forecast view.

#### Scenario: Sync status is stale
- **WHEN** the data query reports that the latest sync failed after a prior success
- **THEN** the dashboard shows the last successful update time and identifies the data as stale

