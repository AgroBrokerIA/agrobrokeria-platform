import { supabase } from "@/lib/supabase/client";

type CrearNotificacionParams = {
  profileId: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  operacionId?: string | null;
  ofertaId?: string | null;
};

export async function crearNotificacion({
  profileId,
  titulo,
  mensaje,
  tipo,
  operacionId = null,
  ofertaId = null,
}: CrearNotificacionParams) {
  if (!profileId) {
    throw new Error(
      "No se puede crear una notificación sin profileId."
    );
  }

  const { data, error } = await supabase
    .from("notificaciones")
    .insert({
      profile_id: profileId,
      titulo,
      mensaje,
      tipo,
      operacion_id: operacionId,
      oferta_id: ofertaId,
      leida: false,
      creada_en: new Date().toISOString(),
      actualizado_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear la notificación: ${error.message}`
    );
  }

  return data;
}
