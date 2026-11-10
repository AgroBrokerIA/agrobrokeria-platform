create or replace function public.revisar_adelanto_combustible_logistica(
  p_adelanto_id uuid,p_aprobar boolean,p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  a public.logistica_adelantos_combustible%rowtype;
  conv uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.platform_admins x where x.user_id=auth.uid()) then raise exception 'ADMIN_REQUIRED'; end if;
  select * into a from public.logistica_adelantos_combustible where id=p_adelanto_id for update;
  if not found or a.estado<>'COMPROBANTE_CARGADO' then raise exception 'COMPROBANTE_ADELANTO_NO_PENDIENTE'; end if;
  update public.logistica_adelantos_combustible
  set estado=case when p_aprobar then 'APROBADO' else 'RECHAZADO' end,
      revisado_por=auth.uid(),revisado_at=now(),
      motivo_rechazo=case when p_aprobar then null else nullif(trim(p_motivo),'') end
  where id=p_adelanto_id;
  select cf.id into conv from public.conversaciones_fletes cf
  where cf.cierre_logistica_id=a.cierre_logistica_id limit 1;
  if conv is not null then
    insert into public.mensajes_fletes(conversacion_id,emisor_profile_id,es_sistema,mensaje,adjunto_path)
    values(
      conv,null,true,
      case when p_aprobar then
        'Administración verificó el comprobante del adelanto de combustible y viáticos. El adelanto quedó aprobado; el viaje puede continuar con la CPE una vez cumplidos los demás controles.'
      else
        'Administración rechazó el comprobante del adelanto. Motivo: '||coalesce(nullif(trim(p_motivo),''),'No se pudo verificar la transferencia')||'. El adelanto no quedó acreditado. El transportista podrá continuar sin adelanto cuando la comisión logística y la CPE estén aprobadas.'
      end,
      a.comprobante_path
    );
  end if;
end;
$$;

revoke all on function public.revisar_adelanto_combustible_logistica(uuid,boolean,text) from public,anon;
grant execute on function public.revisar_adelanto_combustible_logistica(uuid,boolean,text) to authenticated;
