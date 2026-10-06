import { NextRequest, NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin-auth";
import { dispatchManualSynchronization } from "@/lib/admin-sync";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Administrator authentication is required" }, { status: 401 });
  }

  try {
    const result = await dispatchManualSynchronization();
    if (result.status === "already_running") {
      return NextResponse.json(result, { status: 409 });
    }
    if (result.status === "failed") {
      return NextResponse.json({ error: "Unable to dispatch forecast synchronization" }, { status: 502 });
    }
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    console.error("Unable to dispatch protected forecast synchronization", error);
    return NextResponse.json({ error: "Manual synchronization is unavailable" }, { status: 503 });
  }
}
