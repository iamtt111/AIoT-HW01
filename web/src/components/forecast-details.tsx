"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { temperatureTrend } from "@/lib/forecast-presentation";
import type { ForecastRecord } from "@/lib/forecast-records";

const copy = {
  noRecords: "\u672a\u627e\u5230\u7b26\u5408\u689d\u4ef6\u7684\u9810\u5831\u6642\u6bb5\u3002",
  trendAriaLabel: "\u6700\u9ad8\u8207\u6700\u4f4e\u6eab\u5ea6\u8d70\u52e2",
  trendTitle: "\u6700\u9ad8\uff0f\u6700\u4f4e\u6eab\u5ea6\u8d70\u52e2",
  maximum: "\u6700\u9ad8\u6eab",
  minimum: "\u6700\u4f4e\u6eab",
  period: "\u9810\u5831\u6642\u6bb5",
  weather: "\u5929\u6c23",
  temperature: "\u6eab\u5ea6",
  precipitation: "\u964d\u96e8\u6a5f\u7387",
  uv: "\u7d2b\u5916\u7dda",
  wind: "\u98a8\u901f",
  unavailable: "\u2014",
  degree: "\u00b0C",
};

function periodLabel(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function value(value: number | null, unit = ""): string {
  return value === null ? copy.unavailable : `${value}${unit}`;
}

export function ForecastDetails({ records }: { records: ForecastRecord[] }) {
  if (records.length === 0) return <p className="rounded-lg bg-slate-100 p-6 text-slate-600">{copy.noRecords}</p>;
  const trend = temperatureTrend(records);

  return <div className="space-y-6"><section aria-label={copy.trendAriaLabel} className="h-72 rounded-xl border border-slate-200 p-4"><h3 className="mb-2 font-semibold">{copy.trendTitle}</h3><ResponsiveContainer width="100%" height="88%"><LineChart data={trend} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}><XAxis dataKey="label" fontSize={12} /><YAxis unit={copy.degree} fontSize={12} /><Tooltip /><Line type="monotone" dataKey="maximum" name={copy.maximum} stroke="#ef4444" strokeWidth={2} connectNulls /><Line type="monotone" dataKey="minimum" name={copy.minimum} stroke="#2563eb" strokeWidth={2} connectNulls /></LineChart></ResponsiveContainer></section>
    <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-slate-700"><tr><th className="p-3">{copy.period}</th><th className="p-3">{copy.weather}</th><th className="p-3">{copy.temperature}</th><th className="p-3">{copy.precipitation}</th><th className="p-3">{copy.uv}</th><th className="p-3">{copy.wind}</th></tr></thead><tbody>{records.map((record) => <tr className="border-t border-slate-100" key={`${record.areaCode}-${record.validFrom}`}><td className="p-3 whitespace-nowrap">{periodLabel(record.validFrom)} {"\u2013"} {periodLabel(record.validTo)}</td><td className="p-3">{record.weatherDescription ?? copy.unavailable}</td><td className="p-3">{value(record.minTemperatureC, copy.degree)} / {value(record.maxTemperatureC, copy.degree)}</td><td className="p-3">{value(record.precipitationProbability, "%")}</td><td className="p-3">{value(record.uvIndex)}</td><td className="p-3">{value(record.windSpeedMps, " m/s")}</td></tr>)}</tbody></table></div>
  </div>;
}
