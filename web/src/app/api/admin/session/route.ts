import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookie,
  createAdminSession,
  verifyAdminPassword,
  verifyAdminSession,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function sessionFrom(request: NextRequest): string | undefined {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: verifyAdminSession(sessionFrom(request)) });
}

export async function POST(request: NextRequest) {
  let password: unknown;
  try {
    ({ password } = await request.json() as { password?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid administrator login request" }, { status: 400 });
  }

  try {
    if (typeof password !== "string" || !verifyAdminPassword(password)) {
      return NextResponse.json({ error: "Invalid administrator password" }, { status: 401 });
    }
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set({ name: ADMIN_SESSION_COOKIE, ...adminSessionCookie(createAdminSession()) });
    return response;
  } catch (error) {
    console.error("Administrator login is unavailable", error);
    return NextResponse.json({ error: "Administrator login is unavailable" }, { status: 503 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set({ name: ADMIN_SESSION_COOKIE, ...adminSessionCookie(""), maxAge: 0 });
  return response;
}
