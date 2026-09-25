create or replace function public.enforce_agrobrokeria_platform_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usd_id integer;
  v_tn numeric;
begin
  if new.tipo_comision = 'PLATAFORMA' or new.origen_comision = 'AGROBROKER_IA' then
    select id into v_usd_id from public.monedas where upper(codigo)='USD' limit 1;
    if v_usd_id is null then raise exception 'No se puede registrar la comisión AgroBrokerIA: moneda USD no configurada'; end if;
    if tg_op='UPDATE' and old.tipo_comision='PLATAFORMA' and new.tipo_comision<>'PLATAFORMA' then
      raise exception 'La comisión de plataforma AgroBrokerIA no puede cambiar de tipo';
    end if;
    v_tn := coalesce(new.cantidad_tn,0);
    if v_tn < 0 then raise exception 'La cantidad de toneladas de la comisión no puede ser negativa'; end if;
    new.tipo_comision := 'PLATAFORMA';
    new.origen_comision := 'AGROBROKER_IA';
    new.modalidad_calculo := 'USD_TN';
    new.valor_unitario := 1;
    new.moneda_id := v_usd_id;
    new.cantidad_tn := v_tn;
    new.subtotal := v_tn;
    new.total := v_tn;
    new.saldo_pendiente := greatest(v_tn - coalesce(new.saldo_pagado,0),0);
    new.concepto := coalesce(nullif(new.concepto,''),'Comisión AgroBrokerIA');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_agrobrokeria_platform_commission on public.operacion_comisiones;
create trigger trg_enforce_agrobrokeria_platform_commission
before insert or update on public.operacion_comisiones
for each row execute function public.enforce_agrobrokeria_platform_commission();
revoke all on function public.enforce_agrobrokeria_platform_commission() from public,anon,authenticated;
