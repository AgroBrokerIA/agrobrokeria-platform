import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSellerAccessToken, MERCADO_PAGO_API } from "@/lib/mercadopago/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const body = await request.json() as {
      operacion_id?: string;
      empresa_pagadora_id?: string;
      empresa_cobradora_id: string;
      importe?: number;
      titulo?: string;
      payer_email?: string;
    };

    if (!body.empresa_cobradora_id) return NextResponse.json({ error: "SELLER_REQUIRED" }, { status: 400 });
    if (!body.operacion_id) return NextResponse.json({ error: "OPERATION_REQUIRED" }, { status: 400 });
    const amount = Number(body.importe);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("active_company_id,email").eq("id", user.id).single();
    if (!profile?.active_company_id) return NextResponse.json({ error: "ACTIVE_COMPANY_REQUIRED" }, { status: 400 });

    const { data: buyerMembership } = await supabase.from("company_users").select("id")
      .eq("company_id", profile.active_company_id).eq("profile_id", user.id).eq("activo", true).maybeSingle();
    if (!buyerMembership) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (body.empresa_pagadora_id && body.empresa_pagadora_id !== profile.active_company_id) {
      return NextResponse.json({ error: "BUYER_COMPANY_MISMATCH" }, { status: 403 });
    }

    const buyerCompanyId = profile.active_company_id;
    const admin = getSupabaseAdmin();
    const { data: sellerConnection } = await admin.from("mercadopago_conexiones")
      .select("company_id,empresa_id,estado,live_mode").eq("company_id", body.empresa_cobradora_id).maybeSingle();
    if (!sellerConnection || sellerConnection.estado !== "CONECTADA") {
      return NextResponse.json({ error: "SELLER_MERCADOPAGO_NOT_CONNECTED" }, { status: 409 });
    }

    let operation: { id:string; codigo:string; importe_total:number|null; moneda_id:number|null; cantidad_tn:number|null }|null = null;
    if (body.operacion_id) {
      const { data, error } = await admin.from("operaciones").select("id,codigo,importe_total,moneda_id,cantidad_tn").eq("id",body.operacion_id).single();
      if (error || !data) return NextResponse.json({ error: "OPERATION_NOT_FOUND" }, { status: 404 });
      operation = data;
      if (data.importe_total != null && Math.abs(Number(data.importe_total) - amount) > 0.01) {
        return NextResponse.json({ error: "AMOUNT_DOES_NOT_MATCH_OPERATION" }, { status: 400 });
      }
    }

    if (operation) {
      if (!sellerConnection.empresa_id) {
        return NextResponse.json({ error: "SELLER_COMPANY_MAPPING_MISSING" }, { status: 409 });
      }
      const { data: buyerMap, error: buyerMapError } = await admin.from("company_empresa_map")
        .select("empresa_id").eq("company_id", buyerCompanyId).maybeSingle();
      if (buyerMapError) throw buyerMapError;
      if (!buyerMap?.empresa_id) {
        return NextResponse.json({ error: "BUYER_COMPANY_MAPPING_MISSING" }, { status: 409 });
      }
      const { data: participants, error: participantsError } = await admin.from("operacion_participantes")
        .select("empresa_id").eq("operacion_id", operation.id)
        .in("empresa_id", [buyerMap.empresa_id, sellerConnection.empresa_id]);
      if (participantsError) throw participantsError;
      const participantIds = new Set((participants || []).map((participant: { empresa_id: string }) => participant.empresa_id));
      if (!participantIds.has(buyerMap.empresa_id) || !participantIds.has(sellerConnection.empresa_id)) {
        return NextResponse.json({ error: "OPERATION_PARTICIPANT_REQUIRED" }, { status: 403 });
      }
    }

    const currencyId = operation?.moneda_id;
    let currency = "ARS";
    if (currencyId) {
      const { data: currencyRow } = await admin.from("monedas").select("codigo").eq("id",currencyId).maybeSingle();
      currency = currencyRow?.codigo || "ARS";
    }
    if (currency !== "ARS") {
      return NextResponse.json({ error: "MERCADOPAGO_MARKETPLACE_ONLY_ARS", detail:"Para operaciones en otra moneda se debe usar el medio bancario correspondiente." }, { status: 400 });
    }

    // Platform commission policy: USD 1 per metric tonne, converted to ARS
    // using the MEP sell quote. Obtain it server-side from two independent providers.
    if (!operation || !Number.isFinite(Number(operation.cantidad_tn)) || Number(operation.cantidad_tn) <= 0) {
      return NextResponse.json({ error: "OPERATION_TONNAGE_REQUIRED" }, { status: 409 });
    }

    let mepRate: number;
    let mepRateTimestamp: string;
    const mepSource = "DolarAPI";
    try {
      const [primaryResponse, secondaryResponse] = await Promise.all([
        fetch("https://dolarapi.com/v1/dolares/bolsa", { cache: "no-store", signal: AbortSignal.timeout(7000) }),
        fetch("https://monedapi.ar/api/v2/usd/bolsa", { cache: "no-store", signal: AbortSignal.timeout(7000) }),
      ]);
      if (!primaryResponse.ok || !secondaryResponse.ok) throw new Error("MEP_PROVIDER_UNAVAILABLE");
      const primary = await primaryResponse.json() as { venta?: number; fechaActualizacion?: string };
      const secondary = await secondaryResponse.json() as { sell?: number; lastScrapedAt?: string; updatedAt?: string; origin?: string };
      const primarySell = Number(primary.venta);
      const secondarySell = Number(secondary.sell);
      const primaryTimestamp = primary.fechaActualizacion;
      const secondaryTimestamp = secondary.lastScrapedAt || secondary.updatedAt;
      if (!Number.isFinite(primarySell) || primarySell <= 0 || !Number.isFinite(secondarySell) || secondarySell <= 0 || !primaryTimestamp || !secondaryTimestamp) {
        throw new Error("MEP_QUOTE_INVALID");
      }
      const now = Date.now();
      const primaryAge = now - Date.parse(primaryTimestamp);
      const secondaryAge = now - Date.parse(secondaryTimestamp);
      if (!Number.isFinite(primaryAge) || !Number.isFinite(secondaryAge) || primaryAge < -60_000 || secondaryAge < -60_000 || primaryAge > 30 * 60_000 || secondaryAge > 30 * 60_000) {
        throw new Error("MEP_QUOTE_STALE");
      }
      const divergence = Math.abs(primarySell - secondarySell) / Math.min(primarySell, secondarySell);
      if (divergence > 0.02) throw new Error("MEP_QUOTE_DIVERGENCE");
      mepRate = primarySell;
      mepRateTimestamp = primaryTimestamp;
    } catch {
      return NextResponse.json({
        error: "MEP_QUOTE_UNAVAILABLE_OR_UNVERIFIED",
        detail: "No se pudo verificar una cotización MEP vendedora reciente y consistente en dos fuentes. El cobro no se inició.",
      }, { status: 503 });
    }

    const platformCommissionUsd = Number(operation.cantidad_tn); // USD 1 per tonne
    const marketplaceFee = Math.round(platformCommissionUsd * mepRate * 100) / 100;
    if (!Number.isFinite(marketplaceFee) || marketplaceFee <= 0 || marketplaceFee >= amount) {
      return NextResponse.json({
        error: "MARKETPLACE_FEE_OUT_OF_RANGE",
        detail: "La comisión calculada con el MEP vendedor no puede ser igual o superior al importe del cobro.",
      }, { status: 409 });
    }

    const txId = crypto.randomUUID();
    const idempotencyKey = `agrobrokeria:${txId}`;
    const sellerAccessToken = await getSellerAccessToken(body.empresa_cobradora_id);
    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://agrobrokeria.online";

    const { error: txError } = await admin.from("transacciones_pago_externo").insert({
      id: txId,
      operacion_id: body.operacion_id || null,
      empresa_id: sellerConnection.empresa_id || null,
      proveedor: "MERCADOPAGO",
      ambiente: sellerConnection.live_mode ? "PRODUCCION" : "SANDBOX",
      idempotency_key: idempotencyKey,
      importe: amount,
      moneda_id: currencyId || null,
      estado: "PENDIENTE",
      provider_response: {
        empresa_pagadora_id: buyerCompanyId,
        empresa_cobradora_id: body.empresa_cobradora_id,
        marketplace_fee_ars: marketplaceFee,
        marketplace_fee_usd: platformCommissionUsd,
        platform_commission_usd_per_tonne: 1,
        mep_sell_ars: mepRate,
        mep_source: mepSource,
        mep_quoted_at: mepRateTimestamp,
        mep_policy: "USD_1_PER_TONNE_X_MEP_SELL",
      },
    });
    if (txError) throw txError;

    const response = await fetch(`${MERCADO_PAGO_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sellerAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        items: [{
          id: operation?.id || txId,
          title: body.titulo || `Operación ${operation?.codigo || txId.slice(0,8)}`,
          quantity: 1,
          unit_price: amount,
          currency_id: "ARS",
        }],
        marketplace_fee: marketplaceFee,
        external_reference: txId,
        notification_url: `${site}/api/pagos/mercadopago/webhook`,
        back_urls: {
          success: `${site}/pagos?mp=success&tx=${txId}`,
          pending: `${site}/pagos?mp=pending&tx=${txId}`,
          failure: `${site}/pagos?mp=failure&tx=${txId}`,
        },
        auto_return: "approved",
        payer: body.payer_email || profile.email ? { email: body.payer_email || profile.email } : undefined,
      }),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      await admin.from("transacciones_pago_externo").update({
        estado:"ERROR",
        error_code:String(data?.error || response.status),
        error_message:String(data?.message || "Mercado Pago rechazó la preferencia."),
        provider_response:data || {},
        actualizado_at:new Date().toISOString(),
      }).eq("id",txId);
      return NextResponse.json({ error:"MERCADOPAGO_PREFERENCE_ERROR", detail:data?.message || data?.error }, { status:502 });
    }

    await admin.from("transacciones_pago_externo").update({
      external_order_id: data.id || null,
      checkout_url: data.init_point || data.sandbox_init_point || null,
      estado:"INICIADO",
      provider_status:"created",
      provider_response:{
        ...data,
        empresa_pagadora_id: buyerCompanyId,
        empresa_cobradora_id: body.empresa_cobradora_id,
        marketplace_fee_ars: marketplaceFee,
        marketplace_fee_usd: platformCommissionUsd,
        platform_commission_usd_per_tonne: 1,
        mep_sell_ars: mepRate,
        mep_source: mepSource,
        mep_quoted_at: mepRateTimestamp,
        mep_policy: "USD_1_PER_TONNE_X_MEP_SELL",
      },
      actualizado_at:new Date().toISOString(),
    }).eq("id",txId);

    return NextResponse.json({ transaction_id:txId, preference_id:data.id, checkout_url:data.init_point || data.sandbox_init_point });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : "MERCADOPAGO_ERROR" }, { status:500 });
  }
}
