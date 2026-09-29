-- Covering indexes for the remaining foreign keys reported by Supabase performance advisor.
create index if not exists idx_companies_localidad_id on public.companies(localidad_id);
create index if not exists idx_companies_pais_id on public.companies(pais_id);
create index if not exists idx_companies_provincia_id on public.companies(provincia_id);
create index if not exists idx_publicaciones_localidad_id on public.publicaciones(localidad_id);
create index if not exists idx_publicaciones_pais_id on public.publicaciones(pais_id);
create index if not exists idx_publicaciones_provincia_id on public.publicaciones(provincia_id);
