export interface Publicacion {
  id?: string;

  empresa_id: string | null;

  /** Intermediario con legajo verificado que publica por cuenta de un cliente. */
  intermediario_empresa_id?: string | null;
  representado_razon_social?: string | null;
  representado_cuit?: string | null;
  representado_sisa_categoria?: string | null;

  tipo: "COMPRA" | "VENTA";

  tipo_contrato?: "F1" | "F2" | null;

  producto_id: number;

  cantidad_tn: number;

  precio_tn: number | null;

  moneda_id: number | null;

  incoterm_id: number | null;

  pais_id?: number | null;

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
