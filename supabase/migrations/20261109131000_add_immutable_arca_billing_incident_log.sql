-- BLOQUE 43: append-only ARCA incident journal for fiscal rejections and integration failures.
CREATE TABLE IF NOT EXISTS public.factura_arca_incidentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id uuid NOT NULL REFERENCES public.facturas(id) ON DELETE RESTRICT,
  categoria text NOT NULL CHECK (categoria IN (
    'RECHAZO_FISCAL_RECEPTOR',
    'ERROR_TRANSITORIO_ARCA',
    'ERROR_CONFIGURACION',
    'REVISION_MANUAL'
  )),
  resultado_arca text,
  codigos_arca text[] NOT NULL DEFAULT '{}',
  mensajes_arca text[] NOT NULL DEFAULT '{}',
  detalle_tecnico text,
  intento integer NOT NULL DEFAULT 1 CHECK (intento > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS factura_arca_incidentes_factura_idx
  ON public.factura_arca_incidentes (factura_id, creado_at DESC);

ALTER TABLE public.factura_arca_incidentes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.factura_arca_incidentes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.factura_arca_incidentes TO service_role;

CREATE OR REPLACE FUNCTION public.bloquear_mutacion_incidente_arca()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'ARCA_INCIDENT_LOG_IS_APPEND_ONLY';
END;
$$;

REVOKE ALL ON FUNCTION public.bloquear_mutacion_incidente_arca()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_factura_arca_incidentes_append_only
  ON public.factura_arca_incidentes;

CREATE TRIGGER trg_factura_arca_incidentes_append_only
BEFORE UPDATE OR DELETE ON public.factura_arca_incidentes
FOR EACH ROW EXECUTE FUNCTION public.bloquear_mutacion_incidente_arca();

COMMENT ON TABLE public.factura_arca_incidentes IS
  'Registro append-only de rechazos fiscales y errores de integración ARCA. No suspende automáticamente cuentas comerciales.';
