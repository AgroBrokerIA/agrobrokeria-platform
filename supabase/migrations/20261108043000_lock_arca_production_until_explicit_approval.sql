alter table public.arca_company_config
 add column if not exists production_enabled boolean not null default false;
update public.arca_company_config set production_enabled=false;
create or replace function public.enforce_arca_production_gate()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
 if lower(coalesce(new.environment,'')) in ('production','produccion','prod')
    and not coalesce(new.production_enabled,false) then
   raise exception 'ARCA_PRODUCTION_LOCKED_UNTIL_EXPLICIT_APPROVAL';
 end if;
 return new;
end $$;
drop trigger if exists trg_enforce_arca_production_gate on public.arca_company_config;
create trigger trg_enforce_arca_production_gate
before insert or update of environment,production_enabled on public.arca_company_config
for each row execute function public.enforce_arca_production_gate();
