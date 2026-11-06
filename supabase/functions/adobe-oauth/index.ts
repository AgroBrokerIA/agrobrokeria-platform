import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);
const CLIENT_ID = "ats-eada1c07-8d29-4481-94b0-36697190a75a";
const REDIRECT_URI = "https://agrobrokeria.online/api/firma/adobe/callback";
const RETURN_URI = "https://agrobrokeria.online/contratos";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });

function redirect(status: string, detail?: string) {
  const url = new URL(RETURN_URI);
  url.searchParams.set("firma", status);
  url.searchParams.set("tab", "firmas");
  if (detail) url.searchParams.set("detail", detail.slice(0, 180));
  return Response.redirect(url.toString(), 303);
}

async function userFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const uc = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await uc.auth.getUser();
  return user ?? null;
}

async function companyForUser(userId: string) {
  const profile = await db.from("profiles").select("active_company_id").eq("id", userId).maybeSingle();
  const activeCompanyId = profile.data?.active_company_id as string | null;
  if (activeCompanyId) {
    const activeMembership = await db.from("company_users")
      .select("company_id")
      .eq("profile_id", userId)
      .eq("company_id", activeCompanyId)
      .eq("activo", true)
      .eq("rol", "administrador")
      .maybeSingle();
    if (activeMembership.data?.company_id) return String(activeMembership.data.company_id);
  }
  return null;
}

async function status(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return json({ ok: false, connected: false, error: "AUTH_REQUIRED" }, 401);
  const companyId = await companyForUser(user.id);
  if (!companyId) return json({ ok: false, connected: false, error: "ACTIVE_COMPANY_REQUIRED" }, 403);

  const { data: row, error } = await db.from("adobe_sign_oauth_tokens")
    .select("provider,expires_at,api_access_point,scopes,connected_at,revoked_at")
    .eq("provider", "adobe_sign")
    .eq("company_id", companyId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;

  return json({
    ok: true,
    connected: Boolean(row?.api_access_point && row?.connected_at),
    expires_at: row?.expires_at ?? null,
    scopes: Array.isArray(row?.scopes) ? row.scopes : []
  });
}

async function authorize(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return json({ ok: false, error: "AUTH_REQUIRED" }, 401);
  const companyId = await companyForUser(user.id, user.email);
  if (!companyId) return json({ ok: false, error: "ACTIVE_COMPANY_REQUIRED" }, 403);

  const state = crypto.randomUUID();
  const { error } = await db.from("adobe_sign_oauth_states").insert({
    id: state,
    user_id: user.id,
    company_id: companyId,
    redirect_uri: REDIRECT_URI
  });
  if (error) throw new Error("ADOBE_SIGN_STATE_STORE_FAILED");

  const url = new URL("https://secure.echosign.com/public/oauth/v2");
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "user_read agreement_read agreement_write");
  return json({ ok: true, authorization_url: url.toString() });
}

function normalizeSecret(value: string) {
  let normalized = value.trim();
  if (normalized.length >= 2) {
    const first = normalized[0], last = normalized[normalized.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
}

async function callback(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  if (oauthError) return redirect("denied");
  if (!code || !state) return redirect("invalid_callback");

  const { data: stateRow } = await db.from("adobe_sign_oauth_states")
    .select("id,user_id,company_id,redirect_uri,expires_at,consumed_at")
    .eq("id", state)
    .maybeSingle();
  if (!stateRow) return redirect("invalid_state");
  if (stateRow.consumed_at || new Date(stateRow.expires_at).getTime() <= Date.now()) return redirect("expired_state");

  const { data: consumed } = await db.from("adobe_sign_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", state)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (!consumed) return redirect("state_replayed");

  const clientSecret = normalizeSecret(Deno.env.get("ADOBE_SIGN_CLIENT_SECRET") || "");
  if (!clientSecret) return redirect("credentials_pending");

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: CLIENT_ID,
    client_secret: clientSecret,
    redirect_uri: stateRow.redirect_uri
  });

  const returnedApiAccessPoint = url.searchParams.get("api_access_point");
  const endpoints = [
    ...(returnedApiAccessPoint && /^https:\/\//i.test(returnedApiAccessPoint)
      ? [returnedApiAccessPoint.replace(/\/$/, "") + "/oauth/v2/token"] : []),
    "https://api.na3.adobesign.com/oauth/v2/token",
    "https://secure.na3.adobesign.com/oauth/v2/token"
  ];

  let tokenResponse: Response | null = null;
  let tokenData: any = {};
  let lastError = "";
  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      body: tokenBody.toString()
    });
    const data = await response.json().catch(() => ({}));
    tokenResponse = response;
    tokenData = data;
    if (response.ok && typeof data.access_token === "string" && typeof data.refresh_token === "string") break;
    lastError = String(data.error || "unknown_error") + (data.error_description ? ":" + String(data.error_description) : "");
  }

  if (!tokenResponse?.ok || typeof tokenData.access_token !== "string" || typeof tokenData.refresh_token !== "string") {
    return redirect("token_exchange_failed", lastError);
  }

  const apiAccessPoint = String(tokenData.api_access_point || "");
  if (!/^https:\/\//i.test(apiAccessPoint)) return redirect("api_access_point_missing");

  const expiresIn = Number(tokenData.expires_in || 3600);
  const scopes = typeof tokenData.scope === "string"
    ? tokenData.scope.split(/[ ,]+/).filter(Boolean)
    : ["user_read", "agreement_read", "agreement_write"];

  const { error: upsertError } = await db.from("adobe_sign_oauth_tokens").upsert({
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

  if (upsertError) return redirect("token_store_failed");
  return redirect("connected");
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    if (req.method === "GET" && url.searchParams.get("action") === "callback") return await callback(req);
    if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
    const body = await req.json().catch(() => ({}));
    if (body.action === "status") return await status(req);
    if (body.action === "authorize") return await authorize(req);
    return json({ ok: false, error: "INVALID_ACTION" }, 400);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "ADOBE_OAUTH_ERROR" }, 500);
  }
});
