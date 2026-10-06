import { NextRequest, NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin-auth";
import { getLatestRawPayload } from "@/lib/admin-raw-payload";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Administrator authentication is required" }, { status: 401 });
  }

  try {
    return NextResponse.json({ payload: await getLatestRawPayload() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to load protected raw forecast payload", error);
    return NextResponse.json({ error: "Protected raw payload is unavailable" }, { status: 503 });
  }
}
