import { NextResponse } from "next/server";

import { getForecastFreshness } from "@/lib/forecast-freshness";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getForecastFreshness());
  } catch (error) {
    console.error("Unable to load forecast freshness", error);
    return NextResponse.json({ error: "目前無法讀取資料更新狀態。" }, { status: 503 });
  }
}
