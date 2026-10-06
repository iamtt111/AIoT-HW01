# Tasks

## 1. Project foundations and configuration

- [x] 1.1 Scaffold the Next.js/TypeScript Vercel application and Python ingestion package, and verify their documented local start commands complete without errors.
- [x] 1.2 Add committed, credential-free environment-variable examples for CWA, Supabase, Vercel, GitHub Actions, and the admin session secret; verify secret files are ignored by Git.
- [x] 1.3 Add the frontend dependencies for Leaflet, chart rendering, and client-side date handling, and verify the production frontend build succeeds.

## 2. Supabase forecast persistence

- [x] 2.1 Create the Supabase migration for locations, sync runs, forecast versions, immutable forecast records, current forecasts, and protected raw payloads; verify it applies to a clean database.
- [x] 2.2 Add database constraints, indexes, and a synchronization lock that enforce location/valid-time uniqueness and prevent concurrent active synchronizations; verify duplicate and concurrent-write cases in database tests.
- [x] 2.3 Configure least-privilege read and administrative access policies so public queries cannot read raw payloads or write forecast data; verify allowed and denied access with separate credentials.
- [ ] 2.4 Document schema setup, migration execution, and safe rollback/re-sync procedures in the README; verify each documented setup command against a clean local environment.

## 3. CWA forecast ingestion and versioning

- [x] 3.1 Implement a CWA `F-D0047-091` client that loads credentials from environment variables, handles timeouts and non-success responses, and saves fixture responses; verify unit tests cover successful and failed requests.
- [x] 3.2 Implement defensive parsing and normalization of county, town, valid periods, weather, precipitation, temperature, apparent temperature, UV, and wind fields; verify fixture-based tests cover complete, missing, and invalid optional elements.
- [x] 3.3 Implement sync-run recording, canonical checksum generation, current-forecast replacement, immutable changed-version insertion, and raw-payload retention; verify tests prove duplicate content creates no second version and failed syncs preserve the current forecast.
- [x] 3.4 Add a Python command for scheduled and manually dispatched synchronization that emits an actionable result summary; verify it can populate a development Supabase project from a fixture or authorized CWA response.
- [ ] 3.5 Add GitHub Actions workflow(s) for manual dispatch and six-hour UTC scheduling after source publication, using GitHub Secrets only; verify the workflow passes in a repository run and its schedule is documented.

## 4. Forecast query boundary

- [x] 4.1 Implement server-side location discovery for available counties and county-scoped towns; verify tests return only towns from the selected county and handle an unknown county safely.
- [x] 4.2 Implement server-side latest-forecast queries with county, optional town, and optional date-range filters; verify tests cover matching data, no matches, and valid-period overlap.
- [x] 4.3 Implement a data-freshness response derived from sync-run state; verify a failed latest run returns the prior successful update time and stale status.
- [x] 4.4 Ensure no browser response contains CWA or Supabase write credentials; verify route and build-output checks pass with production environment configuration.

## 5. Geographic reference data and public dashboard

- [ ] 5.1 Add a versioned Taiwan county/town GeoJSON reference asset and a normalized-code join strategy; verify a validation script reports unmatched forecast locations.
- [ ] 5.2 Implement the Traditional Chinese dashboard shell with update status, loading, empty, error, and stale-data states; verify these states render from mocked query responses.
- [ ] 5.3 Implement county-then-town controls and date/date-range controls that reset incompatible town selections; verify component tests cover the selection behavior.
- [ ] 5.4 Implement the client-side Leaflet map, indicator selector, legend, and unavailable-value rendering for temperature, precipitation, UV, and wind; verify an integration test or manual test shows each layer changing with the selected date.
- [ ] 5.5 Implement the selected-town highest/lowest temperature trend and forecast table; verify a multi-day fixture renders both the chart series and all returned periods.
- [ ] 5.6 Document dashboard use, map indicator interpretation, and data-freshness limitations in the README; verify the documented local preview matches the deployed behavior.

## 6. Protected administrative operations

- [ ] 6.1 Implement server-side admin password verification and short-lived signed HttpOnly session handling; verify unauthenticated requests cannot access protected routes and authenticated requests can.
- [ ] 6.2 Implement protected raw-payload inspection that returns fetch metadata without credentials; verify a public request is denied and an admin response contains no secret value.
- [ ] 6.3 Implement protected manual synchronization with active-run rejection and result reporting; verify tests cover idle success, upstream failure, and an already-running synchronization.
- [ ] 6.4 Document administrator secret setup, manual synchronization, and recovery steps; verify the documented procedure works in a Vercel preview or equivalent local production-mode run.

## 7. End-to-end verification and deployment readiness

- [ ] 7.1 Run the full Python test suite, frontend lint/type-check/test suite, and production build; verify all commands pass from a clean checkout.
- [ ] 7.2 Perform an end-to-end acceptance check using a populated Supabase project: public county/town/date selection, map indicators, trend/table, fresh and stale status, and admin protection; record the results in project documentation.
- [ ] 7.3 Configure Vercel preview/production environment variables and verify deployment exposes only public read behavior while GitHub Actions continues using separate write credentials.
