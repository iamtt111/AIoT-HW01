export type Location = {
  countyCode: string;
  countyName: string;
  townCode: string;
  townName: string;
};

type CurrentForecastRow = {
  location: {
    county_code: string;
    county_name: string;
    town_code: string;
    town_name: string;
  } | null;
};

export type LocationSelection = {
  counties: Array<Pick<Location, "countyCode" | "countyName">>;
  towns: Array<Pick<Location, "countyCode" | "townCode" | "townName">>;
};

export function selectLocations(locations: Location[], countyCode?: string): LocationSelection {
  const counties = new Map<string, Pick<Location, "countyCode" | "countyName">>();
  const towns = new Map<string, Pick<Location, "countyCode" | "townCode" | "townName">>();

  for (const location of locations) {
    counties.set(location.countyCode, {
      countyCode: location.countyCode,
      countyName: location.countyName,
    });
    if (!countyCode || location.countyCode === countyCode) {
      towns.set(`${location.countyCode}:${location.townCode}`, {
        countyCode: location.countyCode,
        townCode: location.townCode,
        townName: location.townName,
      });
    }
  }

  return {
    counties: [...counties.values()].sort((left, right) => left.countyName.localeCompare(right.countyName, "zh-Hant")),
    towns: countyCode
      ? [...towns.values()].sort((left, right) => left.townName.localeCompare(right.townName, "zh-Hant"))
      : [],
  };
}

function serverSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Server-side Supabase credentials are not configured");
  }
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

export async function getCurrentLocations(fetcher: typeof fetch = fetch): Promise<Location[]> {
  const { url, serviceRoleKey } = serverSupabaseConfig();
  const endpoint = new URL(`${url}/rest/v1/current_forecasts`);
  endpoint.searchParams.set(
    "select",
    "location:locations!inner(county_code,county_name,town_code,town_name)",
  );

  const response = await fetcher(endpoint, {
    cache: "no-store",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase location query failed with HTTP ${response.status}`);
  }

  const rows = (await response.json()) as CurrentForecastRow[];
  return rows.flatMap((row) => {
    if (!row.location) return [];
    return [{
      countyCode: row.location.county_code,
      countyName: row.location.county_name,
      townCode: row.location.town_code,
      townName: row.location.town_name,
    }];
  });
}
