-- Match the text columns used for humidity and protein measurements.
CREATE OR REPLACE FUNCTION public.guardar_control_comercial(p_operacion_id uuid, p_cambios jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  x jsonb:=coalesce(p_cambios,'{}'::jsonb);
  outrow jsonb;
  v_qty numeric;
  v_uid uuid:=auth.uid();
  v_active_company uuid;
  v_is_admin boolean;
  v_sensitive boolean;
begin
  if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then
    raise exception 'No autorizado para esta operación.';
  end if;

  select active_company_id into v_active_company
  from public.profiles where id=v_uid;

  if v_active_company is null
     or not exists(
       select 1
       from public.operacion_participantes op
       where op.operacion_id=p_operacion_id
         and (
           op.empresa_id=v_active_company
           or exists (
             select 1 from public.company_empresa_map cem
             where cem.empresa_id=op.empresa_id
               and cem.company_id=v_active_company
               and cem.verified=true
           )
         )
     ) then
    raise exception 'La empresa activa no participa de la operación.';
  end if;

  select exists(
    select 1 from public.company_users
    where profile_id=v_uid and company_id=v_active_company
      and activo=true and lower(rol::text) in ('administrador','admin')
  ) into v_is_admin;

  v_sensitive :=
    x ? 'comision_estado'
    or x ? 'fondos_estado'
    or x ? 'visado_estado'
    or x ? 'visado_resultado'
    or x ? 'visado_motivo_rechazo'
    or x ? 'visado_observaciones'
    or x ? 'visado_responsable'
    or x ? 'visado_calidad'
    or x ? 'visado_humedad'
    or x ? 'visado_proteina'
    or x ? 'datos_operativos_estado'
    or x ? 'datos_operativos_liberados_at'
    or x ? 'cancelacion_estado';

  if v_sensitive and not v_is_admin then
    raise exception 'Se requiere rol administrador para modificar estados de control comercial.';
  end if;

  if x ? 'no_elusion_aceptada' and not v_is_admin
     and coalesce((x->>'no_elusion_aceptada')::boolean,false) is not true then
    raise exception 'La no elusión solo puede ser aceptada, no revertida, por un usuario no administrador.';
  end if;

  if x ? 'comision_estado' then
    raise exception 'El estado de la comisión de plataforma solo puede cambiar mediante el circuito de retención verificada.';
  end if;
  if x ? 'fondos_estado' and x->>'fondos_estado' not in ('PENDIENTES','LIBERADOS','BLOQUEADOS') then
    raise exception 'Estado de fondos inválido.';
  end if;
  if x ? 'visado_estado' and x->>'visado_estado' not in ('PENDIENTE','APROBADO','RECHAZADO') then
    raise exception 'Estado de visado inválido.';
  end if;
  if x ? 'datos_operativos_estado' and x->>'datos_operativos_estado' not in ('PROTEGIDOS','HABILITADOS') then
    raise exception 'Estado de datos operativos inválido.';
  end if;
  if x ? 'cancelacion_estado' and x->>'cancelacion_estado' not in ('NO_CANCELADA','SOLICITADA','CANCELADA','CANCELACION_RECHAZADA','CANCELADA_POR_VENCIMIENTO') then
    raise exception 'Estado de cancelación inválido.';
  end if;

  select cantidad_tn into v_qty
  from public.operaciones where id=p_operacion_id for update;
  if v_qty is null or v_qty<0 then raise exception 'Operación sin cantidad válida.'; end if;

  select id into v_id
  from public.operacion_control_comercial
  where operacion_id=p_operacion_id for update;

  if v_id is null then
    insert into public.operacion_control_comercial(
      operacion_id,comision_monto,comision_moneda,comision_estado,fondos_estado,
      visado_estado,vendedor_firma_estado,comprador_firma_estado,intermediario_firma_estado,
      datos_operativos_estado,no_elusion_aceptada,cancelacion_estado
    )
    values(
      p_operacion_id,v_qty,'USD','PENDIENTE','PENDIENTES','PENDIENTE',
      'PENDIENTE','PENDIENTE','NO_CORRESPONDE','PROTEGIDOS',false,'NO_CANCELADA'
    )
    returning id into v_id;
  end if;

  update public.operacion_control_comercial set
    comision_monto=v_qty,
    comision_moneda='USD',
    comision_estado=case when x ? 'comision_estado' then x->>'comision_estado' else comision_estado end,
    fondos_estado=case when x ? 'fondos_estado' then x->>'fondos_estado' else fondos_estado end,
    visado_estado=case when x ? 'visado_estado' then x->>'visado_estado' else visado_estado end,
    visado_resultado=case when x ? 'visado_resultado' then x->>'visado_resultado' else visado_resultado end,
    visado_motivo_rechazo=case when x ? 'visado_motivo_rechazo' then x->>'visado_motivo_rechazo' else visado_motivo_rechazo end,
    visado_observaciones=case when x ? 'visado_observaciones' then x->>'visado_observaciones' else visado_observaciones end,
    visado_responsable=case when x ? 'visado_responsable' then x->>'visado_responsable' else visado_responsable end,
    visado_calidad=case when x ? 'visado_calidad' then x->>'visado_calidad' else visado_calidad end,
    visado_humedad=case when x ? 'visado_humedad' then x->>'visado_humedad' else visado_humedad end,
    visado_proteina=case when x ? 'visado_proteina' then x->>'visado_proteina' else visado_proteina end,
    no_elusion_aceptada=case when x ? 'no_elusion_aceptada' then (x->>'no_elusion_aceptada')::boolean else no_elusion_aceptada end,
    datos_operativos_estado=case when x ? 'datos_operativos_estado' then x->>'datos_operativos_estado' else datos_operativos_estado end,
    datos_operativos_liberados_at=case when x ? 'datos_operativos_liberados_at' then (x->>'datos_operativos_liberados_at')::timestamptz else datos_operativos_liberados_at end,
    cancelacion_estado=case when x ? 'cancelacion_estado' then x->>'cancelacion_estado' else cancelacion_estado end,
    updated_at=now()
  where id=v_id
  returning to_jsonb(operacion_control_comercial.*) into outrow;

  return outrow;
end
$function$

