-- Resolve company ownership through the publisher's active company when listing company_id is null.
CREATE OR REPLACE FUNCTION public.contactar_por_oportunidad(p_publicacion_compra_id uuid,p_publicacion_venta_id uuid,p_mensaje text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE v_profile uuid:=auth.uid(); v_company uuid; v_sender_empresa uuid; v_sender_directory uuid; v_buy_empresa uuid; v_sell_empresa uuid; v_target_empresa uuid; v_target_directory uuid; v_id uuid; v_target_profile uuid; v_buy public.publicaciones%rowtype; v_sell public.publicaciones%rowtype;
BEGIN
 IF v_profile IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF length(trim(coalesce(p_mensaje,'')))<10 OR length(p_mensaje)>2000 THEN RAISE EXCEPTION 'MESSAGE_LENGTH_INVALID'; END IF;
 SELECT active_company_id INTO v_company FROM public.profiles WHERE id=v_profile;
 IF v_company IS NULL OR NOT EXISTS(SELECT 1 FROM public.company_users WHERE profile_id=v_profile AND company_id=v_company AND activo=true) THEN RAISE EXCEPTION 'ACTIVE_MEMBERSHIP_REQUIRED'; END IF;
 SELECT m.empresa_id,m.company_id INTO v_sender_empresa,v_sender_directory FROM public.company_empresa_map m JOIN public.empresas e ON e.id=m.empresa_id AND e.activa=true WHERE m.company_id=v_company LIMIT 1;
 IF v_sender_empresa IS NULL THEN RAISE EXCEPTION 'SENDER_COMPANY_NOT_MAPPED'; END IF;
 SELECT * INTO v_buy FROM public.publicaciones WHERE id=p_publicacion_compra_id AND estado IN ('ACTIVA','PUBLICADA','ACTIVO') FOR SHARE;
 SELECT * INTO v_sell FROM public.publicaciones WHERE id=p_publicacion_venta_id AND estado IN ('ACTIVA','PUBLICADA','ACTIVO') FOR SHARE;
 IF v_buy.id IS NULL OR v_sell.id IS NULL THEN RAISE EXCEPTION 'PUBLICATION_NOT_AVAILABLE'; END IF;
 IF upper(v_buy.tipo) NOT IN ('COMPRA','DEMANDA') OR upper(v_sell.tipo) NOT IN ('VENTA','OFERTA') THEN RAISE EXCEPTION 'PUBLICATION_TYPE_MISMATCH'; END IF;
 IF v_buy.producto_id IS DISTINCT FROM v_sell.producto_id THEN RAISE EXCEPTION 'PRODUCT_MISMATCH'; END IF;
 IF v_buy.moneda_id IS NOT NULL AND v_sell.moneda_id IS NOT NULL AND v_buy.moneda_id<>v_sell.moneda_id THEN RAISE EXCEPTION 'CURRENCY_MISMATCH'; END IF;
 SELECT coalesce(v_buy.empresa_id,v_buy.intermediario_empresa_id,cem.empresa_id) INTO v_buy_empresa FROM public.profiles pr LEFT JOIN public.company_empresa_map cem ON cem.company_id=pr.active_company_id WHERE pr.id=v_buy.publicador_profile_id;
 SELECT coalesce(v_sell.empresa_id,v_sell.intermediario_empresa_id,cem.empresa_id) INTO v_sell_empresa FROM public.profiles pr LEFT JOIN public.company_empresa_map cem ON cem.company_id=pr.active_company_id WHERE pr.id=v_sell.publicador_profile_id;
 IF v_buy_empresa IS NULL OR v_sell_empresa IS NULL THEN RAISE EXCEPTION 'PUBLICATION_COMPANY_NOT_MAPPED'; END IF;
 IF v_buy_empresa=v_sell_empresa THEN RAISE EXCEPTION 'SAME_COMPANY_NOT_ALLOWED'; END IF;
 IF v_sender_empresa=v_buy_empresa THEN v_target_empresa:=v_sell_empresa; ELSIF v_sender_empresa=v_sell_empresa THEN v_target_empresa:=v_buy_empresa; ELSE RAISE EXCEPTION 'SENDER_NOT_PARTICIPANT_IN_OPPORTUNITY'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.empresas WHERE id=v_target_empresa AND activa=true) THEN RAISE EXCEPTION 'TARGET_COMPANY_INACTIVE'; END IF;
 SELECT company_id INTO v_target_directory FROM public.company_empresa_map WHERE empresa_id=v_target_empresa ORDER BY verified DESC NULLS LAST LIMIT 1;
 IF v_target_directory IS NULL THEN RAISE EXCEPTION 'TARGET_COMPANY_NOT_MAPPED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.company_users WHERE company_id=v_target_directory AND activo=true) THEN RAISE EXCEPTION 'TARGET_COMPANY_HAS_NO_ACTIVE_USERS'; END IF;
 INSERT INTO public.solicitudes_oportunidad(publicacion_compra_id,publicacion_venta_id,remitente_profile_id,remitente_company_id,destinatario_company_id,mensaje)
 VALUES(p_publicacion_compra_id,p_publicacion_venta_id,v_profile,v_sender_directory,v_target_directory,trim(p_mensaje))
 ON CONFLICT(publicacion_compra_id,publicacion_venta_id,remitente_company_id) DO UPDATE SET mensaje=excluded.mensaje,estado='PENDIENTE',actualizado_at=now()
 RETURNING id INTO v_id;
 FOR v_target_profile IN SELECT profile_id FROM public.company_users WHERE company_id=v_target_directory AND activo=true AND profile_id<>v_profile LOOP
  INSERT INTO public.notificaciones(profile_id,titulo,mensaje,tipo,leida,creada_en,actualizado_at)
  VALUES(v_target_profile,'Nueva consulta por oportunidad','Una empresa quiere contactar por una oportunidad comercial. Revisá la solicitud para responder.','OPORTUNIDAD_CONTACTO',false,now(),now());
 END LOOP;
 RETURN v_id;
END; $function$;
REVOKE ALL ON FUNCTION public.contactar_por_oportunidad(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.contactar_por_oportunidad(uuid,uuid,text) TO authenticated;