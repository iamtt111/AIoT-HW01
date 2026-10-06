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
