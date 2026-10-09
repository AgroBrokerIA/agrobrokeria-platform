import { decryptSecret, encryptSecret } from "@/lib/mercadopago/crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const MERCADO_PAGO_API = "https://api.mercadopago.com";
const AUTH_BASE = "https://auth.mercadopago.com.ar";

export function mercadoPagoConfig() {
  const appId = process.env.MP_CLIENT_ID;
  const appSecret = process.env.MP_CLIENT_SECRET;
  if (!appId || !appSecret) throw new Error("Faltan MP_CLIENT_ID o MP_CLIENT_SECRET.");
  return { appId, appSecret };
}

export function mercadoPagoRedirectUri() {
  return process.env.MP_REDIRECT_URI || "https://agrobrokeria.online/api/pagos/mercadopago/oauth/callback";
}

export function mercadoPagoAuthorizationUrl(state: string, codeChallenge: string) {
  const { appId } = mercadoPagoConfig();
  const params = new URLSearchParams({
    client_id: appId,
    response_type: "code",
    platform_id: "mp",
    redirect_uri: mercadoPagoRedirectUri(),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_BASE}/authorization?${params.toString()}`;
}

export async function exchangeAuthorizationCode(code: string, codeVerifier: string) {
  const { appId, appSecret } = mercadoPagoConfig();
  const response = await fetch(`${MERCADO_PAGO_API}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: mercadoPagoRedirectUri(),
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || data?.error || "Mercado Pago rechazó OAuth.");
  return data as { access_token:string; public_key:string; refresh_token:string; user_id:string|number; expires_in:number; scope?:string; live_mode?:boolean };
}

export async function getSellerAccessToken(companyId: string) {
  const admin = getSupabaseAdmin();
  const { data: connection, error } = await admin.from("mercadopago_conexiones").select("*").eq("company_id", companyId).maybeSingle();
  if (error) throw error;
  if (!connection) throw new Error("La empresa no tiene Mercado Pago conectado.");

  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  const accessToken = decryptSecret(connection.access_token_enc);
  const refreshToken = decryptSecret(connection.refresh_token_enc);
  if (expiresAt > Date.now() + 10 * 60 * 1000) return accessToken;

  const { appId, appSecret } = mercadoPagoConfig();
  const response = await fetch(`${MERCADO_PAGO_API}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id:appId, client_secret:appSecret, grant_type:"refresh_token", refresh_token:refreshToken }),
    cache:"no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    await admin.from("mercadopago_conexiones").update({ estado:"EXPIRADA", actualizado_at:new Date().toISOString() }).eq("id",connection.id);
    throw new Error(data?.message || data?.error || "No se pudo renovar la conexión de Mercado Pago.");
  }
  await admin.from("mercadopago_conexiones").update({
    access_token_enc:encryptSecret(data.access_token),
    refresh_token_enc:encryptSecret(data.refresh_token || refreshToken),
    token_expires_at:new Date(Date.now()+Number(data.expires_in || 15552000)*1000).toISOString(),
    estado:"CONECTADA",
    actualizado_at:new Date().toISOString(),
  }).eq("id",connection.id);
  return data.access_token as string;
}
