-- F-D0047-091 currently supplies county/city locations, not townships.
-- Existing normalized forecasts were built against the superseded township
-- model, so discard only those derived rows. Keep sync history and raw
-- payloads for troubleshooting and auditability.

delete from public.current_forecasts;
delete from public.forecast_records;
delete from public.forecast_versions;
delete from public.locations;

alter table public.locations
  drop constraint locations_county_town_unique;

alter table public.locations
  rename column county_code to area_code;

alter table public.locations
  rename column county_name to area_name;

alter table public.locations
  drop column town_code,
  drop column town_name;

alter table public.locations
  add constraint locations_area_code_unique unique (area_code);

comment on table public.locations is
  'Canonical CWA county or city identities, with an optional GeoJSON feature key.';
