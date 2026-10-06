import { NextRequest, NextResponse } from "next/server";

import { getCurrentLocations, selectLocations } from "@/lib/forecast-locations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const countyCode = request.nextUrl.searchParams.get("county_code")?.trim() || undefined;
  try {
    const selection = selectLocations(await getCurrentLocations(), countyCode);
    return NextResponse.json(selection);
  } catch (error) {
    console.error("Unable to load forecast locations", error);
    return NextResponse.json({ error: "目前無法讀取預報地區。" }, { status: 503 });
  }
}
