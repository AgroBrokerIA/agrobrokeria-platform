-- BLOQUES 15-19: base multi-actor e intermediación externa para contratos formales.
-- Adaptado al esquema real de AgroBrokerIA: companies/empresas/publicaciones/contratos.
-- No se crean tablas ficticias usuarios_corporativos ni contratos_f1.

ALTER TYPE public.company_status ADD VALUE IF NOT EXISTS 'suspendido_comercial';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'cooperativa';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'corredor_oficial';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'comisionista_intermediario';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'productor';

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS tipo_operador text;
ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS empresas_tipo_operador_check;
ALTER TABLE public.empresas
  ADD CONSTRAINT empresas_tipo_operador_check
  CHECK (
    tipo_operador IS NULL OR tipo_operador IN (
      'productor','acopio','cooperativa','corredor_oficial',
      'comisionista_intermediario','exportador','transportista'
    )
  );

ALTER TABLE public.account_onboarding
  ADD COLUMN IF NOT EXISTS tipo_operador text;
ALTER TABLE public.account_onboarding
  DROP CONSTRAINT IF EXISTS account_onboarding_tipo_operador_check;
ALTER TABLE public.account_onboarding
  ADD CONSTRAINT account_onboarding_tipo_operador_check
  CHECK (
    tipo_operador IS NULL OR tipo_operador IN (
      'productor','acopio','cooperativa','corredor_oficial',
      'comisionista_intermediario','exportador','transportista'
    )
  );

ALTER TABLE public.publicaciones
  ADD COLUMN IF NOT EXISTS intermediario_empresa_id uuid
    REFERENCES public.empresas(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS representado_razon_social text,
  ADD COLUMN IF NOT EXISTS representado_cuit text,
  ADD COLUMN IF NOT EXISTS representado_sisa_categoria text;

ALTER TABLE public.publicaciones
  DROP CONSTRAINT IF EXISTS publicaciones_intermediacion_identidad_check;
ALTER TABLE public.publicaciones
  ADD CONSTRAINT publicaciones_intermediacion_identidad_check
  CHECK (
    (intermediario_empresa_id IS NULL
      AND representado_razon_social IS NULL
      AND representado_cuit IS NULL
      AND representado_sisa_categoria IS NULL)
    OR publicador_profile_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS publicaciones_intermediario_empresa_id_idx
  ON public.publicaciones(intermediario_empresa_id)
  WHERE intermediario_empresa_id IS NOT NULL;

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS intermediario_externo_empresa_id uuid
    REFERENCES public.empresas(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS intermediario_externo_nombre_snapshot text,
  ADD COLUMN IF NOT EXISTS intermediario_externo_cuit_snapshot text,
  ADD COLUMN IF NOT EXISTS pacto_comision_externa_declarada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intermediacion_externa_aviso_version text;

CREATE INDEX IF NOT EXISTS contratos_intermediario_externo_empresa_id_idx
  ON public.contratos(intermediario_externo_empresa_id)
  WHERE intermediario_externo_empresa_id IS NOT NULL;

COMMENT ON COLUMN public.contratos.intermediario_externo_empresa_id IS
  'Intermediario externo asociado al contrato formal; sus honorarios no son cobrados por AgroBrokerIA.';
COMMENT ON COLUMN public.contratos.pacto_comision_externa_declarada IS
  'Declaración de que las partes reconocen que cualquier honorario de intermediación externa se pacta y liquida fuera de AgroBrokerIA.';
COMMENT ON COLUMN public.publicaciones.intermediario_empresa_id IS
  'Empresa intermediaria que publica en representación de un cliente; no implica titularidad del grano.';
