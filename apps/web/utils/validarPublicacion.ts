import { Publicacion } from "@/types/publicacion";

export function validarPublicacion(
  p: Partial<Publicacion>
) {
  if (!p.producto_id)
    return "Debe seleccionar un producto.";

  if (!p.cantidad_tn || p.cantidad_tn <= 0)
    return "Cantidad inválida.";

  if (!p.precio_tn || p.precio_tn <= 0)
    return "Precio inválido.";

  if (!p.provincia)
    return "Debe indicar una provincia.";

  if (!p.puerto)
    return "Debe indicar un puerto.";

  return null;
}