-- Resolve the active Companies entity to the legacy Empresas row before creating an invoice.
-- facturas.empresa_id references public.empresas; arca_company_config.company_id references public.companies.
create or replace function public.crear_solicitud_factura(
  p_operacion_id uuid,
  p_empresa_receptor_id uuid,
  p_tipo_comprobante_codigo integer,
  p_punto_venta integer,
  p_importe_neto numeric,
  p_importe_iva numeric,
  p_fecha_emision date default current_date,
  p_fecha_vencimiento date default null,
  p_condicion_iva_receptor integer default null,
  p_doc_tipo_receptor integer default null,
  p_iva_alicuota numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid;
  v_empresa_id uuid;
  v_contrato uuid;
  v_producto integer;
  v_cantidad numeric;
  v_moneda integer;
  v_total numeric;
  v_id uuid;
  v_issuer public.empresas%rowtype;
  v_receiver public.empresas%rowtype;
  v_key text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_tipo_comprobante_codigo not in (1,6,11,51) then raise exception 'INVALID_COMPROBANTE_TYPE'; end if;
  if p_punto_venta is null or p_punto_venta<1 then raise exception 'PUNTO_VENTA_REQUIRED'; end if;
  if p_importe_neto is null or p_importe_neto<=0 then raise exception 'NET_AMOUNT_REQUIRED'; end if;
  if coalesce(p_importe_iva,0)<0 then raise exception 'IVA_INVALID'; end if;
  if coalesce(p_importe_iva,0)>0 and (p_iva_alicuota is null or p_iva_alicuota<=0) then raise exception 'IVA_RATE_REQUIRED'; end if;
  if p_doc_tipo_receptor is null or p_doc_tipo_receptor<=0 then raise exception 'DOC_TYPE_REQUIRED'; end if;

  select active_company_id into v_company_id from public.profiles where id=v_uid;
  if v_company_id is null or not public.usuario_es_miembro_empresa(v_company_id) then
    raise exception 'ACTIVE_COMPANY_REQUIRED';
  end if;

  select m.empresa_id into v_empresa_id
  from public.company_empresa_map m
  where m.company_id=v_company_id
  order by m.verified desc nulls last
  limit 1;

  if v_empresa_id is null and exists(select 1 from public.empresas e where e.id=v_company_id) then
    v_empresa_id:=v_company_id;
  end if;
  if v_empresa_id is null then raise exception 'COMPANY_LEGACY_ENTITY_MAPPING_REQUIRED'; end if;

  if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'FORBIDDEN'; end if;
  select id into v_contrato from public.contratos where operacion_id=p_operacion_id and estado='CONFIRMADO' limit 1;
  if v_contrato is null then raise exception 'CONFIRMED_CONTRACT_REQUIRED'; end if;

  if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=v_empresa_id) then
    raise exception 'ISSUER_NOT_PARTICIPANT';
  end if;
  if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_receptor_id) then
    raise exception 'RECEIVER_NOT_PARTICIPANT';
  end if;
  if p_empresa_receptor_id=v_empresa_id then raise exception 'RECEIVER_MUST_DIFFER_FROM_ISSUER'; end if;

  select cantidad_tn,moneda_id into v_cantidad,v_moneda from public.operaciones where id=p_operacion_id;
  select * into v_issuer from public.empresas where id=v_empresa_id;
  select * into v_receiver from public.empresas where id=p_empresa_receptor_id;
  if v_issuer.id is null or nullif(btrim(v_issuer.cuit),'') is null then raise exception 'ISSUER_FISCAL_DATA_REQUIRED'; end if;
  if v_receiver.id is null or nullif(btrim(v_receiver.cuit),'') is null then raise exception 'RECEIVER_FISCAL_DATA_REQUIRED'; end if;

  select producto_id into v_producto
  from public.publicaciones
  where id in (
    (select publicacion_venta_id from public.operaciones where id=p_operacion_id)
    union all
    (select publicacion_compra_id from public.operaciones where id=p_operacion_id)
  ) and producto_id is not null
  limit 1;

  v_total:=round(p_importe_neto+coalesce(p_importe_iva,0),2);
  v_key:=encode(digest(concat_ws('|',p_operacion_id::text,v_empresa_id::text,p_empresa_receptor_id::text,p_tipo_comprobante_codigo::text,p_punto_venta::text,p_importe_neto::text,p_importe_iva::text,p_fecha_emision::text),'sha256'),'hex');

  select id into v_id from public.facturas where arca_attempt_key=v_key and estado not in ('ANULADA','RECHAZADA') limit 1;
  if v_id is not null then return v_id; end if;
  select id into v_id from public.facturas where operacion_id=p_operacion_id and empresa_id=v_empresa_id and estado in('PENDIENTE_ARCA','PENDIENTE','PENDIENTE_RECONCILIACION') limit 1;
  if v_id is not null then return v_id; end if;

  insert into public.facturas(
    operacion_id,empresa_id,contrato_id,empresa_receptor_id,producto_id,cantidad_tn,
    tipo_factura,tipo_comprobante_codigo,punto_venta,importe,importe_neto,importe_iva,
    importe_total,moneda_id,fecha_emision,fecha_vencimiento,estado,cuit_emisor,cuit_receptor,
    razon_social_emisor,razon_social_receptor,condicion_iva_receptor,doc_tipo_receptor,
    iva_alicuota,arca_attempt_key,usuario_responsable,creada_en,actualizada_en
  )
  values(
    p_operacion_id,v_empresa_id,v_contrato,p_empresa_receptor_id,v_producto,v_cantidad,
    case p_tipo_comprobante_codigo when 1 then 'A' when 6 then 'B' when 11 then 'C' when 51 then 'M' end,
    p_tipo_comprobante_codigo,p_punto_venta,p_importe_neto,p_importe_neto,p_importe_iva,
    v_total,v_moneda,p_fecha_emision,p_fecha_vencimiento,'PENDIENTE_ARCA',v_issuer.cuit,
    v_receiver.cuit,v_issuer.razon_social,v_receiver.razon_social,p_condicion_iva_receptor,
    p_doc_tipo_receptor,p_iva_alicuota,v_key,v_uid,now(),now()
  ) returning id into v_id;

  insert into public.factura_eventos(factura_id,actor_profile_id,evento,metadata)
  values(v_id,v_uid,'SOLICITADA_ARCA',jsonb_build_object('tipo_comprobante',p_tipo_comprobante_codigo,'punto_venta',p_punto_venta,'attempt_key',v_key,'company_id',v_company_id,'empresa_id',v_empresa_id));

  return v_id;
end;
$function$;
