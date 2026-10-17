-- Assign optional as well as mandatory role requirements so their applicability can be tracked.
INSERT INTO public.empresas_verificacion_requisitos(empresa_id,requisito_id,estado)
SELECT e.id,r.id,'PENDIENTE'
FROM public.empresas e
JOIN public.verificacion_requisitos_catalogo r ON r.tipo_empresa=upper(e.tipo_empresa)
ON CONFLICT(empresa_id,requisito_id) DO NOTHING;
