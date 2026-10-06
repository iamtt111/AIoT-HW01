"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { PathOptions } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";

import { mapRecordByArea, mapValueForRecord, type MapIndicator } from "@/lib/forecast-presentation";
import type { ForecastRecord } from "@/lib/forecast-records";

type CountyProperties = { cwa_area_code?: string; area_name?: string };
type CountyCollection = FeatureCollection<Geometry, CountyProperties>;

const copy = {
  loading: "\u6b63\u5728\u8f09\u5165\u7e23\u5e02\u5730\u5716\u2026",
  ariaLabel: "\u81fa\u7063\u7e23\u5e02\u9810\u5831\u5730\u5716",
  unavailable: "\u7121\u8cc7\u6599",
  unknownArea: "\u672a\u77e5\u7e23\u5e02",
  unavailableDescription: "\u7f3a\u503c\u4ee5\u7070\u8272\u5448\u73fe\uff0c\u8868\u793a CWA \u672a\u63d0\u4f9b\u8a72\u6642\u6bb5\u7684\u8cc7\u6599\u3002",
};

const indicatorLabels: Record<MapIndicator, string> = {
  temperature: "\u6700\u9ad8\u6eab", precipitation: "\u964d\u96e8\u6a5f\u7387", uv: "\u7d2b\u5916\u7dda", wind: "\u98a8\u901f",
};

function fillColor(value: number | null, indicator: MapIndicator): string {
  if (value === null) return "#cbd5e1";
  if (indicator === "temperature") return value >= 32 ? "#dc2626" : value >= 27 ? "#f97316" : value >= 22 ? "#facc15" : "#38bdf8";
  if (indicator === "precipitation") return value >= 70 ? "#1d4ed8" : value >= 40 ? "#38bdf8" : "#bfdbfe";
  if (indicator === "uv") return value >= 8 ? "#a21caf" : value >= 6 ? "#f97316" : value >= 3 ? "#facc15" : "#86efac";
  return value >= 10 ? "#7c3aed" : value >= 5 ? "#a78bfa" : "#ddd6fe";
}

export function ForecastMap({ records, indicator }: { records: ForecastRecord[]; indicator: MapIndicator }) {
  const [counties, setCounties] = useState<CountyCollection | null>(null);
  const recordsByArea = useMemo(() => mapRecordByArea(records), [records]);

  useEffect(() => {
    let active = true;
    void fetch("/data/taiwan-counties.geojson")
      .then((response) => response.ok ? response.json() as Promise<CountyCollection> : Promise.reject(new Error("GeoJSON unavailable")))
      .then((data) => { if (active) setCounties(data); })
      .catch(() => { if (active) setCounties(null); });
    return () => { active = false; };
  }, []);

  if (!counties) return <p className="rounded-lg bg-slate-100 p-6 text-slate-600">{copy.loading}</p>;
  const style = (feature?: Feature<Geometry, CountyProperties>): PathOptions => {
    const areaCode = feature?.properties.cwa_area_code?.replace("cwa-", "");
    const { value } = mapValueForRecord(areaCode ? recordsByArea.get(areaCode) : undefined, indicator);
    return { color: "#ffffff", weight: 1, fillColor: fillColor(value, indicator), fillOpacity: 0.78 };
  };
  const geoJsonKey = `${indicator}-${records.map((record) => `${record.areaCode}-${record.validFrom}-${mapValueForRecord(record, indicator).value}`).join("|")}`;

  return <div className="space-y-3"><div className="h-[480px] overflow-hidden rounded-xl border border-slate-200" aria-label={copy.ariaLabel}>
    <MapContainer center={[23.7, 121]} zoom={7} scrollWheelZoom={false} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GeoJSON key={geoJsonKey} data={counties} style={style} onEachFeature={(feature, layer) => {
        const areaCode = feature.properties.cwa_area_code?.replace("cwa-", "");
        const { value, unit } = mapValueForRecord(areaCode ? recordsByArea.get(areaCode) : undefined, indicator);
        const valueLabel = value === null ? copy.unavailable : `${value}${unit}`;
        layer.bindTooltip(`${feature.properties.area_name ?? copy.unknownArea}<br/>${indicatorLabels[indicator]}\uff1a${valueLabel}`);
      }} />
    </MapContainer></div><p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700"><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-slate-300 align-middle" />{indicatorLabels[indicator]}{copy.unavailableDescription}</p>
  </div>;
}
