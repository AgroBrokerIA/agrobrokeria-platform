create table if not exists public.fco(
 id uuid primary key default gen_random_uuid(),
 operacion_id uuid not null references public.operaciones(id) on delete restrict,
 empresa_emisora uuid references public.empresas(id) on delete set null,
 empresa_receptora uuid references public.empresas(id) on delete set null,
 fecha_emision date,
 estado varchar default 'BORRADOR',
 archivo_pdf text,
 creado_en timestamptz default now()
);
alter table public.fco enable row level security;
revoke all on table public.fco from anon,authenticated;
drop policy if exists fco_select_participante on public.fco;
create policy fco_select_participante on public.fco for select to authenticated using (public.usuario_participa_operacion(operacion_id));
create index if not exists idx_fco_operacion_id on public.fco(operacion_id);
create or replace function public.crear_fco_comercial(p_operacion_id uuid,p_archivo_pdf text default null)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid(); v_empresa uuid; v_id uuid;
begin
 if v_uid is null then raise exception 'No autorizado'; end if;
 select active_company_id into v_empresa from public.profiles where id=v_uid;
 if v_empresa is null or not public.usuario_es_miembro_empresa(v_empresa) then raise exception 'No hay una empresa activa válida'; end if;
 if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'No autorizado para la operación'; end if;
 if p_archivo_pdf is not null and (length(p_archivo_pdf)>1000000 or p_archivo_pdf !~ '^data:application/pdf;base64,') then raise exception 'Archivo PDF inválido o demasiado grande'; end if;
 insert into public.fco(operacion_id,empresa_emisora,fecha_emision,estado,archivo_pdf)
 values(p_operacion_id,v_empresa,current_date,'EMITIDO',p_archivo_pdf)
 returning id into v_id;
 return v_id;
end;
$$;
revoke all on function public.crear_fco_comercial(uuid,text) from public,anon;
grant execute on function public.crear_fco_comercial(uuid,text) to authenticated;