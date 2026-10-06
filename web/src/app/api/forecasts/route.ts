import { NextRequest, NextResponse } from "next/server";

import { getLatestForecasts, type ForecastFilters } from "@/lib/forecast-records";

export const dynamic = "force-dynamic";

function optionalIsoTime(value: string | null, field: string): string | undefined {
  if (!value) return undefined;
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be a valid ISO-8601 date or time`);
  }
  return value;
}

export async function GET(request: NextRequest) {
  const areaCode = request.nextUrl.searchParams.get("area_code")?.trim();
  if (!areaCode) {
    return NextResponse.json({ error: "area_code is required" }, { status: 400 });
  }

  try {
    const filters: ForecastFilters = {
      areaCode,
      startsAt: optionalIsoTime(request.nextUrl.searchParams.get("starts_at"), "starts_at"),
      endsAt: optionalIsoTime(request.nextUrl.searchParams.get("ends_at"), "ends_at"),
    };
    if (filters.startsAt && filters.endsAt && filters.startsAt > filters.endsAt) {
      return NextResponse.json({ error: "starts_at must not be after ends_at" }, { status: 400 });
    }
    return NextResponse.json({ records: await getLatestForecasts(filters) });
  } catch (error) {
    if (error instanceof Error && error.message.includes("must be a valid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Unable to load latest forecasts", error);
    return NextResponse.json({ error: "暫時無法取得預報資料" }, { status: 503 });
  }
}
