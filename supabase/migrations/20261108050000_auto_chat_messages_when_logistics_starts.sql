create or replace function public.notificar_inicio_logistica_viaje()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
 v_dest record;
 v_first boolean;
 v_message text;
begin
 if new.transportista_profile_id is null then return new; end if;
 select not exists(
   select 1 from public.viajes v
   where v.operacion_id=new.operacion_id
     and v.id<>new.id
     and v.transportista_profile_id is not null
 ) into v_first;
 if not v_first then return new; end if;

 update public.operaciones
 set estado='EN_LOGISTICA'
 where id=new.operacion_id and upper(estado) in ('ACEPTADA','CONFIRMADA','CONTRATO_CONFIRMADO');

 update public.contratos
 set estado='EN_LOGISTICA'
 where operacion_id=new.operacion_id and upper(estado) in ('CONFIRMADO','CONFIRMADA');

 for v_dest in
   select distinct cu.profile_id,op.empresa_id,upper(op.rol) as rol
   from public.operacion_participantes op
   join public.company_empresa_map cem on cem.empresa_id=op.empresa_id and cem.verified=true
   join public.company_users cu on cu.company_id=cem.company_id and cu.activo=true
   where op.operacion_id=new.operacion_id
 loop
   v_message:='⚙️ [AgroBrokerIA Bot]: ¡Contrato formalizado! La operación pasó a estado EN LOGÍSTICA. Ya está habilitado el canal de documentación de transporte y asignación de choferes. La comisión tecnológica se registra en estado pendiente/retención contable hasta la confirmación documentada de la descarga. Los pagos de mercadería y flete se realizan directamente entre las partes.';
   if not exists(select 1 from public.mensajes_comerciales m where m.operacion_id=new.operacion_id and m.destinatario_profile_id=v_dest.profile_id and m.categoria_comercial='B28_LOGISTICA_INICIO') then
     insert into public.mensajes_comerciales(operacion_id,remitente_profile_id,remitente_empresa_id,destinatario_profile_id,destinatario_empresa_id,mensaje,tipo_mensaje,estado,idioma_origen,categoria_comercial,moderacion_estado)
     values(new.operacion_id,null,null,v_dest.profile_id,v_dest.empresa_id,v_message,'SISTEMA','ENVIADO','es','B28_LOGISTICA_INICIO','APROBADO');
   end if;

   v_message:='📝 [AgroBrokerIA Bot]: Para habilitar la salida del transporte, el viaje debe contar con una Carta de Porte Electrónica (CPE) válida emitida por ARCA. Verificá que el CTG, producto, CUIT de origen/destino, toneladas y dominios coincidan con los datos de la operación. Adjuntá el PDF oficial al expediente logístico.';
   if not exists(select 1 from public.mensajes_comerciales m where m.operacion_id=new.operacion_id and m.destinatario_profile_id=v_dest.profile_id and m.categoria_comercial='B28_CPE_RECORDATORIO') then
     insert into public.mensajes_comerciales(operacion_id,remitente_profile_id,remitente_empresa_id,destinatario_profile_id,destinatario_empresa_id,mensaje,tipo_mensaje,estado,idioma_origen,categoria_comercial,moderacion_estado)
     values(new.operacion_id,null,null,v_dest.profile_id,v_dest.empresa_id,v_message,'SISTEMA','ENVIADO','es','B28_CPE_RECORDATORIO','APROBADO');
   end if;

   if v_dest.rol='INTERMEDIARIO' then
     v_message:='🤝 [AgroBrokerIA Bot]: Se registra la participación del intermediario en esta operación. Los honorarios privados de corretaje o intermediación tradicional, si los hubiera, deben pactarse, facturarse y liquidarse externamente entre las partes. AgroBrokerIA no los cobra ni los administra.';
     if not exists(select 1 from public.mensajes_comerciales m where m.operacion_id=new.operacion_id and m.destinatario_profile_id=v_dest.profile_id and m.categoria_comercial='B28_INTERMEDIARIO_EXTERNO') then
       insert into public.mensajes_comerciales(operacion_id,remitente_profile_id,remitente_empresa_id,destinatario_profile_id,destinatario_empresa_id,mensaje,tipo_mensaje,estado,idioma_origen,categoria_comercial,moderacion_estado)
       values(new.operacion_id,null,null,v_dest.profile_id,v_dest.empresa_id,v_message,'SISTEMA','ENVIADO','es','B28_INTERMEDIARIO_EXTERNO','APROBADO');
     end if;
   end if;
 end loop;

 v_message:='🚚 [AgroBrokerIA Bot - Alerta móvil]: Tu viaje fue asignado. Cuando la CPE esté validada, abrí “Mis viajes”, presioná “Iniciar seguimiento GPS” al comenzar el recorrido y permití la geolocalización durante el viaje. Podés detener el seguimiento al finalizar.';
 if not exists(select 1 from public.mensajes_comerciales m where m.operacion_id=new.operacion_id and m.destinatario_profile_id=new.transportista_profile_id and m.categoria_comercial='B28_INICIO_GPS') then
   insert into public.mensajes_comerciales(operacion_id,remitente_profile_id,remitente_empresa_id,destinatario_profile_id,mensaje,tipo_mensaje,estado,idioma_origen,categoria_comercial,moderacion_estado)
   values(new.operacion_id,null,null,new.transportista_profile_id,v_message,'SISTEMA','ENVIADO','es','B28_INICIO_GPS','APROBADO');
 end if;
 return new;
end;
$$;
drop trigger if exists trg_notificar_inicio_logistica_viaje on public.viajes;
create trigger trg_notificar_inicio_logistica_viaje
after insert or update of transportista_profile_id,vehiculo_id on public.viajes
for each row when (new.transportista_profile_id is not null)
execute function public.notificar_inicio_logistica_viaje();
