export type DateScope = {
  startsAt?: string;
  endsAt?: string;
};

export type DashboardSelection = DateScope & {
  areaCode: string;
};

export function normalizeDateScope(startsAt: string, endsAt: string): DateScope {
  if (!startsAt && !endsAt) return {};
  if (!startsAt) return { endsAt };
  if (!endsAt) return { startsAt };
  return startsAt <= endsAt ? { startsAt, endsAt } : { startsAt: endsAt, endsAt: startsAt };
}

export function forecastQuery(selection: DashboardSelection): string | null {
  if (!selection.areaCode) return null;

  const params = new URLSearchParams({ area_code: selection.areaCode });
  if (selection.startsAt) params.set("starts_at", selection.startsAt);
  if (selection.endsAt) params.set("ends_at", selection.endsAt);
  return `/api/forecasts?${params.toString()}`;
}
