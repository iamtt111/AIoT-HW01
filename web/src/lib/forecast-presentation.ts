import type { ForecastRecord } from "./forecast-records";

export type MapIndicator = "temperature" | "precipitation" | "uv" | "wind";

export type MapValue = {
  value: number | null;
  unit: string;
};

export type TemperatureTrendPoint = {
  label: string;
  minimum: number | null;
  maximum: number | null;
};

export function mapValueForRecord(record: ForecastRecord | undefined, indicator: MapIndicator): MapValue {
  if (!record) return { value: null, unit: "" };
  switch (indicator) {
    case "temperature":
      return { value: record.maxTemperatureC ?? record.minTemperatureC, unit: "\u00b0C" };
    case "precipitation":
      return { value: record.precipitationProbability, unit: "%" };
    case "uv":
      return { value: record.uvIndex, unit: "" };
    case "wind":
      return { value: record.windSpeedMps, unit: "m/s" };
  }
}

export function mapRecordByArea(records: ForecastRecord[]): Map<string, ForecastRecord> {
  const byArea = new Map<string, ForecastRecord>();
  for (const record of records) {
    if (!byArea.has(record.areaCode)) byArea.set(record.areaCode, record);
  }
  return byArea;
}

export function temperatureTrend(records: ForecastRecord[]): TemperatureTrendPoint[] {
  return records.map((record) => ({
    label: new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit" }).format(new Date(record.validFrom)),
    minimum: record.minTemperatureC,
    maximum: record.maxTemperatureC,
  }));
}
