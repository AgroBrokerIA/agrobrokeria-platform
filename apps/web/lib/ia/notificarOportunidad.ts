import { supabase } from "@/lib/supabase/client";

export async function notificarOportunidadIA(
  empresaId: string,
  publicacionId: string,
  puntaje: number
) {
  const { data: usuarios, error } = await supabase
    .from("company_users")
    .select("profile_id")
    .eq("company_id", empresaId)
    .eq("activo", true);

  if (error) {
    throw new Error(
      `No se pudieron obtener los usuarios de la empresa: ${error.message}`
    );
  }

  let notificadas = 0;

  for (const usuario of usuarios ?? []) {
    if (!usuario.profile_id) continue;

    const { error: notificacionError } =
      await supabase.rpc("crear_notificacion_ia", {
        p_profile_id: usuario.profile_id,
        p_publicacion_id: publicacionId,
        p_titulo: "Nueva oportunidad detectada por IA",
        p_mensaje:
          `AgroBroker IA encontró una publicación compatible con tu empresa. ` +
          `Índice de compatibilidad: ${puntaje}%.`,
        p_tipo: "OPORTUNIDAD_IA",
      });

    if (notificacionError) {
      throw new Error(
        `No se pudo crear la notificación IA: ${notificacionError.message}`
      );
    }

    notificadas++;
  }

  return { notificadas };
}
