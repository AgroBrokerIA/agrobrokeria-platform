-- Ensure the public publication view obeys the querying user's RLS policies.
CREATE OR REPLACE VIEW public.vw_publicaciones_activas WITH (security_invoker = true) AS
SELECT
  p.id,
  e.nombre_comercial,
  pr.nombre AS producto,
  p.cantidad_tn,
  p.precio_tn,
  m.codigo AS moneda,
  p.provincia,
  p.puerto,
  coalesce(nullif(trim(pub.nombre),''), nullif(trim(pub.email),''), e.nombre_comercial, 'Usuario AgroBrokerIA') AS publicador_nombre,
  CASE WHEN p.empresa_id IS NULL THEN 'INTERMEDIARIO' ELSE 'EMPRESA' END AS publicador_tipo
FROM public.publicaciones p
LEFT JOIN public.empresas e ON e.id = p.empresa_id
LEFT JOIN public.profiles pub ON pub.id = p.publicador_profile_id
JOIN public.productos pr ON pr.id = p.producto_id
LEFT JOIN public.monedas m ON m.id = p.moneda_id
WHERE p.estado = 'PUBLICADA';
