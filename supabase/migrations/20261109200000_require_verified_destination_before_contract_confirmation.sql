-- Do not allow a draft catalog entry to become a confirmed contract.
-- Drafts and previews can be prepared while a destination is pending review.
create or replace function public.guardar_contrato_comercial(p_operacion_id uuid,p_datos jsonb)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
 v_id uuid; v_uid uuid:=auth.uid(); v_workflow public.operacion_workflow%rowtype;
 v_orden integer; v_estado text; v_qty numeric; v_price numeric; v_total numeric;
 v_agreement_id uuid; v_abierto_at timestamptz; v_vencimiento_at timestamptz;
 v_destino public.destinos_homologados%rowtype; v_categoria public.tipo_destino_grano;
begin
 if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para esta operación.'; end if;
 select * into v_workflow from public.operacion_workflow where operacion_id=p_operacion_id for update;
 if not found then raise exception 'La operación no tiene workflow.'; end if;
 select orden into v_orden from public.workflow_etapas where id=v_workflow.etapa_actual_id and workflow_id=v_workflow.workflow_id;
 if v_orden<>5 then raise exception 'El contrato definitivo solo puede gestionarse en la etapa 5.'; end if;
 v_estado:=coalesce(nullif(p_datos->>'estado',''),'BORRADOR');
 if v_estado not in('BORRADOR','CONFIRMADO') then raise exception 'Estado de contrato inválido.'; end if;
 select cantidad_tn,precio_tn,importe_total into v_qty,v_price,v_total from public.operaciones where id=p_operacion_id for update;
 if not found then raise exception 'Operación inexistente.'; end if;
 if p_datos->>'numero_contrato' is null or p_datos->>'numero_contrato'='' then raise exception 'El número de contrato es obligatorio.'; end if;
 if (p_datos->>'cantidad_tn')::numeric is distinct from v_qty then raise exception 'La cantidad contractual no coincide con la operación.'; end if;
 if (p_datos->>'precio_tn')::numeric is distinct from v_price then raise exception 'El precio contractual no coincide con la operación.'; end if;
 if (p_datos->>'importe_total')::numeric is distinct from v_total then raise exception 'El importe contractual no coincide con la operación.'; end if;
 v_categoria:=coalesce(nullif(p_datos->>'categoria_destino','')::public.tipo_destino_grano,'puerto_exportacion'::public.tipo_destino_grano);
 if nullif(p_datos->>'destino_homologado_id','') is null then raise exception 'Seleccioná un establecimiento del catálogo homologado de destinos.'; end if;
 select * into v_destino from public.destinos_homologados where id_destino=(p_datos->>'destino_homologado_id')::bigint and activo=true for share;
 if not found then raise exception 'El destino seleccionado no está activo en el catálogo.'; end if;
 if v_destino.tipo<>v_categoria then raise exception 'El establecimiento no corresponde a la categoría seleccionada.'; end if;
 if v_estado='CONFIRMADO' and not v_destino.verificado then
  raise exception 'DESTINO_PENDIENTE_DE_VERIFICACION: Administración debe validar el establecimiento antes de confirmar el contrato.';
 end if;
 select abierto_at,vencimiento_at into v_abierto_at,v_vencimiento_at from public.contratos where operacion_id=p_operacion_id for update;
 v_abierto_at:=coalesce(v_abierto_at,now()); v_vencimiento_at:=coalesce(v_vencimiento_at,v_abierto_at+interval '7 days');
 if now()>=v_vencimiento_at and v_estado<>'CONFIRMADO' then
  update public.contratos set estado='CANCELADO',cancelado_por_vencimiento_at=now(),updated_at=now() where operacion_id=p_operacion_id;
  update public.operacion_control_comercial set cancelacion_estado='CANCELADA_POR_VENCIMIENTO',cancelacion_motivo='Contrato no cerrado dentro del plazo máximo de 7 días.',cancelacion_fecha=now(),updated_at=now() where operacion_id=p_operacion_id;
  raise exception 'El contrato venció: el plazo máximo de 7 días fue superado.';
 end if;
 if v_estado='CONFIRMADO' then
  v_agreement_id:=nullif(p_datos->>'acuerdo_id','')::uuid;
  if v_agreement_id is null then raise exception 'El contrato confirmado requiere Acuerdo Comercial.'; end if;
  if not exists(select 1 from public.acuerdos_comerciales where id=v_agreement_id and operacion_id=p_operacion_id and estado='CONFIRMADO') then raise exception 'El Acuerdo Comercial debe estar confirmado antes del contrato.'; end if;
  if nullif(p_datos->>'contenido','') is null then raise exception 'El contrato confirmado requiere contenido.'; end if;
 end if;
 insert into public.contratos(
  operacion_id,acuerdo_id,numero_contrato,estado,cantidad_tn,precio_tn,importe_total,lugar_carga,destino,
  condicion_entrega,forma_pago,plazo_pago,flete,calidad,observaciones,contenido,confirmado_at,updated_at,
  abierto_at,vencimiento_at,cancelado_por_vencimiento_at,intermediario_externo_empresa_id,
  intermediario_externo_nombre_snapshot,intermediario_externo_cuit_snapshot,pacto_comision_externa_declarada,
  categoria_destino,destino_homologado_id,nombre_establecimiento_destino,localidad_destino,provincia_destino
 ) values(
  p_operacion_id,nullif(p_datos->>'acuerdo_id','')::uuid,nullif(p_datos->>'numero_contrato',''),v_estado,
  (p_datos->>'cantidad_tn')::numeric,(p_datos->>'precio_tn')::numeric,(p_datos->>'importe_total')::numeric,
  nullif(p_datos->>'lugar_carga',''),concat_ws(' · ',v_destino.nombre_establecimiento,v_destino.localidad,v_destino.provincia),
  nullif(p_datos->>'condicion_entrega',''),nullif(p_datos->>'forma_pago',''),nullif(p_datos->>'plazo_pago',''),
  nullif(p_datos->>'flete',''),nullif(p_datos->>'calidad',''),nullif(p_datos->>'observaciones',''),p_datos->>'contenido',
  case when v_estado='CONFIRMADO' then now() end,now(),v_abierto_at,v_vencimiento_at,null,
  nullif(p_datos->>'intermediario_externo_empresa_id','')::uuid,nullif(p_datos->>'intermediario_externo_nombre_snapshot',''),
  nullif(p_datos->>'intermediario_externo_cuit_snapshot',''),coalesce((p_datos->>'pacto_comision_externa_declarada')::boolean,false),
  v_categoria,v_destino.id_destino,v_destino.nombre_establecimiento,v_destino.localidad,v_destino.provincia
 )
 on conflict(operacion_id) do update set
  acuerdo_id=excluded.acuerdo_id,numero_contrato=excluded.numero_contrato,estado=excluded.estado,
  cantidad_tn=excluded.cantidad_tn,precio_tn=excluded.precio_tn,importe_total=excluded.importe_total,
  lugar_carga=excluded.lugar_carga,destino=excluded.destino,condicion_entrega=excluded.condicion_entrega,
  forma_pago=excluded.forma_pago,plazo_pago=excluded.plazo_pago,flete=excluded.flete,calidad=excluded.calidad,
  observaciones=excluded.observaciones,contenido=excluded.contenido,confirmado_at=excluded.confirmado_at,
  updated_at=excluded.updated_at,abierto_at=public.contratos.abierto_at,vencimiento_at=public.contratos.vencimiento_at,
  cancelado_por_vencimiento_at=null,intermediario_externo_empresa_id=excluded.intermediario_externo_empresa_id,
  intermediario_externo_nombre_snapshot=excluded.intermediario_externo_nombre_snapshot,
  intermediario_externo_cuit_snapshot=excluded.intermediario_externo_cuit_snapshot,
  pacto_comision_externa_declarada=excluded.pacto_comision_externa_declarada,
  categoria_destino=excluded.categoria_destino,destino_homologado_id=excluded.destino_homologado_id,
  nombre_establecimiento_destino=excluded.nombre_establecimiento_destino,
  localidad_destino=excluded.localidad_destino,provincia_destino=excluded.provincia_destino
 returning id into v_id;
 return (select to_jsonb(c) from public.contratos c where c.id=v_id);
end;
$function$;
