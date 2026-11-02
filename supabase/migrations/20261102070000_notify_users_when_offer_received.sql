-- Notify every active user of the company that owns the publication
-- whenever a new negotiation offer is recorded.
create or replace function public.notificar_oferta_recibida()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publicacion public.publicaciones%rowtype;
  v_emisor text;
begin
  select * into v_publicacion
  from public.publicaciones
  where id = new.publicacion_id;

  if not found then
    raise exception 'PUBLICACION_DE_OFERTA_INEXISTENTE';
  end if;

  select coalesce(nullif(trim(p.nombre_completo), ''), nullif(trim(p.email), ''), 'Un usuario')
    into v_emisor
  from public.profiles p
  where p.id = auth.uid();

  insert into public.notificaciones
    (profile_id, titulo, mensaje, tipo, leida, operacion_id, oferta_id, publicacion_id, creada_en)
  select
    cu.profile_id,
    'Nueva oferta recibida',
    v_emisor || ' envió una oferta sobre tu publicación. Revisá el precio, el volumen y las condiciones.',
    'OFERTA_RECIBIDA',
    false,
    new.operacion_id,
    new.id,
    new.publicacion_id,
    now()
  from public.company_users cu
  where cu.company_id = v_publicacion.empresa_id
    and cu.activo = true
    and cu.profile_id is distinct from auth.uid();

  return new;
end;
$$;

drop trigger if exists trg_notificar_oferta_recibida on public.ofertas_negociacion;
create trigger trg_notificar_oferta_recibida
after insert on public.ofertas_negociacion
for each row execute function public.notificar_oferta_recibida();

revoke all on function public.notificar_oferta_recibida() from public, anon, authenticated;
