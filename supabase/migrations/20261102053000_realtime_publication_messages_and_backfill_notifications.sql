ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS publicacion_id uuid REFERENCES public.publicaciones(id) ON DELETE SET NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_publicaciones;
CREATE OR REPLACE FUNCTION public.notificar_nuevo_mensaje_publicacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_recibe uuid; v_publicacion uuid; v_producto text; v_cantidad numeric; v_tipo text;
BEGIN
 SELECT CASE WHEN c.publicador_profile_id=NEW.remitente_profile_id THEN c.interesado_profile_id ELSE c.publicador_profile_id END,
        p.id,coalesce(pr.nombre,'Producto'),p.cantidad_tn,upper(coalesce(p.tipo,'PUBLICACION'))
 INTO v_recibe,v_publicacion,v_producto,v_cantidad,v_tipo
 FROM public.conversaciones_publicaciones c JOIN public.publicaciones p ON p.id=c.publicacion_id
 LEFT JOIN public.productos pr ON pr.id=p.producto_id
 WHERE c.id=NEW.conversacion_id AND NEW.remitente_profile_id IN(c.publicador_profile_id,c.interesado_profile_id);
 IF v_recibe IS NULL THEN RETURN NEW; END IF;
 INSERT INTO public.notificaciones(profile_id,titulo,mensaje,tipo,leida,publicacion_id)
 VALUES(v_recibe,'Nuevo mensaje por '||v_producto,
 'Te enviaron un mensaje por tu publicación de '||v_producto||' ('||
 to_char(coalesce(v_cantidad,0),'FM999G999G990D00')||' TN, '||v_tipo||').',
 'MENSAJE_PUBLICACION',false,v_publicacion);
 RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_notificar_nuevo_mensaje_publicacion ON public.mensajes_publicaciones;
CREATE TRIGGER trg_notificar_nuevo_mensaje_publicacion AFTER INSERT ON public.mensajes_publicaciones
FOR EACH ROW EXECUTE FUNCTION public.notificar_nuevo_mensaje_publicacion();
INSERT INTO public.notificaciones(profile_id,titulo,mensaje,tipo,leida,publicacion_id,creada_en)
SELECT CASE WHEN c.publicador_profile_id=m.remitente_profile_id THEN c.interesado_profile_id ELSE c.publicador_profile_id END,
 'Nuevo mensaje por '||coalesce(pr.nombre,'Producto'),
 'Tenés un mensaje pendiente por tu publicación de '||coalesce(pr.nombre,'Producto')||
 ' ('||to_char(coalesce(p.cantidad_tn,0),'FM999G999G990D00')||' TN).',
 'MENSAJE_PUBLICACION',false,p.id,m.creado_at
FROM public.mensajes_publicaciones m JOIN public.conversaciones_publicaciones c ON c.id=m.conversacion_id
JOIN public.publicaciones p ON p.id=c.publicacion_id LEFT JOIN public.productos pr ON pr.id=p.producto_id
WHERE m.leido_at IS NULL AND m.remitente_profile_id IN(c.publicador_profile_id,c.interesado_profile_id)
AND NOT EXISTS(SELECT 1 FROM public.notificaciones n WHERE n.profile_id=CASE WHEN c.publicador_profile_id=m.remitente_profile_id THEN c.interesado_profile_id ELSE c.publicador_profile_id END AND n.publicacion_id=p.id AND n.tipo='MENSAJE_PUBLICACION' AND n.creada_en=m.creado_at);