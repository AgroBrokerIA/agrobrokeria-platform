import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FUNCTION_URL = "https://hlviozkqskdhdaykgtis.supabase.co/functions/v1/adobe-oauth";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, connected: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }
  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" }),
      cache: "no-store"
    });
    const body = await response.json().catch(() => ({ ok: false, connected: false, error: "ADOBE_SIGN_STATUS_ERROR" }));
    return NextResponse.json(body, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, connected: false, error: "ADOBE_SIGN_STATUS_UNAVAILABLE" }, { status: 502 });
  }
}
