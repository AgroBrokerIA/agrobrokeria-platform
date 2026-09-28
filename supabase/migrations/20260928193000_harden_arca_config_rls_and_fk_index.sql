-- Harden ARCA config RLS initplan usage and add missing FK index.
create index if not exists idx_empresas_verificacion_requisitos_requisito_id
  on public.empresas_verificacion_requisitos(requisito_id);

drop policy if exists arca_company_config_select_member on public.arca_company_config;
drop policy if exists arca_company_config_insert_admin on public.arca_company_config;
drop policy if exists arca_company_config_update_admin on public.arca_company_config;

create policy arca_company_config_select_member
on public.arca_company_config for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id=arca_company_config.company_id
      and cu.profile_id=(select auth.uid())
      and cu.activo=true
  )
);

create policy arca_company_config_insert_admin
on public.arca_company_config for insert to authenticated
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id=arca_company_config.company_id
      and cu.profile_id=(select auth.uid())
      and cu.activo=true
      and lower(cu.rol::text)='administrador'
  )
);

create policy arca_company_config_update_admin
on public.arca_company_config for update to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id=arca_company_config.company_id
      and cu.profile_id=(select auth.uid())
      and cu.activo=true
      and lower(cu.rol::text)='administrador'
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id=arca_company_config.company_id
      and cu.profile_id=(select auth.uid())
      and cu.activo=true
      and lower(cu.rol::text)='administrador'
  )
);