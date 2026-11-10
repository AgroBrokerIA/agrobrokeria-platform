-- Registrar pagos reportados por miembros activos de las empresas participantes.
-- El estado queda PENDIENTE hasta conciliación; no confirma automáticamente el cobro.
create or replace function public.registrar_pago_operacion(
 p_operacion_id uuid,p_empresa_pagadora uuid,p_empresa_cobradora uuid,p_importe numeric,p_moneda_id integer,p_metodo_pago text,p_referencia text default null,p_comprobante text default null
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_company_id uuid;v_empresa_activa uuid;v_total numeric;v_pagado numeric;v_id uuid;v_moneda integer;
begin
 if v_uid is null then raise exception 'Autenticación requerida'; end if;
 if p_importe is null or p_importe<=0 then raise exception 'El importe debe ser mayor a cero'; end if;
 if p_moneda_id is null then raise exception 'La moneda es obligatoria'; end if;
 if nullif(trim(p_metodo_pago),'') is null then raise exception 'El método de pago es obligatorio'; end if;
 select active_company_id into v_company_id from public.profiles where id=v_uid;
 if v_company_id is null then raise exception 'No hay una empresa activa'; end if;
 if not exists(select 1 from public.company_users where profile_id=v_uid and company_id=v_company_id and activo=true) then raise exception 'MEMBRESIA_EMPRESA_REQUERIDA'; end if;
 select cem.empresa_id into v_empresa_activa from public.company_empresa_map cem join public.empresas e on e.id=cem.empresa_id and e.activa=true where cem.company_id=v_company_id order by cem.verified desc,cem.created_at asc limit 1;
 if v_empresa_activa is null and exists(select 1 from public.empresas where id=v_company_id and activa=true) then v_empresa_activa:=v_company_id; end if;
 if v_empresa_activa is null then raise exception 'EMPRESA_COMERCIAL_NO_VINCULADA'; end if;
 if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación'; end if;
 if v_empresa_activa not in (p_empresa_pagadora,p_empresa_cobradora) then raise exception 'La empresa activa no participa del pago'; end if;
 if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_pagadora and upper(rol) in ('COMPRADOR','BUYER')) then raise exception 'La empresa pagadora debe ser el comprador de la operación'; end if;
 if not exists(select 1 from public.operacion_participantes where operacion_id=p_operacion_id and empresa_id=p_empresa_cobradora and upper(rol) in ('VENDEDOR','SELLER')) then raise exception 'La empresa cobradora debe ser el vendedor de la operación'; end if;
 select importe_total,moneda_id into v_total,v_moneda from public.operaciones where id=p_operacion_id for update;
 if v_total is null or v_total<=0 then raise exception 'Operación sin importe contractual válido'; end if;
 if v_moneda is null or p_moneda_id<>v_moneda then raise exception 'La moneda del pago no coincide con la moneda contractual'; end if;
 select coalesce(sum(importe),0) into v_pagado from public.pagos where operacion_id=p_operacion_id and moneda_id=p_moneda_id and estado not in ('RECHAZADO','CANCELADO','ANULADO');
 if v_pagado+p_importe>v_total then raise exception 'El pago acumulado supera el importe contractual'; end if;
 if nullif(trim(coalesce(p_referencia,'')),'') is not null and exists(select 1 from public.pagos where operacion_id=p_operacion_id and comprobante=trim(p_referencia)) then
  select id into v_id from public.pagos where operacion_id=p_operacion_id and comprobante=trim(p_referencia) limit 1; return v_id;
 end if;
 insert into public.pagos(operacion_id,empresa_pagadora,empresa_cobradora,importe,moneda_id,metodo_pago,estado,comprobante,creado_en)
 values(p_operacion_id,p_empresa_pagadora,p_empresa_cobradora,p_importe,p_moneda_id,trim(p_metodo_pago),'PENDIENTE',coalesce(nullif(trim(p_comprobante),''),nullif(trim(p_referencia),'')),now())
 returning id into v_id;
 insert into public.auditoria(cuenta_id,tabla,registro_id,accion,descripcion,dispositivo)
 values(null,'pagos',v_id,'PAGO_OPERACION_REGISTRADO','Pago informado por una parte de la operación. Pendiente de conciliación.','server');
 return v_id;
end $$;
revoke all on function public.registrar_pago_operacion(uuid,uuid,uuid,numeric,integer,text,text,text) from public,anon;
grant execute on function public.registrar_pago_operacion(uuid,uuid,uuid,numeric,integer,text,text,text) to authenticated;