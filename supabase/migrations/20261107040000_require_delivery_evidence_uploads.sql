-- Store evidence files for both delivery confirmations and make evidence mandatory server-side.
ALTER TABLE public.viajes
  ADD COLUMN IF NOT EXISTS transportista_entrega_evidencia_path text,
  ADD COLUMN IF NOT EXISTS productor_recepcion_evidencia_path text;

DO $$
DECLARE v_def text; v_old text; v_new text;
BEGIN
  v_def := pg_get_functiondef('public.confirmar_entrega_transportista(uuid,numeric,text)'::regprocedure);
  v_old := 'CREATE OR REPLACE FUNCTION public.confirmar_entrega_transportista(p_viaje_id uuid, p_kilos_entregados numeric, p_observaciones text DEFAULT NULL::text)';
  v_new := 'CREATE OR REPLACE FUNCTION public.confirmar_entrega_transportista(p_viaje_id uuid, p_kilos_entregados numeric, p_observaciones text DEFAULT NULL::text, p_evidencia_path text DEFAULT NULL::text)';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'CARRIER_FUNCTION_SIGNATURE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := '  IF v_v.transportista_entrega_confirmada_at IS NOT NULL THEN';
  v_new := '  IF nullif(trim(coalesce(p_evidencia_path,'''')),'''') IS NULL THEN RAISE EXCEPTION ''DELIVERY_EVIDENCE_REQUIRED''; END IF;'||chr(10)||
    '  IF p_evidencia_path NOT LIKE v_v.operacion_id::text||''/logistica/''||p_viaje_id::text||''/entrega/''||v_uid::text||''-%'' OR NOT EXISTS (SELECT 1 FROM storage.objects so WHERE so.bucket_id=''documentos-operacion'' AND so.name=p_evidencia_path AND so.owner_id::text=v_uid::text) THEN RAISE EXCEPTION ''INVALID_DELIVERY_EVIDENCE''; END IF;'||chr(10)||v_old;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'CARRIER_EVIDENCE_GUARD_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := '      transportista_kilos_entregados=p_kilos_entregados,';
  v_new := '      transportista_kilos_entregados=p_kilos_entregados,'||chr(10)||'      transportista_entrega_evidencia_path=p_evidencia_path,';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'CARRIER_EVIDENCE_UPDATE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  DROP FUNCTION public.confirmar_entrega_transportista(uuid,numeric,text);
  EXECUTE v_def;

  v_def := pg_get_functiondef('public.confirmar_recepcion_productor(uuid,numeric,boolean,text)'::regprocedure);
  v_old := 'CREATE OR REPLACE FUNCTION public.confirmar_recepcion_productor(p_viaje_id uuid, p_kilos_recibidos numeric, p_confirmar boolean, p_observaciones text DEFAULT NULL::text)';
  v_new := 'CREATE OR REPLACE FUNCTION public.confirmar_recepcion_productor(p_viaje_id uuid, p_kilos_recibidos numeric, p_confirmar boolean, p_observaciones text DEFAULT NULL::text, p_evidencia_path text DEFAULT NULL::text)';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PRODUCER_FUNCTION_SIGNATURE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := '  IF v_v.transportista_entrega_confirmada_at IS NULL THEN';
  v_new := '  IF nullif(trim(coalesce(p_evidencia_path,'''')),'''') IS NULL THEN RAISE EXCEPTION ''RECEIPT_EVIDENCE_REQUIRED''; END IF;'||chr(10)||
    '  IF p_evidencia_path NOT LIKE v_v.operacion_id::text||''/logistica/''||p_viaje_id::text||''/recepcion/''||v_uid::text||''-%'' OR NOT EXISTS (SELECT 1 FROM storage.objects so WHERE so.bucket_id=''documentos-operacion'' AND so.name=p_evidencia_path AND so.owner_id::text=v_uid::text) THEN RAISE EXCEPTION ''INVALID_RECEIPT_EVIDENCE''; END IF;'||chr(10)||v_old;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PRODUCER_EVIDENCE_GUARD_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := '    SET productor_kilos_recibidos=p_kilos_recibidos,';
  v_new := '    SET productor_kilos_recibidos=p_kilos_recibidos,'||chr(10)||'        productor_recepcion_evidencia_path=p_evidencia_path,';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PRODUCER_INCIDENT_EVIDENCE_UPDATE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := '      productor_kilos_recibidos=p_kilos_recibidos,';
  v_new := '      productor_kilos_recibidos=p_kilos_recibidos,'||chr(10)||'      productor_recepcion_evidencia_path=p_evidencia_path,';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'PRODUCER_CONFIRM_EVIDENCE_UPDATE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  DROP FUNCTION public.confirmar_recepcion_productor(uuid,numeric,boolean,text);
  EXECUTE v_def;
END $$;

REVOKE ALL ON FUNCTION public.confirmar_entrega_transportista(uuid,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_entrega_transportista(uuid,numeric,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.confirmar_recepcion_productor(uuid,numeric,boolean,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_recepcion_productor(uuid,numeric,boolean,text,text) TO authenticated;