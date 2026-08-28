-- ============================================
-- TABLA DE PUBLICACIONES
-- ============================================

create table if not exists publicaciones (

    id uuid primary key default gen_random_uuid(),

    usuario_id uuid not null references auth.users(id) on delete cascade,

    tipo text not null check (tipo in ('COMPRA','VENTA')),

    producto text not null,

    cantidad numeric(14,2) not null,

    unidad text default 'TN',

    precio numeric(14,2),

    moneda text default 'USD',

    condicion text,

    provincia text,

    localidad text,

    puerto text,

    calidad text,

    campaña text,

    descripcion text,

    estado text default 'ACTIVA',

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);

create index if not exists publicaciones_producto_idx
on publicaciones(producto);

create index if not exists publicaciones_estado_idx
on publicaciones(estado);

create index if not exists publicaciones_usuario_idx
on publicaciones(usuario_id);

alter table publicaciones enable row level security;

drop policy if exists "leer publicaciones" on publicaciones;
create policy "leer publicaciones"
on publicaciones
for select
using (true);

drop policy if exists "crear publicaciones" on publicaciones;
create policy "crear publicaciones"
on publicaciones
for insert
to authenticated
with check (auth.uid() = usuario_id);

drop policy if exists "editar propias publicaciones" on publicaciones;
create policy "editar propias publicaciones"
on publicaciones
for update
to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

drop policy if exists "eliminar propias publicaciones" on publicaciones;
create policy "eliminar propias publicaciones"
on publicaciones
for delete
to authenticated
using (auth.uid() = usuario_id);