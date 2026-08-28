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
  return supabase
    .from("publicaciones")
    .insert(publicacion)
    .select()
    .single();
}