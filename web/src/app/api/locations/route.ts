import { NextResponse } from "next/server";

import { getCurrentAreas, selectAreas } from "@/lib/forecast-locations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ areas: selectAreas(await getCurrentAreas()) });
  } catch (error) {
    console.error("Unable to load forecast locations", error);
    return NextResponse.json({ error: "暫時無法取得可用縣市" }, { status: 503 });
  }
}
