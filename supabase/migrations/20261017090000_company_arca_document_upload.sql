begin;

create or replace function public.solicitar_verificacion_arca(p_empresa_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Iniciá sesión para solicitar la verificación';
  end if;
  if not public.usuario_es_miembro_empresa(p_empresa_id) then
    raise exception 'No tenés permisos sobre esta empresa';
  end if;

  insert into public.empresas_verificaciones
    (empresa_id, estado, organismo, tipo_consulta, fuente_oficial, observaciones, ejecutado_por, consultado_at)
  values
    (p_empresa_id, 'PENDIENTE', 'ARCA', 'ARCA_CUIT', 'ARCA ws_sr_constancia_inscripcion',
     'Consulta solicitada por el titular. El estado no se considera verificado hasta recibir respuesta oficial.',
     auth.uid()::text, now())
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.solicitar_verificacion_arca(uuid) from public, anon;
grant execute on function public.solicitar_verificacion_arca(uuid) to authenticated;

drop policy if exists agrobroker_private_company_docs_select on storage.objects;
create policy agrobroker_private_company_docs_select on storage.objects
for select to authenticated
using (
  bucket_id = 'agrobroker-private'
  and (storage.foldername(name))[1] = 'empresas'
  and public.usuario_es_miembro_empresa(((storage.foldername(name))[2])::uuid)
);

drop policy if exists agrobroker_private_company_docs_insert on storage.objects;
create policy agrobroker_private_company_docs_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'agrobroker-private'
  and (storage.foldername(name))[1] = 'empresas'
  and public.usuario_es_miembro_empresa(((storage.foldername(name))[2])::uuid)
);

drop policy if exists agrobroker_private_company_docs_update on storage.objects;
create policy agrobroker_private_company_docs_update on storage.objects
for update to authenticated
using (
  bucket_id = 'agrobroker-private'
  and (storage.foldername(name))[1] = 'empresas'
  and public.usuario_es_miembro_empresa(((storage.foldername(name))[2])::uuid)
)
with check (
  bucket_id = 'agrobroker-private'
  and (storage.foldername(name))[1] = 'empresas'
  and public.usuario_es_miembro_empresa(((storage.foldername(name))[2])::uuid)
);

drop policy if exists agrobroker_private_company_docs_delete on storage.objects;
create policy agrobroker_private_company_docs_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'agrobroker-private'
  and (storage.foldername(name))[1] = 'empresas'
  and public.usuario_es_miembro_empresa(((storage.foldername(name))[2])::uuid)
);

commit;
