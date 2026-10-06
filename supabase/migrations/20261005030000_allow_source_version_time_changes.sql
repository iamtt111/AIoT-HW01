-- A new source publication time is a distinct immutable source version even
-- when its normalized forecast rows happen to have identical content.

alter table public.forecast_versions
  drop constraint forecast_versions_source_checksum_unique;

create unique index forecast_versions_source_checksum_published_unique
  on public.forecast_versions (
    source_dataset_id,
    content_checksum,
    coalesce(source_published_at, '-infinity'::timestamptz)
  );
