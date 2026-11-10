-- 24-hour no-objection confirmation and proportional commission release.
-- Accounting release only; this job never initiates a bank transfer.
alter table public.viajes
 add column if not exists receptor_objecion_hasta timestamptz,
 add column if not exists entrega_liberada_auto_at timestamptz;

update public.viajes set receptor_objecion_hasta=transportista_entrega_confirmada_at+interval '24 hours'
where transportista_entrega_confirmada_at is not null and receptor_objecion_hasta is null;

create or replace function public.fijar_plazo_objecion_entrega_viaje()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then
  if new.transportista_entrega_confirmada_at is not null then new.receptor_objecion_hasta:=new.transportista_entrega_confirmada_at+interval '24 hours'; end if;
 elsif new.transportista_entrega_confirmada_at is distinct from old.transportista_entrega_confirmada_at then
  if new.transportista_entrega_confirmada_at is null then new.receptor_objecion_hasta:=null;
  else new.receptor_objecion_hasta:=new.transportista_entrega_confirmada_at+interval '24 hours'; end if;
 elsif new.transportista_entrega_confirmada_at is not null and new.receptor_objecion_hasta is null then
  new.receptor_objecion_hasta:=new.transportista_entrega_confirmada_at+interval '24 hours';
 end if;
 return new;
end $$;
drop trigger if exists trg_fijar_plazo_objecion_entrega_viaje on public.viajes;
create trigger trg_fijar_plazo_objecion_entrega_viaje
before insert or update of transportista_entrega_confirmada_at on public.viajes
for each row execute function public.fijar_plazo_objecion_entrega_viaje();

-- Keep the existing bank verification, allocation, evidence, and CPE checks.
-- Only the producer acknowledgement condition is extended to the expired no-objection path.
do $$
declare d text; a text; b text; x text; y text;
begin
 d:=pg_get_functiondef('public.intentar_liberar_comision_agrobrokeria(uuid)'::regprocedure);
 a:='select a.id,a.viaje_id,a.importe_asignado,v.transportista_entrega_confirmada_at,v.productor_recepcion_confirmada_at,v.estado,v.productor_recepcion_observada_at,v.transportista_kilos_entregados,v.productor_kilos_recibidos from public.operacion_comision_viajes a join public.viajes v on v.id=a.viaje_id where a.retencion_id=v_r.id and a.estado=''RETENIDA'' for update of a';
 b:='select a.id,a.viaje_id,a.importe_asignado,v.transportista_entrega_confirmada_at,v.productor_recepcion_confirmada_at,v.estado,v.productor_recepcion_observada_at,v.transportista_kilos_entregados,v.productor_kilos_recibidos,v.transportista_entrega_evidencia_path,v.entrega_liberada_auto_at,v.receptor_objecion_hasta from public.operacion_comision_viajes a join public.viajes v on v.id=a.viaje_id where a.retencion_id=v_r.id and a.estado=''RETENIDA'' for update of a';
 if position(a in d)=0 then raise exception 'AUTO_RELEASE_ALLOCATION_SELECT_ANCHOR_NOT_FOUND'; end if;
 d:=replace(d,a,b);
 x:='if v_row.transportista_entrega_confirmada_at is not null and v_row.productor_recepcion_confirmada_at is not null and v_row.estado=''ENTREGADO_CONFIRMADO'' and v_row.productor_recepcion_observada_at is null and v_row.transportista_kilos_entregados is not null and v_row.productor_kilos_recibidos=v_row.transportista_kilos_entregados and exists(select 1 from public.viaje_cartas_porte cp where cp.viaje_id=v_row.viaje_id and cp.estado_verificacion=''VALIDADA'') then';
 y:='if v_row.transportista_entrega_confirmada_at is not null and v_row.estado=''ENTREGADO_CONFIRMADO'' and v_row.productor_recepcion_observada_at is null and v_row.transportista_kilos_entregados is not null and ((v_row.productor_recepcion_confirmada_at is not null and v_row.productor_kilos_recibidos=v_row.transportista_kilos_entregados) or (v_row.productor_recepcion_confirmada_at is null and v_row.entrega_liberada_auto_at is not null and v_row.receptor_objecion_hasta is not null and v_row.receptor_objecion_hasta<=now() and coalesce(v_row.transportista_entrega_evidencia_path,'''')<>'''')) and exists(select 1 from public.viaje_cartas_porte cp where cp.viaje_id=v_row.viaje_id and cp.estado_verificacion=''VALIDADA'') then';
 if position(x in d)=0 then raise exception 'AUTO_RELEASE_CONFIRMATION_GATE_ANCHOR_NOT_FOUND'; end if;
 d:=replace(d,x,y);
 execute d;
end $$;

-- Late confirmations/objections are routed to Admin; the 24-hour decision is immutable.
do $$
declare d text; a text; b text;
begin
 d:=pg_get_functiondef('public.confirmar_recepcion_productor(uuid,numeric,boolean,text,text)'::regprocedure);
 a:='IF NOT FOUND THEN RAISE EXCEPTION ''TRIP_NOT_FOUND''; END IF;';
 b:=a||E'\n IF v_v.entrega_liberada_auto_at IS NOT NULL THEN RAISE EXCEPTION ''AUTO_RELEASE_ALREADY_FINALIZED_CONTACT_ADMIN''; END IF;';
 if position(a in d)=0 then raise exception 'LATE_RECEIPT_GUARD_ANCHOR_NOT_FOUND'; end if;
 execute replace(d,a,b);
end $$;

create or replace function public.procesar_liberaciones_automaticas_viajes()
returns integer language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare admin_id uuid; t record; release_result jsonb; done integer:=0; cpe_kilos numeric;
begin
 select user_id into admin_id from public.platform_admins order by created_at limit 1;
 if admin_id is null then raise exception 'PLATFORM_ADMIN_REQUIRED_FOR_AUTOMATIC_RELEASE'; end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id::text,'role','authenticated')::text,true);

 for t in
  select v.id,v.operacion_id,v.transportista_profile_id,v.transportista_kilos_entregados,v.transportista_entrega_evidencia_path
  from public.viajes v
  where v.estado='ESPERANDO_RECEPCION_PRODUCTOR'
   and v.transportista_entrega_confirmada_at is not null
   and v.receptor_objecion_hasta<=now()
   and v.productor_recepcion_confirmada_at is null and v.productor_recepcion_observada_at is null
   and v.transportista_profile_id is not null and v.transportista_kilos_entregados>0
   and coalesce(v.transportista_entrega_evidencia_path,'')<>''
   and v.transportista_entrega_evidencia_path like v.operacion_id::text||'/logistica/'||v.id::text||'/entrega/'||v.transportista_profile_id::text||'-%'
   and exists(select 1 from storage.objects so where so.bucket_id='documentos-operacion' and so.name=v.transportista_entrega_evidencia_path and so.owner_id::text=v.transportista_profile_id::text)
   and exists(select 1 from public.viaje_cartas_porte cp where cp.viaje_id=v.id and cp.estado_verificacion='VALIDADA')
   and exists(select 1 from public.operacion_comision_viajes a join public.operacion_comision_retenciones r on r.id=a.retencion_id where a.viaje_id=v.id and a.estado='RETENIDA' and r.estado='RETENIDA' and r.verificado_at is not null and r.verificado_por is not null)
  order by v.receptor_objecion_hasta,v.id for update of v skip locked
 loop
  select coalesce(sum(kilos_declarados),0) into cpe_kilos from public.viaje_cartas_porte where viaje_id=t.id and estado_verificacion='VALIDADA';
  if cpe_kilos<=0 or t.transportista_kilos_entregados>cpe_kilos then continue; end if;

  update public.viajes set estado='ENTREGADO_CONFIRMADO',kilos_entregados=transportista_kilos_entregados,
   entregado_confirmado_por=transportista_profile_id,entregado_confirmado_at=now(),entrega_liberada_auto_at=now(),actualizado_at=now()
  where id=t.id and estado='ESPERANDO_RECEPCION_PRODUCTOR' and productor_recepcion_confirmada_at is null and productor_recepcion_observada_at is null;
  if not found then continue; end if;

  insert into public.viaje_eventos(viaje_id,operacion_id,estado,toneladas,observaciones,registrado_por)
  values(t.id,t.operacion_id,'ENTREGA_AUTOCONFIRMADA_POR_SILENCIO',t.transportista_kilos_entregados/1000,
   'Venció el plazo de 24 horas desde la entrega documentada sin objeciones. Confirmación automática para liquidación contable; no constituye transferencia bancaria.',admin_id);

  release_result:=public.intentar_liberar_comision_agrobrokeria(t.operacion_id);
  if coalesce((release_result->>'liberaciones_nuevas')::integer,0)>0 then
   insert into public.notificaciones(profile_id,titulo,mensaje,tipo,operacion_id,leida,creada_en,actualizado_at)
   select distinct cu.profile_id,'Comisión liberada por entrega sin objeciones',
    'Venció el plazo de 24 horas sin objeciones. La comisión de este camión fue liberada contablemente; no se genera una transferencia bancaria automática.',
    'COMISION_CAMION_LIBERADA_AUTO',t.operacion_id,false,now(),now()
   from public.operacion_participantes op join public.company_empresa_map cem on cem.empresa_id=op.empresa_id
   join public.company_users cu on cu.company_id=cem.company_id and cu.activo=true
   where op.operacion_id=t.operacion_id and lower(trim(op.rol)) in ('comprador','buyer','vendedor','productor','seller')
   union
   select distinct cu.profile_id,'Comisión liberada por entrega sin objeciones',
    'Venció el plazo de 24 horas sin objeciones. La comisión de este camión fue liberada contablemente; no se genera una transferencia bancaria automática.',
    'COMISION_CAMION_LIBERADA_AUTO',t.operacion_id,false,now(),now()
   from public.operacion_participantes op join public.company_users cu on cu.company_id=op.empresa_id and cu.activo=true
   where op.operacion_id=t.operacion_id and lower(trim(op.rol)) in ('comprador','buyer','vendedor','productor','seller');
   insert into public.notificaciones(profile_id,titulo,mensaje,tipo,operacion_id,leida,creada_en,actualizado_at)
   values(t.transportista_profile_id,'Entrega validada y comisión liberada',
    'Tu entrega quedó validada automáticamente al vencer las 24 horas sin objeciones. La comisión se liberó contablemente.',
    'COMISION_CAMION_LIBERADA_AUTO',t.operacion_id,false,now(),now());
  end if;
  done:=done+1;
 end loop;
 return done;
end $$;

revoke all on function public.procesar_liberaciones_automaticas_viajes() from public,anon,authenticated;
grant execute on function public.procesar_liberaciones_automaticas_viajes() to service_role;

do $$
begin
 if exists(select 1 from cron.job where jobname='agrobrokeria-liberacion-auto-entregas-15m') then perform cron.unschedule('agrobrokeria-liberacion-auto-entregas-15m'); end if;
 perform cron.schedule('agrobrokeria-liberacion-auto-entregas-15m','*/15 * * * *','select public.procesar_liberaciones_automaticas_viajes();');
end $$;
