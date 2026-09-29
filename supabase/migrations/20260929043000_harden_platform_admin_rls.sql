alter table admin_private.platform_admins enable row level security;
drop policy if exists "owner service only" on admin_private.platform_admins;
create policy "owner service only" on admin_private.platform_admins for all to service_role using (true) with check (true);