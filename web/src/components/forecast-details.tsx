"use client";

import { ChevronDown, ChevronUp, CloudDrizzle, CloudRain, Droplets, Sun, Wind } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Fragment, useState } from "react";

import type { MapIndicator } from "@/lib/forecast-presentation";
import type { ForecastRecord } from "@/lib/forecast-records";
import { apparentTemperatureSummary, indicatorChartSeries, weatherPresentation, weatherSourceExtras, weatherSummary, windForceLabel, windSummary } from "@/lib/weather-presentation";

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
  apparentTemperature: "\u9ad4\u611f\u6eab\u5ea6",
  comfort: "\u8212\u9069\u5ea6",
  relativeHumidity: "\u76f8\u5c0d\u6fd5\u5ea6",
  more: "\u66f4\u591a",
  less: "\u6536\u5408",
  expandDetails: "\u986f\u793a\u66f4\u591a\u9810\u5831\u8cc7\u8a0a",
  collapseDetails: "\u6536\u5408\u9810\u5831\u8cc7\u8a0a",
  precipitationLow: "\u964d\u96e8\u6a5f\u7387\u4f4e",
  precipitationMedium: "\u964d\u96e8\u6a5f\u7387\u4e2d",
  precipitationHigh: "\u964d\u96e8\u6a5f\u7387\u9ad8",
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

function uvPresentation(value: number | null): { label: string; advice: string; className: string } | null {
  if (value === null) return null;
  if (value <= 2) return { label: "\u4f4e\u91cf\u7d1a", advice: "\u53ef\u5b89\u5fc3\u6236\u5916\u6d3b\u52d5", className: "text-emerald-600" };
  if (value <= 5) return { label: "\u4e2d\u91cf\u7d1a", advice: "\u4e2d\u5348\u5916\u51fa\u5efa\u8b70\u4f7f\u7528\u9632\u66ec\u7528\u54c1", className: "text-amber-600" };
  if (value <= 7) return { label: "\u9ad8\u91cf\u7d1a", advice: "\u8acb\u52a0\u5f37\u9632\u66ec \u907f\u514d\u9577\u6642\u9593\u66dd\u66ec", className: "text-orange-600" };
  if (value <= 10) return { label: "\u904e\u91cf\u7d1a", advice: "\u5916\u51fa\u8acb\u4f7f\u7528\u9632\u66ec \u4e26\u5c0b\u627e\u906e\u9670\u8655", className: "text-rose-600" };
  return { label: "\u5371\u96aa\u7d1a", advice: "\u61c9\u76e1\u91cf\u907f\u514d\u66dd\u66ec \u505a\u597d\u5b8c\u6574\u9632\u8b77", className: "text-fuchsia-700" };
}

function PrecipitationValue({ probability }: { probability: number | null }) {
  if (probability === null) return copy.unavailable;
  const presentation = probability >= 60
    ? { Icon: CloudRain, label: copy.precipitationHigh, className: "text-blue-700" }
    : probability >= 30
      ? { Icon: CloudDrizzle, label: copy.precipitationMedium, className: "text-sky-600" }
      : { Icon: Droplets, label: copy.precipitationLow, className: "text-cyan-600" };
  return <span className="inline-flex items-center gap-1.5 font-medium" aria-label={`${presentation.label} ${probability}%`}><presentation.Icon className={`h-4 w-4 ${presentation.className}`} aria-hidden="true" />{probability}%</span>;
}

function IndicatorChart({ records, indicator }: { records: ForecastRecord[]; indicator: MapIndicator }) {
  const data = indicatorChartSeries(records, indicator);
  const unit = indicator === "temperature" ? copy.degree : indicator === "precipitation" ? "%" : indicator === "wind" ? " m/s" : "";
  if (indicator === "temperature") return <ResponsiveContainer width="100%" height="88%"><LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" /><XAxis dataKey="label" {...chartAxisProps} /><YAxis unit={unit} fontSize={12} /><Tooltip {...chartTooltipProps} /><Line type="monotone" dataKey="primary" name={copy.maximum} stroke="#ef4444" strokeWidth={2.5} connectNulls /><Line type="monotone" dataKey="secondary" name={copy.minimum} stroke="#2563eb" strokeWidth={2.5} connectNulls /></LineChart></ResponsiveContainer>;
  if (indicator === "precipitation") return <ResponsiveContainer width="100%" height="88%"><BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" /><XAxis dataKey="label" {...chartAxisProps} /><YAxis unit={unit} domain={[0, 100]} fontSize={12} /><Tooltip {...chartTooltipProps} /><Bar dataKey="primary" name={copy.precipitationLabel} fill="#0ea5e9" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>;
  const chartColor = indicator === "uv" ? "#c026d3" : "#16a34a";
  return <ResponsiveContainer width="100%" height="88%"><AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}><defs><linearGradient id="indicator-fill" x1="0" x2="0" y1="0"><stop offset="0%" stopColor={chartColor} stopOpacity={0.45} /><stop offset="100%" stopColor={chartColor} stopOpacity={0.03} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" /><XAxis dataKey="label" {...chartAxisProps} /><YAxis unit={unit} fontSize={12} /><Tooltip {...chartTooltipProps} /><Area type="monotone" dataKey="primary" name={indicator === "uv" ? copy.uvLabel : copy.windLabel} stroke={chartColor} fill="url(#indicator-fill)" strokeWidth={2.5} connectNulls /></AreaChart></ResponsiveContainer>;
}

export function ForecastDetails({ records, indicator }: { records: ForecastRecord[]; indicator: MapIndicator }) {
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  if (records.length === 0) return <p className="rounded-2xl bg-white/10 p-6 text-slate-200">{copy.noRecords}</p>;

  return <div className="space-y-6">
    <section aria-label={chartTitles[indicator]} className="h-80 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-3"><h3 className="text-lg font-bold text-slate-900">{chartTitles[indicator]}</h3><span className="text-sm text-slate-500">{records.length}{" \u7b46\u6642\u6bb5"}</span></div>
      <IndicatorChart records={records} indicator={indicator} />
    </section>
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr><th className="p-4 font-semibold">{copy.period}</th><th className="p-4 font-semibold">{copy.weather}</th><th className="p-4 font-semibold">{copy.temperatureLabel}</th><th className="p-4 font-semibold">{copy.precipitationLabel}</th><th className="p-4 font-semibold">{copy.uvLabel}</th><th className="p-4 font-semibold">{copy.windLabel}</th></tr></thead>
        <tbody>{records.map((record) => {
          const weather = weatherPresentation(record.weatherCode);
          const summary = weatherSummary(record.weatherDescription, weather.label);
          const sourceExtras = weatherSourceExtras(record.weatherDescription);
          const apparent = apparentTemperatureSummary(record.apparentMinTemperatureC, record.apparentMaxTemperatureC);
          const wind = windSummary(record.windDirectionDegrees, record.windDescription, record.windSpeedMps);
          const uv = uvPresentation(record.uvIndex);
          const periodId = `${record.areaCode}-${record.validFrom}`;
          const isExpanded = expandedPeriod === periodId;

          return <Fragment key={periodId}>
            <tr className="border-t border-slate-100 text-slate-700">
              <td className="p-4 whitespace-nowrap text-slate-600"><div className="inline-flex items-center gap-2">{periodLabel(record.validFrom)} {"\u2013"} {periodLabel(record.validTo)}<button type="button" aria-label={isExpanded ? copy.collapseDetails : copy.expandDetails} aria-expanded={isExpanded} onClick={() => setExpandedPeriod(isExpanded ? null : periodId)} className="grid h-7 w-7 place-items-center rounded-md border border-sky-200 text-sky-700 transition hover:bg-sky-50">{isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}</button></div></td>
              <td className="p-4"><span className="inline-flex items-center gap-2 font-medium" aria-label={weather.label}><WeatherIcon name={weather.icon} className="h-5 w-5 text-sky-700" /><span>{summary}</span></span></td>
              <td className="p-4 font-semibold"><span className="text-blue-600">{value(record.minTemperatureC, copy.degree)}</span><span className="px-1.5 text-slate-400">/</span><span className="text-red-500">{value(record.maxTemperatureC, copy.degree)}</span></td>
              <td className="p-4"><PrecipitationValue probability={record.precipitationProbability} /></td>
              <td className="p-4">{uv ? <span className={`inline-flex items-center gap-1.5 font-medium ${uv.className}`} aria-label={`${copy.uvLabel} ${record.uvIndex} ${uv.label}`}><Sun className="h-4 w-4" aria-hidden="true" />{record.uvIndex}</span> : copy.unavailable}</td>
              <td className="p-4 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><Wind className="h-4 w-4 text-slate-500" aria-hidden="true" />{windForceLabel(record.windSpeedMps) ?? copy.unavailable}</span></td>
            </tr>
            {isExpanded && <tr className="border-t border-sky-100 bg-sky-50/70"><td colSpan={6} className="p-4"><ul className="grid gap-x-4 gap-y-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-5">
              {sourceExtras.comfort && <li><span className="font-semibold text-slate-900">{copy.comfort}{"\uff1a"}</span> {sourceExtras.comfort}</li>}
              {apparent && <li><span className="font-semibold text-slate-900">{copy.apparentTemperature}{"\uff1a"}</span> {apparent.replace(/^\u9ad4\u611f\uff1a/, "")}</li>}
              {sourceExtras.relativeHumidity && <li><span className="font-semibold text-slate-900">{copy.relativeHumidity}{"\uff1a"}</span> {sourceExtras.relativeHumidity.replace(/^\u76f8\u5c0d\u6fd5\u5ea6/, "")}</li>}
              <li><span className="font-semibold text-slate-900">{copy.uvLabel}{"\uff1a"}</span> {uv ? <><span>{`${record.uvIndex}\uff08${uv.label}\uff09`}</span><span className="mt-1 block text-slate-500">{uv.advice}</span></> : copy.unavailable}</li>
              <li><span className="font-semibold text-slate-900">{copy.windLabel}{"\uff1a"}</span> {wind ?? copy.unavailable}</li>
            </ul></td></tr>}
          </Fragment>;
        })}</tbody>
      </table>
    </div>
  </div>;
}
