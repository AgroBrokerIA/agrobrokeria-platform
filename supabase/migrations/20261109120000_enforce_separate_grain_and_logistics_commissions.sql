-- AgroBrokerIA commission rules are independent:
-- Grain: fixed USD 1 per metric tonne (never a percentage).
-- Logistics: 1% in ARS per contracted truck, based on that truck's agreed freight value.
-- comision_granos_pct is a legacy field and is zeroed to prevent any consumer interpreting grain fees as 1%.

update public.config_comisiones_agrobrokeria
set comision_granos_pct=0,
    comision_granos_usd_por_tn=1.0000,
    comision_logistica_pct=1.000,
    updated_at=now()
where id=1;

comment on column public.config_comisiones_agrobrokeria.comision_granos_pct
is 'LEGACY / NO USAR: comisión de granos no es porcentual. Se conserva en cero por compatibilidad. La comisión vigente es comision_granos_usd_por_tn = USD 1 por tonelada.';

comment on column public.config_comisiones_agrobrokeria.comision_granos_usd_por_tn
is 'Comisión fija de AgroBrokerIA por compraventa de granos: USD por tonelada métrica. Valor vigente: 1.00 USD/TN. No es porcentaje.';

comment on column public.config_comisiones_agrobrokeria.comision_logistica_pct
is 'Comisión de AgroBrokerIA por logística: porcentaje aplicado individualmente al valor de flete pactado por cada camión. Valor vigente: 1.00%, liquidado en ARS.';
