create schema if not exists admin_private;

create table if not exists admin_private.platform_admins (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  access_level text not null default 'OWNER' check (access_level in ('OWNER','SUPER_ADMIN')),
  created_at timestamptz not null default now()
);

insert into admin_private.platform_admins(profile_id, access_level)
select p.id, 'OWNER'
from public.profiles p
where p.nombre = 'Samanta Sequeira'
  and upper(coalesce(p.tipo_usuario,'')) in ('BROKER','CORREDOR','ADMIN')
on conflict (profile_id) do update set access_level='OWNER';

revoke all on schema admin_private from public, anon, authenticated;
grant usage on schema admin_private to postgres, service_role;
revoke all on table admin_private.platform_admins from public, anon, authenticated;
grant all on table admin_private.platform_admins to postgres, service_role;

create or replace function admin_private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from admin_private.platform_admins a
    where a.profile_id = (select auth.uid())
  );
$$;

revoke all on function admin_private.is_platform_admin() from public, anon, authenticated;
grant execute on function admin_private.is_platform_admin() to authenticated;

create or replace view admin_private.directorio_empresas as
select 'EMPRESAS'::text as origen,e.id,e.razon_social,e.nombre_comercial,e.cuit,
null::text as email,null::text as telefono,e.pais,e.provincia,e.localidad,e.direccion,
e.sitio_web,e.tipo_empresa as tipo,e.verificada,e.activa,e.creado_en as creado_at
from public.empresas e
union all
select 'COMPANIES'::text as origen,c.id,c.razon_social,c.nombre_comercial,c.cuit,c.email,c.telefono,
c.pais,c.provincia,c.ciudad as localidad,c.direccion,c.sitio_web,null::text as tipo,
(c.estado::text='verificada') as verificada,(c.estado::text not in ('rechazada','suspendida')) as activa,
c.created_at
from public.companies c;

create or replace view admin_private.directorio_contactos as
select ec.id,ec.empresa_id,e.razon_social,e.nombre_comercial,ec.nombre,ec.cargo,ec.email,
ec.telefono,ec.whatsapp,ec.principal,ec.activo,ec.creado_en
from public.empresas_contactos ec join public.empresas e on e.id=ec.empresa_id
union all
select cc.id,null::uuid,null::text,null::text,cc.nombre_razon_social,cc.representante_cargo,
cc.email,cc.telefono,null::text,false,cc.activo,cc.created_at
from public.contactos_comerciales cc;

create or replace view admin_private.directorio_intereses as
select i.id,i.empresa_id,e.razon_social,e.nombre_comercial,i.producto_id,p.nombre as producto,
i.tipo_operacion,i.cantidad_minima,i.cantidad_maxima,i.precio_objetivo,i.provincia,i.localidad,
i.puerto,i.prioridad,i.activo,i.creado_en
from public.intereses_comerciales i
join public.empresas e on e.id=i.empresa_id
join public.productos p on p.id=i.producto_id;

create or replace function public.admin_listar_directorio_empresas(p_limit integer default 100,p_offset integer default 0)
returns table(origen text,id uuid,razon_social text,nombre_comercial text,cuit text,email text,telefono text,
pais text,provincia text,localidad text,direccion text,sitio_web text,tipo text,verificada boolean,activa boolean,creado_at timestamptz)
language plpgsql security definer set search_path=''
as $$
begin
 if not admin_private.is_platform_admin() then raise exception 'ADMIN_ONLY'; end if;
 return query select d.origen,d.id,d.razon_social,d.nombre_comercial,d.cuit,d.email,d.telefono,d.pais,d.provincia,
 d.localidad,d.direccion,d.sitio_web,d.tipo,d.verificada,d.activa,d.creado_at
 from admin_private.directorio_empresas d order by d.creado_at desc nulls last
 limit greatest(1,least(coalesce(p_limit,100),500)) offset greatest(coalesce(p_offset,0),0);
end; $$;

create or replace function public.admin_listar_directorio_contactos(p_limit integer default 100,p_offset integer default 0)
returns table(id uuid,empresa_id uuid,razon_social text,nombre_comercial text,nombre text,cargo text,email text,
telefono text,whatsapp text,principal boolean,activo boolean,creado_en timestamptz)
language plpgsql security definer set search_path=''
as $$
begin
 if not admin_private.is_platform_admin() then raise exception 'ADMIN_ONLY'; end if;
 return query select d.id,d.empresa_id,d.razon_social,d.nombre_comercial,d.nombre,d.cargo,d.email,d.telefono,
 d.whatsapp,d.principal,d.activo,d.creado_en from admin_private.directorio_contactos d
 order by d.creado_en desc nulls last limit greatest(1,least(coalesce(p_limit,100),500))
 offset greatest(coalesce(p_offset,0),0);
end; $$;

create or replace function public.admin_listar_directorio_intereses(p_limit integer default 100,p_offset integer default 0)
returns table(id uuid,empresa_id uuid,razon_social text,nombre_comercial text,producto_id integer,producto text,
tipo_operacion text,cantidad_minima numeric,cantidad_maxima numeric,precio_objetivo numeric,provincia text,
localidad text,puerto text,prioridad integer,activo boolean,creado_en timestamptz)
language plpgsql security definer set search_path=''
as $$
begin
 if not admin_private.is_platform_admin() then raise exception 'ADMIN_ONLY'; end if;
 return query select d.id,d.empresa_id,d.razon_social,d.nombre_comercial,d.producto_id,d.producto,d.tipo_operacion,
 d.cantidad_minima,d.cantidad_maxima,d.precio_objetivo,d.provincia,d.localidad,d.puerto,d.prioridad,d.activo,d.creado_en
 from admin_private.directorio_intereses d order by d.prioridad desc nulls last,d.creado_en desc
 limit greatest(1,least(coalesce(p_limit,100),500)) offset greatest(coalesce(p_offset,0),0);
end; $$;

revoke execute on function public.admin_listar_directorio_empresas(integer,integer) from public,anon;
revoke execute on function public.admin_listar_directorio_contactos(integer,integer) from public,anon;
revoke execute on function public.admin_listar_directorio_intereses(integer,integer) from public,anon;
grant execute on function public.admin_listar_directorio_empresas(integer,integer) to authenticated;
grant execute on function public.admin_listar_directorio_contactos(integer,integer) to authenticated;
grant execute on function public.admin_listar_directorio_intereses(integer,integer) to authenticated;
