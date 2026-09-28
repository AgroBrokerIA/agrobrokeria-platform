alter table public.provincias
  add column if not exists tipo text not null default 'STATE',
  add column if not exists codigo_externo text,
  add column if not exists latitud numeric,
  add column if not exists longitud numeric;

alter table public.localidades
  add column if not exists codigo_externo text,
  add column if not exists latitud numeric,
  add column if not exists longitud numeric;

alter table public.companies
  add column if not exists pais_id integer references public.paises(id),
  add column if not exists provincia_id integer references public.provincias(id),
  add column if not exists localidad_id integer references public.localidades(id);

alter table public.publicaciones
  add column if not exists pais_id integer references public.paises(id),
  add column if not exists provincia_id integer references public.provincias(id),
  add column if not exists localidad_id integer references public.localidades(id);

update public.companies c
set pais_id=1
where pais_id is null and lower(coalesce(c.pais,'')) in ('argentina','ar');

update public.companies c
set provincia_id=p.id
from public.provincias p
where c.provincia_id is null and c.pais_id=1 and lower(c.provincia)=lower(p.nombre);

update public.publicaciones p
set pais_id=1
where pais_id is null and lower(coalesce(p.provincia,'')) in
  (select lower(nombre) from public.provincias where pais_id=1);

update public.publicaciones p
set provincia_id=pr.id
from public.provincias pr
where p.provincia_id is null and p.pais_id=1 and lower(p.provincia)=lower(pr.nombre);
