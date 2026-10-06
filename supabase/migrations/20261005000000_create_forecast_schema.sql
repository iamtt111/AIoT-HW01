-- CWA F-D0047-091 forecast persistence.
--
-- This migration defines the append-only source-version model. Row-level
-- security policies and operational constraints are added in later migrations.

create extension if not exists pgcrypto;

create type public.sync_run_status as enum (
  'running',
  'succeeded',
  'failed',
  'skipped'
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  county_code text not null,
  town_code text not null,
  county_name text not null,
  town_name text not null,
  geo_feature_key text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.locations is
  'Canonical CWA county and town identities, with an optional GeoJSON feature key.';

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_dataset_id text not null,
  status public.sync_run_status not null default 'running',
  requested_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  source_published_at timestamptz,
  source_checksum text,
  record_count integer,
  error_summary text,
  created_at timestamptz not null default now()
);

comment on table public.sync_runs is
  'One row per scheduled or manually triggered CWA retrieval attempt.';

create table public.forecast_versions (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references public.sync_runs(id),
  source_dataset_id text not null,
  source_published_at timestamptz,
  content_checksum text not null,
  created_at timestamptz not null default now()
);

comment on table public.forecast_versions is
  'Immutable, changed normalized forecast snapshots only.';

create table public.forecast_records (
  id bigint generated always as identity primary key,
  version_id uuid not null references public.forecast_versions(id) on delete cascade,
  location_id uuid not null references public.locations(id),
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  weather_description text,
  weather_code text,
  precipitation_probability numeric(5, 2),
  min_temperature_c numeric(5, 2),
  max_temperature_c numeric(5, 2),
  apparent_min_temperature_c numeric(5, 2),
  apparent_max_temperature_c numeric(5, 2),
  uv_index numeric(5, 2),
  wind_speed_mps numeric(6, 2),
  wind_direction_degrees numeric(6, 2),
  wind_description text,
  source_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.forecast_records is
  'Immutable normalized forecast periods belonging to one source version.';

create table public.current_forecasts (
  id bigint generated always as identity primary key,
  version_id uuid not null references public.forecast_versions(id),
  location_id uuid not null references public.locations(id),
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  weather_description text,
  weather_code text,
  precipitation_probability numeric(5, 2),
  min_temperature_c numeric(5, 2),
  max_temperature_c numeric(5, 2),
  apparent_min_temperature_c numeric(5, 2),
  apparent_max_temperature_c numeric(5, 2),
  uv_index numeric(5, 2),
  wind_speed_mps numeric(6, 2),
  wind_direction_degrees numeric(6, 2),
  wind_description text,
  refreshed_at timestamptz not null default now()
);

comment on table public.current_forecasts is
  'Atomically replaced projection of the newest successful forecast version.';

create table public.raw_payloads (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references public.sync_runs(id) on delete cascade,
  payload jsonb not null,
  content_checksum text not null,
  source_url text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.raw_payloads is
  'Protected, retained CWA responses for operator-only diagnostics.';
