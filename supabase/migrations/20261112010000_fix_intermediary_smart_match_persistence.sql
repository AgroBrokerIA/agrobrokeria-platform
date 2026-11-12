DO $migration$
DECLARE v_def text; v_old text; v_new text;
BEGIN
  v_def := pg_get_functiondef('public.procesar_smart_match_publicacion(uuid)'::regprocedure);
  v_old := $old$
 -- Las publicaciones independientes de intermediarios/comisionistas no tienen
 -- empresa vendedora asociada; no deben romperse al disparar Smart Match.
 if v_owner is null then
   if exists (
     select 1 from public.publicaciones p
     join public.profiles pr on pr.id = p.publicador_profile_id
     where p.id = p_publicacion_id
       and (
         position('intermediario' in lower(coalesce(pr.tipo_usuario,''))) > 0
         or position('comisionista' in lower(coalesce(pr.tipo_usuario,''))) > 0
       )
   ) then
     return;
   end if;
   raise exception 'PUBLICATION_OWNER_REQUIRED';
 end if;
 select active_company_id into v_active from public.profiles where id=auth.uid();
 if v_active is null or not exists(select 1 from public.company_empresa_map where company_id=v_active and empresa_id=v_owner and (verified=true or match_method='platform_internal')) then raise exception 'FORBIDDEN'; end if;
$old$;
  v_new := $new$
 select active_company_id into v_active from public.profiles where id=auth.uid();
 if v_active is null or not exists (
   select 1
   from public.publicaciones p
   join public.company_empresa_map cem on cem.company_id=v_active
   where p.id=p_publicacion_id
     and (
       (p.empresa_id is not null and cem.empresa_id=p.empresa_id)
       or (p.intermediario_empresa_id is not null and cem.empresa_id=p.intermediario_empresa_id)
       or (p.empresa_id is null and p.intermediario_empresa_id is null
           and p.publicador_profile_id=auth.uid()
           and cem.match_method='platform_internal')
     )
     and (cem.verified=true or cem.match_method='platform_internal')
 ) then
   raise exception 'FORBIDDEN';
 end if;
$new$;
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_INTERMEDIARY_GATE_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  v_old := 'join public.company_empresa_map cem on cem.empresa_id=mc.empresa_id and cem.verified=true';
  v_new := 'join public.company_empresa_map cem on cem.empresa_id=mc.empresa_id and (cem.verified=true or cem.match_method=''platform_internal'')';
  IF position(v_old in v_def)=0 THEN RAISE EXCEPTION 'SMART_MATCH_CANDIDATE_MAP_ANCHOR_NOT_FOUND'; END IF;
  v_def := replace(v_def,v_old,v_new);
  EXECUTE v_def;
END
$migration$;
