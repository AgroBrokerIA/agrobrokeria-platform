import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVER_CONFIG_MISSING");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function redirect(req: NextRequest, status: string) {
  const url = new URL("/contratos", req.url);
  url.searchParams.set("firma", status);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  if (error) return redirect(req, "denied");
  if (!code || !state) return redirect(req, "invalid_callback");

  try {
    const admin = adminClient();
    const { data: stateRow } = await admin
      .from("adobe_sign_oauth_states")
      .select("id,user_id,company_id,redirect_uri,expires_at,consumed_at")
      .eq("id", state)
      .maybeSingle();

    if (!stateRow) return redirect(req, "invalid_state");
    if (stateRow.consumed_at || new Date(stateRow.expires_at).getTime() <= Date.now()) return redirect(req, "expired_state");

    const { data: consumed } = await admin
      .from("adobe_sign_oauth_states")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", state)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();

    if (!consumed) return redirect(req, "state_replayed");

    const clientId = process.env.ADOBE_SIGN_CLIENT_ID || "ats-eada1c07-8d29-4481-94b0-36697190a75a";
    const clientSecret = process.env.ADOBE_SIGN_CLIENT_SECRET;
    if (!clientSecret) return redirect(req, "credentials_pending");

    const authBase = (process.env.ADOBE_SIGN_AUTH_BASE_URL || "https://secure.na3.adobesign.com").replace(/\/$/, "");
    const tokenResponse = await fetch(authBase + "/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: stateRow.redirect_uri
      }),
      cache: "no-store"
    });

    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || typeof tokenData.access_token !== "string" || typeof tokenData.refresh_token !== "string") {
      return redirect(req, "token_exchange_failed");
    }

    const apiAccessPoint = String(tokenData.api_access_point || "");
    if (!/^https:\/\//i.test(apiAccessPoint)) return redirect(req, "api_access_point_missing");

    const expiresIn = Number(tokenData.expires_in || 3600);
    const scopes = typeof tokenData.scope === "string"
      ? tokenData.scope.split(/[ ,]+/).filter(Boolean)
      : ["user_read:account", "agreement_read:account", "agreement_write:account"];

    const { error: upsertError } = await admin.from("adobe_sign_oauth_tokens").upsert({
      provider: "adobe_sign",
      user_id: stateRow.user_id,
      company_id: stateRow.company_id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: String(tokenData.token_type || "Bearer"),
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      api_access_point: apiAccessPoint.replace(/\/$/, ""),
      web_access_point: typeof tokenData.web_access_point === "string" ? tokenData.web_access_point.replace(/\/$/, "") : null,
      scopes,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      revoked_at: null
    }, { onConflict: "provider,company_id" });

    if (upsertError) throw new Error("ADOBE_SIGN_TOKEN_STORE_FAILED");
    return redirect(req, "connected");
  } catch {
    return redirect(req, "error");
  }
}
