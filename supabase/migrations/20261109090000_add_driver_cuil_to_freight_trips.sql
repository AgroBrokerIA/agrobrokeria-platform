-- Capture the driver's CUIL separately from the carrier's CUIT and expose only carriers
-- whose 1% ARS freight commission has already been manually approved.

alter table public.viajes
  add column if not exists chofer_cuil text;

comment on column public.viajes.chofer_cuil
  is 'CUIL/CUIT del chofer que conduce este viaje; se utiliza en la emisión de la CPE ante ARCA.';

create or replace function public.validar_cuit_cuil(p_value text)
returns boolean
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  v_digits text:=regexp_replace(p_value,'[^0-9]','','g');
  v_weights integer[]:=array[5,4,3,2,7,6,5,4,3,2];
  v_sum integer:=0;
  v_check integer;
  i integer;
begin
  if length(v_digits)<>11 then return false; end if;
  for i in 1..10 loop
    v_sum:=v_sum+substring(v_digits,i,1)::integer*v_weights[i];
  end loop;
  v_check:=11-(v_sum%11);
  if v_check=11 then v_check:=0;
  elsif v_check=10 then v_check:=9;
  end if;
  return substring(v_digits,11,1)::integer=v_check;
end;
$$;

create or replace function public.listar_transportistas_habilitados_por_comision(p_operacion_id uuid)
returns table(
  profile_id uuid,
  nombre_completo text,
  empresa_transporte text,
  telefono text,
  foto_perfil_path text,
  cuit text,
  empresa_id uuid
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select distinct t.profile_id,t.nombre_completo,t.empresa_transporte,t.telefono,
         t.foto_perfil_path,t.cuit,t.empresa_id
  from public.transportistas t
  join public.cierres_logistica c
    on c.empresa_transportista_id=t.empresa_id
   and c.operacion_id=p_operacion_id
   and c.estado_cierre='cerrado_formal'
   and c.estado_pago_comision_logistica='aprobado'
  where t.verificacion_estado='VERIFICADO'
    and t.activo=true
    and public.usuario_puede_gestionar_logistica_operacion(p_operacion_id)
    and (select count(*) from public.viajes v where v.cierre_logistica_id=c.id)<c.cantidad_camiones
  order by t.nombre_completo;
$$;

create or replace function public.crear_viaje_operacion_con_vehiculos_completo(
  p_operacion_id uuid,
  p_transportista_profile_id uuid,
  p_vehiculo_id uuid,
  p_acoplado_vehiculo_id uuid,
  p_origen text,
  p_destino text,
  p_origen_nombre text,
  p_destino_nombre text,
  p_chofer_nombre text,
  p_chofer_cuil text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_id uuid;
  v_cuil text:=regexp_replace(coalesce(p_chofer_cuil,''),'[^0-9]','','g');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_chofer_nombre),'') is null or length(trim(p_chofer_nombre))>120 then
    raise exception 'CHOFER_NOMBRE_REQUERIDO';
  end if;
  if not public.validar_cuit_cuil(v_cuil) then raise exception 'CHOFER_CUIL_INVALIDO'; end if;

  v_id:=public.crear_viaje_operacion_con_vehiculos(
    p_operacion_id,p_transportista_profile_id,p_vehiculo_id,p_acoplado_vehiculo_id,
    p_origen,p_destino,p_origen_nombre,p_destino_nombre
  );

  update public.viajes
  set chofer_nombre=trim(p_chofer_nombre),chofer_cuil=v_cuil,actualizado_at=now()
  where id=v_id;
  return v_id;
end;
$$;

revoke all on function public.validar_cuit_cuil(text) from public,anon,authenticated;
grant execute on function public.validar_cuit_cuil(text) to service_role;
revoke all on function public.listar_transportistas_habilitados_por_comision(uuid) from public,anon;
grant execute on function public.listar_transportistas_habilitados_por_comision(uuid) to authenticated;
revoke all on function public.crear_viaje_operacion_con_vehiculos_completo(uuid,uuid,uuid,uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.crear_viaje_operacion_con_vehiculos_completo(uuid,uuid,uuid,uuid,text,text,text,text,text,text) to authenticated;
