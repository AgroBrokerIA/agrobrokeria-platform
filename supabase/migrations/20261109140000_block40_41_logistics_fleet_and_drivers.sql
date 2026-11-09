-- BLOQUES 40-41: actividad logística y legajos de flota/choferes.
alter table public.account_onboarding drop constraint if exists account_onboarding_tipo_operador_check;
alter table public.account_onboarding add constraint account_onboarding_tipo_operador_check
 check (tipo_operador is null or tipo_operador in ('productor','acopio','cooperativa','corredor_oficial','comisionista_intermediario','exportador','transportista','logistica'));
alter table public.empresas drop constraint if exists empresas_tipo_operador_check;
alter table public.empresas add constraint empresas_tipo_operador_check
 check (tipo_operador is null or tipo_operador in ('productor','acopio','cooperativa','corredor_oficial','comisionista_intermediario','exportador','transportista','logistica'));

create table if not exists public.logistica_flota_camiones (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.empresas(id) on delete restrict,
 patente_chasis varchar(7) not null,
 patente_acoplado varchar(7),
 marca_modelo varchar(100),
 estado_disponibilidad boolean not null default true,
 activo boolean not null default true,
 creado_por uuid not null default auth.uid() references auth.users(id),
 creado_at timestamptz not null default now(),
 actualizado_at timestamptz not null default now(),
 constraint logistica_flota_camiones_patente_chasis_format check (patente_chasis ~ '^[A-Za-z0-9]{6,7}$'),
 constraint logistica_flota_camiones_patente_acoplado_format check (patente_acoplado is null or patente_acoplado ~ '^[A-Za-z0-9]{6,7}$'),
 constraint logistica_flota_camiones_patente_chasis_unique unique (patente_chasis)
);
create index if not exists idx_logistica_flota_camiones_empresa on public.logistica_flota_camiones(empresa_id,activo,estado_disponibilidad);
create table if not exists public.logistica_choferes (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.empresas(id) on delete restrict,
 cuil_chofer varchar(11) not null,
 nombre_apellido varchar(150) not null,
 telefono_celular varchar(30) not null,
 numero_licencia_linti varchar(30),
 activo boolean not null default true,
 creado_por uuid not null default auth.uid() references auth.users(id),
 creado_at timestamptz not null default now(),
 actualizado_at timestamptz not null default now(),
 constraint logistica_choferes_cuil_format check (cuil_chofer ~ '^[0-9]{11}$'),
 constraint logistica_choferes_cuil_unique unique (cuil_chofer)
);
create index if not exists idx_logistica_choferes_empresa on public.logistica_choferes(empresa_id,activo);
alter table public.viajes add column if not exists logistica_camion_id uuid references public.logistica_flota_camiones(id) on delete restrict;
alter table public.viajes add column if not exists logistica_chofer_id uuid references public.logistica_choferes(id) on delete restrict;

alter table public.logistica_flota_camiones enable row level security;
alter table public.logistica_choferes enable row level security;
drop policy if exists logistica_flota_select_member on public.logistica_flota_camiones;
create policy logistica_flota_select_member on public.logistica_flota_camiones for select to authenticated using (public.usuario_es_miembro_empresa(empresa_id) or public.es_administrador_plataforma());
drop policy if exists logistica_flota_insert_member on public.logistica_flota_camiones;
create policy logistica_flota_insert_member on public.logistica_flota_camiones for insert to authenticated with check (public.usuario_es_miembro_empresa(empresa_id) and creado_por=auth.uid());
drop policy if exists logistica_flota_update_member on public.logistica_flota_camiones;
create policy logistica_flota_update_member on public.logistica_flota_camiones for update to authenticated using (public.usuario_es_miembro_empresa(empresa_id) or public.es_administrador_plataforma()) with check (public.usuario_es_miembro_empresa(empresa_id) or public.es_administrador_plataforma());
drop policy if exists logistica_flota_delete_member on public.logistica_flota_camiones;
create policy logistica_flota_delete_member on public.logistica_flota_camiones for delete to authenticated using (public.usuario_es_miembro_empresa(empresa_id) or public.es_administrador_plataforma());
drop policy if exists logistica_choferes_select_member on public.logistica_choferes;
create policy logistica_choferes_select_member on public.logistica_choferes for select to authenticated using (public.usuario_es_miembro_empresa(empresa_id) or public.es_administrador_plataforma());
drop policy if exists logistica_choferes_insert_member on public.logistica_choferes;
create policy logistica_choferes_insert_member on public.logistica_choferes for insert to authenticated with check (public.usuario_es_miembro_empresa(empresa_id) and creado_por=auth.uid());
drop policy if exists logistica_choferes_update_member on public.logistica_choferes;
create policy logistica_choferes_update_member on public.logistica_choferes for update to authenticated using (public.usuario_es_miembro_empresa(empresa_id) or public.es_administrador_plataforma()) with check (public.usuario_es_miembro_empresa(empresa_id) or public.es_administrador_plataforma());
drop policy if exists logistica_choferes_delete_member on public.logistica_choferes;
create policy logistica_choferes_delete_member on public.logistica_choferes for delete to authenticated using (public.usuario_es_miembro_empresa(empresa_id) or public.es_administrador_plataforma());

create or replace function public.asignar_recursos_flota_a_viaje(p_viaje_id uuid,p_camion_id uuid,p_chofer_id uuid)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $function$
declare v_viaje public.viajes%rowtype;v_cierre public.cierres_logistica%rowtype;v_camion public.logistica_flota_camiones%rowtype;v_chofer public.logistica_choferes%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_viaje from public.viajes where id=p_viaje_id for update;
 if not found then raise exception 'VIAJE_NO_ENCONTRADO';end if;
 if not public.usuario_puede_gestionar_logistica_operacion(v_viaje.operacion_id) then raise exception 'FORBIDDEN';end if;
 select * into v_cierre from public.cierres_logistica where id=v_viaje.cierre_logistica_id and estado_cierre='cerrado_formal' and estado_pago_comision_logistica='aprobado';
 if not found then raise exception 'COMISION_LOGISTICA_NO_APROBADA';end if;
 if not public.usuario_es_miembro_empresa(v_cierre.empresa_transportista_id) then raise exception 'NO_ES_MIEMBRO_EMPRESA_TRANSPORTISTA';end if;
 select * into v_camion from public.logistica_flota_camiones where id=p_camion_id and empresa_id=v_cierre.empresa_transportista_id and activo=true for update;
 if not found then raise exception 'CAMION_NO_PERTENECE_A_EMPRESA';end if;
 if not v_camion.estado_disponibilidad then raise exception 'CAMION_NO_DISPONIBLE';end if;
 select * into v_chofer from public.logistica_choferes where id=p_chofer_id and empresa_id=v_cierre.empresa_transportista_id and activo=true;
 if not found then raise exception 'CHOFER_NO_PERTENECE_A_EMPRESA';end if;
 if v_viaje.logistica_camion_id is not null and v_viaje.logistica_camion_id<>p_camion_id then update public.logistica_flota_camiones set estado_disponibilidad=true,actualizado_at=now() where id=v_viaje.logistica_camion_id;end if;
 update public.logistica_flota_camiones set estado_disponibilidad=false,actualizado_at=now() where id=p_camion_id;
 update public.viajes set logistica_camion_id=p_camion_id,logistica_chofer_id=p_chofer_id,patente_camion=v_camion.patente_chasis,patente_acoplado=v_camion.patente_acoplado,chofer_nombre=v_chofer.nombre_apellido,chofer_cuil=v_chofer.cuil_chofer,actualizado_at=now() where id=p_viaje_id;
end;$function$;
revoke all on function public.asignar_recursos_flota_a_viaje(uuid,uuid,uuid) from public,anon;
grant execute on function public.asignar_recursos_flota_a_viaje(uuid,uuid,uuid) to authenticated;

create or replace function public.liberar_camion_tras_descarga_confirmada()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $function$
begin
 if new.carta_porte_estado='DESCARGADA_CONFIRMADA' and coalesce(old.carta_porte_estado,'')<>'DESCARGADA_CONFIRMADA' and new.logistica_camion_id is not null then
  update public.logistica_flota_camiones set estado_disponibilidad=true,actualizado_at=now() where id=new.logistica_camion_id;
 end if;
 return new;
end;$function$;
drop trigger if exists trg_liberar_camion_tras_descarga_confirmada on public.viajes;
create trigger trg_liberar_camion_tras_descarga_confirmada after update of carta_porte_estado on public.viajes for each row execute function public.liberar_camion_tras_descarga_confirmada();
comment on table public.logistica_flota_camiones is 'Flota propia de cada empresa logística; la disponibilidad se bloquea al asignar un viaje y se libera ante confirmación de descarga registrada por la integración ARCA.';
comment on table public.logistica_choferes is 'Choferes habilitados declarados por cada empresa logística. CUIL y contacto son datos privados de la empresa y administración.';
