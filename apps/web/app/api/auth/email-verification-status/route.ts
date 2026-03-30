import { NextResponse } from "next/server"

import { getAuthSessionEmailVerified } from "@/lib/auth/session-user"

export async function GET() {
  const emailVerified = await getAuthSessionEmailVerified()
  return NextResponse.json({ emailVerified })
}
