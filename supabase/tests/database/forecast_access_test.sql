begin;

select plan(17);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.locations'::regclass),
  'locations has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.sync_runs'::regclass),
  'sync_runs has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.forecast_versions'::regclass),
  'forecast_versions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.forecast_records'::regclass),
  'forecast_records has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.current_forecasts'::regclass),
  'current_forecasts has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.raw_payloads'::regclass),
  'raw_payloads has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.sync_locks'::regclass),
  'sync_locks has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.raw_payloads', 'select'),
  'anonymous clients cannot read raw payloads'
);
select ok(
  not has_table_privilege('authenticated', 'public.raw_payloads', 'select'),
  'authenticated clients cannot read raw payloads'
);
select ok(
  not has_table_privilege('anon', 'public.current_forecasts', 'insert'),
  'anonymous clients cannot write current forecasts'
);
select ok(
  not has_table_privilege('authenticated', 'public.current_forecasts', 'update'),
  'authenticated clients cannot change current forecasts'
);
select ok(
  not has_table_privilege('anon', 'public.sync_runs', 'delete'),
  'anonymous clients cannot delete sync history'
);
select ok(
  not has_table_privilege('anon', 'public.sync_locks', 'update'),
  'anonymous clients cannot acquire a sync lock directly'
);

select ok(
  has_table_privilege('service_role', 'public.raw_payloads', 'select'),
  'the server-side service role can inspect raw payloads'
);
select ok(
  has_table_privilege('service_role', 'public.current_forecasts', 'insert'),
  'the server-side service role can replace current forecasts'
);
select ok(
  has_table_privilege('service_role', 'public.sync_locks', 'update'),
  'the server-side service role can manage synchronization state'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'raw_payloads'
      and policyname = 'raw_payloads_service_role_only'
  ),
  'raw payload access policy is restricted to the service role'
);

select * from finish();

rollback;
