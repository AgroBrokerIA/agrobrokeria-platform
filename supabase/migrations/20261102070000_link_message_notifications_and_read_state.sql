ALTER TABLE public.notificaciones
 ADD COLUMN IF NOT EXISTS conversacion_id uuid REFERENCES public.conversaciones_publicaciones(id) ON DELETE SET NULL;

UPDATE public.notificaciones n
SET conversacion_id=c.id
FROM public.conversaciones_publicaciones c
WHERE n.tipo='MENSAJE_PUBLICACION'
  AND n.publicacion_id=c.publicacion_id
  AND n.profile_id IN(c.publicador_profile_id,c.interesado_profile_id)
  AND n.conversacion_id IS NULL;

CREATE OR REPLACE FUNCTION public.notificar_nuevo_mensaje_publicacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_recibe uuid; v_publicacion uuid; v_producto text; v_cantidad numeric; v_tipo text; v_conversacion uuid;
BEGIN
 SELECT CASE WHEN c.publicador_profile_id=NEW.remitente_profile_id THEN c.interesado_profile_id ELSE c.publicador_profile_id END,
        p.id,coalesce(pr.nombre,'Producto'),p.cantidad_tn,upper(coalesce(p.tipo,'PUBLICACION')),c.id
 INTO v_recibe,v_publicacion,v_producto,v_cantidad,v_tipo,v_conversacion
 FROM public.conversaciones_publicaciones c
 JOIN public.publicaciones p ON p.id=c.publicacion_id
 LEFT JOIN public.productos pr ON pr.id=p.producto_id
 WHERE c.id=NEW.conversacion_id
   AND NEW.remitente_profile_id IN(c.publicador_profile_id,c.interesado_profile_id);
 IF v_recibe IS NULL THEN RETURN NEW; END IF;
 INSERT INTO public.notificaciones(profile_id,titulo,mensaje,tipo,leida,publicacion_id,conversacion_id)
 VALUES(v_recibe,'Nuevo mensaje por '||v_producto,
 'Te enviaron un mensaje por tu publicación de '||v_producto||' ('||
 to_char(coalesce(v_cantidad,0),'FM999G999G990D00')||' TN, '||v_tipo||').',
 'MENSAJE_PUBLICACION',false,v_publicacion,v_conversacion);
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_notificacion_leida(p_notificacion_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid:=auth.uid(); v_rows integer;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 UPDATE public.notificaciones
 SET leida=true,actualizado_at=now()
 WHERE id=p_notificacion_id
   AND (profile_id=v_uid OR cuenta_id=v_uid)
   AND leida IS DISTINCT FROM true;
 GET DIAGNOSTICS v_rows=ROW_COUNT;
 IF v_rows=0 THEN
   IF EXISTS(SELECT 1 FROM public.notificaciones WHERE id=p_notificacion_id AND (profile_id=v_uid OR cuenta_id=v_uid)) THEN
     RETURN true;
   END IF;
   RAISE EXCEPTION 'NOTIFICACION_NO_AUTORIZADA_O_INEXISTENTE';
 END IF;
 RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.marcar_notificacion_leida(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_notificacion_leida(uuid) TO authenticated;
