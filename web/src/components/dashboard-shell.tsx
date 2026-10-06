"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import { forecastQuery, normalizeDateScope } from "@/lib/dashboard-controls";
import { resolveDashboardState } from "@/lib/dashboard-state";
import type { MapIndicator } from "@/lib/forecast-presentation";
import type { ForecastRecord } from "@/lib/forecast-records";

import { ForecastDetails } from "./forecast-details";

const ForecastMap = dynamic(() => import("./forecast-map").then((module) => module.ForecastMap), { ssr: false });

type Area = { areaCode: string; areaName: string };
type Freshness = { status?: "fresh" | "stale" | "empty"; lastSuccessfulAt?: string | null };
type ForecastResponse = { records?: ForecastRecord[] };

const copy = {
  product: "CWA \u5929\u6c23\u9810\u5831",
  title: "\u81fa\u7063\u7e23\u5e02\u5929\u6c23\u9810\u5831",
  status: "\u8cc7\u6599\u72c0\u614b",
  loading: "\u8f09\u5165\u4e2d",
  error: "\u66ab\u6642\u7121\u6cd5\u53d6\u5f97\u8cc7\u6599",
  empty: "\u5c1a\u7121\u9810\u5831\u8cc7\u6599",
  stale: "\u6b64\u70ba\u6700\u5f8c\u4e00\u6b21\u6210\u529f\u66f4\u65b0\u7684\u820a\u8cc7\u6599",
  fresh: "\u5df2\u66f4\u65b0",
  lastUpdated: "\u6700\u5f8c\u6210\u529f\u66f4\u65b0",
  noUpdate: "\u5c1a\u7121\u6210\u529f\u66f4\u65b0\u8a18\u9304",
  county: "\u7e23\u5e02",
  chooseCounty: "\u8acb\u9078\u64c7\u7e23\u5e02",
  startsAt: "\u958b\u59cb\u65e5\u671f",
  endsAt: "\u7d50\u675f\u65e5\u671f",
  requestError: "\u66ab\u6642\u7121\u6cd5\u66f4\u65b0\u6240\u9078\u9810\u5831\uff1b\u6b63\u4fdd\u7559\u4e0a\u4e00\u6b21\u6210\u529f\u986f\u793a\u7684\u8cc7\u6599\u3002",
  mapTitle: "\u7e23\u5e02\u9810\u5831\u5730\u5716",
  mapDescription: "\u4f9d\u6307\u6a19\u986f\u793a\u5404\u7e23\u5e02\u5728\u9078\u5b9a\u6642\u9593\u7bc4\u570d\u7684\u7b2c\u4e00\u7b46\u9810\u5831\u3002",
  indicator: "\u5730\u5716\u6307\u6a19",
  detailSuffix: "\u7684\u9810\u5831\u8a73\u7d30",
  loadingForecast: "\u6b63\u5728\u8f09\u5165\u9810\u5831\u2026",
};

const indicatorOptions: Array<{ value: MapIndicator; label: string }> = [
  { value: "temperature", label: "\u6700\u9ad8\u6eab" },
  { value: "precipitation", label: "\u964d\u96e8\u6a5f\u7387" },
  { value: "uv", label: "\u7d2b\u5916\u7dda" },
  { value: "wind", label: "\u98a8\u901f" },
];

function updateLabel(timestamp: string | null | undefined): string {
  if (!timestamp) return copy.noUpdate;
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}

export function DashboardShell() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaCode, setAreaCode] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [indicator, setIndicator] = useState<MapIndicator>("temperature");
  const [freshness, setFreshness] = useState<Freshness>({ status: "empty" });
  const [records, setRecords] = useState<ForecastRecord[]>([]);
  const [mapRecords, setMapRecords] = useState<ForecastRecord[]>([]);
  const [initialError, setInitialError] = useState(false);
  const [forecastError, setForecastError] = useState(false);
  const [loading, setLoading] = useState(true);

  const scope = useMemo(() => normalizeDateScope(startsAt, endsAt), [startsAt, endsAt]);
  const state = resolveDashboardState({ isLoading: loading, hasError: initialError, areaCount: areas.length, freshnessStatus: freshness.status ?? "empty" });
  const statusLabel = state === "loading" ? copy.loading : state === "error" ? copy.error : state === "empty" ? copy.empty : state === "stale" ? copy.stale : copy.fresh;
  const requestRecords = useCallback(async (selectedAreaCode: string, selectedScope: { startsAt?: string; endsAt?: string }) => {
    const request = forecastQuery({ areaCode: selectedAreaCode, ...selectedScope });
    if (!request) return [];
    const response = await fetch(request);
    if (!response.ok) throw new Error("Forecast request failed");
    return ((await response.json()) as ForecastResponse).records ?? [];
  }, []);

  useEffect(() => {
    void Promise.all([fetch("/api/locations"), fetch("/api/freshness")]).then(async ([locationResponse, freshnessResponse]) => {
      if (!locationResponse.ok || !freshnessResponse.ok) throw new Error("Dashboard request failed");
      const locationData = (await locationResponse.json()) as { areas?: Area[] };
      const availableAreas = locationData.areas ?? [];
      setAreas(availableAreas);
      setAreaCode((current) => current || availableAreas[0]?.areaCode || "");
      setFreshness((await freshnessResponse.json()) as Freshness);
    }).catch(() => setInitialError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!areaCode) return;
    let active = true;
    void requestRecords(areaCode, scope)
      .then((nextRecords) => {
        if (!active) return;
        setRecords(nextRecords);
        setForecastError(false);
      })
      .catch(() => { if (active) setForecastError(true); });
    return () => { active = false; };
  }, [areaCode, requestRecords, scope]);

  useEffect(() => {
    if (areas.length === 0) return;
    void Promise.all(areas.map((area) => requestRecords(area.areaCode, scope)))
      .then((allRecords) => setMapRecords(allRecords.flat()))
      .catch(() => { /* Keep the last complete map layer visible. */ });
  }, [areas, requestRecords, scope]);

  const setDateScope = (nextStart: string, nextEnd: string) => {
    const normalized = normalizeDateScope(nextStart, nextEnd);
    setStartsAt(normalized.startsAt ?? "");
    setEndsAt(normalized.endsAt ?? "");
  };
  const selectedArea = areas.find((area) => area.areaCode === areaCode);

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><section className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-2xl bg-sky-700 p-7 text-white"><p className="text-sky-100">{copy.product}</p><h1 className="text-3xl font-bold">{copy.title}</h1></header>
    <section className="rounded-xl bg-white p-5 shadow-sm"><p className="font-medium">{copy.status}{"\uff1a"}{statusLabel}</p><p className="mt-1 text-sm text-slate-600">{copy.lastUpdated}{"\uff1a"}{updateLabel(freshness.lastSuccessfulAt)}</p></section>
    <section className="grid gap-4 rounded-xl bg-white p-5 shadow-sm md:grid-cols-3"><label className="font-medium">{copy.county}<select className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-normal" value={areaCode} onChange={(event) => setAreaCode(event.target.value)}><option value="">{copy.chooseCounty}</option>{areas.map((area) => <option key={area.areaCode} value={area.areaCode}>{area.areaName}</option>)}</select></label><label className="font-medium">{copy.startsAt}<input className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-normal" type="date" value={startsAt} onChange={(event) => setDateScope(event.target.value, endsAt)} /></label><label className="font-medium">{copy.endsAt}<input className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-normal" type="date" value={endsAt} onChange={(event) => setDateScope(startsAt, event.target.value)} /></label></section>
    {forecastError && <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">{copy.requestError}</p>}
    <section className="rounded-xl bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{copy.mapTitle}</h2><p className="text-sm text-slate-600">{copy.mapDescription}</p></div><label className="font-medium">{copy.indicator}<select className="ml-2 rounded-md border border-slate-300 p-2 font-normal" value={indicator} onChange={(event) => setIndicator(event.target.value as MapIndicator)}>{indicatorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div><ForecastMap records={mapRecords} indicator={indicator} /></section>
    <section className="rounded-xl bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">{selectedArea?.areaName ?? copy.chooseCounty}{copy.detailSuffix}</h2><ForecastDetails records={records} /></section>
  </section></main>;
}
