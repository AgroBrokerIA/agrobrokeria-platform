-- Ensure operation payments use the contract currency.
create or replace function public.registrar_pago_operacion(
 p_operacion_id uuid,p_empresa_pagadora uuid,p_empresa_cobradora uuid,p_importe numeric,
 p_moneda_id integer,p_metodo_pago text,p_referencia text default null,p_comprobante text default null
) returns uuid language plpgsql security definer set search_path=public
as $function$
declare v_uid uuid:=auth.uid(); v_active_company uuid; v_admin boolean; v_total numeric; v_pagado numeric; v_id uuid; v_moneda integer;
begin
 if v_uid is null then raise exception 'Autenticación requerida'; end if;
 if p_importe is null or p_importe<=0 then raise exception 'El importe debe ser mayor a cero'; end if;
 if p_moneda_id is null then raise exception 'La moneda es obligatoria'; end if;
 if nullif(trim(p_metodo_pago),'') is null then raise exception 'El método de pago es obligatorio'; end if;
 if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación'; end if;
 select active_company_id into v_active_company from public.profiles where id=v_uid;
 if v_active_company is null or v_active_company not in (p_empresa_pagadora,p_empresa_cobradora) then raise exception 'La empresa activa no participa del pago'; end if;
 select exists(select 1 from public.company_users where profile_id=v_uid and company_id=v_active_company and activo=true and lower(rol::text) in ('administrador','admin')) into v_admin;
 if not v_admin then raise exception 'Se requiere rol administrador'; end if;
 if p_empresa_pagadora is not null and not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_pagadora) then raise exception 'Empresa pagadora no participa de la operación'; end if;
 if p_empresa_cobradora is not null and not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_cobradora) then raise exception 'Empresa cobradora no participa de la operación'; end if;
 select importe_total,moneda_id into v_total,v_moneda from public.operaciones where id=p_operacion_id for update;
 if v_total is null or v_total<=0 then raise exception 'Operación sin importe contractual válido'; end if;
 if v_moneda is null or p_moneda_id<>v_moneda then raise exception 'La moneda del pago no coincide con la moneda contractual'; end if;
 select coalesce(sum(importe),0) into v_pagado from public.pagos where operacion_id=p_operacion_id and moneda_id=p_moneda_id and estado in ('CONFIRMADO','PAGADO','COMPLETADO');
 if v_pagado+p_importe>v_total then raise exception 'El pago acumulado supera el importe contractual'; end if;
 if p_referencia is not null and exists(select 1 from public.pagos where operacion_id=p_operacion_id and comprobante=p_referencia) then
   select id into v_id from public.pagos where operacion_id=p_operacion_id and comprobante=p_referencia limit 1; return v_id;
 end if;
 insert into public.pagos(operacion_id,empresa_pagadora,empresa_cobradora,importe,moneda_id,metodo_pago,estado,comprobante,creado_en)
 values(p_operacion_id,p_empresa_pagadora,p_empresa_cobradora,p_importe,p_moneda_id,trim(p_metodo_pago),'PENDIENTE',coalesce(p_comprobante,p_referencia),now())
 returning id into v_id;
 return v_id;
end
$function$;
revoke all on function public.registrar_pago_operacion(uuid,uuid,uuid,numeric,integer,text,text,text) from public,anon;
grant execute on function public.registrar_pago_operacion(uuid,uuid,uuid,numeric,integer,text,text,text) to authenticated;
