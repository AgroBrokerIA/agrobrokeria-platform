create or replace function public.establecer_medio_cobro_predeterminado(p_medio_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_empresa_id uuid;
begin
  select p.active_company_id into v_empresa_id
  from public.profiles p where p.id = auth.uid();

  if v_empresa_id is null then raise exception 'No se encontró una empresa activa.'; end if;

  if not exists (
    select 1 from public.company_users cu
    where cu.company_id=v_empresa_id and cu.profile_id=auth.uid() and cu.activo=true
  ) then raise exception 'No autorizado para esta empresa.'; end if;

  if not exists (
    select 1 from public.medios_cobro mc
    where mc.id=p_medio_id and mc.empresa_id=v_empresa_id and mc.estado='VALIDADO'
  ) then raise exception 'El medio de cobro debe pertenecer a la empresa activa y estar validado.'; end if;

  perform pg_advisory_xact_lock(
    hashtext('agrobrokeria:medio_predeterminado:' || v_empresa_id::text)
  );

  update public.medios_cobro
  set es_predeterminado=false, actualizado_at=now()
  where empresa_id=v_empresa_id and es_predeterminado=true;

  update public.medios_cobro
  set es_predeterminado=true, actualizado_at=now()
  where id=p_medio_id;
end;
$function$;

revoke all on function public.establecer_medio_cobro_predeterminado(uuid) from public;
revoke all on function public.establecer_medio_cobro_predeterminado(uuid) from anon;
grant execute on function public.establecer_medio_cobro_predeterminado(uuid) to authenticated;

create unique index if not exists ux_medios_cobro_predeterminado_empresa
on public.medios_cobro (empresa_id)
where es_predeterminado=true;
