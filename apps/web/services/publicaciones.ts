import { supabase } from "@/lib/supabase/client";
import { Publicacion } from "@/types/publicacion";

export async function crearPublicacion(
  datos: Publicacion
) {
  return supabase
    .from("publicaciones")
    .insert(datos)
    .select()
    .single();
}

export async function obtenerPublicaciones() {
  return supabase
    .from("publicaciones")
    .select(`
      *,
      productos(nombre),
      empresas(razon_social)
    `)
    .order("creada_en", {
      ascending: false,
    });
}

export async function eliminarPublicacion(
  id: string
) {
  return supabase
    .from("publicaciones")
    .delete()
    .eq("id", id);
}

export async function actualizarPublicacion(
  id: string,
  datos: Partial<Publicacion>
) {
  return supabase
    .from("publicaciones")
    .update(datos)
    .eq("id", id)
    .select()
    .single();
}