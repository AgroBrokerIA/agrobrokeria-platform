create or replace function public.registrar_firma_electronica(p_token text,p_nombre text,p_consentimiento boolean,p_declaracion text,p_ip inet default null,p_user_agent text default null)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
 v_s public.firma_solicitudes%rowtype; v_evidence text; v_id uuid; v_rol text; v_all_signed boolean; v_required integer;
begin
 select * into v_s from public.firma_solicitudes where token_hash=encode(digest(p_token,'sha256'),'hex') for update;
 if not found then raise exception 'SIGN_REQUEST_NOT_FOUND'; end if;
 if v_s.estado<>'PENDIENTE' then raise exception 'SIGN_REQUEST_NOT_ACTIVE'; end if;
 if v_s.expira_at<now() then update public.firma_solicitudes set estado='EXPIRADO',actualizado_at=now() where id=v_s.id; raise exception 'SIGN_REQUEST_EXPIRED'; end if;
 if not p_consentimiento then raise exception 'CONSENT_REQUIRED'; end if;
 if lower(trim(coalesce(p_nombre,'')))<>lower(trim(v_s.firmante_nombre)) then raise exception 'SIGNER_NAME_MISMATCH'; end if;
 if length(trim(coalesce(p_declaracion,'')))<20 then raise exception 'DECLARATION_REQUIRED'; end if;
 v_evidence:=encode(digest(convert_to(v_s.documento_hash||'|'||trim(p_nombre)||'|'||trim(p_declaracion)||'|'||coalesce(p_user_agent,'')||'|'||coalesce(p_ip::text,''),'utf8'),'sha256'),'hex');
 insert into public.firmas_electronicas(solicitud_id,firmante_nombre,firmante_email,consentimiento,declaracion,firma_nombre,documento_hash,evidencia_hash,ip_address,user_agent)
 values(v_s.id,v_s.firmante_nombre,v_s.firmante_email,true,trim(p_declaracion),trim(p_nombre),v_s.documento_hash,v_evidence,p_ip,p_user_agent)
 returning id into v_id;
 update public.firma_solicitudes set estado='FIRMADO',firmado_at=now(),actualizado_at=now() where id=v_s.id;
 v_rol:=upper(trim(v_s.firmante_rol));

 if v_s.contrato_id is not null and v_rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO') then
   update public.contrato_firmantes set firmado=true,fecha_firma=now(),metodo_firma='ELECTRONICA'
   where contrato_id=v_s.contrato_id and rol=v_rol;
   if v_rol='VENDEDOR' then
     update public.operacion_control_comercial set vendedor_firma_estado='FIRMADO',fecha_firma_vendedor=now(),updated_at=now() where operacion_id=v_s.operacion_id;
   elsif v_rol='COMPRADOR' then
     update public.operacion_control_comercial set comprador_firma_estado='FIRMADO',fecha_firma_comprador=now(),updated_at=now() where operacion_id=v_s.operacion_id;
   else
     update public.operacion_control_comercial set intermediario_firma_estado='FIRMADO',fecha_firma_intermediario=now(),updated_at=now() where operacion_id=v_s.operacion_id;
   end if;
 end if;

 if v_s.contrato_id is not null then
   select 2 + case when exists(
     select 1 from public.operaciones o join public.operacion_participantes op on op.operacion_id=o.id
     where o.id=v_s.operacion_id and o.tipo_operacion='F1' and op.rol='INTERMEDIARIO'
   ) then 1 else 0 end into v_required;
   select
     count(*) >= v_required
     and not exists(
       select 1 from public.contrato_firmantes
       where contrato_id=v_s.contrato_id
         and rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO')
         and firmado=false
     )
   into v_all_signed
   from public.contrato_firmantes
   where contrato_id=v_s.contrato_id and rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO');
   if v_all_signed then
     update public.contratos set fecha_firma=coalesce(fecha_firma,current_date),updated_at=now() where id=v_s.contrato_id;
   end if;
 end if;

 insert into public.firma_eventos(solicitud_id,evento,ip_address,user_agent,metadata)
 values(v_s.id,'FIRMADO',p_ip,p_user_agent,jsonb_build_object('evidencia_hash',v_evidence,'firma_id',v_id,'firmante_rol',v_rol,'all_required_signed',coalesce(v_all_signed,false)));
 return jsonb_build_object('ok',true,'firma_id',v_id,'evidencia_hash',v_evidence,'firmado_at',now(),'firmante_rol',v_rol,'all_required_signed',coalesce(v_all_signed,false));
end;
$$;