import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { LOGIN_CSRF_COOKIE_NAME } from "@/lib/auth/constants";

/**
 * CSRF-Token für POST /api/auth/login und POST /api/auth/logout.
 * Cookie darf nicht in Server Components gesetzt werden (nur Route Handler / Server Actions).
 */
export async function GET() {
  const csrf = randomBytes(32).toString("hex");
  const res = NextResponse.json({ csrf });
  res.cookies.set(LOGIN_CSRF_COOKIE_NAME, csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3600,
    path: "/",
  });
  return res;
}
