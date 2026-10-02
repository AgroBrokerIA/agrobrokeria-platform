import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVER_CONFIG_MISSING");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });

    const supabase = authClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });

    const admin = adminClient();
    let companyId: string | null = null;
    const byId = await admin.from("profiles").select("active_company_id").eq("id", user.id).maybeSingle();
    if (byId.data?.active_company_id) companyId = byId.data.active_company_id;
    if (!companyId && user.email) {
      const byEmail = await admin.from("profiles").select("active_company_id").eq("email", user.email).maybeSingle();
      companyId = byEmail.data?.active_company_id ?? null;
    }
    if (!companyId) return NextResponse.json({ ok: false, error: "ACTIVE_COMPANY_REQUIRED" }, { status: 403 });

    const clientId = process.env.ADOBE_SIGN_CLIENT_ID;
    const redirectUri = process.env.ADOBE_SIGN_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return NextResponse.json({ ok: false, error: "ADOBE_SIGN_NOT_CONFIGURED" }, { status: 503 });
    }

    const state = crypto.randomUUID();
    const { error } = await admin.from("adobe_sign_oauth_states").insert({
      id: state, user_id: user.id, company_id: companyId, redirect_uri: redirectUri
    });
    if (error) throw new Error("ADOBE_SIGN_STATE_STORE_FAILED");

    const authBase = (process.env.ADOBE_SIGN_AUTH_BASE_URL || "https://secure.na3.adobesign.com").replace(/\/$/, "");
    const scope = [
      "user_read:account",
      "agreement_read:account",
      "agreement_write:account"
    ].join(" ");

    const url = new URL(authBase + "/public/oauth/v2");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", scope);

    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "ADOBE_SIGN_AUTHORIZE_ERROR" }, { status: 500 });
  }
}
