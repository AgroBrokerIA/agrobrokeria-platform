import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/lib/mercadopago/server";
import { decryptSecret, encryptSecret, verifyState } from "@/lib/mercadopago/crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://agrobrokeria.online";
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");
    if (error) return NextResponse.redirect(`${appUrl}/configuracion/pagos?mp=error&reason=${encodeURIComponent(error)}`);
    if (!code || !state) return NextResponse.redirect(`${appUrl}/configuracion/pagos?mp=error&reason=missing_oauth_data`);

    const [payload, signature] = state.split(".");
    if (!payload || !signature || !verifyState(payload, signature)) {
      return NextResponse.redirect(`${appUrl}/configuracion/pagos?mp=error&reason=invalid_state`);
    }
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      companyId:string; profileId:string; nonce:string; exp:number;
    };
    if (!decoded.companyId || !decoded.profileId || !decoded.nonce || !decoded.exp || decoded.exp < Date.now()) {
      return NextResponse.redirect(`${appUrl}/configuracion/pagos?mp=error&reason=expired_state`);
    }

    const admin = getSupabaseAdmin();
    const { data: oauthState, error: stateLookupError } = await admin
      .from("mercadopago_oauth_states")
      .select("nonce, company_id, profile_id, code_verifier_enc, expires_at, consumed_at")
      .eq("nonce", decoded.nonce)
      .eq("company_id", decoded.companyId)
      .eq("profile_id", decoded.profileId)
      .maybeSingle();
    if (stateLookupError) throw stateLookupError;
    if (!oauthState || oauthState.consumed_at || new Date(oauthState.expires_at).getTime() < Date.now()) {
      return NextResponse.redirect(`${appUrl}/configuracion/pagos?mp=error&reason=expired_or_used_state`);
    }

    const { data: consumedState, error: consumeError } = await admin
      .from("mercadopago_oauth_states")
      .update({ consumed_at: new Date().toISOString() })
      .eq("nonce", decoded.nonce)
      .is("consumed_at", null)
      .select("nonce")
      .maybeSingle();
    if (consumeError) throw consumeError;
    if (!consumedState) {
      return NextResponse.redirect(`${appUrl}/configuracion/pagos?mp=error&reason=used_state`);
    }

    const codeVerifier = decryptSecret(oauthState.code_verifier_enc);
    const tokens = await exchangeAuthorizationCode(code, codeVerifier);

    const { data: map } = await admin
      .from("company_empresa_map")
      .select("empresa_id")
      .eq("company_id", decoded.companyId)
      .maybeSingle();

    const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 15552000) * 1000).toISOString();
    const { error: saveError } = await admin.from("mercadopago_conexiones").upsert({
      company_id: decoded.companyId,
      empresa_id: map?.empresa_id || null,
      profile_id: decoded.profileId,
      mp_user_id: String(tokens.user_id),
      public_key: tokens.public_key,
      access_token_enc: encryptSecret(tokens.access_token),
      refresh_token_enc: encryptSecret(tokens.refresh_token),
      token_expires_at: expiresAt,
      scope: tokens.scope || null,
      live_mode: Boolean(tokens.live_mode),
      estado: "CONECTADA",
      metadata: { connected_via: "oauth", application_id: process.env.MP_CLIENT_ID || null },
      actualizado_at: new Date().toISOString(),
    }, { onConflict: "company_id" });

    if (saveError) throw saveError;

    if (map?.empresa_id) {
      await admin.from("integraciones_pago").upsert({
        empresa_id: map.empresa_id,
        proveedor: "MERCADOPAGO",
        ambiente: tokens.live_mode ? "PRODUCCION" : "SANDBOX",
        habilitado: true,
        metadata: { application_id: process.env.MP_CLIENT_ID || null, mp_user_id: String(tokens.user_id), mode: "MARKETPLACE_SPLIT_1_1" },
        actualizado_at: new Date().toISOString(),
      }, { onConflict: "empresa_id,proveedor,ambiente" });
    }

    return NextResponse.redirect(`${appUrl}/configuracion/pagos?mp=connected`);
  } catch (error) {
    return NextResponse.redirect(`${appUrl}/configuracion/pagos?mp=error&reason=${encodeURIComponent(error instanceof Error ? error.message : "oauth_callback_error")}`);
  }
}
