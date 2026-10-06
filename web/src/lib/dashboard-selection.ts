import type { ForecastRecord } from "./forecast-records";

export type MapPeriod = {
  id: string;
  validFrom: string;
  validTo: string;
};

export type DetailDateRange = {
  startsAt: string;
  endsAt: string;
};

const taiwanDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function taiwanCalendarDate(value: string): string {
  const parts = taiwanDateFormatter.formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function availableMapPeriods(records: ForecastRecord[]): MapPeriod[] {
  const periods = new Map<string, MapPeriod>();
  for (const record of records) {
    const id = `${record.validFrom}|${record.validTo}`;
    periods.set(id, { id, validFrom: record.validFrom, validTo: record.validTo });
  }
  return [...periods.values()].sort((left, right) => left.validFrom.localeCompare(right.validFrom));
}

export function nextMapPeriod(periods: MapPeriod[], now = new Date()): MapPeriod | null {
  const nowIso = now.toISOString();
  return periods.find((period) => period.validFrom >= nowIso) ?? periods[0] ?? null;
}

export function detailDateRangeForArea(records: ForecastRecord[], areaCode: string): DetailDateRange | null {
  const areaRecords = records.filter((record) => record.areaCode === areaCode);
  if (areaRecords.length === 0) return null;
  const startsAt = areaRecords.reduce((earliest, record) => record.validFrom < earliest ? record.validFrom : earliest, areaRecords[0].validFrom);
  const endsAt = areaRecords.reduce((latest, record) => record.validTo > latest ? record.validTo : latest, areaRecords[0].validTo);
  return { startsAt: taiwanCalendarDate(startsAt), endsAt: taiwanCalendarDate(endsAt) };
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Returns the next seven calendar days available for an area's detail view. */
export function futureWeekDateRangeForArea(records: ForecastRecord[], areaCode: string, now = new Date()): DetailDateRange | null {
  const areaRecords = records
    .filter((record) => record.areaCode === areaCode)
    .sort((left, right) => left.validFrom.localeCompare(right.validFrom));
  if (areaRecords.length === 0) return null;

  const reference = areaRecords.find((record) => record.validTo >= now.toISOString()) ?? areaRecords[0];
  const startsAt = taiwanCalendarDate(reference.validFrom);
  const availableEnd = taiwanCalendarDate(areaRecords[areaRecords.length - 1]?.validTo ?? reference.validTo);
  return { startsAt, endsAt: addCalendarDays(startsAt, 6) < availableEnd ? addCalendarDays(startsAt, 6) : availableEnd };
}

export function recordsForMapPeriod(records: ForecastRecord[], periodId: string | null): ForecastRecord[] {
  if (!periodId) return [];
  return records.filter((record) => `${record.validFrom}|${record.validTo}` === periodId);
}
