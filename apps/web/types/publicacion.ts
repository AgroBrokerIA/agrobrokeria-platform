export interface Publicacion {
  id?: string;

  empresa_id: string;

  tipo: "COMPRA" | "VENTA";

  producto_id: number;

  cantidad_tn: number;

  precio_tn: number;

  moneda_id: number;

  incoterm_id: number;

  provincia: string;

  localidad: string;

  puerto: string;

  calidad: string;

  humedad: number | null;

  proteina: number | null;

  observaciones: string;

  estado: "BORRADOR" | "PUBLICADA";

  creada_en?: string;

  actualizada_en?: string;
}