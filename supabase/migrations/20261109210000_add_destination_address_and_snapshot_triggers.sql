-- Persist optional street address and derive the full destination snapshot server-side.
alter table public.destinos_homologados add column if not exists direccion varchar(250);
alter table public.contratos add column if not exists direccion_destino varchar(250);
alter table public.publicaciones add column if not exists direccion_destino varchar(250);

create or replace function public.sincronizar_snapshot_destino_homologado()
returns trigger language plpgsql set search_path to 'public','pg_temp'
as $function$
declare v_destino public.destinos_homologados%rowtype;
begin
 if new.destino_homologado_id is null then return new; end if;
 select * into v_destino from public.destinos_homologados
 where id_destino=new.destino_homologado_id and activo=true;
 if not found then raise exception 'DESTINO_NO_ACTIVO_O_INEXISTENTE'; end if;
 if new.categoria_destino is not null and new.categoria_destino<>v_destino.tipo then
  raise exception 'CATEGORIA_DESTINO_NO_COINCIDE';
 end if;
 new.categoria_destino:=v_destino.tipo;
 new.nombre_establecimiento_destino:=v_destino.nombre_establecimiento;
 new.localidad_destino:=v_destino.localidad;
 new.provincia_destino:=v_destino.provincia;
 new.direccion_destino:=v_destino.direccion;
 return new;
end;
$function$;

drop trigger if exists trg_contratos_sync_destino_homologado on public.contratos;
create trigger trg_contratos_sync_destino_homologado
before insert or update of destino_homologado_id,categoria_destino on public.contratos
for each row execute function public.sincronizar_snapshot_destino_homologado();

drop trigger if exists trg_publicaciones_sync_destino_homologado on public.publicaciones;
create trigger trg_publicaciones_sync_destino_homologado
before insert or update of destino_homologado_id,categoria_destino on public.publicaciones
for each row execute function public.sincronizar_snapshot_destino_homologado();
