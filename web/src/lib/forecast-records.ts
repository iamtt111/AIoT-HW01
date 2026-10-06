import type { Location } from "./forecast-locations";

export type ForecastRecord = Location & {
  validFrom: string;
  validTo: string;
  weatherDescription: string | null;
  weatherCode: string | null;
  precipitationProbability: number | null;
  minTemperatureC: number | null;
  maxTemperatureC: number | null;
  apparentMinTemperatureC: number | null;
  apparentMaxTemperatureC: number | null;
  uvIndex: number | null;
  windSpeedMps: number | null;
  windDirectionDegrees: number | null;
  windDescription: string | null;
};

export type ForecastFilters = {
  countyCode: string;
  townCode?: string;
  startsAt?: string;
  endsAt?: string;
};

type CurrentForecastRow = {
  valid_from: string;
  valid_to: string;
  weather_description: string | null;
  weather_code: string | null;
  precipitation_probability: number | null;
  min_temperature_c: number | null;
  max_temperature_c: number | null;
  apparent_min_temperature_c: number | null;
  apparent_max_temperature_c: number | null;
  uv_index: number | null;
  wind_speed_mps: number | null;
  wind_direction_degrees: number | null;
  wind_description: string | null;
  location: {
    county_code: string;
    county_name: string;
    town_code: string;
    town_name: string;
  } | null;
};

function serverSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Server-side Supabase credentials are not configured");
  }
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

export function filterForecastRecords(records: ForecastRecord[], filters: ForecastFilters): ForecastRecord[] {
  return records.filter((record) => {
    if (record.countyCode !== filters.countyCode) return false;
    if (filters.townCode && record.townCode !== filters.townCode) return false;
    if (filters.startsAt && record.validTo < filters.startsAt) return false;
    if (filters.endsAt && record.validFrom > filters.endsAt) return false;
    return true;
  });
}

export async function getLatestForecasts(
  filters: ForecastFilters,
  fetcher: typeof fetch = fetch,
): Promise<ForecastRecord[]> {
  const { url, serviceRoleKey } = serverSupabaseConfig();
  const endpoint = new URL(`${url}/rest/v1/current_forecasts`);
  endpoint.searchParams.set(
    "select",
    [
      "valid_from,valid_to,weather_description,weather_code,precipitation_probability",
      "min_temperature_c,max_temperature_c,apparent_min_temperature_c,apparent_max_temperature_c",
      "uv_index,wind_speed_mps,wind_direction_degrees,wind_description",
      "location:locations!inner(county_code,county_name,town_code,town_name)",
    ].join(","),
  );
  endpoint.searchParams.set("location.county_code", `eq.${filters.countyCode}`);
  if (filters.townCode) endpoint.searchParams.set("location.town_code", `eq.${filters.townCode}`);
  if (filters.startsAt) endpoint.searchParams.set("valid_to", `gte.${filters.startsAt}`);
  if (filters.endsAt) endpoint.searchParams.set("valid_from", `lte.${filters.endsAt}`);
  endpoint.searchParams.set("order", "valid_from.asc");

  const response = await fetcher(endpoint, {
    cache: "no-store",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase forecast query failed with HTTP ${response.status}`);
  }

  const rows = (await response.json()) as CurrentForecastRow[];
  return rows.flatMap((row) => {
    if (!row.location) return [];
    return [{
      countyCode: row.location.county_code,
      countyName: row.location.county_name,
      townCode: row.location.town_code,
      townName: row.location.town_name,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      weatherDescription: row.weather_description,
      weatherCode: row.weather_code,
      precipitationProbability: row.precipitation_probability,
      minTemperatureC: row.min_temperature_c,
      maxTemperatureC: row.max_temperature_c,
      apparentMinTemperatureC: row.apparent_min_temperature_c,
      apparentMaxTemperatureC: row.apparent_max_temperature_c,
      uvIndex: row.uv_index,
      windSpeedMps: row.wind_speed_mps,
      windDirectionDegrees: row.wind_direction_degrees,
      windDescription: row.wind_description,
    }];
  });
}
