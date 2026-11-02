-- Unified inbox support for Marketplace publication conversations.
CREATE OR REPLACE FUNCTION public.listar_conversaciones_publicaciones()
RETURNS TABLE(
  conversacion_id uuid,
  publicacion_id uuid,
  tipo_publicacion text,
  producto text,
  cantidad_tn numeric,
  publicador_profile_id uuid,
  interesado_profile_id uuid,
  otro_usuario_nombre text,
  ultimo_mensaje text,
  ultimo_mensaje_at timestamptz,
  no_leidos bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  RETURN QUERY
  SELECT c.id,p.id,upper(coalesce(p.tipo,'')),coalesce(pr.nombre,'Producto'),
         p.cantidad_tn,c.publicador_profile_id,c.interesado_profile_id,
         coalesce(other_profile.nombre,other_profile.email,'Usuario AgroBrokerIA'),
         coalesce(last_msg.mensaje,'Conversación iniciada'),
         coalesce(last_msg.creado_at,c.actualizado_at),
         (SELECT count(*) FROM public.mensajes_publicaciones unread
          WHERE unread.conversacion_id=c.id
            AND unread.remitente_profile_id<>v_uid
            AND unread.leido_at IS NULL)
  FROM public.conversaciones_publicaciones c
  JOIN public.publicaciones p ON p.id=c.publicacion_id
  LEFT JOIN public.productos pr ON pr.id=p.producto_id
  LEFT JOIN public.profiles other_profile
    ON other_profile.id=CASE WHEN c.publicador_profile_id=v_uid
                            THEN c.interesado_profile_id ELSE c.publicador_profile_id END
  LEFT JOIN LATERAL (
    SELECT m.mensaje,m.creado_at
    FROM public.mensajes_publicaciones m
    WHERE m.conversacion_id=c.id
    ORDER BY m.creado_at DESC LIMIT 1
  ) last_msg ON true
  WHERE v_uid IN (c.publicador_profile_id,c.interesado_profile_id)
  ORDER BY coalesce(last_msg.creado_at,c.actualizado_at) DESC;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.listar_conversaciones_publicaciones() TO authenticated;

CREATE OR REPLACE FUNCTION public.marcar_mensajes_publicacion_leidos(p_conversacion_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid:=auth.uid(); v_count integer;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.conversaciones_publicaciones c
               WHERE c.id=p_conversacion_id
                 AND v_uid IN(c.publicador_profile_id,c.interesado_profile_id)) THEN
   RAISE EXCEPTION 'CONVERSACION_NO_AUTORIZADA';
 END IF;
 UPDATE public.mensajes_publicaciones
 SET leido_at=now()
 WHERE conversacion_id=p_conversacion_id
   AND remitente_profile_id<>v_uid
   AND leido_at IS NULL;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.marcar_mensajes_publicacion_leidos(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.notificar_nuevo_mensaje_publicacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
 v_recibe uuid;
 v_publicacion uuid;
 v_producto text;
 v_cantidad numeric;
 v_tipo text;
BEGIN
 SELECT CASE WHEN c.publicador_profile_id=NEW.remitente_profile_id
             THEN c.interesado_profile_id ELSE c.publicador_profile_id END,
        p.id,coalesce(pr.nombre,'Producto'),p.cantidad_tn,upper(coalesce(p.tipo,'PUBLICACION'))
 INTO v_recibe,v_publicacion,v_producto,v_cantidad,v_tipo
 FROM public.conversaciones_publicaciones c
 JOIN public.publicaciones p ON p.id=c.publicacion_id
 LEFT JOIN public.productos pr ON pr.id=p.producto_id
 WHERE c.id=NEW.conversacion_id
   AND NEW.remitente_profile_id IN(c.publicador_profile_id,c.interesado_profile_id);

 IF v_recibe IS NULL THEN RETURN NEW; END IF;
 INSERT INTO public.notificaciones(profile_id,titulo,mensaje,tipo,leida,oferta_id)
 VALUES(
   v_recibe,
   'Nuevo mensaje por '||v_producto,
   'Te enviaron un mensaje por tu publicación de '||v_producto||
     ' ('||to_char(coalesce(v_cantidad,0),'FM999G999G990D00')||' TN, '||v_tipo||').',
   'MENSAJE_PUBLICACION',
   false,
   v_publicacion
 );
 RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notificar_nuevo_mensaje_publicacion ON public.mensajes_publicaciones;
CREATE TRIGGER trg_notificar_nuevo_mensaje_publicacion
AFTER INSERT ON public.mensajes_publicaciones
FOR EACH ROW EXECUTE FUNCTION public.notificar_nuevo_mensaje_publicacion();
