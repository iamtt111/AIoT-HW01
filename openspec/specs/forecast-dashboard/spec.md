# forecast-dashboard Specification

## Purpose

Defines the public Traditional Chinese dashboard used to explore CWA county and city forecast data on maps, charts, and tables.

## Requirements

### Requirement: Traditional Chinese county forecast dashboard

The public dashboard SHALL present labels, messages, dates, weather information, and the latest forecast update status in Traditional Chinese. It SHALL use a responsive, map-first weather-dashboard layout with a prominent Taiwan map and a deep-blue/indigo visual hierarchy; translucent controls SHALL not prevent the map or its data from remaining legible.

#### Scenario: User opens the dashboard

- **WHEN** the dashboard loads successfully
- **THEN** it displays a Traditional Chinese title, a prominent forecast map, and the timestamp or state of the latest forecast data

#### Scenario: User opens the dashboard on a narrow viewport

- **WHEN** the dashboard is rendered on a narrow viewport
- **THEN** map controls, the selected-area summary, date navigation, and forecast details remain usable without horizontal page overflow

### Requirement: County and date selection

The dashboard SHALL make map selection the primary way to choose an available county or city, while retaining an accessible county search or selector fallback. It SHALL provide a clearly labelled forecast date-and-period navigator. Selecting a county SHALL select that county's complete available forecast range for details; the map SHALL default to the next upcoming available 12-hour forecast period.

#### Scenario: County is selected

- **WHEN** a user selects an available county or city
- **THEN** the dashboard requests and displays forecast data only for that location

#### Scenario: County is selected from the map

- **WHEN** a user selects an available county or city on the map
- **THEN** the dashboard highlights the county, fills its available forecast date range, and smoothly moves to that county's detailed forecast

#### Scenario: County is selected with an accessible fallback

- **WHEN** a user selects an available county or city with the fallback selector
- **THEN** the dashboard requests and displays forecast data only for that location and updates the map selection

#### Scenario: User changes the forecast date scope

- **WHEN** a user selects an available forecast date, period, or date range
- **THEN** the dashboard refreshes the displayed records to the selected time scope and visibly identifies the map's active 12-hour period

### Requirement: Interactive county forecast map

The dashboard SHALL render an interactive Taiwan county map with icon-supported, selectable forecast indicators for temperature, precipitation probability, ultraviolet index, and wind speed when data is available. It SHALL label the temperature indicator as "溫度" and SHALL identify the selected 12-hour forecast period. The map SHALL provide a selected-area summary and place freshness information at its lower left without obstructing county selection.

#### Scenario: User switches the displayed forecast indicator

- **WHEN** a user selects an available forecast indicator
- **THEN** the map updates its county visual encoding, icon-supported control, legend, and selected-area summary to identify the selected indicator and its values

#### Scenario: User selects a county

- **WHEN** a user selects a county on the map
- **THEN** the map visibly highlights it and shows a summary with its weather icon, active period, temperature range, precipitation probability, ultraviolet index, and wind speed when available

#### Scenario: Map data is unavailable for an indicator

- **WHEN** the selected indicator is unavailable for a county or active period
- **THEN** the dashboard marks it as unavailable rather than showing an invented value

#### Scenario: Forecast freshness is available

- **WHEN** the dashboard has a fresh or stale synchronization state
- **THEN** the map's lower-left status control identifies the state and the last successful update time

### Requirement: Forecast detail visualization

The dashboard SHALL show a primary chart and a tabular forecast detail for the selected county or city and date scope. The primary chart SHALL synchronize with the map indicator: temperature shows highest and lowest temperature trends; precipitation probability, ultraviolet index, and wind speed each show their corresponding forecast trend.

#### Scenario: Multi-day county forecast is selected

- **WHEN** forecast data exists for a selected county or city across multiple days
- **THEN** the dashboard displays the chart for the active indicator and a table of the returned periods

#### Scenario: User changes the displayed forecast indicator

- **WHEN** a user changes the map indicator while a county forecast is selected
- **THEN** the primary chart changes to the corresponding indicator without discarding the selected county or date scope

#### Scenario: Forecast table includes a weather code

- **WHEN** a returned forecast period has a supported weather code
- **THEN** the table presents an associated weather icon and an accessible short weather label instead of relying on a verbose weather-description sentence

### Requirement: User-visible unavailable and stale states

The dashboard SHALL display a comprehensible Traditional Chinese loading, empty, error, or stale-data state without discarding the last successfully loaded forecast view. Freshness status SHALL be presented in the map's lower-left control when the map is available.

#### Scenario: Sync status is stale

- **WHEN** the data query reports that the latest sync failed after a prior success
- **THEN** the dashboard shows the last successful update time and identifies the data as stale in the map status control without discarding the prior forecast view
