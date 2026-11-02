create or replace function public.crear_operacion_desde_publicaciones(p_publicacion_compra_id uuid,p_publicacion_venta_id uuid,p_cantidad_tn numeric,p_precio_tn numeric) returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v_user uuid:=auth.uid(); v_compra public.publicaciones%rowtype; v_venta public.publicaciones%rowtype; v_operacion uuid; v_moneda integer; v_workflow uuid; v_stage uuid; v_ow uuid;
begin
if v_user is null then raise exception 'Debés iniciar sesión para crear una operación.'; end if;
if p_publicacion_compra_id is null or p_publicacion_venta_id is null or p_publicacion_compra_id=p_publicacion_venta_id then raise exception 'Seleccioná una compra y una venta diferentes.'; end if;
if p_cantidad_tn is null or p_cantidad_tn<=0 or p_precio_tn is null or p_precio_tn<=0 then raise exception 'La cantidad y el precio acordados deben ser mayores que cero.'; end if;
select * into v_compra from public.publicaciones where id=p_publicacion_compra_id and estado in ('PUBLICADA','ACTIVA') for share;
select * into v_venta from public.publicaciones where id=p_publicacion_venta_id and estado in ('PUBLICADA','ACTIVA') for share;
if v_compra.id is null or v_venta.id is null then raise exception 'Una de las publicaciones ya no está activa o no existe.'; end if;
if upper(v_compra.tipo) not in ('COMPRA','DEMANDA') or upper(v_venta.tipo) not in ('VENTA','OFERTA') then raise exception 'Seleccioná una demanda/compra y una oferta/venta.'; end if;
if v_compra.empresa_id=v_venta.empresa_id then raise exception 'La compra y la venta deben pertenecer a empresas distintas.'; end if;
if v_compra.producto_id<>v_venta.producto_id then raise exception 'Los productos de compra y venta deben coincidir.'; end if;
if v_compra.moneda_id is not null and v_venta.moneda_id is not null and v_compra.moneda_id<>v_venta.moneda_id then raise exception 'Las monedas de compra y venta deben coincidir.'; end if;
if p_cantidad_tn>least(v_compra.cantidad_tn,v_venta.cantidad_tn) then raise exception 'La cantidad acordada supera el volumen disponible.'; end if;
if not exists(select 1 from public.company_users cu join public.company_empresa_map cem on cem.company_id=cu.company_id where cu.profile_id=v_user and cu.activo is true and cem.empresa_id in(v_compra.empresa_id,v_venta.empresa_id)) then raise exception 'No tenés permisos para iniciar una operación con estas empresas.'; end if;
v_moneda:=coalesce(v_compra.moneda_id,v_venta.moneda_id);
insert into public.operaciones(codigo,publicacion_compra_id,publicacion_venta_id,estado,precio_tn,cantidad_tn,moneda_id,importe_total,fecha_operacion,tipo_operacion,modalidad_comercial,cantidad_original,unidad_original,factor_normalizacion,unidad_base)
values('OP-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS'),v_compra.id,v_venta.id,'NEGOCIACION',p_precio_tn,p_cantidad_tn,v_moneda,p_precio_tn*p_cantidad_tn,now(),'F2','A_COORDINAR',p_cantidad_tn,'TN',1,'TN') returning id into v_operacion;
insert into public.operacion_participantes(operacion_id,empresa_id,rol) values(v_operacion,v_compra.empresa_id,'COMPRADOR'),(v_operacion,v_venta.empresa_id,'VENDEDOR');
select id into v_workflow from public.workflows where nombre='Operación de granos' and activo=true order by creado_en limit 1;
if v_workflow is null then raise exception 'No existe workflow activo de Operación de granos'; end if;
select id into v_stage from public.workflow_etapas where workflow_id=v_workflow and orden=1 limit 1;
if v_stage is null then raise exception 'El workflow no tiene etapa inicial'; end if;
insert into public.operacion_workflow(operacion_id,workflow_id,etapa_actual_id,estado) values(v_operacion,v_workflow,v_stage,'EN_CURSO') returning id into v_ow;
insert into public.workflow_historial(operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones)
select v_ow,v_stage,now(),cu.id,'Operación iniciada desde el cruce de publicaciones; continuar negociación y acuerdo comercial.' from public.profiles pr join public.cuentas cu on lower(trim(cu.email))=lower(trim(pr.email)) where pr.id=v_user limit 1;
if not exists(select 1 from public.workflow_historial where operacion_workflow_id=v_ow and etapa_id=v_stage) then
insert into public.workflow_historial(operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones) values(v_ow,v_stage,now(),null,'Operación iniciada desde el cruce de publicaciones; continuar negociación y acuerdo comercial.');
end if;
return v_operacion;
end;$function$;

with active_workflow as(select id from public.workflows where nombre='Operación de granos' and activo=true order by creado_en limit 1),
initial_stage as(select e.id from public.workflow_etapas e join active_workflow w on w.id=e.workflow_id where e.orden=1),
repaired as(
insert into public.operacion_workflow(operacion_id,workflow_id,etapa_actual_id,estado)
select o.id,w.id,s.id,'EN_CURSO' from public.operaciones o cross join active_workflow w cross join initial_stage s
where o.estado in('NEGOCIACION','ACEPTADA','EN_CURSO') and not exists(select 1 from public.operacion_workflow ow where ow.operacion_id=o.id)
and exists(select 1 from public.operacion_participantes p where p.operacion_id=o.id and p.rol='VENDEDOR')
and exists(select 1 from public.operacion_participantes p where p.operacion_id=o.id and p.rol='COMPRADOR')
returning id,etapa_actual_id)
insert into public.workflow_historial(operacion_workflow_id,etapa_id,fecha_inicio,usuario_id,observaciones)
select id,etapa_actual_id,now(),null,'Workflow inicial reparado: la operación activa existía sin etapas asociadas. Datos comerciales preservados.' from repaired;