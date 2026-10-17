-- Role-specific requirements and aggregate verification state.
-- Keep the overall verified badge separate from a single successful ARCA CUIT lookup.
-- Every required check for the participant's role must be complete before a company is marked verified.

UPDATE public.verificacion_requisitos_catalogo
SET nombre='CUIT y constancia fiscal'
WHERE tipo_empresa IN ('ACOPIO','COOPERATIVA','EXPORTADOR','LOGISTICA')
  AND codigo='IDENTIDAD_FISCAL';

INSERT INTO public.verificacion_requisitos_catalogo(tipo_empresa,codigo,nombre,obligatorio,fuente,descripcion)
VALUES
 ('ACOPIO','DOCUMENTACION_SOCIETARIA','Documentación societaria/constitutiva',true,'Registro público / documentación oficial','La consulta de CUIT de ARCA no acredita la documentación constitutiva.'),
 ('COOPERATIVA','DOCUMENTACION_SOCIETARIA','Documentación societaria y vigencia de la cooperativa',true,'INAES / organismo competente','La consulta de CUIT de ARCA no acredita la vigencia institucional.'),
 ('EXPORTADOR','DOCUMENTACION_SOCIETARIA','Documentación societaria/constitutiva',true,'Registro público / documentación oficial','Validación separada de la constancia fiscal.'),
 ('ACOPIO','REGISTRO_SECTORIAL','Registro sectorial aplicable (RUCA u organismo competente)',false,'RUCA / organismo competente','Validar aplicabilidad según actividad, producto y normativa vigente.'),
 ('BROKER','REGISTRO_SECTORIAL','Registro sectorial aplicable (RUCA u organismo competente)',false,'RUCA / organismo competente','Validar aplicabilidad según actividad y normativa vigente.'),
 ('CORREDOR','REGISTRO_SECTORIAL','Registro sectorial aplicable (RUCA u organismo competente)',false,'RUCA / organismo competente','Validar aplicabilidad según actividad y jurisdicción.'),
 ('COOPERATIVA','REGISTRO_SECTORIAL','Registro sectorial aplicable (RUCA u organismo competente)',false,'RUCA / organismo competente','Validar aplicabilidad según actividad y normativa vigente.'),
 ('EXPORTADOR','REGISTRO_SECTORIAL','Registro sectorial aplicable (RUCA u organismo competente)',false,'RUCA / organismo competente','Validar aplicabilidad según actividad y normativa vigente.'),
 ('INTERMEDIARIO','REGISTRO_SECTORIAL','Registro sectorial aplicable (RUCA u organismo competente)',false,'RUCA / organismo competente','Validar aplicabilidad según actividad y normativa vigente.')
ON CONFLICT(tipo_empresa,codigo) DO NOTHING;

INSERT INTO public.empresas_verificacion_requisitos(empresa_id,requisito_id,estado)
SELECT e.id,r.id,'PENDIENTE'
FROM public.empresas e
JOIN public.verificacion_requisitos_catalogo r ON r.tipo_empresa=upper(e.tipo_empresa)
WHERE r.obligatorio=true
ON CONFLICT(empresa_id,requisito_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.recalcular_verificacion_empresa(p_empresa_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_role text; v_has_required boolean; v_complete boolean;
BEGIN
  SELECT upper(tipo_empresa) INTO v_role FROM public.empresas WHERE id=p_empresa_id;
  IF v_role IS NULL THEN RETURN; END IF;
  SELECT EXISTS(SELECT 1 FROM public.verificacion_requisitos_catalogo WHERE tipo_empresa=v_role AND obligatorio=true)
  INTO v_has_required;
  SELECT NOT EXISTS(
    SELECT 1
    FROM public.verificacion_requisitos_catalogo r
    LEFT JOIN public.empresas_verificacion_requisitos er
      ON er.requisito_id=r.id AND er.empresa_id=p_empresa_id
    WHERE r.tipo_empresa=v_role AND r.obligatorio=true
      AND (er.id IS NULL OR er.estado NOT IN ('VERIFICADO','NO_APLICA'))
  ) INTO v_complete;
  UPDATE public.empresas SET verificada=(v_has_required AND v_complete),actualizado_en=now()
  WHERE id=p_empresa_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalcular_verificacion_empresa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    PERFORM public.recalcular_verificacion_empresa(OLD.empresa_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalcular_verificacion_empresa(NEW.empresa_id);
  IF TG_OP='UPDATE' AND OLD.empresa_id IS DISTINCT FROM NEW.empresa_id THEN
    PERFORM public.recalcular_verificacion_empresa(OLD.empresa_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalcular_verificacion_empresa ON public.empresas_verificacion_requisitos;
CREATE TRIGGER trg_recalcular_verificacion_empresa
AFTER INSERT OR UPDATE OF estado,empresa_id OR DELETE
ON public.empresas_verificacion_requisitos
FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_verificacion_empresa();

REVOKE ALL ON FUNCTION public.recalcular_verificacion_empresa(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.trg_recalcular_verificacion_empresa() FROM PUBLIC,anon,authenticated;

DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT id FROM public.empresas LOOP
    PERFORM public.recalcular_verificacion_empresa(item.id);
  END LOOP;
END;
$$;
