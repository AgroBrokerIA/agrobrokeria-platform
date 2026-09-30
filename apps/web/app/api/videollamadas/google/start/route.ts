import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !service) throw new Error("SUPABASE_SERVER_CONFIG_MISSING");
  return createClient(url, service);
}

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer /i, "");
    if (!token) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!url || !anon) return NextResponse.json({ error: "SUPABASE_SERVER_CONFIG_MISSING" }, { status: 500 });
    if (!clientId) return NextResponse.json({ error: "GOOGLE_CLIENT_ID_PENDING", detail: "Falta configurar GOOGLE_CLIENT_ID en el entorno de producción." }, { status: 409 });

    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const { data: profile } = await userClient.from("profiles").select("active_company_id").eq("id", user.id).maybeSingle();
    const companyId = profile?.active_company_id;
    if (!companyId) return NextResponse.json({ error: "ACTIVE_COMPANY_REQUIRED" }, { status: 409 });

    const { data: membership, error: membershipError } = await userClient
      .from("company_users")
      .select("rol")
      .eq("company_id", companyId)
      .eq("profile_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (membershipError) return NextResponse.json({ error: "COMPANY_ROLE_CHECK_FAILED" }, { status: 403 });
    if (membership?.rol !== "administrador") {
      return NextResponse.json({ error: "ADMIN_REQUIRED", detail: "Solo un administrador de la empresa puede conectar la cuenta de Google de AgroBrokerIA." }, { status: 403 });
    }

    const admin = supabaseAdmin();
    await admin.from("google_oauth_states").delete().lt("expires_at", new Date().toISOString());

    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || new URL("/api/videollamadas/google/callback", req.url).toString();

    const { data: stateRow, error: stateError } = await admin.from("google_oauth_states").insert({
      user_id: user.id,
      company_id: companyId,
      redirect_uri: redirectUri,
    }).select("id").single();

    if (stateError || !stateRow) throw new Error("GOOGLE_OAUTH_STATE_CREATE_FAILED");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state: stateRow.id,
    });

    return NextResponse.json({ ok: true, authorization_url: `${GOOGLE_AUTH_URL}?${params.toString()}` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "GOOGLE_OAUTH_START_FAILED" }, { status: 502 });
  }
}
