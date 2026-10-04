import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FUNCTION_URL = "https://hlviozkqskdhdaykgtis.supabase.co/functions/v1/adobe-oauth";

export async function GET(req: NextRequest) {
  const target = new URL(FUNCTION_URL);
  target.searchParams.set("action", "callback");
  for (const key of ["code", "state", "error", "api_access_point"]) {
    const value = req.nextUrl.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target);
}
