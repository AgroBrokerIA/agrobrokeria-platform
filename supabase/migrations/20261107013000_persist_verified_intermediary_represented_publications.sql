-- Bloque 16: ampliar guardar_publicacion preservando las validaciones y controles actuales.
DO $migration$
DECLARE
  v_def text := pg_get_functiondef('public.guardar_publicacion(uuid,jsonb)'::regprocedure);
BEGIN
  v_def := replace(v_def,
    'v_pais integer:=nullif(p_datos->>''pais_id'','''')::integer;',
    'v_pais integer:=nullif(p_datos->>''pais_id'','''')::integer;
 v_intermediario_empresa uuid:=nullif(p_datos->>''intermediario_empresa_id'','''')::uuid;
 v_representado_nombre text:=nullif(trim(p_datos->>''representado_razon_social''),'''');
 v_representado_cuit text:=nullif(regexp_replace(coalesce(p_datos->>''representado_cuit'',''''),''[^0-9]'','''',''g''),'''');
 v_representado_sisa text:=nullif(trim(p_datos->>''representado_sisa_categoria''),'''');');
  v_def := replace(v_def, 'if p_publicacion_id is null then',
$insert$
 if v_intermediario_empresa is null and
    (position('intermediario' in v_tipo_usuario)>0
     or position('comisionista' in v_tipo_usuario)>0
     or position('corredor' in v_tipo_usuario)>0) then
   select cem.empresa_id into v_intermediario_empresa
   from public.company_empresa_map cem
   join public.company_users cu on cu.company_id=cem.company_id
   where cem.company_id=v_company and cem.verified=true
     and cu.profile_id=v_uid and cu.activo=true
   order by cem.created_at nulls last limit 1;
 end if;
 if v_intermediario_empresa is not null then
   if v_company is null or not exists (
     select 1 from public.company_empresa_map cem
     join public.company_users cu on cu.company_id=cem.company_id
     where cem.company_id=v_company and cem.empresa_id=v_intermediario_empresa
       and cem.verified=true and cu.profile_id=v_uid and cu.activo=true
   ) then raise exception 'INTERMEDIARIO_EMPRESA_NO_AUTORIZADA'; end if;
   if not exists (
     select 1 from public.empresas e where e.id=v_intermediario_empresa and e.activa=true
       and (e.tipo_operador in ('corredor_oficial','comisionista_intermediario')
         or upper(coalesce(e.tipo_empresa,'')) in ('BROKER','INTERMEDIARIO'))
   ) then raise exception 'LEGAJO_INTERMEDIARIO_NO_VALIDADO'; end if;
   if v_representado_nombre is null or v_representado_cuit !~ '^[0-9]{11}$' then
     raise exception 'DATOS_REPRESENTADO_INCOMPLETOS';
   end if;
 elsif v_representado_nombre is not null or v_representado_cuit is not null or v_representado_sisa is not null then
   raise exception 'INTERMEDIARIO_REQUERIDO_PARA_REPRESENTACION';
 end if;
 if p_publicacion_id is null then
$insert$);
  v_def := replace(v_def,
    'insert into public.publicaciones(empresa_id,publicador_profile_id,tipo,producto_id,cantidad_tn,precio_tn,moneda_id,incoterm_id,pais_id,provincia,localidad,puerto,calidad,humedad,proteina,observaciones,estado,puertos,lugares_recepcion)',
    'insert into public.publicaciones(empresa_id,publicador_profile_id,intermediario_empresa_id,representado_razon_social,representado_cuit,representado_sisa_categoria,tipo,producto_id,cantidad_tn,precio_tn,moneda_id,incoterm_id,pais_id,provincia,localidad,puerto,calidad,humedad,proteina,observaciones,estado,puertos,lugares_recepcion)');
  v_def := replace(v_def,
    'values(v_empresa,v_uid,p_datos->>''tipo''',
    'values(v_empresa,v_uid,v_intermediario_empresa,v_representado_nombre,v_representado_cuit,v_representado_sisa,p_datos->>''tipo''');
  v_def := replace(v_def,
    'update public.publicaciones set tipo=p_datos->>''tipo''',
    'update public.publicaciones set intermediario_empresa_id=v_intermediario_empresa,representado_razon_social=v_representado_nombre,representado_cuit=v_representado_cuit,representado_sisa_categoria=v_representado_sisa,tipo=p_datos->>''tipo''');
  EXECUTE v_def;
END
$migration$;
