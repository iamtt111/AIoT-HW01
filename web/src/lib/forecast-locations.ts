export type ForecastArea = {
  areaCode: string;
  areaName: string;
};

type CurrentForecastRow = {
  location: {
    area_code: string;
    area_name: string;
  } | null;
};

export function selectAreas(locations: ForecastArea[]): ForecastArea[] {
  const areas = new Map<string, ForecastArea>();
  for (const location of locations) {
    areas.set(location.areaCode, location);
  }
  return [...areas.values()].sort((left, right) => left.areaName.localeCompare(right.areaName, "zh-Hant"));
}

export async function getCurrentAreas(fetcher: typeof fetch = fetch): Promise<ForecastArea[]> {
  const { url, secretKey } = serverSupabaseConfig();
  const endpoint = new URL(`${url}/rest/v1/current_forecasts`);
  endpoint.searchParams.set("select", "location:locations!inner(area_code,area_name)");

  const response = await fetcher(endpoint, {
    cache: "no-store",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase location query failed with HTTP ${response.status}`);
  }

  const rows = (await response.json()) as CurrentForecastRow[];
  return rows.flatMap((row) => {
    if (!row.location) return [];
    return [{ areaCode: row.location.area_code, areaName: row.location.area_name }];
  });
}
import { serverSupabaseConfig } from "./server-supabase";
