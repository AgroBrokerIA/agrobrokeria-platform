-- Allow the trusted platform-internal company mapping to participate in
-- commercial-control initialization without marking it as externally verified.
-- External company mappings still require verified=true.
CREATE OR REPLACE FUNCTION public.inicializar_control_comercial_contrato(p_operacion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  v_row public.operacion_control_comercial%rowtype;
  v_qty numeric;
begin
  if v_uid is null or not public.usuario_participa_operacion(p_operacion_id) then
    raise exception 'No autorizado para esta operación.';
  end if;

  select active_company_id
    into v_company
    from public.profiles
   where id = v_uid;

  if v_company is null or not exists (
    select 1
      from public.operacion_participantes op
     where op.operacion_id = p_operacion_id
       and (
         op.empresa_id = v_company
         or exists (
           select 1
             from public.company_empresa_map cem
            where cem.empresa_id = op.empresa_id
              and cem.company_id = v_company
              and (
                cem.verified = true
                or cem.match_method = 'platform_internal'
              )
         )
       )
  ) then
    raise exception 'La empresa activa no participa de la operación.';
  end if;

  select cantidad_tn
    into v_qty
    from public.operaciones
   where id = p_operacion_id;

  if v_qty is null or v_qty < 0 then
    raise exception 'Operación sin cantidad válida.';
  end if;

  insert into public.operacion_control_comercial (
    operacion_id,
    comision_monto,
    comision_moneda,
    fondos_estado,
    visado_estado,
    vendedor_firma_estado,
    comprador_firma_estado,
    intermediario_firma_estado,
    datos_operativos_estado,
    no_elusion_aceptada,
    cancelacion_estado
  )
  values (
    p_operacion_id,
    v_qty,
    'USD',
    'PENDIENTES',
    'PENDIENTE',
    'PENDIENTE',
    'PENDIENTE',
    'NO_CORRESPONDE',
    'PROTEGIDOS',
    false,
    'NO_CANCELADA'
  )
  on conflict (operacion_id) do nothing;

  select *
    into v_row
    from public.operacion_control_comercial
   where operacion_id = p_operacion_id;

  return to_jsonb(v_row);
end;
$function$;
