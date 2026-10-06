-- Integrity, lookup performance, and single-run synchronization controls.

alter table public.locations
  add constraint locations_county_town_unique
  unique (county_code, town_code);

alter table public.forecast_versions
  add constraint forecast_versions_source_checksum_unique
  unique (source_dataset_id, content_checksum);

alter table public.forecast_records
  add constraint forecast_records_version_location_period_unique
  unique (version_id, location_id, valid_from, valid_to),
  add constraint forecast_records_valid_period_check
  check (valid_to > valid_from),
  add constraint forecast_records_precipitation_probability_check
  check (precipitation_probability is null or precipitation_probability between 0 and 100),
  add constraint forecast_records_uv_index_check
  check (uv_index is null or uv_index >= 0),
  add constraint forecast_records_wind_speed_check
  check (wind_speed_mps is null or wind_speed_mps >= 0),
  add constraint forecast_records_wind_direction_check
  check (wind_direction_degrees is null or wind_direction_degrees >= 0 and wind_direction_degrees < 360);

alter table public.current_forecasts
  add constraint current_forecasts_location_period_unique
  unique (location_id, valid_from, valid_to),
  add constraint current_forecasts_valid_period_check
  check (valid_to > valid_from),
  add constraint current_forecasts_precipitation_probability_check
  check (precipitation_probability is null or precipitation_probability between 0 and 100),
  add constraint current_forecasts_uv_index_check
  check (uv_index is null or uv_index >= 0),
  add constraint current_forecasts_wind_speed_check
  check (wind_speed_mps is null or wind_speed_mps >= 0),
  add constraint current_forecasts_wind_direction_check
  check (wind_direction_degrees is null or wind_direction_degrees >= 0 and wind_direction_degrees < 360);

alter table public.raw_payloads
  add constraint raw_payloads_sync_run_unique
  unique (sync_run_id);

alter table public.sync_runs
  add constraint sync_runs_record_count_check
  check (record_count is null or record_count >= 0),
  add constraint sync_runs_completion_state_check
  check (
    (status = 'running' and completed_at is null)
    or (status <> 'running' and completed_at is not null)
  );

create unique index sync_runs_one_active_forecast_idx
  on public.sync_runs (source_dataset_id)
  where status = 'running';

create index forecast_records_location_period_idx
  on public.forecast_records (location_id, valid_from, valid_to);

create index current_forecasts_location_period_idx
  on public.current_forecasts (location_id, valid_from, valid_to);

create index sync_runs_latest_success_idx
  on public.sync_runs (source_dataset_id, completed_at desc)
  where status = 'succeeded';

create index raw_payloads_fetched_at_idx
  on public.raw_payloads (fetched_at desc);

create table public.sync_locks (
  lock_name text primary key,
  sync_run_id uuid unique references public.sync_runs(id),
  acquired_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_locks_supported_name_check check (lock_name = 'forecast'),
  constraint sync_locks_lease_state_check check (
    (sync_run_id is null and acquired_at is null and expires_at is null)
    or (
      sync_run_id is not null
      and acquired_at is not null
      and expires_at is not null
      and expires_at > acquired_at
    )
  )
);

insert into public.sync_locks (lock_name)
values ('forecast');

comment on table public.sync_locks is
  'Single-row, leased mutex for CWA forecast synchronization.';

create function public.try_acquire_forecast_sync_lock(
  p_sync_run_id uuid,
  p_lease_interval interval default interval '20 minutes'
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_lease_interval <= interval '0 seconds' then
    raise exception 'lock lease interval must be positive';
  end if;

  if not exists (
    select 1
    from public.sync_runs
    where id = p_sync_run_id
      and status = 'running'
  ) then
    raise exception 'sync run % must be running before it can acquire the forecast lock', p_sync_run_id;
  end if;

  update public.sync_locks
  set sync_run_id = p_sync_run_id,
      acquired_at = now(),
      expires_at = now() + p_lease_interval,
      updated_at = now()
  where lock_name = 'forecast'
    and (
      sync_run_id is null
      or sync_run_id = p_sync_run_id
      or expires_at <= now()
    );

  return found;
end;
$$;

create function public.release_forecast_sync_lock(p_sync_run_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.sync_locks
  set sync_run_id = null,
      acquired_at = null,
      expires_at = null,
      updated_at = now()
  where lock_name = 'forecast'
    and sync_run_id = p_sync_run_id;

  return found;
end;
$$;

revoke all on function public.try_acquire_forecast_sync_lock(uuid, interval) from public;
revoke all on function public.release_forecast_sync_lock(uuid) from public;
grant execute on function public.try_acquire_forecast_sync_lock(uuid, interval) to service_role;
grant execute on function public.release_forecast_sync_lock(uuid) to service_role;
