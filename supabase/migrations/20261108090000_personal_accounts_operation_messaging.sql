-- Personal accounts can message operation counterparties without a fabricated company.
create or replace function public.listar_operaciones_mensajes_disponibles()
returns table(id uuid,codigo text,estado text,rol text)
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
 v_uid uuid:=auth.uid();
 v_company_id uuid;
 v_empresa_id uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select p.active_company_id into v_company_id from public.profiles p where p.id=v_uid;
 if v_company_id is not null then
   if not exists(select 1 from public.company_users cu where cu.profile_id=v_uid and cu.company_id=v_company_id and cu.activo=true) then
     v_company_id:=null;
   else
     select m.empresa_id into v_empresa_id from public.company_empresa_map m where m.company_id=v_company_id limit 1;
     if v_empresa_id is null and exists(select 1 from public.empresas e where e.id=v_company_id and e.activa=true) then v_empresa_id:=v_company_id; end if;
   end if;
 end if;
 return query
 select o.id,o.codigo::text,o.estado::text,min(op.rol::text) as rol
 from public.operacion_participantes op join public.operaciones o on o.id=op.operacion_id
 where (v_empresa_id is not null and op.empresa_id=v_empresa_id)
    or op.remitente_profile_id=v_uid
    or op.destinatario_profile_id=v_uid
 group by o.id,o.codigo,o.estado order by o.codigo desc;
end;
$$;
revoke all on function public.listar_operaciones_mensajes_disponibles() from public,anon;
grant execute on function public.listar_operaciones_mensajes_disponibles() to authenticated;
