# Design

## Context

The repository contains requirements and an older observation-focused Windy/FastAPI design, but no application code or existing OpenSpec capabilities. This change follows the confirmed `requirement-list.md` MVP: CWA `F-D0047-091` weekly town forecasts, six-hour updates, Supabase PostgreSQL, and a Vercel-hosted Leaflet dashboard. See `proposal.md` for motivation and the capability specs for behavior contracts.

## Goals / Non-Goals

**Goals:**

- Build one reliable forecast pipeline that preserves the last successful data set and records source versions.
- Keep the CWA credential and database write credential outside browser-delivered code.
- Provide a Vercel-friendly, Traditional Chinese dashboard with town-level forecast exploration.
- Make scheduled and manual synchronization idempotent and observable.

**Non-Goals:**

- Ingesting `O-A0003-001`, showing live station markers, or supporting a 30-minute observation scheduler.
- Using Windy, Folium, FastAPI, Redis, local SQLite, or an always-running backend service.
- Supporting end-user accounts, saved locations, or a public data-write API.
- Supplying sunrise/sunset, long-term historical playback, or forecasts beyond the source's available week.

## Decisions

### 1. Use GitHub Actions plus Python for ingestion and Supabase PostgreSQL for persistence

The scheduled workflow runs a Python command every six hours, shortly after the documented CWA publication windows. It obtains the CWA key from GitHub Actions Secrets and writes through a server-side Supabase/PostgreSQL connection. The Vercel deployment never runs a persistent scheduler.

This preserves the course requirement for modular Python data processing and avoids relying on Vercel's ephemeral filesystem. A dedicated FastAPI service was considered, but it adds a separately hosted, always-on backend without adding MVP behavior. Vercel Cron was not selected because the project must avoid an extra paid dependency.

The workflow SHALL use a non-zero minute offset and UTC cron schedule so it fetches after CWA publishes. It SHALL also support a manually dispatched run for diagnosis.

### 2. Store canonical current rows, immutable versions, and raw responses separately

The database uses a normalized model:

- `locations`: stable county/town identifiers and display names; optional map geometry key or centroid.
- `sync_runs`: attempt time, source identifier, source issue/update time, checksum, outcome, and error summary.
- `forecast_versions`: one successful changed source version, linked to its sync run.
- `forecast_records`: immutable normalized records belonging to a version, keyed by location and valid period.
- `current_forecasts`: a current projection or table updated atomically from the latest version for fast public reads.
- `raw_payloads`: protected raw source bodies and metadata, linked to sync runs.

The source publication/update value is preferred for change detection; a canonicalized-content checksum is the fallback. A successful duplicate updates `sync_runs` but creates neither a `forecast_versions` nor `forecast_records` duplicate. A failed run leaves `current_forecasts` untouched.

Using only raw JSON would couple the website to CWA's nested format. Using only a mutable current table would lose the required historical versions. The dual representation serves both needs.

### 3. Make Next.js/Vercel the web and query boundary

The Vercel application uses Next.js with server-side routes or server components as the forecast query boundary. Browser clients receive normalized forecast, location, and freshness data only; no browser bundle receives CWA or Supabase service credentials.

The query surface has three logical resources:

- location discovery: counties and towns constrained by the chosen county;
- forecast data: county/town plus optional date range;
- freshness: last successful update and latest sync state.

Server-side query code uses a least-privilege read credential where possible. Direct public table access was considered but rejected for the MVP because it complicates raw-payload isolation and allows the browser to depend on database schema.

### 4. Use Leaflet with versioned Taiwan geographic reference data

The frontend renders Leaflet on the client and joins normalized locations to a versioned Taiwan county/town GeoJSON asset by stable administrative code rather than display text. For a selected forecast date and indicator, it colors the matching town features and derives the legend from the same indicator scale. Missing values remain visibly unavailable.

Leaflet was selected because it supports custom data layers and works naturally in a Vercel React application. Windy would introduce another API key and a separate model-data visual language; Folium produces a Python-rendered map that is less suitable for client-side filter changes.

### 5. Use one shared administrator secret with a server-side session for the MVP

The administrative route presents a password challenge verified only on the server against a Vercel environment secret. A successful verification issues a short-lived, signed, HttpOnly, Secure session cookie. Admin-only server routes require that session before exposing raw payloads or accepting a manual synchronization request.

This is intentionally not a multi-user identity system. The manual action calls the same protected workflow trigger or server-side sync mechanism used by operations, and synchronization ownership is protected by a database-backed lock or unique active-run state. A public client can never initiate a write using the CWA key.

## Risks / Trade-offs

- [GitHub scheduled runs can be delayed or skipped] → Schedule after source publication, make sync idempotent, retain last successful data, record every attempt, and offer authenticated manual retry.
- [CWA field availability or shape varies by period] → Parse elements defensively, preserve valid records with unavailable optional values, validate against saved fixture payloads, and log rejected values.
- [Town labels may not exactly match map labels] → Join by normalized official administrative identifiers, include a validation report for unmatched locations, and avoid display-name-only joins.
- [Forecast source can update without a reliable timestamp] → Use canonical content checksums as change-detection fallback.
- [Free Supabase project availability and size are limited] → Store raw payloads with bounded retention, keep one current projection, monitor version growth, and document recovery/re-sync steps.
- [A shared administrator password has limited auditability] → Limit the route to trusted operators, use a strong secret, short session lifetime, and defer user-level audit requirements to a future change.

## Migration Plan

1. Provision Supabase schema, row-access policy, and required environment secrets before deploying any public route.
2. Deploy the Python sync workflow with a manual dispatch path; perform an initial synchronization and validate records, location joins, and duplicate detection.
3. Deploy Vercel query routes and dashboard against the populated schema; verify public reads, stale-state behavior, and unsupported-data rendering.
4. Configure the six-hour GitHub Actions schedule and protected admin credentials; monitor initial scheduled runs.
5. Roll back a web deployment by reverting Vercel to the previous deployment. If ingestion is faulty, disable the workflow or admin trigger, retain the prior `current_forecasts`, correct the parser, and re-run synchronization. No destructive migration is required for rollback because forecast versions are append-only.
