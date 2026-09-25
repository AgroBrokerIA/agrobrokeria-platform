-- AgroBrokerIA production database smoke/security checks.
-- Run with the Supabase test runner in an environment with pgTAP enabled.
begin;
select plan(10);

select is(
  (select count(*) from pg_tables where schemaname='public' and not rowsecurity),
  0::bigint,
  'all public tables have RLS'
);

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'execute')),
  0::bigint,
  'anon cannot execute security-definer functions'
);

select is(
  has_table_privilege('authenticated','public.pagos','insert'),
  false,
  'authenticated cannot insert payments directly'
);

select is(
  has_table_privilege('authenticated','public.operaciones','update'),
  false,
  'authenticated cannot update operations directly'
);

select is(
  has_table_privilege('authenticated','public.contratos','update'),
  false,
  'authenticated cannot update contracts directly'
);

select is(
  has_table_privilege('authenticated','public.liquidaciones','update'),
  false,
  'authenticated cannot update liquidations directly'
);

select is(
  (select count(*) from public.comisiones where valor < 0 or coalesce(importe_calculado,0) < 0),
  0::bigint,
  'no negative legacy commission amounts'
);

select is(
  (select count(*) from public.operaciones where cantidad_tn <= 0 or precio_tn <= 0 or coalesce(importe_total,0) < 0),
  0::bigint,
  'no invalid operation financial values'
);

select is(
  (select count(*) from pg_indexes where schemaname='public' and indexname='ux_firma_solicitud_pendiente_contrato_email'),
  1::bigint,
  'pending signature requests are idempotently constrained'
);

select is(
  (select count(*) from pg_indexes where schemaname='public' and indexname='ux_pagos_operacion_comprobante'),
  1::bigint,
  'payment references are idempotently constrained'
);

select * from finish();
rollback;