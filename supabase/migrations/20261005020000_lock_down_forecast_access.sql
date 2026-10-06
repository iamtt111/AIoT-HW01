-- The browser never connects to forecast tables directly. Public requests go
-- through Next.js route handlers, while the server-side service role performs
-- the controlled database operations.

alter table public.locations enable row level security;
alter table public.sync_runs enable row level security;
alter table public.forecast_versions enable row level security;
alter table public.forecast_records enable row level security;
alter table public.current_forecasts enable row level security;
alter table public.raw_payloads enable row level security;
alter table public.sync_locks enable row level security;

revoke all on table public.locations from anon, authenticated;
revoke all on table public.sync_runs from anon, authenticated;
revoke all on table public.forecast_versions from anon, authenticated;
revoke all on table public.forecast_records from anon, authenticated;
revoke all on table public.current_forecasts from anon, authenticated;
revoke all on table public.raw_payloads from anon, authenticated;
revoke all on table public.sync_locks from anon, authenticated;

revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.locations,
  public.sync_runs,
  public.forecast_versions,
  public.forecast_records,
  public.current_forecasts,
  public.raw_payloads,
  public.sync_locks
to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.try_acquire_forecast_sync_lock(uuid, interval) to service_role;
grant execute on function public.release_forecast_sync_lock(uuid) to service_role;

create policy locations_service_role_only
  on public.locations for all to service_role
  using (true) with check (true);

create policy sync_runs_service_role_only
  on public.sync_runs for all to service_role
  using (true) with check (true);

create policy forecast_versions_service_role_only
  on public.forecast_versions for all to service_role
  using (true) with check (true);

create policy forecast_records_service_role_only
  on public.forecast_records for all to service_role
  using (true) with check (true);

create policy current_forecasts_service_role_only
  on public.current_forecasts for all to service_role
  using (true) with check (true);

create policy raw_payloads_service_role_only
  on public.raw_payloads for all to service_role
  using (true) with check (true);

create policy sync_locks_service_role_only
  on public.sync_locks for all to service_role
  using (true) with check (true);

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
