create or replace function public.facturas_validar_tipo_comprobante_iva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_condicion text;
begin
  select e.condicion_iva into v_condicion
  from public.empresas e
  where e.id=new.empresa_id;

  if upper(coalesce(v_condicion,'')) like '%MONOTRIBUT%'
     and new.tipo_comprobante_codigo is distinct from 11 then
    raise exception 'MONOTRIBUTISTA_SOLO_FACTURA_C';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_facturas_validar_tipo_comprobante_iva on public.facturas;
create trigger trg_facturas_validar_tipo_comprobante_iva
before insert or update of empresa_id,tipo_comprobante_codigo on public.facturas
for each row execute function public.facturas_validar_tipo_comprobante_iva();

revoke all on function public.facturas_validar_tipo_comprobante_iva() from public,anon,authenticated;
comment on function public.facturas_validar_tipo_comprobante_iva() is
  'Evita emitir comprobantes incompatibles con la condición fiscal del emisor; los monotributistas sólo pueden emitir Factura C.';
