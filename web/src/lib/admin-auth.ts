import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "cwa_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 30 * 60;

type AdminSession = {
  exp: number;
  role: "admin";
  version: 1;
};

type AdminCredentials = {
  password: string;
  sessionSecret: string;
};

function credentialsFromEnvironment(): AdminCredentials {
  const password = process.env.ADMIN_PASSWORD?.trim();
  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!password || !sessionSecret || sessionSecret.length < 32) {
    throw new Error("Administrator authentication is not configured");
  }
  return { password, sessionSecret };
}

function sign(value: string, sessionSecret: string): string {
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function safelyEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAdminPassword(candidate: string): boolean {
  const { password, sessionSecret } = credentialsFromEnvironment();
  return safelyEquals(sign(candidate, sessionSecret), sign(password, sessionSecret));
}

export function createAdminSession(now = Date.now()): string {
  const { sessionSecret } = credentialsFromEnvironment();
  const encoded = Buffer.from(
    JSON.stringify({
      exp: Math.floor(now / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
      role: "admin",
      version: 1,
    } satisfies AdminSession),
  ).toString("base64url");
  return `${encoded}.${sign(encoded, sessionSecret)}`;
}

export function verifyAdminSession(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;

  const [encoded, signature, ...remainder] = token.split(".");
  if (!encoded || !signature || remainder.length > 0) return false;

  try {
    const { sessionSecret } = credentialsFromEnvironment();
    if (!safelyEquals(signature, sign(encoded, sessionSecret))) return false;
    const session = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AdminSession;
    return session.version === 1 && session.role === "admin" && session.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export function adminSessionCookie(value: string) {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "strict" as const,
    secure: true,
    value,
  };
}
