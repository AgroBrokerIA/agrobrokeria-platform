import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVER_CONFIG_MISSING");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) return NextResponse.json({ ok: false, connected: false, error: "AUTH_REQUIRED" }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ ok: false, connected: false, error: "AUTH_REQUIRED" }, { status: 401 });

    const admin = adminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .maybeSingle();
    const companyId = profile?.active_company_id;
    if (!companyId) return NextResponse.json({ ok: false, connected: false, error: "ACTIVE_COMPANY_REQUIRED" }, { status: 403 });

    const { data: row, error } = await admin
      .from("adobe_sign_oauth_tokens")
      .select("provider,expires_at,api_access_point,scopes,connected_at,revoked_at")
      .eq("provider", "adobe_sign")
      .eq("company_id", companyId)
      .is("revoked_at", null)
      .maybeSingle();

    if (error) throw error;

    const connected = Boolean(row?.api_access_point && row?.connected_at);
    return NextResponse.json({
      ok: true,
      connected,
      expires_at: row?.expires_at ?? null,
      scopes: Array.isArray(row?.scopes) ? row.scopes : [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      connected: false,
      error: error instanceof Error ? error.message : "ADOBE_SIGN_STATUS_ERROR"
    }, { status: 500 });
  }
}
