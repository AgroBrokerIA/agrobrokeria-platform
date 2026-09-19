import { supabase } from "@/lib/supabase/client";
import { Publicacion } from "@/types/publicacion";

export async function obtenerProductos() {
  return supabase
    .from("productos")
    .select("*")
    .eq("activo", true)
    .order("nombre");
}

export async function obtenerMonedas() {
  return supabase
    .from("monedas")
    .select("*")
    .order("codigo");
}

export async function obtenerIncoterms() {
  return supabase
    .from("incoterms")
    .select("*")
    .order("codigo");
}

export async function crearPublicacion(
  publicacion: Publicacion
) {
  const { data, error } = await supabase
    .from("publicaciones")
    .insert(publicacion)
    .select()
    .single();

  if (error || !data) {
    return { data, error };
  }

  void (async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.error("No se pudo iniciar IA: no hay sesión activa.");
      return;
    }

    await fetch("/api/ia/procesar-publicacion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        publicacionId: data.id,
      }),
    });
  })().catch((iaError) => {
    console.error(
      "Error iniciando procesamiento IA:",
      iaError
    );
  });

  return { data, error: null };
}
