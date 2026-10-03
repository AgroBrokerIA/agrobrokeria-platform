create or replace function public.crear_solicitud_firma_contrato(p_contrato_id uuid,p_firmante_email text,p_firmante_nombre text,p_firmante_rol text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid(); v_contrato public.contratos%rowtype; v_token text; v_hash text; v_id uuid; v_hash_doc text; v_empresa_firmante uuid; v_rol text; v_empresa_solicitante uuid;
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
 select active_company_id into v_empresa_solicitante from public.profiles where id=v_uid;
 if v_empresa_solicitante is null then raise exception 'ACTIVE_COMPANY_REQUIRED'; end if;
 if not exists(select 1 from public.operacion_participantes where operacion_id=v_contrato.operacion_id and empresa_id=v_empresa_solicitante) then
   raise exception 'SOLICITOR_NOT_PARTICIPANT';
 end if;
 if v_rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO') then
   select empresa_id into v_empresa_firmante from public.operacion_participantes
   where operacion_id=v_contrato.operacion_id and rol=v_rol order by id limit 1;
   if v_empresa_firmante is null then raise exception 'SIGNER_ROLE_NOT_PARTICIPANT'; end if;
   if v_empresa_solicitante<>v_empresa_firmante then raise exception 'SIGNER_ROLE_COMPANY_MISMATCH'; end if;
 else
   if not exists(select 1 from public.operacion_participantes where operacion_id=v_contrato.operacion_id and empresa_id=v_empresa_solicitante and rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO')) then
     raise exception 'PARTY_SIGNER_FORBIDDEN';
   end if;
 end if;
 if exists(select 1 from public.firma_solicitudes where contrato_id=p_contrato_id and lower(firmante_email)=lower(trim(p_firmante_email)) and estado='FIRMADO') then raise exception 'SIGNER_ALREADY_SIGNED'; end if;
 v_token:=encode(gen_random_bytes(32),'hex'); v_hash:=encode(digest(v_token,'sha256'),'hex');
 v_hash_doc:=encode(digest(convert_to(coalesce(v_contrato.contenido,''),'utf8'),'sha256'),'hex');
 insert into public.firma_solicitudes(contrato_id,operacion_id,empresa_solicitante_id,firmante_email,firmante_nombre,firmante_rol,token_hash,documento_hash,documento_tipo,documento_nombre,documento_contenido,creado_por)
 values(p_contrato_id,v_contrato.operacion_id,v_empresa_solicitante,trim(lower(p_firmante_email)),trim(p_firmante_nombre),v_rol,v_hash,v_hash_doc,'CONTRATO',coalesce(v_contrato.numero_contrato,'Contrato')||'.txt',coalesce(v_contrato.contenido,''),v_uid)
 returning id into v_id;
 if v_rol in ('VENDEDOR','COMPRADOR','INTERMEDIARIO') then
   insert into public.contrato_firmantes(contrato_id,empresa_id,rol,firmado,metodo_firma)
   values(p_contrato_id,v_empresa_firmante,v_rol,false,'ELECTRONICA') on conflict do nothing;
 end if;
 insert into public.firma_eventos(solicitud_id,actor_profile_id,evento,metadata)
 values(v_id,v_uid,'SOLICITADA',jsonb_build_object('firmante_rol',v_rol));
 return jsonb_build_object('id',v_id,'token',v_token,'expira_at',now()+interval '72 hours');
end; $$;
revoke execute on function public.crear_solicitud_firma_contrato(uuid,text,text,text) from public,anon;
grant execute on function public.crear_solicitud_firma_contrato(uuid,text,text,text) to authenticated;
