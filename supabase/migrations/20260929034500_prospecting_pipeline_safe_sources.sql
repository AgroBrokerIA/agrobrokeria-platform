create table public.prospectos_comerciales (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid references public.empresas(id) on delete set null,
 company_id uuid references public.companies(id) on delete set null,
 created_by uuid references public.profiles(id) on delete set null,
 nombre_empresa text,
 pais text,
 provincia text,
 localidad text,
 sitio_web text,
 fuente text not null,
 fuente_referencia text,
 tipo_prospecto text not null check (tipo_prospecto in ('PRODUCTOR','ACOPIO','COOPERATIVA','EXPORTADOR','COMPRADOR','VENDEDOR','CORREDOR','INTERMEDIARIO','LOGISTICA','INDUSTRIA','OTRO')),
 productos text[] not null default '{}',
 email text,
 telefono text,
 contacto_nombre text,
 consentimiento_contacto boolean not null default false,
 estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE','VALIDANDO','VALIDADO','DESCARTADO','CONTACTADO','RESPONDIO','NO_CONTACTAR')),
 score numeric(5,2),
 notas text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.campanas_prospeccion (
 id uuid primary key default gen_random_uuid(),
 nombre text not null,
 objetivo text not null,
 producto text,
 tipo_prospecto text,
 provincia text,
 localidad text,
 puerto text,
 volumen_min_tn numeric,
 volumen_max_tn numeric,
 estado text not null default 'BORRADOR' check (estado in ('BORRADOR','LISTA','ACTIVA','PAUSADA','FINALIZADA')),
 ia_enabled boolean not null default true,
 requiere_revision_humana boolean not null default true,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.prospectos_campana (
 id uuid primary key default gen_random_uuid(),
 campana_id uuid not null references public.campanas_prospeccion(id) on delete cascade,
 prospecto_id uuid not null references public.prospectos_comerciales(id) on delete cascade,
 score numeric(5,2),
 estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE','MENSAJE_GENERADO','ENVIADO','RESPONDIO','RECHAZO','NO_CONTACTAR')),
 mensaje_generado text,
 enviado_at timestamptz,
 responded_at timestamptz,
 unique(campana_id,prospecto_id)
);

create table public.prospeccion_fuentes (
 id uuid primary key default gen_random_uuid(),
 nombre text not null unique,
 tipo text not null check (tipo in ('API_OFICIAL','IMPORTACION','MANUAL','WEB_PUBLICA')),
 base_url text,
 activo boolean not null default false,
 requiere_credenciales boolean not null default true,
 politicas_aceptadas boolean not null default false,
 created_at timestamptz not null default now()
);

alter table public.prospectos_comerciales enable row level security;
alter table public.campanas_prospeccion enable row level security;
alter table public.prospectos_campana enable row level security;
alter table public.prospeccion_fuentes enable row level security;

create policy "prospectos owner read" on public.prospectos_comerciales for select to authenticated
using ((select auth.uid())=created_by);
create policy "prospectos owner insert" on public.prospectos_comerciales for insert to authenticated
with check ((select auth.uid())=created_by);
create policy "prospectos owner update" on public.prospectos_comerciales for update to authenticated
using ((select auth.uid())=created_by) with check ((select auth.uid())=created_by);

create policy "campanas owner" on public.campanas_prospeccion for all to authenticated
using ((select auth.uid())=created_by) with check ((select auth.uid())=created_by);

create policy "campana prospects owner" on public.prospectos_campana for select to authenticated
using (exists(select 1 from public.campanas_prospeccion c where c.id=campana_id and c.created_by=(select auth.uid())));

create policy "sources authenticated read" on public.prospeccion_fuentes for select to authenticated
using (true);