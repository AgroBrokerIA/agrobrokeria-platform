-- Ensure COMEX drafts are issued by the correct side and contain a complete immutable operation snapshot.
create or replace function public.crear_documento_comex_borrador(
  p_operacion_id uuid,
  p_tipo_documento text default 'LOI',
  p_idioma text default null,
  p_membrete text default 'empresa'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_empresa_id uuid;
  v_op public.operaciones%rowtype;
  v_buy public.publicaciones%rowtype;
  v_sell public.publicaciones%rowtype;
  v_lang text;
  v_doc_id uuid;
  v_snapshot jsonb;
  v_currency_code text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_tipo_documento not in ('LOI','SCO','FCO','KYC_LEGAJO') then
    raise exception 'INVALID_DOCUMENT_TYPE';
  end if;
  if coalesce(p_idioma,'es') not in ('es','en','pt','zh','zh-CN','fr','it','ru','hi') then
    raise exception 'INVALID_LANGUAGE';
  end if;
  if coalesce(p_membrete,'empresa') not in ('empresa','neutro') then
    raise exception 'INVALID_LETTERHEAD';
  end if;
  if not public.usuario_participa_operacion(p_operacion_id) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_op from public.operaciones where id=p_operacion_id;
  if not found then raise exception 'OPERATION_NOT_FOUND'; end if;

  -- LOI must be issued by the buyer. SCO and FCO must be issued by the seller.
  if p_tipo_documento='LOI' then
    select op.empresa_id into v_empresa_id
    from public.operacion_participantes op
    where op.operacion_id=p_operacion_id
      and upper(op.rol) in ('COMPRADOR','BUYER')
      and public.usuario_es_miembro_empresa(op.empresa_id)
    order by op.creada_en
    limit 1;
  elsif p_tipo_documento in ('SCO','FCO') then
    select op.empresa_id into v_empresa_id
    from public.operacion_participantes op
    where op.operacion_id=p_operacion_id
      and upper(op.rol) in ('VENDEDOR','SELLER')
      and public.usuario_es_miembro_empresa(op.empresa_id)
    order by op.creada_en
    limit 1;
  else
    select op.empresa_id into v_empresa_id
    from public.operacion_participantes op
    where op.operacion_id=p_operacion_id
      and public.usuario_es_miembro_empresa(op.empresa_id)
    order by case upper(op.rol)
      when 'VENDEDOR' then 1 when 'SELLER' then 1
      when 'COMPRADOR' then 2 when 'BUYER' then 2 else 3 end,
      op.creada_en
    limit 1;
  end if;
  if v_empresa_id is null then
    if p_tipo_documento='LOI' then raise exception 'BUYER_MEMBERSHIP_REQUIRED'; end if;
    if p_tipo_documento in ('SCO','FCO') then raise exception 'SELLER_MEMBERSHIP_REQUIRED'; end if;
    raise exception 'COMPANY_MEMBERSHIP_REQUIRED';
  end if;

  select * into v_buy from public.publicaciones where id=v_op.publicacion_compra_id;
  select * into v_sell from public.publicaciones where id=v_op.publicacion_venta_id;
  if v_buy.id is null or v_sell.id is null then
    raise exception 'BUYER_SELLER_PUBLICATIONS_REQUIRED';
  end if;
  select codigo into v_currency_code from public.monedas where id=v_op.moneda_id;

  select coalesce(nullif(p_idioma,''),p.idioma_preferido,'es')
  into v_lang
  from public.profiles p where p.id=auth.uid();
  v_lang:=coalesce(v_lang,'es');

  select jsonb_build_object(
    'operation_code',v_op.codigo,
    'operation_id',v_op.id,
    'date_issued',current_date,
    'commodity',pr.nombre,
    'total_quantity_mt',v_op.cantidad_tn,
    'price_per_mt',v_op.precio_tn,
    'total_value',v_op.importe_total,
    'currency_id',v_op.moneda_id,
    'currency_code',coalesce(v_currency_code,'USD'),
    'buyer_company_id',v_buy.empresa_id,
    'seller_company_id',v_sell.empresa_id,
    'issuer_company_id',v_empresa_id,
    'issuer_role',case when p_tipo_documento='LOI' then 'BUYER' when p_tipo_documento in ('SCO','FCO') then 'SELLER' else 'PARTICIPANT' end,
    'buyer_reason_social',coalesce(v_buy.representado_razon_social,eb.razon_social),
    'buyer_cuit_tax_id',coalesce(v_buy.representado_cuit,eb.cuit),
    'buyer_sisa_category',v_buy.representado_sisa_categoria,
    'seller_reason_social',coalesce(v_sell.representado_razon_social,es.razon_social),
    'seller_cuit_tax_id',coalesce(v_sell.representado_cuit,es.cuit),
    'seller_sisa_category',v_sell.representado_sisa_categoria,
    'incoterm',inc.codigo,
    'port_of_origin',coalesce(v_sell.puerto,v_sell.puerto_origen_destino),
    'port_of_destination',coalesce(v_buy.puerto,v_buy.puerto_origen_destino),
    'destination_country',coalesce(v_buy.pais_destino,eb.pais),
    'origin_country','Argentina',
    'moisture_max',coalesce(v_sell.humedad_maxima,v_sell.humedad),
    'foreign_matter_max',v_sell.materia_extrana_maxima,
    'damaged_grains_max',v_sell.granos_danados_maximos,
    'aflatoxins_max_ppb',v_sell.aflatoxinas_max_ppb,
    'protein_min',coalesce(v_sell.proteina_minima,v_sell.proteina),
    'payment_instruments',to_jsonb(v_sell.instrumentos_pago_internacional),
    'price_method',case when v_sell.base_precio_cbot then 'CBOT + premium solicitado' else 'Precio negociado entre las partes' end,
    'cbot_premium',v_sell.premium_cbot,
    'shipping_schedule',v_sell.cantidad_envios,
    'vessel_type',v_sell.tipo_buque,
    'tons_per_shipment',v_sell.toneladas_por_envio,
    'delivery_window_start',v_sell.fecha_disponible,
    'delivery_window_end',v_sell.fecha_vencimiento,
    'offer_expiry_date',v_sell.fecha_vencimiento,
    'validity_days',15,
    'source_publication_id',v_sell.id,
    'buyer_publication_id',v_buy.id,
    'seller_publication_id',v_sell.id,
    'generated_from_snapshot',true,
    'snapshot_created_at',now()
  ) into v_snapshot
  from public.productos pr
  left join public.empresas eb on eb.id=v_buy.empresa_id
  left join public.empresas es on es.id=v_sell.empresa_id
  left join public.incoterms inc on inc.id=coalesce(v_op.incoterm_id,v_sell.incoterm_id,v_buy.incoterm_id)
  where pr.id=coalesce(v_sell.producto_id,v_buy.producto_id);

  if v_snapshot is null then
    raise exception 'OPERATION_SNAPSHOT_INCOMPLETE';
  end if;

  insert into public.documentos_comex(
    operacion_id,contrato_id,publicacion_id,empresa_id,tipo_documento,
    idioma_origen,idioma_generado,membrete_tipo,datos_inmutables,creado_por,estado
  )
  values(
    p_operacion_id,
    (select c.id from public.contratos c where c.operacion_id=p_operacion_id order by c.creado_en desc limit 1),
    coalesce(v_sell.id,v_buy.id),
    v_empresa_id,
    p_tipo_documento,
    v_lang,
    v_lang,
    p_membrete,
    v_snapshot,
    auth.uid(),
    'BORRADOR'
  )
  returning id into v_doc_id;

  return v_doc_id;
end;
$$;

revoke all on function public.crear_documento_comex_borrador(uuid,text,text,text) from public,anon;
grant execute on function public.crear_documento_comex_borrador(uuid,text,text,text) to authenticated;
