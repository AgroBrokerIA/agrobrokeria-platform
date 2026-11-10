-- Close the direct-DML bypass: every new vehicle/driver assignment must reference an approved freight closure.
create or replace function public.validar_comision_flete_antes_de_asignar_camion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  c public.cierres_logistica%rowtype;
  v_transportista public.transportistas%rowtype;
  v_camion public.vehiculos%rowtype;
  v_acoplado public.vehiculos%rowtype;
begin
  if new.transportista_profile_id is null
     and new.vehiculo_id is null
     and nullif(trim(coalesce(new.patente_camion,'')),'') is null
     and nullif(trim(coalesce(new.chofer_nombre,'')),'') is null then
    if new.cierre_logistica_id is not null then
      select * into c from public.cierres_logistica where id=new.cierre_logistica_id;
      if not found or c.estado_cierre<>'cerrado_formal' or c.estado_pago_comision_logistica<>'aprobado' then
        raise exception 'COMISION_LOGISTICA_PENDIENTE_VALIDACION_MANUAL';
      end if;
      if c.operacion_id is distinct from new.operacion_id then raise exception 'CIERRE_FLETE_OPERACION_NO_COINCIDE'; end if;
    end if;
    return new;
  end if;

  if new.cierre_logistica_id is null then raise exception 'LOGISTICS_CLOSURE_REQUIRED'; end if;
  select * into c from public.cierres_logistica where id=new.cierre_logistica_id;
  if not found or c.estado_cierre<>'cerrado_formal' or c.estado_pago_comision_logistica<>'aprobado' then
    raise exception 'COMISION_LOGISTICA_PENDIENTE_VALIDACION_MANUAL';
  end if;
  if c.operacion_id is distinct from new.operacion_id then raise exception 'CIERRE_FLETE_OPERACION_NO_COINCIDE'; end if;

  if new.transportista_profile_id is null or new.vehiculo_id is null then
    raise exception 'TRANSPORTISTA_Y_CAMION_REGISTRADOS_REQUERIDOS';
  end if;
  select * into v_transportista from public.transportistas
  where profile_id=new.transportista_profile_id and activo=true;
  if not found or v_transportista.verificacion_estado<>'VERIFICADO'
     or v_transportista.empresa_id is distinct from c.empresa_transportista_id then
    raise exception 'TRANSPORTISTA_NO_VERIFICADO_O_EMPRESA_NO_COINCIDE';
  end if;

  select * into v_camion from public.vehiculos
  where id=new.vehiculo_id and transportista_id=v_transportista.id
    and habilitado=true and upper(tipo)='CAMION';
  if not found then raise exception 'CAMION_NO_REGISTRADO_PARA_TRANSPORTISTA'; end if;

  if new.acoplado_vehiculo_id is not null then
    select * into v_acoplado from public.vehiculos
    where id=new.acoplado_vehiculo_id and transportista_id=v_transportista.id
      and habilitado=true and upper(tipo)='ACOPLADO';
    if not found then raise exception 'ACOPLADO_NO_REGISTRADO_PARA_TRANSPORTISTA'; end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validar_comision_flete_antes_de_asignar_camion() from public,anon,authenticated;
grant execute on function public.validar_comision_flete_antes_de_asignar_camion() to service_role;
