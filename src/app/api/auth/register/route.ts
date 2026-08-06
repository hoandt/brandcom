import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { code: "PASSWORD_REGISTRATION_DISABLED" },
    { status: 403 },
  )
}
