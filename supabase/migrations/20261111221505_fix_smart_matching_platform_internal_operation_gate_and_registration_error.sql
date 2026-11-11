DO $migration$
DECLARE v_def text; v_old text; v_new text;
BEGIN
  v_def := pg_get_functiondef('public.guardar_control_comercial(uuid,jsonb)'::regprocedure);
  v_old := 'and cem.verified=true';
  v_new := 'and (cem.verified=true or cem.match_method=''platform_internal'')';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'CONTROL_COMERCIAL_MAPPING_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  EXECUTE v_def;

  v_def := pg_get_functiondef('public.calcular_smart_matches(uuid)'::regprocedure);
  v_old := 'same_product_ops int; currency_match boolean;';
  v_new := 'same_product_ops int; currency_match boolean; v_mapped_empresa uuid; counterpart_price numeric; counterpart_qty numeric; counterpart_count integer;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_DECLARATION_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := 'if auth.uid() is null then raise exception ''AUTH_REQUIRED''; end if;';
  v_new := 'if auth.uid() is null then raise exception ''AUTH_REQUIRED''; end if;
 select cem.empresa_id into v_mapped_empresa
 from public.profiles pr
 join public.company_empresa_map cem on cem.company_id=pr.active_company_id
 where pr.id=auth.uid() and (cem.verified=true or cem.match_method=''platform_internal'')
 order by cem.confidence desc nulls last limit 1;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_AUTH_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := '(v_publicacion.empresa_id is not null and cem.empresa_id=v_publicacion.empresa_id) or (v_publicacion.empresa_id is null and v_publicacion.publicador_profile_id=auth.uid() and cem.empresa_id=v_publicacion.intermediario_empresa_id)';
  v_new := '(v_publicacion.empresa_id is not null and cem.empresa_id=v_publicacion.empresa_id) or (v_publicacion.empresa_id is null and v_publicacion.publicador_profile_id=auth.uid() and cem.empresa_id=v_publicacion.intermediario_empresa_id) or (v_publicacion.empresa_id is null and v_publicacion.intermediario_empresa_id is null and v_publicacion.publicador_profile_id=auth.uid())';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_OWNERSHIP_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := 'where e.id<>coalesce(v_publicacion.intermediario_empresa_id,v_publicacion.empresa_id)';
  v_new := 'where e.id<>coalesce(v_publicacion.intermediario_empresa_id,v_publicacion.empresa_id,v_mapped_empresa)';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_EXCLUSION_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := 'and o.estado in (''ACEPTADA'',''CERRADA'',''FINALIZADA'')
     )
   )
 loop';
  v_new := 'and o.estado in (''ACEPTADA'',''CERRADA'',''FINALIZADA'')
     )
     or exists(
       select 1 from public.publicaciones other
       left join public.profiles other_profile on other_profile.id=other.publicador_profile_id
       left join public.company_empresa_map other_map on other_map.company_id=other_profile.active_company_id
         and (other_map.verified=true or other_map.match_method=''platform_internal'')
       where upper(trim(other.estado::text)) in (''PUBLICADA'',''ACTIVA'')
         and other.id<>v_publicacion.id
         and other.producto_id=v_publicacion.producto_id
         and (case when upper(v_publicacion.tipo) in (''VENTA'',''OFERTA'') then upper(trim(other.tipo::text)) in (''COMPRA'',''DEMANDA'') else upper(trim(other.tipo::text)) in (''VENTA'',''OFERTA'') end)
         and coalesce(other.intermediario_empresa_id,other.empresa_id,other_map.empresa_id)=e.id
     )
   )
 loop';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_COUNTERPART_CANDIDATE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := '   has_product:=exists(';
  v_new := '   select count(*)::integer,max(other.cantidad_tn),avg(other.precio_tn)
     into counterpart_count,counterpart_qty,counterpart_price
   from public.publicaciones other
   left join public.profiles other_profile on other_profile.id=other.publicador_profile_id
   left join public.company_empresa_map other_map on other_map.company_id=other_profile.active_company_id
     and (other_map.verified=true or other_map.match_method=''platform_internal'')
   where upper(trim(other.estado::text)) in (''PUBLICADA'',''ACTIVA'')
     and other.id<>v_publicacion.id
     and other.producto_id=v_publicacion.producto_id
     and (case when upper(v_publicacion.tipo) in (''VENTA'',''OFERTA'') then upper(trim(other.tipo::text)) in (''COMPRA'',''DEMANDA'') else upper(trim(other.tipo::text)) in (''VENTA'',''OFERTA'') end)
     and coalesce(other.intermediario_empresa_id,other.empresa_id,other_map.empresa_id)=c.company_id
     and (other.moneda_id is null or v_publicacion.moneda_id is null or other.moneda_id=v_publicacion.moneda_id);

   has_product:=counterpart_count>0 or exists(';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_COUNTERPART_SCORE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := '   elsif tons>=v_publicacion.cantidad_tn and v_publicacion.cantidad_tn>0 then
      qty_score:=100;';
  v_new := '   elsif counterpart_count>0 and counterpart_qty is not null and v_publicacion.cantidad_tn>0 then
      qty_score:=least(100,(counterpart_qty/v_publicacion.cantidad_tn)*100);
   elsif tons>=v_publicacion.cantidad_tn and v_publicacion.cantidad_tn>0 then
      qty_score:=100;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_QUANTITY_SCORE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);

  v_old := '   if v_publicacion.precio_tn is null then price_score:=50;
   elsif not currency_match then price_score:=50;
   elsif avg_price>=v_publicacion.precio_tn then price_score:=100;
   elsif v_publicacion.precio_tn>0 then price_score:=least(100,greatest(0,(avg_price/v_publicacion.precio_tn)*100));
   else price_score:=0;
   end if;';
  v_new := '   if v_publicacion.precio_tn is null then price_score:=50;
   elsif counterpart_count>0 and counterpart_price is not null then
     if upper(v_publicacion.tipo) in (''COMPRA'',''DEMANDA'') then
       if v_publicacion.precio_tn>=counterpart_price then price_score:=100;
       else price_score:=least(100,greatest(0,(v_publicacion.precio_tn/counterpart_price)*100)); end if;
     else
       if counterpart_price>=v_publicacion.precio_tn then price_score:=100;
       else price_score:=least(100,greatest(0,(counterpart_price/v_publicacion.precio_tn)*100)); end if;
     end if;
   elsif not currency_match then price_score:=50;
   elsif avg_price>=v_publicacion.precio_tn then price_score:=100;
   elsif v_publicacion.precio_tn>0 then price_score:=least(100,greatest(0,(avg_price/v_publicacion.precio_tn)*100));
   else price_score:=0;
   end if;';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_PRICE_SCORE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  EXECUTE v_def;

  v_def := pg_get_functiondef('public.listar_publicaciones_activas_oportunidades()'::regprocedure);
  v_old := '''intermediario_razon_social'',ei.razon_social,';
  v_new := '''intermediario_razon_social'',ei.razon_social,
        ''intermediario_empresa_id'',ei.id,';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'OPPORTUNITY_LIST_INTERMEDIARY_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  EXECUTE v_def;
END
$migration$;
