export type DateBoundary = "start" | "end";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function optionalForecastTime(value: string | null, field: string, boundary: DateBoundary): string | undefined {
  if (!value) return undefined;
  const normalized = DATE_ONLY.test(value)
    ? `${value}T${boundary === "start" ? "00:00:00.000+08:00" : "23:59:59.999+08:00"}`
    : value;
  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${field} must be a valid ISO-8601 date or time`);
  }
  return normalized;
}
