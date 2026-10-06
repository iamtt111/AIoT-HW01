# admin-forecast-operations Specification

## Purpose

Defines protected administrative operations for securely diagnosing and manually synchronizing retained CWA forecast data.

## Requirements

### Requirement: Protected administrative access

The system SHALL require administrator authentication before granting access to development or administrative forecast operations.

#### Scenario: Unauthenticated visitor opens an admin route

- **WHEN** an unauthenticated visitor requests an administrative route
- **THEN** the system denies access and does not return raw forecast payloads or administrative controls

#### Scenario: Authenticated administrator opens an admin route

- **WHEN** an authenticated administrator requests an administrative route
- **THEN** the system grants access to the authorized operations for the current environment

### Requirement: Restricted raw payload inspection

The system SHALL make retained raw CWA JSON available only through protected administrative operations and SHALL not include the CWA API Key in any browser response or raw payload view.

#### Scenario: Administrator inspects the latest raw response

- **WHEN** an authenticated administrator requests the latest retained raw response
- **THEN** the system returns the payload and associated fetch metadata without disclosing credentials

### Requirement: Controlled manual synchronization

The system SHALL allow an authenticated administrator to request a manual forecast synchronization and SHALL report whether that request succeeded, failed, or was rejected because a synchronization is already in progress.

#### Scenario: Administrator triggers an idle synchronization

- **WHEN** an authenticated administrator requests a synchronization while none is running
- **THEN** the system starts one synchronization and reports its resulting status

#### Scenario: Administrator triggers during an active synchronization

- **WHEN** an authenticated administrator requests a synchronization while another synchronization is active
- **THEN** the system rejects the duplicate request with a clear status and does not start a second concurrent synchronization
