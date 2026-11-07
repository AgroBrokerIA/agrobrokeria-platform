export interface Publicacion {
  id?: string;

  empresa_id: string | null;

  /** Intermediario con legajo verificado que publica por cuenta de un cliente. */
  intermediario_empresa_id?: string | null;
  representado_razon_social?: string | null;
  representado_cuit?: string | null;
  representado_sisa_categoria?: string | null;

  /** Condiciones internacionales y especificaciones de calidad de la publicación. */
  base_precio_cbot?: boolean;
  premium_cbot?: number | null;
  humedad_maxima?: number | null;
  materia_extrana_maxima?: number | null;
  aflatoxinas_max_ppb?: number | null;
  proteina_minima?: number | null;
  granos_danados_maximos?: number | null;
  granos_quebrados_maximos?: number | null;
  instrumentos_pago_internacional?: string[];
  tipo_buque?: string | null;
  cantidad_envios?: number | null;
  toneladas_por_envio?: number | null;
  puerto_origen_destino?: string | null;
  pais_destino?: string | null;

  tipo: "COMPRA" | "VENTA";

  tipo_contrato?: "F1" | null;

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
