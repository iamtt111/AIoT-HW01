"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { MapIndicator } from "@/lib/forecast-presentation";
import type { ForecastRecord } from "@/lib/forecast-records";
import { indicatorChartSeries, weatherPresentation } from "@/lib/weather-presentation";

import { WeatherIcon } from "./weather-icon";

const copy = {
  noRecords: "\u672a\u627e\u5230\u7b26\u5408\u689d\u4ef6\u7684\u9810\u5831\u6642\u6bb5\u3002",
  temperature: "\u6eab\u5ea6\u8d70\u52e2",
  precipitation: "\u964d\u96e8\u6a5f\u7387\u8d70\u52e2",
  uv: "\u7d2b\u5916\u7dda\u8d70\u52e2",
  wind: "\u98a8\u901f\u8d70\u52e2",
  maximum: "\u6700\u9ad8\u6eab",
  minimum: "\u6700\u4f4e\u6eab",
  period: "\u9810\u5831\u6642\u6bb5",
  weather: "\u5929\u6c23",
  temperatureLabel: "\u6eab\u5ea6",
  precipitationLabel: "\u964d\u96e8\u6a5f\u7387",
  uvLabel: "\u7d2b\u5916\u7dda",
  windLabel: "\u98a8\u901f",
  unavailable: "\u2014",
  degree: "\u00b0C",
};

const chartTitles: Record<MapIndicator, string> = {
  temperature: copy.temperature,
  precipitation: copy.precipitation,
  uv: copy.uv,
  wind: copy.wind,
};

function periodLabel(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function value(value: number | null, unit = ""): string {
  return value === null ? copy.unavailable : `${value}${unit}`;
}

const chartAxisProps = {
  fontSize: 12,
  minTickGap: 28,
  tick: { fill: "#475569", fontWeight: 600 },
  tickLine: { stroke: "#94a3b8" },
  axisLine: { stroke: "#94a3b8" },
  tickFormatter: (label: string) => label.split(" ")[0],
};

const chartTooltipProps = {
  contentStyle: { borderRadius: "12px", borderColor: "#cbd5e1", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)" },
  labelStyle: { color: "#334155", fontWeight: 700 },
};

function IndicatorChart({ records, indicator }: { records: ForecastRecord[]; indicator: MapIndicator }) {
  const data = indicatorChartSeries(records, indicator);
  const unit = indicator === "temperature" ? copy.degree : indicator === "precipitation" ? "%" : indicator === "wind" ? " m/s" : "";
  if (indicator === "temperature") return <ResponsiveContainer width="100%" height="88%"><LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" /><XAxis dataKey="label" {...chartAxisProps} /><YAxis unit={unit} fontSize={12} /><Tooltip {...chartTooltipProps} /><Line type="monotone" dataKey="primary" name={copy.maximum} stroke="#ef4444" strokeWidth={2.5} connectNulls /><Line type="monotone" dataKey="secondary" name={copy.minimum} stroke="#2563eb" strokeWidth={2.5} connectNulls /></LineChart></ResponsiveContainer>;
  if (indicator === "precipitation") return <ResponsiveContainer width="100%" height="88%"><BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" /><XAxis dataKey="label" {...chartAxisProps} /><YAxis unit={unit} domain={[0, 100]} fontSize={12} /><Tooltip {...chartTooltipProps} /><Bar dataKey="primary" name={copy.precipitationLabel} fill="#0ea5e9" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height="88%"><AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}><defs><linearGradient id="indicator-fill" x1="0" x2="0" y1="0"><stop offset="0%" stopColor={indicator === "uv" ? "#c026d3" : "#7c3aed"} stopOpacity={0.45} /><stop offset="100%" stopColor={indicator === "uv" ? "#c026d3" : "#7c3aed"} stopOpacity={0.03} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" /><XAxis dataKey="label" {...chartAxisProps} /><YAxis unit={unit} fontSize={12} /><Tooltip {...chartTooltipProps} /><Area type="monotone" dataKey="primary" name={indicator === "uv" ? copy.uvLabel : copy.windLabel} stroke={indicator === "uv" ? "#c026d3" : "#7c3aed"} fill="url(#indicator-fill)" strokeWidth={2.5} connectNulls /></AreaChart></ResponsiveContainer>;
}

export function ForecastDetails({ records, indicator }: { records: ForecastRecord[]; indicator: MapIndicator }) {
  if (records.length === 0) return <p className="rounded-2xl bg-white/10 p-6 text-slate-200">{copy.noRecords}</p>;

  return <div className="space-y-6"><section aria-label={chartTitles[indicator]} className="h-80 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 flex items-baseline justify-between gap-3"><h3 className="text-lg font-bold text-slate-900">{chartTitles[indicator]}</h3><span className="text-sm text-slate-500">{records.length}{" \u7b46\u6642\u6bb5"}</span></div><IndicatorChart records={records} indicator={indicator} /></section>
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-4 font-semibold">{copy.period}</th><th className="p-4 font-semibold">{copy.weather}</th><th className="p-4 font-semibold">{copy.temperatureLabel}</th><th className="p-4 font-semibold">{copy.precipitationLabel}</th><th className="p-4 font-semibold">{copy.uvLabel}</th><th className="p-4 font-semibold">{copy.windLabel}</th></tr></thead><tbody>{records.map((record) => { const weather = weatherPresentation(record.weatherCode); return <tr className="border-t border-slate-100 text-slate-700" key={`${record.areaCode}-${record.validFrom}`}><td className="p-4 whitespace-nowrap text-slate-600">{periodLabel(record.validFrom)} {"\u2013"} {periodLabel(record.validTo)}</td><td className="p-4"><span className="inline-flex items-center gap-2 font-medium" aria-label={weather.label}><WeatherIcon name={weather.icon} className="h-5 w-5 text-sky-700" /><span>{weather.label}</span></span></td><td className="p-4 font-semibold"><span className="text-blue-600">{value(record.minTemperatureC, copy.degree)}</span><span className="px-1.5 text-slate-400">/</span><span className="text-red-500">{value(record.maxTemperatureC, copy.degree)}</span></td><td className="p-4">{value(record.precipitationProbability, "%")}</td><td className="p-4">{value(record.uvIndex)}</td><td className="p-4">{value(record.windSpeedMps, " m/s")}</td></tr>; })}</tbody></table></div>
  </div>;
}
