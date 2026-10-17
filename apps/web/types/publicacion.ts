export interface Publicacion {
  id?: string;

  empresa_id: string;

  tipo: "COMPRA" | "VENTA";

  producto_id: number;

  cantidad_tn: number;

  precio_tn: number | null;

  moneda_id: number | null;

  incoterm_id: number | null;

  provincia: string | null;

  localidad: string | null;

  puerto: string | null;

  /** Puertos alternativos donde puede realizarse la recepción/entrega. */
  puertos?: string[];

  /** Tipos de lugares habilitados para la recepción/entrega. */
  lugares_recepcion?: string[];

  calidad: string;

  humedad: number | null;

  proteina: number | null;

  observaciones: string;

  estado: "BORRADOR" | "PUBLICADA";

  creada_en?: string;

  actualizada_en?: string;
}
