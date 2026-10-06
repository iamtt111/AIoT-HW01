import type { ForecastArea } from "./forecast-locations";
import { serverSupabaseConfig } from "./server-supabase";

export type ForecastRecord = ForecastArea & {
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
  areaCode: string;
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
    area_code: string;
    area_name: string;
  } | null;
};

export function filterForecastRecords(records: ForecastRecord[], filters: ForecastFilters): ForecastRecord[] {
  return records.filter((record) => {
    if (record.areaCode !== filters.areaCode) return false;
    if (filters.startsAt && record.validTo < filters.startsAt) return false;
    if (filters.endsAt && record.validFrom > filters.endsAt) return false;
    return true;
  });
}

export async function getLatestForecasts(
  filters: ForecastFilters,
  fetcher: typeof fetch = fetch,
): Promise<ForecastRecord[]> {
  const { url, secretKey } = serverSupabaseConfig();
  const endpoint = new URL(`${url}/rest/v1/current_forecasts`);
  endpoint.searchParams.set(
    "select",
    [
      "valid_from,valid_to,weather_description,weather_code,precipitation_probability",
      "min_temperature_c,max_temperature_c,apparent_min_temperature_c,apparent_max_temperature_c",
      "uv_index,wind_speed_mps,wind_direction_degrees,wind_description",
      "location:locations!inner(area_code,area_name)",
    ].join(","),
  );
  endpoint.searchParams.set("location.area_code", `eq.${filters.areaCode}`);
  if (filters.startsAt) endpoint.searchParams.set("valid_to", `gte.${filters.startsAt}`);
  if (filters.endsAt) endpoint.searchParams.set("valid_from", `lte.${filters.endsAt}`);
  endpoint.searchParams.set("order", "valid_from.asc");

  const response = await fetcher(endpoint, {
    cache: "no-store",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase forecast query failed with HTTP ${response.status}`);
  }

  const rows = (await response.json()) as CurrentForecastRow[];
  return rows.flatMap((row) => {
    if (!row.location) return [];
    return [{
      areaCode: row.location.area_code,
      areaName: row.location.area_name,
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
