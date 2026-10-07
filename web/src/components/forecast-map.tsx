"use client";

import { Droplets, Gauge, MapPin, RefreshCw, Sun, ThermometerSun, Wind, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { Map as LeafletMap, PathOptions } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";

import { recordsForMapPeriod, type MapPeriod } from "@/lib/dashboard-selection";
import { mapRecordByArea, mapValueForRecord, type MapIndicator } from "@/lib/forecast-presentation";
import type { ForecastRecord } from "@/lib/forecast-records";
import { weatherPresentation, weatherSummary, windForceLabel } from "@/lib/weather-presentation";

import { WeatherIcon } from "./weather-icon";

type CountyProperties = { cwa_area_code?: string; area_name?: string };
type CountyCollection = FeatureCollection<Geometry, CountyProperties>;
type Freshness = { status?: "fresh" | "stale" | "empty"; lastSuccessfulAt?: string | null };

const copy = {
  loading: "\u6b63\u5728\u8f09\u5165\u7e23\u5e02\u5730\u5716\u2026",
  ariaLabel: "\u81fa\u7063\u7e23\u5e02\u9810\u5831\u5730\u5716",
  unavailable: "\u7121\u8cc7\u6599",
  unknownArea: "\u672a\u77e5\u7e23\u5e02",
  selectArea: "\u9ede\u9078\u7e23\u5e02\u67e5\u770b\u9810\u5831",
  fresh: "\u8cc7\u6599\u5df2\u66f4\u65b0",
  stale: "\u8cc7\u6599\u53ef\u80fd\u5df2\u904e\u671f",
  noUpdate: "\u5c1a\u7121\u6210\u529f\u66f4\u65b0\u8a18\u9304",
  lastUpdate: "\u6700\u5f8c\u6210\u529f\u66f4\u65b0",
  activePeriod: "\u5730\u5716\u9810\u5831\u6642\u6bb5",
  indicatorControls: "\u5730\u5716\u6307\u6a19",
  legend: "\u8272\u968e\uff1a\u4f4e\u2192\u9ad8\uff0f\u7070\u8272\uff1a\u7121\u8cc7\u6599",
  temperature: "\u6eab\u5ea6",
  precipitation: "\u964d\u96e8\u6a5f\u7387",
  rainfall: "\u964d\u96e8",
  uv: "\u7d2b\u5916\u7dda",
  wind: "\u98a8\u901f",
  zoomIn: "\u653e\u5927\u5730\u5716",
  zoomOut: "\u7e2e\u5c0f\u5730\u5716",
};

const indicatorOptions: Array<{ value: MapIndicator; label: string; Icon: typeof ThermometerSun }> = [
  { value: "temperature", label: copy.temperature, Icon: ThermometerSun },
  { value: "precipitation", label: copy.rainfall, Icon: Droplets },
  { value: "uv", label: copy.uv, Icon: Sun },
  { value: "wind", label: copy.wind, Icon: Wind },
];

const indicatorLabels: Record<MapIndicator, string> = {
  temperature: copy.temperature,
  precipitation: copy.precipitation,
  uv: copy.uv,
  wind: copy.wind,
};

function fillColor(value: number | null, indicator: MapIndicator): string {
  if (value === null) return "#475569";
  if (indicator === "temperature") return value >= 32 ? "#ea580c" : value >= 27 ? "#f97316" : value >= 22 ? "#fbbf24" : "#fde68a";
  if (indicator === "precipitation") return value >= 70 ? "#1d4ed8" : value >= 40 ? "#2563eb" : "#93c5fd";
  if (indicator === "uv") return value >= 8 ? "#a21caf" : value >= 6 ? "#c026d3" : value >= 3 ? "#e879f9" : "#f5d0fe";
  return value >= 10 ? "#15803d" : value >= 5 ? "#22c55e" : "#bbf7d0";
}

function legendGradient(indicator: MapIndicator): string {
  if (indicator === "temperature") return "from-amber-200 via-amber-400 to-orange-600";
  if (indicator === "precipitation") return "from-blue-200 via-blue-400 to-blue-700";
  if (indicator === "uv") return "from-fuchsia-200 via-fuchsia-400 to-fuchsia-700";
  return "from-emerald-200 via-emerald-400 to-green-700";
}

function periodLabel(period: MapPeriod): string {
  const date = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" }).format(new Date(period.validFrom));
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", hour: "2-digit", hourCycle: "h23" }).format(new Date(period.validFrom)));
  return `${date} ${hour >= 18 || hour < 6 ? "\u665a" : "\u65e5"}`;
}

function timestampLabel(value: string | null | undefined): string {
  if (!value) return copy.noUpdate;
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function value(value: number | null, unit = ""): string {
  return value === null ? copy.unavailable : `${value}${unit}`;
}

export function ForecastMap({ records, periods, activePeriodId, indicator, selectedAreaCode, freshness, onPeriodSelect, onAreaSelect, onIndicatorSelect }: {
  records: ForecastRecord[];
  periods: MapPeriod[];
  activePeriodId: string | null;
  indicator: MapIndicator;
  selectedAreaCode: string;
  freshness: Freshness;
  onPeriodSelect: (periodId: string) => void;
  onAreaSelect: (areaCode: string) => void;
  onIndicatorSelect: (indicator: MapIndicator) => void;
}) {
  const [counties, setCounties] = useState<CountyCollection | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const activeRecords = useMemo(() => recordsForMapPeriod(records, activePeriodId), [records, activePeriodId]);
  const recordsByArea = useMemo(() => mapRecordByArea(activeRecords), [activeRecords]);
  const selectedRecord = selectedAreaCode ? recordsByArea.get(selectedAreaCode) : undefined;

  useEffect(() => {
    let active = true;
    void fetch("/data/taiwan-counties.geojson")
      .then((response) => response.ok ? response.json() as Promise<CountyCollection> : Promise.reject(new Error("GeoJSON unavailable")))
      .then((data) => { if (active) setCounties(data); })
      .catch(() => { if (active) setCounties(null); });
    return () => { active = false; };
  }, []);

  if (!counties) return <p className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-slate-200">{copy.loading}</p>;

  const style = (feature?: Feature<Geometry, CountyProperties>): PathOptions => {
    const areaCode = feature?.properties.cwa_area_code?.replace("cwa-", "") ?? "";
    const selected = areaCode === selectedAreaCode;
    const { value: mapValue } = mapValueForRecord(recordsByArea.get(areaCode), indicator);
    return { color: selected ? "#f8fafc" : "#cbd5e1", weight: selected ? 3 : 1, fillColor: fillColor(mapValue, indicator), fillOpacity: selected ? 0.98 : 0.8 };
  };
  const geoJsonKey = `${indicator}-${activePeriodId}-${selectedAreaCode}-${activeRecords.map((record) => `${record.areaCode}-${mapValueForRecord(record, indicator).value}`).join("|")}`;
  const weather = weatherPresentation(selectedRecord?.weatherCode ?? null);
  const selectedPeriod = periods.find((period) => period.id === activePeriodId);

  return <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl shadow-sky-950/40" aria-label={copy.ariaLabel}>
    <div className="absolute inset-x-0 top-0 z-[500] bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-2" aria-label={copy.indicatorControls}>
        {indicatorOptions.map(({ value: optionValue, label, Icon }) => <button key={optionValue} type="button" onClick={() => onIndicatorSelect(optionValue)} aria-pressed={indicator === optionValue} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${indicator === optionValue ? "border-white bg-white text-slate-950 shadow-lg" : "border-white/20 bg-slate-950/60 text-white hover:bg-white/15"}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}
        <label className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-200"><span className="hidden sm:inline">{copy.activePeriod}</span><select aria-label={copy.activePeriod} className="max-w-28 bg-transparent text-sm font-semibold text-white outline-none sm:max-w-36" value={activePeriodId ?? ""} onChange={(event) => onPeriodSelect(event.target.value)}>{periods.map((period) => <option key={period.id} value={period.id} className="bg-slate-950">{periodLabel(period)}</option>)}</select></label>
      </div>
      <div className="mt-2 flex gap-2"><button type="button" aria-label={copy.zoomIn} onClick={() => mapRef.current?.zoomIn()} className="grid h-9 w-9 place-items-center rounded-lg border border-white/20 bg-slate-950/75 text-white shadow-lg transition hover:bg-white hover:text-slate-950"><ZoomIn className="h-4 w-4" aria-hidden="true" /></button><button type="button" aria-label={copy.zoomOut} onClick={() => mapRef.current?.zoomOut()} className="grid h-9 w-9 place-items-center rounded-lg border border-white/20 bg-slate-950/75 text-white shadow-lg transition hover:bg-white hover:text-slate-950"><ZoomOut className="h-4 w-4" aria-hidden="true" /></button></div>
    </div>
    <div className="h-[min(72vh,680px)] min-h-[510px] sm:h-[620px]"><MapContainer ref={mapRef} center={[23.7, 121]} zoom={7} zoomControl={false} scrollWheelZoom={false} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><GeoJSON key={geoJsonKey} data={counties} style={style} onEachFeature={(feature, layer) => { const areaCode = feature.properties.cwa_area_code?.replace("cwa-", ""); const selected = areaCode === selectedAreaCode; if (selected) { const areaName = feature.properties.area_name ?? copy.unknownArea; const mapValue = mapValueForRecord(areaCode ? recordsByArea.get(areaCode) : undefined, indicator); const valueLabel = mapValue.value === null ? copy.unavailable : `${mapValue.value}${mapValue.unit}`; layer.bindTooltip(`${areaName}<br/>${indicatorLabels[indicator]}：${valueLabel}`).openTooltip(); } if (areaCode) layer.on({ click: () => onAreaSelect(areaCode) }); }} /></MapContainer></div>
    <Image src="/weather_reporter-transparent.png" alt="" aria-hidden="true" width={176} height={176} priority className="pointer-events-none absolute bottom-4 right-[19rem] z-[500] hidden h-36 w-36 object-contain drop-shadow-[0_12px_18px_rgba(2,6,23,0.35)] lg:block" />
    <div className="pointer-events-none absolute bottom-4 left-4 z-[500] max-w-[calc(100%-2rem)] rounded-2xl border border-white/15 bg-slate-950/85 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur-md"><div className="flex items-center gap-2 font-semibold"><RefreshCw className={`h-3.5 w-3.5 ${freshness.status === "stale" ? "text-amber-300" : "text-emerald-300"}`} aria-hidden="true" />{freshness.status === "stale" ? copy.stale : copy.fresh}</div><p className="mt-1 text-slate-300">{copy.lastUpdate}{"\uff1a"}{timestampLabel(freshness.lastSuccessfulAt)}</p></div>
    <div className="absolute bottom-4 right-4 z-[500] w-[min(18rem,calc(100%-2rem))] rounded-2xl border border-white/15 bg-slate-950/85 p-4 text-white shadow-xl backdrop-blur-md">{selectedRecord ? <><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-200">{selectedPeriod ? periodLabel(selectedPeriod) : copy.activePeriod}</p><h3 className="mt-1 text-xl font-bold">{selectedRecord.areaName}</h3></div><WeatherIcon name={weather.icon} className="h-9 w-9 text-amber-200" /></div><p className="mt-1 text-sm text-slate-200">{weatherSummary(selectedRecord.weatherDescription, weather.label)}</p><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-white/10 p-2"><span className="block text-xs text-slate-300">{copy.temperature}</span><strong><span className="text-sky-300">{value(selectedRecord.minTemperatureC, "\u00b0C")}</span><span className="px-1 text-slate-400">/</span><span className="text-rose-300">{value(selectedRecord.maxTemperatureC, "\u00b0C")}</span></strong></div><div className="rounded-xl bg-white/10 p-2"><span className="block text-xs text-slate-300">{copy.precipitation}</span><strong>{value(selectedRecord.precipitationProbability, "%")}</strong></div><div className="rounded-xl bg-white/10 p-2"><span className="block text-xs text-slate-300">{copy.uv}</span><strong>{value(selectedRecord.uvIndex)}</strong></div><div className="rounded-xl bg-white/10 p-2"><span className="block text-xs text-slate-300">{copy.wind}</span><strong>{windForceLabel(selectedRecord.windSpeedMps) ?? copy.unavailable}</strong></div></div></> : <div className="flex items-center gap-3 text-sm text-slate-100"><MapPin className="h-5 w-5 text-sky-200" aria-hidden="true" />{copy.selectArea}</div>}</div>
    <div className="absolute bottom-4 left-1/2 z-[500] hidden -translate-x-1/2 items-center rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-100 shadow-lg backdrop-blur-md sm:flex"><Gauge className="mr-1 inline h-3.5 w-3.5 text-sky-200" aria-hidden="true" />{indicatorLabels[indicator]}<span className={`mx-2 h-2 w-12 rounded-full bg-gradient-to-r ${legendGradient(indicator)}`} aria-hidden="true" /><span>{copy.legend}</span></div>
  </div>;
}
