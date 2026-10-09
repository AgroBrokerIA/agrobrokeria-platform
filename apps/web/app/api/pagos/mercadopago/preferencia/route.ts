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

    // Fail closed unless the server-side fee conversion policy has been implemented.
    // This flag alone does not calculate a fee; do not enable it until a trusted FX
    // source and the USD/tonne-to-ARS business rule are implemented and reviewed.
    if (process.env.MP_MARKETPLACE_FEE_POLICY_CONFIGURED !== "true") {
      return NextResponse.json({
        error: "MARKETPLACE_FEE_POLICY_NOT_CONFIGURED",
        detail: "Los cobros por Mercado Pago quedan bloqueados hasta definir la conversión documentada de la comisión de plataforma de USD/tn a ARS.",
      }, { status: 409 });
    }

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

    let operation: { id:string; codigo:string; importe_total:number|null; moneda_id:number|null }|null = null;
    if (body.operacion_id) {
      const { data, error } = await admin.from("operaciones").select("id,codigo,importe_total,moneda_id").eq("id",body.operacion_id).single();
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
      },
      actualizado_at:new Date().toISOString(),
    }).eq("id",txId);

    return NextResponse.json({ transaction_id:txId, preference_id:data.id, checkout_url:data.init_point || data.sandbox_init_point });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : "MERCADOPAGO_ERROR" }, { status:500 });
  }
}
