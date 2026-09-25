create or replace function public.crear_solicitud_firma_contrato(p_contrato_id uuid,p_firmante_email text,p_firmante_nombre text,p_firmante_rol text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
 v_uid uuid:=auth.uid(); v_contrato public.contratos%rowtype; v_token text; v_hash text; v_id uuid; v_hash_doc text; v_empresa_firmante uuid; v_rol text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_contrato from public.contratos where id=p_contrato_id for update;
 if not found then raise exception 'CONTRACT_NOT_FOUND'; end if;
 if not public.usuario_participa_operacion(v_contrato.operacion_id) then raise exception 'FORBIDDEN'; end if;
 if v_contrato.estado<>'CONFIRMADO' then raise exception 'CONTRACT_MUST_BE_CONFIRMED'; end if;
 if nullif(trim(p_firmante_email),'') is null or nullif(trim(p_firmante_nombre),'') is null then raise exception 'SIGNER_DATA_REQUIRED'; end if;
 if trim(p_firmante_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'SIGNER_EMAIL_INVALID'; end if;
 v_rol:=upper(trim(coalesce(p_firmante_rol,'')));
 if v_rol not in ('VENDEDOR','COMPRADOR','INTERMEDIARIO','PARTE') then raise exception 'SIGNER_ROLE_INVALID'; end if;
 if exists(select 1 from public.firma_solicitudes where contrato_id=p_contrato_id and lower(firmante_email)=lower(trim(p_firmante_email)) and estado='FIRMADO') then
   raise exception 'SIGNER_ALREADY_SIGNED';
 end if;
 if v_rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO') then
   select empresa_id into v_empresa_firmante
   from public.operacion_participantes
   where operacion_id=v_contrato.operacion_id and rol=v_rol
   order by id limit 1;
   if v_empresa_firmante is null then raise exception 'SIGNER_ROLE_NOT_PARTICIPANT'; end if;
 end if;
 v_token:=encode(gen_random_bytes(32),'hex');
 v_hash:=encode(digest(v_token,'sha256'),'hex');
 v_hash_doc:=encode(digest(convert_to(coalesce(v_contrato.contenido,''),'utf8'),'sha256'),'hex');
 insert into public.firma_solicitudes(contrato_id,operacion_id,empresa_solicitante_id,firmante_email,firmante_nombre,firmante_rol,token_hash,documento_hash,documento_tipo,documento_nombre,documento_contenido,creado_por)
 select p_contrato_id,v_contrato.operacion_id,p.active_company_id,trim(lower(p_firmante_email)),trim(p_firmante_nombre),v_rol,v_hash,v_hash_doc,'CONTRATO',coalesce(v_contrato.numero_contrato,'Contrato')||'.txt',coalesce(v_contrato.contenido,''),v_uid
 from public.profiles p where p.id=v_uid returning id into v_id;
 if v_rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO') then
   insert into public.contrato_firmantes(contrato_id,empresa_id,rol,firmado,metodo_firma)
   values(p_contrato_id,v_empresa_firmante,v_rol,false,'ELECTRONICA')
   on conflict do nothing;
 end if;
 insert into public.firma_eventos(solicitud_id,actor_profile_id,evento,metadata)
 values(v_id,v_uid,'SOLICITADA',jsonb_build_object('firmante_rol',v_rol));
 return jsonb_build_object('id',v_id,'token',v_token,'expira_at',now()+interval '72 hours');
end;
$$;

create or replace function public.registrar_firma_electronica(p_token text,p_nombre text,p_consentimiento boolean,p_declaracion text,p_ip inet default null,p_user_agent text default null)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
 v_s public.firma_solicitudes%rowtype; v_evidence text; v_id uuid; v_rol text; v_all_signed boolean;
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
   update public.contrato_firmantes
   set firmado=true,fecha_firma=now(),metodo_firma='ELECTRONICA'
   where contrato_id=v_s.contrato_id and rol=v_rol;
   if v_rol='VENDEDOR' then
     update public.operacion_control_comercial set vendedor_firma_estado='FIRMADO',fecha_firma_vendedor=now(),updated_at=now() where operacion_id=v_s.operacion_id;
   elsif v_rol='COMPRADOR' then
     update public.operacion_control_comercial set comprador_firma_estado='FIRMADO',fecha_firma_comprador=now(),updated_at=now() where operacion_id=v_s.operacion_id;
   elsif v_rol='INTERMEDIARIO' then
     update public.operacion_control_comercial set intermediario_firma_estado='FIRMADO',fecha_firma_intermediario=now(),updated_at=now() where operacion_id=v_s.operacion_id;
   end if;
 end if;

 if v_s.contrato_id is not null then
   select not exists(select 1 from public.contrato_firmantes where contrato_id=v_s.contrato_id and firmado=false) into v_all_signed;
   if v_all_signed then
     update public.contratos set fecha_firma=coalesce(fecha_firma,current_date),updated_at=now() where id=v_s.contrato_id;
   end if;
 end if;

 insert into public.firma_eventos(solicitud_id,evento,ip_address,user_agent,metadata)
 values(v_s.id,'FIRMADO',p_ip,p_user_agent,jsonb_build_object('evidencia_hash',v_evidence,'firma_id',v_id,'firmante_rol',v_rol));
 return jsonb_build_object('ok',true,'firma_id',v_id,'evidencia_hash',v_evidence,'firmado_at',now(),'firmante_rol',v_rol);
end;
$$;

revoke all on function public.crear_solicitud_firma_contrato(uuid,text,text,text) from public,anon;
grant execute on function public.crear_solicitud_firma_contrato(uuid,text,text,text) to authenticated;
revoke all on function public.registrar_firma_electronica(text,text,boolean,text,inet,text) from public,anon,authenticated;
grant execute on function public.registrar_firma_electronica(text,text,boolean,text,inet,text) to service_role;