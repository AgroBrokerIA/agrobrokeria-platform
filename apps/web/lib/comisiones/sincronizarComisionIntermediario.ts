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
  if (!operacionId || !empresaIntermediariaId) {
    throw new Error("Faltan datos de la operación o empresa intermediaria.");
  }
  const valor = Number(valorComision);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("El valor de la comisión debe ser mayor a cero.");
  }

  const { data, error } = await supabase.rpc("sincronizar_comision_intermediario", {
    p_operacion_id: operacionId,
    p_empresa_intermediaria_id: empresaIntermediariaId,
    p_tipo_comision: tipoComision,
    p_valor_comision: valor,
    p_quien_abona: quienAbona,
    p_estado: estado,
    p_acuerdo_previo: acuerdoPrevio,
    p_detalle: detalle,
  });

  if (error) {
    throw new Error(`No se pudo sincronizar la comisión del intermediario: ${error.message}`);
  }
  return data;
}
