import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/lib/mercadopago/server";
import { encryptSecret, verifyState } from "@/lib/mercadopago/crypto";
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
      companyId:string; profileId:string; exp:number;
    };
    if (!decoded.companyId || !decoded.profileId || !decoded.exp || decoded.exp < Date.now()) {
      return NextResponse.redirect(`${appUrl}/configuracion/pagos?mp=error&reason=expired_state`);
    }

    const tokens = await exchangeAuthorizationCode(code);
    const admin = getSupabaseAdmin();

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
