import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { mercadoPagoAuthorizationUrl } from "@/lib/mercadopago/server";
import { encryptSecret, signState } from "@/lib/mercadopago/crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .single();
    if (profileError || !profile?.active_company_id) {
      return NextResponse.json({ error: "ACTIVE_COMPANY_REQUIRED" }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("company_users")
      .select("id")
      .eq("company_id", profile.active_company_id)
      .eq("profile_id", user.id)
      .eq("activo", true)
      .maybeSingle();
    if (membershipError || !membership) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const nonce = crypto.randomBytes(16).toString("hex");
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const admin = getSupabaseAdmin();
    const { error: stateError } = await admin.from("mercadopago_oauth_states").insert({
      nonce,
      company_id: profile.active_company_id,
      profile_id: user.id,
      code_verifier_enc: encryptSecret(codeVerifier),
      expires_at: expiresAt,
    });
    if (stateError) throw stateError;
    const payload = Buffer.from(JSON.stringify({
      companyId: profile.active_company_id,
      profileId: user.id,
      nonce,
      exp: Date.now() + 10 * 60 * 1000,
    })).toString("base64url");
    const state = `${payload}.${signState(payload)}`;
    return NextResponse.redirect(mercadoPagoAuthorizationUrl(state, codeChallenge));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "MP_CONNECT_ERROR" }, { status: 500 });
  }
}
