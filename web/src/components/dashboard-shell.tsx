"use client";

import dynamic from "next/dynamic";
import { CalendarDays, MapPinned } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { forecastQuery, normalizeDateScope } from "@/lib/dashboard-controls";
import { availableMapPeriods, futureWeekDateRangeForArea, nextMapPeriod, taiwanCalendarDate } from "@/lib/dashboard-selection";
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
  title: "\u63a2\u7d22\u81fa\u7063\u7684\u672a\u4f86\u5929\u6c23",
  subtitle: "\u9ede\u9078\u5730\u5716\u7e23\u5e02\uff0c\u5373\u53ef\u67e5\u770b\u672a\u4f86\u4e00\u9031\u7684\u9810\u5831\u8b8a\u5316\u3002",
  loading: "\u6b63\u5728\u8f09\u5165\u9810\u5831\u5730\u5716\u2026",
  error: "\u66ab\u6642\u7121\u6cd5\u53d6\u5f97\u9810\u5831\u8cc7\u6599",
  empty: "\u5c1a\u7121\u53ef\u986f\u793a\u7684\u9810\u5831\u8cc7\u6599",
  stale: "\u8cc7\u6599\u66ab\u6642\u7121\u6cd5\u66f4\u65b0\uff0c\u4ee5\u6700\u5f8c\u4e00\u6b21\u6210\u529f\u8cc7\u6599\u986f\u793a\u3002",
  requestError: "\u66ab\u6642\u7121\u6cd5\u66f4\u65b0\u6240\u9078\u9810\u5831\uff1b\u6b63\u4fdd\u7559\u4e0a\u4e00\u6b21\u6210\u529f\u986f\u793a\u7684\u8cc7\u6599\u3002",
  county: "\u7e23\u5e02",
  chooseCounty: "\u8acb\u9078\u64c7\u7e23\u5e02",
  fallbackHint: "\u4e5f\u53ef\u4f7f\u7528\u6b64\u9078\u55ae\u9078\u64c7\u7e23\u5e02",
  startsAt: "\u958b\u59cb\u65e5\u671f",
  endsAt: "\u7d50\u675f\u65e5\u671f",
  dateRange: "\u9810\u5831\u7bc4\u570d",
  adjustDates: "\u8abf\u6574\u9810\u5831\u7bc4\u570d",
  detailSuffix: "\u7684\u9810\u5831\u8a73\u7d30",
  selectPrompt: "\u5f9e\u5730\u5716\u9078\u64c7\u7e23\u5e02\uff0c\u958b\u59cb\u63a2\u7d22\u5929\u6c23\u3002",
  detailLabel: "\u7e23\u5e02\u9810\u5831\u8a73\u7d30",
  mapLabel: "\u7e23\u5e02\u9810\u5831\u5730\u5716",
};

function initialStateLabel(state: ReturnType<typeof resolveDashboardState>): string {
  if (state === "loading") return copy.loading;
  if (state === "error") return copy.error;
  if (state === "empty") return copy.empty;
  if (state === "stale") return copy.stale;
  return "";
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
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [initialError, setInitialError] = useState(false);
  const [forecastError, setForecastError] = useState(false);
  const [loading, setLoading] = useState(true);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);

  const periods = useMemo(() => availableMapPeriods(mapRecords), [mapRecords]);
  const defaultDetailRange = useMemo(() => areaCode ? futureWeekDateRangeForArea(mapRecords, areaCode) : null, [areaCode, mapRecords]);
  const effectiveStartsAt = startsAt || defaultDetailRange?.startsAt || "";
  const effectiveEndsAt = endsAt || defaultDetailRange?.endsAt || "";
  const activeMapPeriodId = activePeriodId ?? nextMapPeriod(periods)?.id ?? null;
  const scope = useMemo(() => normalizeDateScope(effectiveStartsAt, effectiveEndsAt), [effectiveEndsAt, effectiveStartsAt]);
  const state = resolveDashboardState({ isLoading: loading, hasError: initialError, areaCount: areas.length, freshnessStatus: freshness.status ?? "empty" });
  const selectedArea = areas.find((area) => area.areaCode === areaCode);

  const requestRecords = useCallback(async (selectedAreaCode: string, selectedScope: { startsAt?: string; endsAt?: string } = {}) => {
    const request = forecastQuery({ areaCode: selectedAreaCode, ...selectedScope });
    if (!request) return [];
    const response = await fetch(request);
    if (!response.ok) throw new Error("Forecast request failed");
    return ((await response.json()) as ForecastResponse).records ?? [];
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([fetch("/api/locations"), fetch("/api/freshness")])
      .then(async ([locationResponse, freshnessResponse]) => {
        if (!locationResponse.ok || !freshnessResponse.ok) throw new Error("Dashboard request failed");
        const locationData = (await locationResponse.json()) as { areas?: Area[] };
        const availableAreas = locationData.areas ?? [];
        if (!active) return;
        setAreas(availableAreas);
        setAreaCode((current) => current || availableAreas[0]?.areaCode || "");
        setFreshness((await freshnessResponse.json()) as Freshness);
      })
      .catch(() => { if (active) setInitialError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (areas.length === 0) return;
    let active = true;
    void Promise.all(areas.map((area) => requestRecords(area.areaCode)))
      .then((allRecords) => { if (active) setMapRecords(allRecords.flat()); })
      .catch(() => { /* Preserve the previous successful map layer. */ });
    return () => { active = false; };
  }, [areas, requestRecords]);

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

  const scrollToDetails = () => {
    window.setTimeout(() => {
      const heading = detailHeadingRef.current;
      if (!heading) return;
      heading.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      heading.focus({ preventScroll: true });
    }, 0);
  };

  const selectArea = (nextAreaCode: string, shouldScroll = true) => {
    if (!nextAreaCode) return;
    const range = futureWeekDateRangeForArea(mapRecords, nextAreaCode);
    setAreaCode(nextAreaCode);
    setStartsAt(range?.startsAt ?? "");
    setEndsAt(range?.endsAt ?? "");
    setForecastError(false);
    if (shouldScroll) scrollToDetails();
  };

  const selectPeriod = (periodId: string) => {
    const period = periods.find((candidate) => candidate.id === periodId);
    if (!period) return;
    setActivePeriodId(periodId);
    setStartsAt(taiwanCalendarDate(period.validFrom));
    setEndsAt(taiwanCalendarDate(period.validTo));
  };

  const setDateScope = (nextStart: string, nextEnd: string) => {
    const normalized = normalizeDateScope(nextStart, nextEnd);
    setStartsAt(normalized.startsAt ?? "");
    setEndsAt(normalized.endsAt ?? "");
  };

  return <main className="min-h-screen overflow-x-hidden bg-[#020617] text-slate-100"><section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
    <header className="mb-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold tracking-[0.2em] text-sky-300">{copy.product}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-5xl">{copy.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{copy.subtitle}</p></div><div className="w-full max-w-xs text-sm font-semibold text-slate-200"><label htmlFor="county-selector" className="mb-2 flex items-center gap-2"><MapPinned className="h-4 w-4 text-sky-300" aria-hidden="true" />{copy.county}</label><select id="county-selector" className="block w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-white shadow-lg outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30" value={areaCode} onChange={(event) => selectArea(event.target.value, false)} aria-describedby="county-fallback-help"><option value="">{copy.chooseCounty}</option>{areas.map((area) => <option key={area.areaCode} value={area.areaCode}>{area.areaName}</option>)}</select><span id="county-fallback-help" className="mt-1 block font-normal text-slate-400">{copy.fallbackHint}</span></div></header>

    {state !== "ready" && <p role="status" className={`mb-5 rounded-2xl border p-4 text-sm ${state === "error" ? "border-rose-400/40 bg-rose-950/40 text-rose-100" : "border-sky-300/20 bg-slate-900 text-slate-200"}`}>{initialStateLabel(state)}</p>}
    {forecastError && <p role="status" className="mb-5 rounded-2xl border border-amber-300/30 bg-amber-950/35 p-4 text-sm text-amber-100">{copy.requestError}</p>}

    <section aria-label={copy.mapLabel} className="relative"><ForecastMap records={mapRecords} periods={periods} activePeriodId={activeMapPeriodId} indicator={indicator} selectedAreaCode={areaCode} freshness={freshness} onPeriodSelect={selectPeriod} onAreaSelect={(nextAreaCode) => selectArea(nextAreaCode)} onIndicatorSelect={setIndicator} /></section>

    <details className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 shadow-xl shadow-black/10"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-300 marker:hidden"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-sky-300" aria-hidden="true" />{copy.dateRange}</span><span className="text-slate-400">{areaCode ? `${effectiveStartsAt || "—"} 至 ${effectiveEndsAt || "—"}` : copy.selectPrompt}</span><span className="text-sky-300">{copy.adjustDates}</span></summary><div className="mt-4 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-200">{copy.startsAt}<input className="mt-2 block w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30" type="date" value={effectiveStartsAt} onChange={(event) => setDateScope(event.target.value, effectiveEndsAt)} /></label><label className="text-sm font-semibold text-slate-200">{copy.endsAt}<input className="mt-2 block w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30" type="date" value={effectiveEndsAt} onChange={(event) => setDateScope(effectiveStartsAt, event.target.value)} /></label></div></details>

    <section aria-labelledby="forecast-details-heading" className="mt-10 scroll-mt-6"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold tracking-[0.16em] text-sky-300">{copy.detailLabel}</p><h2 ref={detailHeadingRef} tabIndex={-1} id="forecast-details-heading" className="mt-1 text-2xl font-bold text-white outline-none sm:text-3xl">{selectedArea ? `${selectedArea.areaName}${copy.detailSuffix}` : copy.chooseCounty}</h2></div></div><ForecastDetails records={records} indicator={indicator} /></section>
  </section></main>;
}
