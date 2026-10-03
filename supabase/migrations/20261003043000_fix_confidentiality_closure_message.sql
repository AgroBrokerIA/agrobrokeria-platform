create or replace function public.validar_cierre_documental_operacion(p_operacion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_missing jsonb := '[]'::jsonb;
  v_contract uuid;
  v_signed boolean;
  v_invoice boolean;
  v_docs boolean;
  v_has_intermediary boolean;
  v_conf_message text;
begin
  if auth.uid() is null or not public.usuario_participa_operacion(p_operacion_id) then
    raise exception 'FORBIDDEN';
  end if;

  select exists(
    select 1 from public.operacion_participantes
    where operacion_id=p_operacion_id and upper(rol)='INTERMEDIARIO'
  ) into v_has_intermediary;

  v_conf_message := case
    when v_has_intermediary then
      'Falta la aceptación del Contrato de Confidencialidad, No Circunvención y Reconocimiento de Comisiones por todas las partes requeridas.'
    else
      'Falta la aceptación del Contrato de Confidencialidad de la Operación por todas las partes requeridas.'
  end;

  if not public.operacion_confidencialidad_completa(p_operacion_id) then
    v_missing := v_missing || jsonb_build_array(
      jsonb_build_object('codigo','CONFIDENCIALIDAD','mensaje',v_conf_message)
    );
  end if;

  select id into v_contract
  from public.contratos
  where operacion_id=p_operacion_id and estado='CONFIRMADO'
  limit 1;

  if v_contract is null then
    v_missing := v_missing || jsonb_build_array(
      jsonb_build_object('codigo','CONTRATO','mensaje','Falta contrato confirmado')
    );
  end if;

  if v_contract is not null then
    select not exists(
      select 1 from public.contrato_firmantes
      where contrato_id=v_contract and firmado=false
    ) into v_signed;
    if not coalesce(v_signed,false) then
      v_missing := v_missing || jsonb_build_array(
        jsonb_build_object('codigo','FIRMAS','mensaje','Faltan firmas obligatorias')
      );
    end if;
  end if;

  select exists(
    select 1 from public.facturas
    where operacion_id=p_operacion_id and estado='AUTORIZADA'
  ) into v_invoice;

  if not v_invoice then
    v_missing := v_missing || jsonb_build_array(
      jsonb_build_object('codigo','FACTURA','mensaje','Falta factura autorizada por ARCA')
    );
  end if;

  select not exists(
    select 1 from public.documentos_operacion
    where operacion_id=p_operacion_id
      and obligatorio=true
      and coalesce(aprobado,false)=false
  ) into v_docs;

  if not coalesce(v_docs,false) then
    v_missing := v_missing || jsonb_build_array(
      jsonb_build_object('codigo','DOCUMENTACION','mensaje','Faltan documentos obligatorios aprobados')
    );
  end if;

  return jsonb_build_object(
    'ok',jsonb_array_length(v_missing)=0,
    'faltantes',v_missing
  );
end;
$function$;
