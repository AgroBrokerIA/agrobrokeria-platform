import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !service) throw new Error("SUPABASE_SERVER_CONFIG_MISSING");
  return createClient(url, service);
}

function redirectToApp(req: NextRequest, status: string) {
  const base = new URL("/videollamadas", req.url);
  base.searchParams.set("google", status);
  return NextResponse.redirect(base);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) return redirectToApp(req, "denied");
  if (!code || !state) return redirectToApp(req, "invalid_callback");

  try {
    const admin = adminClient();
    const { data: stateRow, error: stateReadError } = await admin.from("google_oauth_states")
      .select("id,user_id,company_id,redirect_uri,expires_at,consumed_at").eq("id", state).maybeSingle();

    if (stateReadError || !stateRow) return redirectToApp(req, "invalid_state");
    if (stateRow.consumed_at || new Date(stateRow.expires_at).getTime() <= Date.now()) return redirectToApp(req, "expired_state");

    const { data: consumed, error: consumeError } = await admin.from("google_oauth_states")
      .update({ consumed_at: new Date().toISOString() }).eq("id", stateRow.id).is("consumed_at", null).select("id").maybeSingle();

    if (consumeError || !consumed) return redirectToApp(req, "state_replayed");

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return redirectToApp(req, "credentials_pending");

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: stateRow.redirect_uri, grant_type: "authorization_code" }),
      cache: "no-store",
    });

    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) return redirectToApp(req, "token_exchange_failed");

    const refreshToken = typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : null;
    const scopes = typeof tokenData.scope === "string" ? tokenData.scope.split(" ").filter(Boolean) : [];

    let tokenToStore = refreshToken;
    if (!tokenToStore) {
      const { data: existing } = await admin.from("google_oauth_tokens").select("refresh_token").eq("provider", "google").maybeSingle();
      tokenToStore = existing?.refresh_token || null;
    }

    if (!tokenToStore) return redirectToApp(req, "refresh_token_missing");

    const { error: upsertError } = await admin.from("google_oauth_tokens").upsert({
      provider: "google",
      refresh_token: tokenToStore,
      scopes,
      connected_by: stateRow.user_id,
      connected_company_id: stateRow.company_id,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      revoked_at: null,
    }, { onConflict: "provider" });

    if (upsertError) throw new Error("GOOGLE_TOKEN_STORE_FAILED");
    return redirectToApp(req, "connected");
  } catch {
    return redirectToApp(req, "error");
  }
}
