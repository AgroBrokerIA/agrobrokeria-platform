import { supabase } from "@/lib/supabase/client";
import { crearNotificacion } from "./crearNotificacion";

type NotificarOperacionParams = {
  operacionId: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  ofertaId?: string | null;
};

export async function notificarParticipantesOperacion({
  operacionId,
  titulo,
  mensaje,
  tipo,
  ofertaId = null,
}: NotificarOperacionParams) {
  const { data: participantes, error: errorParticipantes } =
    await supabase
      .from("operacion_participantes")
      .select("empresa_id")
      .eq("operacion_id", operacionId);

  if (errorParticipantes) {
    throw new Error(
      `No se pudieron obtener los participantes: ${errorParticipantes.message}`
    );
  }

  const empresasIds = [
    ...new Set(
      (participantes || [])
        .map((p) => p.empresa_id)
        .filter(Boolean)
    ),
  ];

  if (empresasIds.length === 0) {
    return [];
  }

  const { data: usuarios, error: errorUsuarios } =
    await supabase
      .from("company_users")
      .select("profile_id, company_id")
      .in("company_id", empresasIds)
      .eq("activo", true);

  if (errorUsuarios) {
    throw new Error(
      `No se pudieron obtener los usuarios participantes: ${errorUsuarios.message}`
    );
  }

  const usuariosUnicos = [
    ...new Map(
      (usuarios || [])
        .filter((usuario) => usuario.profile_id)
        .map((usuario) => [usuario.profile_id, usuario])
    ).values(),
  ];

  const resultados = [];

  for (const usuario of usuariosUnicos) {
    try {
      const resultado = await crearNotificacion({
        profileId: usuario.profile_id,
        titulo,
        mensaje,
        tipo,
        operacionId,
        ofertaId,
      });

      resultados.push(resultado);
    } catch (error) {
      console.error(
        `ERROR CREANDO NOTIFICACIÓN PARA ${usuario.profile_id}:`,
        error
      );
    }
  }

  return resultados;
}
