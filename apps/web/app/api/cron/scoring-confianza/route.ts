import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "CRON_NOT_CONFIGURED_OR_UNAUTHORIZED" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!base || !serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVER_CREDENTIALS_NOT_CONFIGURED" }, { status: 500 });
  }

  const response = await fetch(`${base}/rest/v1/rpc/recalcular_scoring_confianza_agrobrokeria`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  const body = await response.text();
  return new NextResponse(body || JSON.stringify({ ok: response.ok }), {
    status: response.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
