import { supabase } from "@/lib/supabase/client";

type SincronizarParams = {
  operacionId: string;
  cantidadTn?: number;
  modalidadComercial?: string | null;
};

type OperacionComision = {
  id: string;
  subtotal: number;
  total: number;
  estado: string;
};

export async function sincronizarComisionAgroBrokerIA({
  operacionId,
  cantidadTn,
  modalidadComercial = null,
}: SincronizarParams): Promise<OperacionComision> {
  if (!operacionId) {
    throw new Error("Falta el ID de la operación.");
  }

  let tn = Number(cantidadTn ?? 0);

  if (!Number.isFinite(tn) || tn <= 0) {
    const { data: operacion, error: errorOperacion } = await supabase
      .from("operaciones")
      .select("cantidad_tn, modalidad_comercial")
      .eq("id", operacionId)
      .maybeSingle();

    if (errorOperacion) {
      throw new Error(
        `No se pudo obtener la cantidad de la operación: ${errorOperacion.message}`
      );
    }

    tn = Number(operacion?.cantidad_tn ?? 0);
    modalidadComercial =
      modalidadComercial ?? operacion?.modalidad_comercial ?? null;
  }

  if (!Number.isFinite(tn) || tn <= 0) {
    throw new Error(
      "La operación no tiene una cantidad válida para calcular la comisión."
    );
  }

  // Comisión oficial del sistema:
  // USD 1 por tonelada.
  const valorUnitario = 1;
  const subtotal = Math.round(tn * valorUnitario * 100) / 100;

  // El IVA se mantiene separado.
  // El tratamiento fiscal se determinará en el módulo fiscal.
  const ivaPorcentaje = 0;
  const ivaImporte = 0;
  const total = subtotal;

  const modalidad =
    modalidadComercial === "F1" || modalidadComercial === "F2"
      ? modalidadComercial
      : null;

  const { data: existente, error: errorExistente } = await supabase
    .from("operacion_comisiones")
    .select("id, subtotal, total, estado")
    .eq("operacion_id", operacionId)
    .eq("tipo_comision", "AGROBROKERIA")
    .maybeSingle();

  if (errorExistente) {
    throw new Error(
      `No se pudo consultar la comisión AgroBrokerIA: ${errorExistente.message}`
    );
  }

  const payload = {
    operacion_id: operacionId,
    empresa_id: null,
    profile_id: null,
    tipo_comision: "AGROBROKERIA",
    tipo_ganancia: "USD_TN",
    concepto: "Comisión AgroBrokerIA",
    modalidad_calculo: "USD_TN",
    cantidad_tn: tn,
    valor_unitario: valorUnitario,
    porcentaje: null,
    valor_base: tn,
    subtotal,
    moneda_id: 2,
    iva_porcentaje: ivaPorcentaje,
    iva_importe: ivaImporte,
    total,
    estado: "PENDIENTE",
    factura_estado: "NO_CORRESPONDE",
    saldo_pendiente: total,
    saldo_pagado: 0,
    observaciones: modalidad
      ? `Comisión automática del sistema. Modalidad comercial ${modalidad}.`
      : "Comisión automática del sistema.",
    actualizado_at: new Date().toISOString(),
  };

  let comision: OperacionComision;

  if (existente) {
    const { data, error } = await supabase
      .from("operacion_comisiones")
      .update(payload)
      .eq("id", existente.id)
      .select("id, subtotal, total, estado")
      .single();

    if (error) {
      throw new Error(
        `No se pudo actualizar la comisión AgroBrokerIA: ${error.message}`
      );
    }

    comision = data;
  } else {
    const { data, error } = await supabase
      .from("operacion_comisiones")
      .insert(payload)
      .select("id, subtotal, total, estado")
      .single();

    if (error) {
      throw new Error(
        `No se pudo crear la comisión AgroBrokerIA: ${error.message}`
      );
    }

    comision = data;
  }

  /*
   * Movimiento económico.
   *
   * Para evitar duplicaciones, primero comprobamos si ya existe
   * un movimiento para esta comisión con el concepto correspondiente.
   */
  const { data: movimientoExistente, error: errorMovimientoExistente } =
    await supabase
      .from("operacion_movimientos_economicos")
      .select("id")
      .eq("comision_id", comision.id)
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
        comision_id: comision.id,
        empresa_id: null,
        profile_id: null,
        tipo_movimiento: "COMISION_GENERADA",
        concepto: "Comisión AgroBrokerIA USD 1/TN",
        moneda_id: 2,
        importe: total,
        signo: 1,
        estado: "PENDIENTE",
        referencia: `COMISION-${comision.id}`,
        fecha_movimiento: new Date().toISOString(),
        actualizado_at: new Date().toISOString(),
      });

    if (errorMovimiento) {
      throw new Error(
        `La comisión fue registrada, pero no se pudo registrar el movimiento económico: ${errorMovimiento.message}`
      );
    }
  }

  return comision;
}
