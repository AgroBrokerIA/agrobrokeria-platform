-- Accept the ARCA milestone whether it is persisted with spaces or underscores.
create or replace function public.liberar_camion_tras_descarga_confirmada()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $function$
begin
 if upper(replace(trim(coalesce(new.carta_porte_estado,'')),' ','_'))='DESCARGADA_CONFIRMADA'
    and upper(replace(trim(coalesce(old.carta_porte_estado,'')),' ','_'))<>'DESCARGADA_CONFIRMADA'
    and new.logistica_camion_id is not null then
   update public.logistica_flota_camiones set estado_disponibilidad=true,actualizado_at=now()
   where id=new.logistica_camion_id;
 end if;
 return new;
end;
$function$;
revoke all on function public.liberar_camion_tras_descarga_confirmada() from public,anon,authenticated;
