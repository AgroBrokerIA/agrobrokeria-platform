-- Bloque 18: vincular al contrato al intermediario que ya participa en la operación.
CREATE OR REPLACE FUNCTION public.sincronizar_intermediario_externo_contrato()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=public,pg_temp
AS $$
DECLARE
  v_empresa_id uuid;
  v_razon_social text;
  v_cuit text;
  v_payload jsonb := '{}'::jsonb;
BEGIN
  IF NEW.contenido IS NOT NULL THEN
    BEGIN
      v_payload := NEW.contenido::jsonb;
    EXCEPTION WHEN others THEN
      v_payload := '{}'::jsonb;
    END;
  END IF;

  SELECT p.empresa_id,e.razon_social,e.cuit
    INTO v_empresa_id,v_razon_social,v_cuit
  FROM public.operacion_participantes p
  JOIN public.empresas e ON e.id=p.empresa_id
  WHERE p.operacion_id=NEW.operacion_id
    AND upper(trim(coalesce(p.rol,''))) IN ('INTERMEDIARIO','COMISIONISTA','COMISIONISTA_INTERMEDIARIO','CORREDOR','CORREDOR_OFICIAL')
  ORDER BY p.creada_en
  LIMIT 1;

  IF v_empresa_id IS NOT NULL THEN
    NEW.intermediario_externo_empresa_id := v_empresa_id;
    NEW.intermediario_externo_nombre_snapshot := coalesce(v_razon_social,NEW.intermediario_externo_nombre_snapshot);
    NEW.intermediario_externo_cuit_snapshot := coalesce(v_cuit,NEW.intermediario_externo_cuit_snapshot);
    NEW.pacto_comision_externa_declarada := true;
    NEW.intermediacion_externa_aviso_version := '1.0';
  ELSIF NEW.intermediario_externo_empresa_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.operacion_participantes p
      WHERE p.operacion_id=NEW.operacion_id
        AND p.empresa_id=NEW.intermediario_externo_empresa_id
        AND upper(trim(coalesce(p.rol,''))) IN ('INTERMEDIARIO','COMISIONISTA','COMISIONISTA_INTERMEDIARIO','CORREDOR','CORREDOR_OFICIAL')
    ) THEN
      RAISE EXCEPTION 'INTERMEDIARIO_NO_ES_PARTICIPANTE_DE_LA_OPERACION';
    END IF;
  END IF;

  IF coalesce(v_payload->>'intermediario','') <> '' AND NEW.intermediario_externo_nombre_snapshot IS NULL THEN
    NEW.intermediario_externo_nombre_snapshot := left(trim(v_payload->>'intermediario'),255);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contratos_sincronizar_intermediario_externo ON public.contratos;
CREATE TRIGGER contratos_sincronizar_intermediario_externo
BEFORE INSERT OR UPDATE OF operacion_id,contenido,intermediario_externo_empresa_id
ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_intermediario_externo_contrato();

REVOKE ALL ON FUNCTION public.sincronizar_intermediario_externo_contrato() FROM PUBLIC,anon,authenticated;
