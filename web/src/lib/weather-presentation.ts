import type { ForecastRecord } from "./forecast-records";
import type { MapIndicator } from "./forecast-presentation";

export type WeatherIconName = "sun" | "cloud-sun" | "cloud" | "cloud-rain" | "cloud-lightning" | "cloudy";

export type WeatherPresentation = {
  icon: WeatherIconName;
  label: string;
};

export type IndicatorChartPoint = {
  label: string;
  primary: number | null;
  secondary?: number | null;
};

export function weatherPresentation(weatherCode: string | null): WeatherPresentation {
  if (weatherCode === "01") return { icon: "sun", label: "\u6674\u6717" };
  if (["02", "03"].includes(weatherCode ?? "")) return { icon: "cloud-sun", label: "\u6674\u6642\u591a\u96f2" };
  if (["04", "05", "06", "07"].includes(weatherCode ?? "")) return { icon: "cloud", label: "\u591a\u96f2" };
  if (["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "31", "32", "33", "34", "35", "36", "41"].includes(weatherCode ?? "")) return { icon: "cloud-rain", label: "\u6709\u96e8" };
  if (["23", "24", "25", "26", "27", "28"].includes(weatherCode ?? "")) return { icon: "cloud-lightning", label: "\u96f7\u96e8" };
  return { icon: "cloudy", label: "\u5929\u6c23\u672a\u77e5" };
}

const windForceThresholds = [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
const compassDirections = ["\u504f\u5317\u98a8", "\u6771\u5317\u98a8", "\u504f\u6771\u98a8", "\u6771\u5357\u98a8", "\u504f\u5357\u98a8", "\u897f\u5357\u98a8", "\u504f\u897f\u98a8", "\u897f\u5317\u98a8"];

function roundedNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

export function apparentTemperatureSummary(minimum: number | null, maximum: number | null): string | null {
  if (minimum === null && maximum === null) return null;
  if (minimum !== null && maximum !== null) return `\u9ad4\u611f\uff1a${roundedNumber(minimum)}\u00b0C - ${roundedNumber(maximum)}\u00b0C`;
  return `\u9ad4\u611f\uff1a${roundedNumber(minimum ?? maximum ?? 0)}\u00b0C`;
}

export function windSummary(directionDegrees: number | null, directionDescription: string | null, speedMps: number | null): string | null {
  const normalizedDirection = directionDescription?.trim()
    || (directionDegrees === null ? null : compassDirections[Math.round((((directionDegrees % 360) + 360) % 360) / 45) % compassDirections.length]);
  if (speedMps === null) return normalizedDirection;
  const force = windForceThresholds.findIndex((threshold) => speedMps < threshold);
  const forceLevel = force === -1 ? 12 : force;
  const speed = `\u98a8\u901f${forceLevel}\u7d1a\uff08${roundedNumber(speedMps)} m/s\uff09`;
  return normalizedDirection ? `${normalizedDirection} ${speed}` : speed;
}

export function windForceLabel(speedMps: number | null): string | null {
  if (speedMps === null) return null;
  const force = windForceThresholds.findIndex((threshold) => speedMps < threshold);
  return `${force === -1 ? 12 : force}\u7d1a`;
}

function weatherSentenceParts(description: string | null): string[] {
  return description?.split(/[\u3002\uff0e]/).map((part) => part.trim()).filter(Boolean) ?? [];
}

export function weatherSummary(description: string | null, fallback: string): string {
  return weatherSentenceParts(description)[0] ?? fallback;
}

export function weatherSourceExtras(description: string | null): { comfort: string | null; relativeHumidity: string | null } {
  const parts = weatherSentenceParts(description);
  const humidity = parts.find((part) => part.includes("\u76f8\u5c0d\u6fd5\u5ea6")) ?? null;
  const comfort = parts.slice(1).find((part) => !/\u964d\u96e8\u6a5f\u7387|\u6eab\u5ea6|\u98a8|\u76f8\u5c0d\u6fd5\u5ea6/.test(part)) ?? null;
  return { comfort, relativeHumidity: humidity };
}

function label(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit" }).format(new Date(value));
}

export function indicatorChartSeries(records: ForecastRecord[], indicator: MapIndicator): IndicatorChartPoint[] {
  return records.map((record) => {
    const base = { label: label(record.validFrom) };
    if (indicator === "temperature") return { ...base, primary: record.maxTemperatureC, secondary: record.minTemperatureC };
    if (indicator === "precipitation") return { ...base, primary: record.precipitationProbability };
    if (indicator === "uv") return { ...base, primary: record.uvIndex };
    return { ...base, primary: record.windSpeedMps };
  });
}
