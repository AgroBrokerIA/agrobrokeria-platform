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
