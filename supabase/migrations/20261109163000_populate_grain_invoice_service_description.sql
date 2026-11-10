-- Populate the official grain-intermediation concept before a draft invoice is stored.
-- WSFEv1 does not accept free-text item descriptions; this text is rendered in the PDF.
create or replace function public.facturas_completar_concepto_granos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_codigo text;
  v_toneladas numeric;
  v_producto text;
  v_fecha_contrato date;
begin
  if nullif(btrim(coalesce(new.concepto_descripcion,'')),'') is not null then
    return new;
  end if;

  select o.codigo, o.cantidad_tn, o.fecha_operacion::date
    into v_codigo, v_toneladas, v_fecha_contrato
  from public.operaciones o
  where o.id = new.operacion_id;

  select nullif(btrim(p.nombre),'')
    into v_producto
  from public.productos p
  where p.id = new.producto_id;

  if new.contrato_id is not null then
    select coalesce(c.fecha_firma,c.confirmado_at::date,c.creado_en::date)
      into v_fecha_contrato
    from public.contratos c
    where c.id = new.contrato_id;
  end if;

  v_codigo := coalesce(nullif(v_codigo,''),left(new.operacion_id::text,8));
  v_toneladas := coalesce(nullif(new.cantidad_tn,0),v_toneladas,0);
  v_producto := coalesce(v_producto,'granos');
  v_fecha_contrato := coalesce(v_fecha_contrato,current_date);

  new.concepto_descripcion := format(
    'Servicios tecnológicos de intermediación y corretaje digital de granos - Operación N° %s - Contrato Formal F1 de fecha %s. Volumen: %s TN de %s.',
    v_codigo,
    to_char(v_fecha_contrato,'DD/MM/YYYY'),
    to_char(v_toneladas,'FM999999990D999'),
    v_producto
  );
  new.fecha_servicio_desde := coalesce(new.fecha_servicio_desde,v_fecha_contrato);
  new.fecha_servicio_hasta := coalesce(new.fecha_servicio_hasta,v_fecha_contrato);
  return new;
end;
$function$;

drop trigger if exists trg_facturas_completar_concepto_granos on public.facturas;
create trigger trg_facturas_completar_concepto_granos
before insert on public.facturas
for each row execute function public.facturas_completar_concepto_granos();

revoke all on function public.facturas_completar_concepto_granos() from public,anon,authenticated;
comment on function public.facturas_completar_concepto_granos() is
  'Completa el concepto de servicios de intermediación de granos para el PDF; no agrega DetDesc al XML WSFEv1.';
