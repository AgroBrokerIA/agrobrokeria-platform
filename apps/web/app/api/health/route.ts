import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { ok: false, status: "misconfigured", service: "agrobrokeria" },
        { status: 503 }
      );
    }

    const db = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await db
      .from("companies")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          status: "degraded",
          service: "agrobrokeria",
          latency_ms: Date.now() - startedAt,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: "ready",
      service: "agrobrokeria",
      latency_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, status: "error", service: "agrobrokeria" },
      { status: 503 }
    );
  }
}
