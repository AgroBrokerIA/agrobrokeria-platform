import { supabase } from "@/lib/supabase/client";

type SincronizarComisionIntermediarioParams = {
  operacionId: string;
  empresaIntermediariaId: string;
  tipoComision: string;
  valorComision: number;
  quienAbona: string;
  estado?: string;
  acuerdoPrevio?: boolean;
  detalle?: string | null;
};

export async function sincronizarComisionIntermediario({
  operacionId,
  empresaIntermediariaId,
  tipoComision,
  valorComision,
  quienAbona,
  estado = "PENDIENTE",
  acuerdoPrevio = false,
  detalle = null,
}: SincronizarComisionIntermediarioParams) {
  if (!operacionId) {
    throw new Error("Falta el ID de la operación.");
  }

  if (!empresaIntermediariaId) {
    throw new Error("Falta la empresa intermediaria.");
  }

  const valor = Number(valorComision);

  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("El valor de la comisión debe ser mayor a cero.");
  }

  /*
   * Obtener la cantidad de toneladas de la operación.
   * Para USD_TN la comisión económica total se calcula:
   *
   * valor por TN × cantidad de TN.
   */
  const { data: operacion, error: errorOperacion } = await supabase
    .from("operaciones")
    .select("id, cantidad_tn")
    .eq("id", operacionId)
    .single();

  if (errorOperacion || !operacion) {
    throw new Error(
      `No se pudo obtener la cantidad de la operación: ${
        errorOperacion?.message || "Operación inexistente."
      }`
    );
  }

  const cantidadTn = Number(operacion.cantidad_tn);

  if (!Number.isFinite(cantidadTn) || cantidadTn <= 0) {
    throw new Error(
      "La operación no tiene una cantidad de toneladas válida."
    );
  }

  /*
   * Buscamos la comisión comercial original.
   */
  const { data: comisionOriginal, error: errorComisionOriginal } =
    await supabase
      .from("comisiones_intermediarios")
      .select(
        "id, operacion_id, parte_operacion_id, tipo_comision, valor_comision, moneda, quien_abona, estado"
      )
      .eq("operacion_id", operacionId)
      .eq("tipo_comision", tipoComision)
      .eq("valor_comision", valor)
      .order("fecha_acuerdo", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (errorComisionOriginal) {
    throw new Error(
      `No se pudo localizar la comisión del intermediario: ${errorComisionOriginal.message}`
    );
  }

  /*
   * Identificamos el participante intermediario.
   */
  const { data: participante, error: errorParticipante } = await supabase
    .from("operacion_participantes")
    .select("id, empresa_id")
    .eq("operacion_id", operacionId)
    .eq("rol", "INTERMEDIARIO")
    .eq("empresa_id", empresaIntermediariaId)
    .maybeSingle();

  if (errorParticipante) {
    throw new Error(
      `No se pudo identificar al intermediario: ${errorParticipante.message}`
    );
  }

  if (!participante) {
    throw new Error(
      "La empresa intermediaria no está registrada como participante de la operación."
    );
  }

  const comisionIdOriginal = comisionOriginal?.id ?? null;

  /*
   * Cálculo económico definitivo.
   *
   * USD_TN:
   *   valor × toneladas
   *
   * PORCENTAJE y MONTO_FIJO:
   *   por ahora conservan el valor informado como importe,
   *   porque la base económica correspondiente se incorporará
   *   cuando se complete ese módulo específico.
   */
  let subtotal = valor;

  if (tipoComision === "USD_TN") {
    subtotal = valor * cantidadTn;
  }

  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    throw new Error("El importe total de la comisión no es válido.");
  }

  const estadoEconomico =
    estado === "ANULADA"
      ? "ANULADA"
      : estado === "DEVUELTA"
        ? "DEVUELTA"
        : estado === "ABONADA"
          ? "ABONADA"
          : "PENDIENTE";

  /*
   * Evitar duplicados.
   * La comisión económica se identifica por operación,
   * intermediario, tipo y valor unitario.
   */
  const { data: existente, error: errorExistente } = await supabase
    .from("operacion_comisiones")
    .select("id, subtotal, total, estado")
    .eq("operacion_id", operacionId)
    .eq("empresa_id", empresaIntermediariaId)
    .eq("tipo_comision", "INTERMEDIARIO")
    .eq("tipo_ganancia", "USD_TN")
    .eq("valor_unitario", valor)
    .maybeSingle();

  if (errorExistente) {
    throw new Error(
      `No se pudo verificar la comisión económica del intermediario: ${errorExistente.message}`
    );
  }

  const payload = {
    operacion_id: operacionId,
    empresa_id: empresaIntermediariaId,
    profile_id: null,
    tipo_comision: "INTERMEDIARIO",
    tipo_ganancia: "USD_TN",
    concepto: `Comisión intermediario — ${tipoComision}`,
    modalidad_calculo: tipoComision,
    cantidad_tn: tipoComision === "USD_TN" ? cantidadTn : null,
    valor_unitario: valor,
    porcentaje: tipoComision === "PORCENTAJE" ? valor : null,
    valor_base: null,
    subtotal,
    moneda_id: 2,
    iva_porcentaje: 0,
    iva_importe: 0,
    total: subtotal,
    estado: estadoEconomico,
    factura_estado: "NO_CORRESPONDE",
    saldo_pendiente: estadoEconomico === "ABONADA" ? 0 : subtotal,
    saldo_pagado: estadoEconomico === "ABONADA" ? subtotal : 0,
    observaciones:
      [
        quienAbona ? `Abona: ${quienAbona}.` : "",
        acuerdoPrevio ? "Acuerdo previo." : "",
        detalle || "",
        `Cantidad operación: ${cantidadTn} TN.`,
        tipoComision === "USD_TN"
          ? `Cálculo: USD ${valor}/TN × ${cantidadTn} TN = USD ${subtotal}.`
          : "",
        comisionIdOriginal
          ? `Comisión comercial vinculada: ${comisionIdOriginal}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ") || null,
    actualizado_at: new Date().toISOString(),
  };

  let comisionEconomica;

  if (existente) {
    const { data, error } = await supabase
      .from("operacion_comisiones")
      .update(payload)
      .eq("id", existente.id)
      .select("id, subtotal, total, estado")
      .single();

    if (error) {
      throw new Error(
        `No se pudo actualizar la comisión económica del intermediario: ${error.message}`
      );
    }

    comisionEconomica = data;
  } else {
    const { data, error } = await supabase
      .from("operacion_comisiones")
      .insert(payload)
      .select("id, subtotal, total, estado")
      .single();

    if (error) {
      throw new Error(
        `No se pudo crear la comisión económica del intermediario: ${error.message}`
      );
    }

    comisionEconomica = data;
  }

  /*
   * Registrar movimiento económico.
   */
  const referencia = `INTERMEDIARIO-${comisionEconomica.id}`;

  const { data: movimientoExistente, error: errorMovimientoExistente } =
    await supabase
      .from("operacion_movimientos_economicos")
      .select("id")
      .eq("comision_id", comisionEconomica.id)
      .eq("tipo_movimiento", "COMISION_GENERADA")
      .maybeSingle();

  if (errorMovimientoExistente) {
    throw new Error(
      `No se pudo verificar el movimiento económico: ${errorMovimientoExistente.message}`
    );
  }

  if (!movimientoExistente) {
    const { error: errorMovimiento } = await supabase
      .from("operacion_movimientos_economicos")
      .insert({
        operacion_id: operacionId,
        comision_id: comisionEconomica.id,
        empresa_id: empresaIntermediariaId,
        profile_id: null,
        tipo_movimiento: "COMISION_GENERADA",
        concepto: `Comisión intermediario — ${tipoComision}`,
        moneda_id: 2,
        importe: subtotal,
        signo: 1,
        estado: estadoEconomico,
        referencia,
        fecha_movimiento: new Date().toISOString(),
        actualizado_at: new Date().toISOString(),
      });

    if (errorMovimiento) {
      throw new Error(
        `La comisión fue registrada, pero no se pudo registrar el movimiento económico: ${errorMovimiento.message}`
      );
    }
  }

  return comisionEconomica;
}
