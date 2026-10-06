# CWA forecast ingestion

This package will fetch `F-D0047-091`, validate the payload, and write
idempotent forecast snapshots to Supabase.

## Local setup

1. Install Python 3.11 or later.
2. From this directory, create and activate a virtual environment.
3. Install the package in editable mode: `py -3.12 -m pip install -e .` on
   Windows, or `python -m pip install -e .` on macOS/Linux.
4. Copy the repository `.env.example` values into your local secret store.
5. Confirm the command is available: `py -3.12 -m cwa_weather_ingestion --help`

`SUPABASE_DB_URL` is required by the ingestion writer. Obtain a PostgreSQL URI
from Supabase Dashboard **Connect**. Prefer the Transaction pooler (`:6543`) if
it is available; otherwise use the Direct URI only from an IPv6-capable network.
Place it only in the ignored repository-root `.env` for local work, and store the
same value as a GitHub Actions secret for scheduled runs. Do not put it in
`web/.env.local` or any `NEXT_PUBLIC_*` setting.

## Run a synchronization

For an actual CWA fetch, set `CWA_API_KEY` and `SUPABASE_DB_URL`, then run:

```powershell
py -3.12 -m cwa_weather_ingestion
```

For an offline, repeatable development run that uses the checked-in fixture:

```powershell
py -3.12 -m cwa_weather_ingestion --fixture tests/fixtures/fd0047-091-parser-complete.json
```

The command prints one JSON result line and returns exit code `0` for a successful
sync, `1` for an upstream/parse/database failure that was recorded in `sync_runs`,
and `2` for a configuration error that could not be recorded.

## GitHub Actions schedule

`.github/workflows/cwa-forecast-sync.yml` supports **Run workflow** manual
dispatch and runs at minute 17 of `00:00`, `06:00`, `12:00`, and `18:00` UTC.
Set the repository secrets `CWA_API_KEY` and `SUPABASE_DB_URL` before enabling
the workflow. The job prints only the command's credential-free JSON summary.
