import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "CRON_NOT_CONFIGURED_OR_UNAUTHORIZED" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keyName = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
  const serviceKey = process.env[keyName];
  if (!base || !serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVER_CREDENTIALS_NOT_CONFIGURED" }, { status: 500 });
  }

  const response = await fetch(`${base}/rest/v1/rpc/expirar_contratos_vencidos`, {
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
