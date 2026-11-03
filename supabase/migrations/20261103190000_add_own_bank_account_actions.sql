create or replace function public.establecer_medio_cobro_predeterminado(p_medio_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select active_company_id into v_empresa from public.profiles where id=v_uid;
  if v_empresa is null then raise exception 'No hay empresa activa'; end if;
  if not exists (select 1 from public.company_users where company_id=v_empresa and profile_id=v_uid and activo=true) then
    raise exception 'No pertenecés a la empresa activa';
  end if;
  if not exists (select 1 from public.medios_cobro where id=p_medio_id and empresa_id=v_empresa and profile_id=v_uid and tipo='BANCO') then
    raise exception 'La cuenta no existe o no te pertenece';
  end if;
  update public.medios_cobro set es_predeterminado=false, actualizado_at=now()
  where empresa_id=v_empresa and profile_id=v_uid and tipo='BANCO';
  update public.medios_cobro set es_predeterminado=true, actualizado_at=now()
  where id=p_medio_id and empresa_id=v_empresa and profile_id=v_uid;
end;
$function$;
revoke all on function public.establecer_medio_cobro_predeterminado(uuid) from public;
grant execute on function public.establecer_medio_cobro_predeterminado(uuid) to authenticated;