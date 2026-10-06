begin;

select plan(12);

select has_table('public', 'sync_locks', 'sync lock table exists');
select has_index('public', 'sync_runs', 'sync_runs_one_active_forecast_idx', 'active-run index exists');
select has_index('public', 'forecast_records', 'forecast_records_location_period_idx', 'forecast lookup index exists');

select lives_ok(
  $$
    insert into public.locations (id, county_code, town_code, county_name, town_name)
    values (
      '00000000-0000-0000-0000-000000000001',
      '100',
      '10001',
      '測試縣',
      '測試鄉'
    )
  $$,
  'first canonical location can be inserted'
);

select throws_ok(
  $$
    insert into public.locations (county_code, town_code, county_name, town_name)
    values ('100', '10001', '重複縣', '重複鄉')
  $$,
  '23505',
  null,
  'duplicate county/town is rejected'
);

insert into public.sync_runs (id, source_dataset_id)
values ('00000000-0000-0000-0000-000000000010', 'F-D0047-091');

insert into public.sync_runs (id, source_dataset_id)
values ('00000000-0000-0000-0000-000000000011', 'lock-test-source');

select ok(
  public.try_acquire_forecast_sync_lock('00000000-0000-0000-0000-000000000010'),
  'first running sync acquires the forecast lock'
);

select ok(
  not public.try_acquire_forecast_sync_lock('00000000-0000-0000-0000-000000000011'),
  'second running sync is rejected while the lock lease is active'
);

select is(
  (select sync_run_id from public.sync_locks where lock_name = 'forecast'),
  '00000000-0000-0000-0000-000000000010'::uuid,
  'the lock remains owned by the first sync'
);

select ok(
  public.release_forecast_sync_lock('00000000-0000-0000-0000-000000000010'),
  'the owning sync can release the lock'
);

select ok(
  public.try_acquire_forecast_sync_lock('00000000-0000-0000-0000-000000000011'),
  'a later sync acquires the released lock'
);

insert into public.forecast_versions (
  id,
  sync_run_id,
  source_dataset_id,
  content_checksum
)
values (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  'F-D0047-091',
  'test-checksum'
);

select lives_ok(
  $$
    insert into public.forecast_records (
      version_id, location_id, valid_from, valid_to
    )
    values (
      '00000000-0000-0000-0000-000000000020',
      '00000000-0000-0000-0000-000000000001',
      '2026-10-05 00:00:00+00',
      '2026-10-05 12:00:00+00'
    )
  $$,
  'first forecast location-period can be inserted'
);

select throws_ok(
  $$
    insert into public.forecast_records (
      version_id, location_id, valid_from, valid_to
    )
    values (
      '00000000-0000-0000-0000-000000000020',
      '00000000-0000-0000-0000-000000000001',
      '2026-10-05 00:00:00+00',
      '2026-10-05 12:00:00+00'
    )
  $$,
  '23505',
  null,
  'duplicate forecast version/location/period is rejected'
);

select * from finish();

rollback;
