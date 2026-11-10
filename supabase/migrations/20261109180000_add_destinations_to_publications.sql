-- Add the same typed destination reference to both sale offers and purchase demands.
alter table public.publicaciones
 add column if not exists categoria_destino public.tipo_destino_grano,
 add column if not exists destino_homologado_id bigint references public.destinos_homologados(id_destino) on delete restrict,
 add column if not exists nombre_establecimiento_destino varchar(150),
 add column if not exists localidad_destino varchar(100),
 add column if not exists provincia_destino varchar(50);
create index if not exists publicaciones_destino_idx
 on public.publicaciones(destino_homologado_id)
 where destino_homologado_id is not null;
