ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_publicaciones;

-- Notify the recipients about messages that were already sent before the trigger existed.
INSERT INTO public.notificaciones(profile_id,titulo,mensaje,tipo,leida,oferta_id,creada_en)
SELECT
 CASE WHEN c.publicador_profile_id=m.remitente_profile_id THEN c.interesado_profile_id ELSE c.publicador_profile_id END,
 'Nuevo mensaje por '||coalesce(pr.nombre,'Producto'),
 'Tenés un mensaje pendiente por tu publicación de '||coalesce(pr.nombre,'Producto')||
 ' ('||to_char(coalesce(p.cantidad_tn,0),'FM999G999G990D00')||' TN).',
 'MENSAJE_PUBLICACION',false,p.id,m.creado_at
FROM public.mensajes_publicaciones m
JOIN public.conversaciones_publicaciones c ON c.id=m.conversacion_id
JOIN public.publicaciones p ON p.id=c.publicacion_id
LEFT JOIN public.productos pr ON pr.id=p.producto_id
WHERE m.leido_at IS NULL
  AND m.remitente_profile_id IN(c.publicador_profile_id,c.interesado_profile_id)
  AND NOT EXISTS(
    SELECT 1 FROM public.notificaciones n
    WHERE n.profile_id=CASE WHEN c.publicador_profile_id=m.remitente_profile_id THEN c.interesado_profile_id ELSE c.publicador_profile_id END
      AND n.oferta_id=p.id AND n.tipo='MENSAJE_PUBLICACION'
      AND n.creada_en=m.creado_at
  );