# Tasks

## 1. Project foundations and configuration

- [x] 1.1 Scaffold the Next.js/TypeScript Vercel application and Python ingestion package, and verify their documented local start commands complete without errors.
- [x] 1.2 Add committed, credential-free environment-variable examples for CWA, Supabase, Vercel, GitHub Actions, and the admin session secret; verify secret files are ignored by Git.
- [x] 1.3 Add the frontend dependencies for Leaflet, chart rendering, and client-side date handling, and verify the production frontend build succeeds.

## 2. Supabase forecast persistence

- [x] 2.1 Create the Supabase migration for locations, sync runs, forecast versions, immutable forecast records, current forecasts, and protected raw payloads; verify it applies to a clean database.
- [x] 2.2 Add database constraints, indexes, and a synchronization lock that enforce location/valid-time uniqueness and prevent concurrent active synchronizations; verify duplicate and concurrent-write cases in database tests.
- [x] 2.3 Configure least-privilege read and administrative access policies so public queries cannot read raw payloads or write forecast data; verify allowed and denied access with separate credentials.
- [x] 2.4 Document schema setup, migration execution, and safe rollback/re-sync procedures in the README; verify each documented setup command against a clean local environment.
- [x] 2.5 Add a forward-only migration that represents `F-D0047-091` locations as counties or cities without fabricated township identities; verify database constraints and migration tests pass.

## 3. CWA county forecast ingestion and versioning

- [x] 3.1 Implement a CWA `F-D0047-091` client that loads credentials from environment variables, handles timeouts and non-success responses, and saves fixture responses; verify unit tests cover successful and failed requests.
- [x] 3.2 Update defensive parsing and normalization for the current `F-D0047-091` county response shape, including case-compatible structural fields and supported weather elements; verify fixture and authorized live-response tests cover complete, missing, and invalid optional elements.
- [x] 3.3 Implement sync-run recording, canonical checksum generation, current-forecast replacement, immutable changed-version insertion, and raw-payload retention; verify tests prove duplicate content creates no second version and failed syncs preserve the current forecast.
- [x] 3.4 Update the scheduled/manual Python command for the county data model and verify it populates a development Supabase project from an authorized CWA response.
- [x] 3.5 Add GitHub Actions workflow(s) for manual dispatch and six-hour UTC scheduling after source publication, using GitHub Secrets only; verify the workflow passes in a repository run and its schedule is documented.

## 4. Forecast query boundary

- [x] 4.1 Implement server-side discovery of available counties and cities; verify tests return each current location once and safely handle no current data.
- [x] 4.2 Implement server-side latest-forecast queries with a required county or city and optional date-range filters; verify tests cover matching data, no matches, and valid-period overlap.
- [x] 4.3 Implement a data-freshness response derived from sync-run state; verify a failed latest run returns the prior successful update time and stale status.
- [x] 4.4 Ensure no browser response contains CWA or Supabase write credentials; verify route and build-output checks pass with production environment configuration.

## 5. Geographic reference data and public dashboard

- [x] 5.1 Add a versioned Taiwan county GeoJSON reference asset and a normalized-code join strategy; verify a validation script reports unmatched forecast locations.
- [x] 5.2 Implement the Traditional Chinese dashboard shell with update status, loading, empty, error, and stale-data states; verify these states render from mocked query responses.
- [x] 5.3 Implement county and date/date-range controls; verify component tests cover changing location and time scope.
- [x] 5.4 Implement the client-side Leaflet county map, indicator selector, legend, and unavailable-value rendering for temperature, precipitation, UV, and wind; verify an integration test or manual test shows each layer changing with the selected date.
- [x] 5.5 Implement the selected-county highest/lowest temperature trend and forecast table; verify a multi-day fixture renders both the chart series and all returned periods.
- [x] 5.6 Document dashboard use, map indicator interpretation, and data-freshness limitations in the README; verify the documented local preview matches the deployed behavior.

## 6. Protected administrative operations

- [x] 6.1 Implement server-side admin password verification and short-lived signed HttpOnly session handling; verify unauthenticated requests cannot access protected routes and authenticated requests can.
- [x] 6.2 Implement protected raw-payload inspection that returns fetch metadata without credentials; verify a public request is denied and an admin response contains no secret value.
- [x] 6.3 Implement protected manual synchronization with active-run rejection and result reporting; verify tests cover idle success, upstream failure, and an already-running synchronization.
- [x] 6.4 Document administrator secret setup, manual synchronization, and recovery steps; verify the documented procedure works in a Vercel preview or equivalent local production-mode run.

## 7. End-to-end verification and deployment readiness

- [x] 7.1 Run the full Python test suite, frontend lint/type-check/test suite, and production build; verify all commands pass from a clean checkout.
- [x] 7.2 Perform an end-to-end acceptance check using a populated Supabase project: public county/date selection, map indicators, trend/table, fresh and stale status, and admin protection; record the results in project documentation.
- [x] 7.3 Configure Vercel preview/production environment variables and verify deployment exposes only public read behavior while GitHub Actions continues using separate write credentials.
