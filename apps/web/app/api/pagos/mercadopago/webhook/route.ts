import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSellerAccessToken, MERCADO_PAGO_API } from "@/lib/mercadopago/server";

export const runtime = "nodejs";

function validSignature(header: string|null, requestId: string|null, dataId: string|null) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !header || !requestId || !dataId) return false;
  const parts = Object.fromEntries(header.split(",").map((part) => {
    const [k,...v] = part.split("=");
    return [k.trim(), v.join("=").trim()];
  }));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${String(dataId || "").toLowerCase()};request-id:${requestId || ""};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a,b);
}

export async function POST(request: NextRequest) {
  const admin = getSupabaseAdmin();
  const dataId = request.nextUrl.searchParams.get("data.id");
  const type = request.nextUrl.searchParams.get("type") || "payment";
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");

  if (!validSignature(signature, requestId, dataId)) {
    return NextResponse.json({ error:"INVALID_SIGNATURE" }, { status:401 });
  }

  let body: any = {};
  try { body = await request.json(); } catch {}

  // Both environments are accepted for reconciliation; the transaction environment
  // determines whether the event may create an internal confirmed payment.
  if (typeof body?.live_mode !== "boolean") {
    return NextResponse.json({ error: "INVALID_EVENT_MODE" }, { status: 400 });
  }

  const eventId = body?.id ? String(body.id) : null;
  const { data: event, error: eventError } = await admin.from("eventos_pago_externo").insert({
    proveedor:"MERCADOPAGO",
    evento_id:eventId,
    tipo_evento:type,
    payload:body,
    firma_valida:true,
  }).select("id").maybeSingle();

  if (eventError && !String(eventError.message).toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error:"EVENT_STORE_FAILED" }, { status:500 });
  }

  if (type !== "payment" || !dataId) return NextResponse.json({ received:true });

  try {
    const mpUserId = body?.user_id ? String(body.user_id) : null;
    if (!mpUserId) return NextResponse.json({ received:true });

    const { data: connection } = await admin.from("mercadopago_conexiones")
      .select("company_id,empresa_id,mp_user_id").eq("mp_user_id",mpUserId).maybeSingle();
    if (!connection) return NextResponse.json({ received:true });

    const accessToken = await getSellerAccessToken(connection.company_id);
    const paymentResponse = await fetch(`${MERCADO_PAGO_API}/v1/payments/${encodeURIComponent(dataId)}`, {
      headers:{ Authorization:`Bearer ${accessToken}` },
      cache:"no-store",
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) throw new Error(payment?.message || "No se pudo consultar el pago.");

    const txId = payment.external_reference ? String(payment.external_reference) : null;
    let tx:any = null;
    if (txId) {
      const { data } = await admin.from("transacciones_pago_externo").select("*").eq("id",txId).maybeSingle();
      tx = data;
    }
    if (!tx) {
      const { data } = await admin.from("transacciones_pago_externo").select("*")
        .eq("proveedor","MERCADOPAGO").eq("external_payment_id",String(dataId)).maybeSingle();
      tx = data;
    }
    if (!tx) return NextResponse.json({ received:true, matched:false });

    // Reconcile the provider response against the original transaction before
    // changing any financial state. This prevents cross-account, test-mode,
    // wrong-currency, and amount-mismatch notifications from being recorded as paid.
    if (payment.live_mode !== (tx.ambiente === "PRODUCCION")) throw new Error("PAYMENT_ENVIRONMENT_MISMATCH");
    if (String(payment.collector_id || "") !== String(connection.mp_user_id)) {
      throw new Error("PAYMENT_COLLECTOR_MISMATCH");
    }
    if (String(payment.external_reference || "") !== String(tx.id)) {
      throw new Error("PAYMENT_REFERENCE_MISMATCH");
    }
    if (String(payment.currency_id || "") !== "ARS") {
      throw new Error("PAYMENT_CURRENCY_MISMATCH");
    }
    if (Math.abs(Number(payment.transaction_amount) - Number(tx.importe)) > 0.01) {
      throw new Error("PAYMENT_AMOUNT_MISMATCH");
    }

    await admin.from("eventos_pago_externo").update({
      transaccion_id:tx.id,
      procesado:false,
    }).eq("id",event?.id);

    const status = String(payment.status || "unknown").toUpperCase();
    const providerState = status === "APPROVED" ? "APROBADO" : status === "PENDING" || status === "IN_PROCESS" ? "PENDIENTE" : status === "REFUNDED" ? "DEVUELTO" : status === "CHARGED_BACK" ? "CONTRACARGO" : status === "CANCELLED" ? "CANCELADO" : status === "REJECTED" ? "RECHAZADO" : "PENDIENTE";
    await admin.from("transacciones_pago_externo").update({
      external_payment_id:String(payment.id),
      estado:providerState,
      provider_status:payment.status || null,
      provider_response:{
        ...payment,
        // Keep internal reconciliation metadata across webhook retries.
        empresa_pagadora_id: tx.provider_response?.empresa_pagadora_id || null,
        empresa_cobradora_id: tx.provider_response?.empresa_cobradora_id || null,
        marketplace_fee: tx.provider_response?.marketplace_fee || 0,
      },
      actualizado_at:new Date().toISOString(),
    }).eq("id",tx.id);

    if (status === "APPROVED" && tx.ambiente === "PRODUCCION" && tx.operacion_id && !tx.pago_id) {
      if (!connection.empresa_id) throw new Error("SELLER_COMPANY_MAPPING_MISSING");
      const meta = tx.provider_response || {};
      const buyerCompanyId = meta.empresa_pagadora_id as string|undefined;
      if (!buyerCompanyId) throw new Error("BUYER_COMPANY_MAPPING_MISSING");
      const { data: map, error: buyerMapError } = await admin.from("company_empresa_map")
        .select("empresa_id").eq("company_id",buyerCompanyId).maybeSingle();
      if (buyerMapError) throw buyerMapError;
      const payerEmpresaId = map?.empresa_id;
      if (!payerEmpresaId) throw new Error("BUYER_COMPANY_MAPPING_MISSING");
      const { data: existingPayment } = await admin.from("pagos").select("id").eq("operacion_id",tx.operacion_id).eq("comprobante",String(payment.id)).maybeSingle();
      let paymentId = existingPayment?.id as string|undefined;
      if (!paymentId) {
        const { data: inserted, error: insertError } = await admin.from("pagos").insert({
          operacion_id:tx.operacion_id,
          empresa_pagadora:payerEmpresaId,
          empresa_cobradora:connection.empresa_id,
          importe:Number(payment.transaction_amount || tx.importe),
          moneda_id:tx.moneda_id,
          metodo_pago:"MERCADOPAGO",
          estado:"CONFIRMADO",
          fecha_pago:payment.date_approved || payment.date_created || new Date().toISOString(),
          comprobante:String(payment.id),
        }).select("id").single();
        if (insertError) throw insertError;
        paymentId = inserted.id;
      }
      await admin.from("transacciones_pago_externo").update({ pago_id:paymentId, actualizado_at:new Date().toISOString() }).eq("id",tx.id);
    }

    await admin.from("eventos_pago_externo").update({ procesado:true, transaccion_id:tx.id }).eq("id",event?.id);
    return NextResponse.json({ received:true, processed:true });
  } catch (error) {
    if (event?.id) await admin.from("eventos_pago_externo").update({ procesado:false, error_message:error instanceof Error?error.message:"WEBHOOK_PROCESSING_ERROR" }).eq("id",event.id);
    return NextResponse.json({ received:true, processed:false }, { status:200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok:true, service:"mercadopago-webhook" });
}
