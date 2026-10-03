-- Commission wallet, real payment-entry ledger, and withdrawal lifecycle.
-- Money is credited only after an authenticated payment provider/manual reconciliation confirms receipt.
create table if not exists public.cuentas_financieras_retiro (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  medio_cobro_id uuid references public.medios_cobro(id) on delete set null,
  tipo text not null default 'BANCARIA', proveedor text, titular text, cuit_cuil text, banco text, tipo_cuenta text,
  cbu text, cvu text, alias text, moneda_id integer references public.monedas(id),
  estado text not null default 'PENDIENTE_VERIFICACION', es_predeterminada boolean not null default false,
  verificada_at timestamptz, verificada_por uuid references public.profiles(id) on delete set null, motivo_rechazo text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint cuentas_financieras_retiro_estado_chk check (estado in ('PENDIENTE_VERIFICACION','VERIFICADA','BLOQUEADA','RECHAZADA')),
  constraint cuentas_financieras_retiro_tipo_chk check (tipo in ('BANCARIA','PAGO_DIGITAL','OTRA')),
  constraint cuentas_financieras_retiro_destino_chk check (nullif(trim(coalesce(cbu,'')),'') is not null or nullif(trim(coalesce(cvu,'')),'') is not null or nullif(trim(coalesce(alias,'')),'') is not null)
);
create table if not exists public.billeteras_comisiones (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.companies(id) on delete cascade,
  moneda_id integer not null references public.monedas(id), saldo_disponible numeric(24,8) not null default 0,
  saldo_pendiente numeric(24,8) not null default 0, saldo_en_retiro numeric(24,8) not null default 0,
  saldo_retirado numeric(24,8) not null default 0, updated_at timestamptz not null default now(),
  unique(empresa_id,moneda_id), constraint billeteras_nonnegative_chk check (saldo_disponible >= 0 and saldo_pendiente >= 0 and saldo_en_retiro >= 0 and saldo_retirado >= 0)
);
create table if not exists public.billeteras_comisiones_movimientos (
  id uuid primary key default gen_random_uuid(), billetera_id uuid not null references public.billeteras_comisiones(id) on delete restrict,
  empresa_id uuid not null references public.companies(id) on delete restrict, profile_id uuid references public.profiles(id) on delete set null,
  operacion_id uuid references public.operaciones(id) on delete set null, operacion_comision_id uuid references public.operacion_comisiones(id) on delete set null,
  tipo text not null, importe numeric(24,8) not null, moneda_id integer not null references public.monedas(id), signo smallint not null,
  estado text not null default 'CONFIRMADO', referencia_externa text, referencia_interna text, proveedor_pago text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint billetera_mov_tipo_chk check (tipo in ('COMISION_GENERADA','PAGO_COMISION_RECIBIDO','AJUSTE_CREDITO','AJUSTE_DEBITO','RETIRO_SOLICITADO','RETIRO_PAGADO','RETIRO_RECHAZADO','DEVOLUCION')),
  constraint billetera_mov_importe_chk check (importe > 0), constraint billetera_mov_signo_chk check (signo in (-1,1)),
  constraint billetera_mov_estado_chk check (estado in ('PENDIENTE','CONFIRMADO','RECHAZADO','ANULADO'))
);
create table if not exists public.ingresos_comisiones (
  id uuid primary key default gen_random_uuid(), empresa_receptora_id uuid not null references public.companies(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null, operacion_id uuid references public.operaciones(id) on delete set null,
  operacion_comision_id uuid references public.operacion_comisiones(id) on delete set null, moneda_id integer not null references public.monedas(id),
  importe numeric(24,8) not null, medio_pago text not null, proveedor_pago text, referencia_pago text, referencia_operacion text,
  estado text not null default 'PENDIENTE', fecha_instruccion timestamptz, fecha_confirmacion timestamptz,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ingresos_comision_importe_chk check (importe > 0), constraint ingresos_comision_estado_chk check (estado in ('PENDIENTE','INICIADO','RECIBIDO','CONCILIADO','RECHAZADO','DEVUELTO'))
);
create unique index if not exists ux_ingresos_comision_ref on public.ingresos_comisiones(referencia_pago) where referencia_pago is not null;
create table if not exists public.retiros_comisiones (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.companies(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict, cuenta_retiro_id uuid references public.cuentas_financieras_retiro(id) on delete restrict,
  medio_cobro_id uuid references public.medios_cobro(id) on delete set null, moneda_id integer not null references public.monedas(id),
  importe numeric(24,8) not null, estado text not null default 'SOLICITADO', referencia_proveedor text, comprobante_url text,
  motivo_rechazo text, fecha_solicitud timestamptz not null default now(), fecha_aprobacion timestamptz, fecha_proceso timestamptz,
  fecha_pago timestamptz, fecha_rechazo timestamptz, created_at timestamptz not null default now(), actualizado_at timestamptz not null default now(),
  referencia text, aprobado_por uuid references public.profiles(id) on delete set null, pagado_por uuid references public.profiles(id) on delete set null, observaciones text,
  constraint retiros_comisiones_importe_chk check (importe > 0),
  constraint retiros_comisiones_estado_chk check (estado in ('SOLICITADO','EN_REVISION','APROBADO','PROCESANDO','PAGADO','RECHAZADO','CANCELADO'))
);
create table if not exists public.retiros_comisiones_detalle (
  id uuid primary key default gen_random_uuid(), retiro_id uuid not null references public.retiros_comisiones(id) on delete cascade,
  comision_id uuid not null references public.operacion_comisiones(id) on delete restrict, importe_reservado numeric(24,8) not null,
  importe_pagado numeric(24,8) not null default 0, created_at timestamptz not null default now(),
  constraint retiros_detalle_importe_chk check (importe_reservado > 0), unique(retiro_id,comision_id)
);
create table if not exists public.finanzas_auditoria (
  id uuid primary key default gen_random_uuid(), empresa_id uuid references public.companies(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null, entidad text not null, entidad_id uuid, accion text not null,
  datos jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.cuentas_financieras_retiro enable row level security;
alter table public.billeteras_comisiones enable row level security;
alter table public.billeteras_comisiones_movimientos enable row level security;
alter table public.ingresos_comisiones enable row level security;
alter table public.retiros_comisiones enable row level security;
alter table public.retiros_comisiones_detalle enable row level security;
alter table public.finanzas_auditoria enable row level security;
