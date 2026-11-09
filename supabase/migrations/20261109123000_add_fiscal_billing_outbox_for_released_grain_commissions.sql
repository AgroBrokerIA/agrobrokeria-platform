-- BLOQUE 43 foundation: durable, idempotent billing outbox for released grain commissions.
-- This migration intentionally queues billing work; it does NOT issue invoices until
-- issuer, payer/receiver, ARS conversion and point-of-sale configuration are validated.

CREATE TABLE IF NOT EXISTS public.facturacion_eventos_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento text NOT NULL CHECK (tipo_evento IN (
    'COMISION_GRANOS_LIBERADA',
    'COMISION_LOGISTICA_LIBERADA'
  )),
  tabla_origen text NOT NULL,
  registro_origen_id uuid NOT NULL,
  operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE RESTRICT,
  clave_idempotencia text NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'REQUIERE_CONFIGURACION' CHECK (estado IN (
    'REQUIERE_CONFIGURACION',
    'PENDIENTE',
    'PROCESANDO',
    'AUTORIZADA',
    'RECHAZADA',
    'ERROR_INTEGRACION',
    'CANCELADA'
  )),
  moneda_origen text,
  importe_origen numeric(20,6),
  cantidad_tn numeric(20,6),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  intentos integer NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  proximo_intento_at timestamptz,
  ultimo_error_codigo text,
  ultimo_error_mensaje text,
  factura_id uuid REFERENCES public.facturas(id) ON DELETE RESTRICT,
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now(),
  procesado_at timestamptz,
  CONSTRAINT facturacion_outbox_source_unique UNIQUE (tabla_origen, registro_origen_id, tipo_evento)
);

CREATE INDEX IF NOT EXISTS facturacion_outbox_dispatch_idx
  ON public.facturacion_eventos_outbox (estado, proximo_intento_at, creado_at)
  WHERE estado IN ('PENDIENTE', 'ERROR_INTEGRACION');

CREATE INDEX IF NOT EXISTS facturacion_outbox_operation_idx
  ON public.facturacion_eventos_outbox (operacion_id, creado_at DESC);

ALTER TABLE public.facturacion_eventos_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.facturacion_eventos_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.facturacion_eventos_outbox TO service_role;

COMMENT ON TABLE public.facturacion_eventos_outbox IS
  'Outbox transaccional e idempotente para eventos de facturación. No emite comprobantes por sí sola.';

CREATE OR REPLACE FUNCTION public.encolar_factura_comision_granos_liberada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.tipo_comision <> 'PLATAFORMA'
     OR NEW.origen_comision <> 'AGROBROKER_IA'
     OR NEW.estado <> 'LIBERADA'
     OR OLD.estado IS NOT DISTINCT FROM NEW.estado THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.facturacion_eventos_outbox (
    tipo_evento,
    tabla_origen,
    registro_origen_id,
    operacion_id,
    clave_idempotencia,
    estado,
    moneda_origen,
    importe_origen,
    cantidad_tn,
    payload
  )
  VALUES (
    'COMISION_GRANOS_LIBERADA',
    'operacion_comisiones',
    NEW.id,
    NEW.operacion_id,
    'grain-commission-release:' || NEW.id::text,
    'REQUIERE_CONFIGURACION',
    'USD',
    COALESCE(NEW.total, NEW.subtotal, 0),
    COALESCE(NEW.cantidad_tn, 0),
    jsonb_build_object(
      'comision_id', NEW.id,
      'operacion_id', NEW.operacion_id,
      'origen_comision', NEW.origen_comision,
      'tipo_comision', NEW.tipo_comision,
      'cantidad_tn', COALESCE(NEW.cantidad_tn, 0),
      'valor_unitario_usd_tn', COALESCE(NEW.valor_unitario, 1),
      'importe_comision_usd', COALESCE(NEW.total, NEW.subtotal, 0),
      'concepto_template',
        'Servicios tecnológicos de intermediación y corretaje digital de granos - Operación N° {{codigo_operacion}} - Contrato Formal F1 de fecha {{fecha_contrato}}. Volumen: {{toneladas}} TN de {{producto_nombre}}.',
      'requiere_definir_emisor_y_receptor', true,
      'requiere_tipo_cambio_ars', true,
      'requiere_punto_venta_fiscal', true
    )
  )
  ON CONFLICT (clave_idempotencia) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.encolar_factura_comision_granos_liberada()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_encolar_factura_comision_granos_liberada
  ON public.operacion_comisiones;

CREATE TRIGGER trg_encolar_factura_comision_granos_liberada
AFTER UPDATE OF estado ON public.operacion_comisiones
FOR EACH ROW
WHEN (NEW.estado = 'LIBERADA' AND OLD.estado IS DISTINCT FROM NEW.estado)
EXECUTE FUNCTION public.encolar_factura_comision_granos_liberada();
