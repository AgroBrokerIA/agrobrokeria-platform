update public.arca_company_config
set environment='homologacion'
where id='ba9a95bc-3921-4a6f-9a99-2c5c09a4ec7b'::uuid
  and enabled=true;
do $$
begin
 if not exists(select 1 from public.arca_company_config where id='ba9a95bc-3921-4a6f-9a99-2c5c09a4ec7b'::uuid and environment='homologacion') then
  raise exception 'ARCA_HOMOLOGATION_CONFIGURATION_NOT_APPLIED';
 end if;
end $$;
