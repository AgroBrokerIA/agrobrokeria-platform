-- Keep the market commodity catalog aligned with the complete product catalog.
INSERT INTO public.commodities(codigo,nombre,unidad,activo)
SELECT p.codigo,p.nombre,'TN',true
FROM public.productos p
WHERE NOT EXISTS (SELECT 1 FROM public.commodities c WHERE c.codigo=p.codigo OR lower(c.nombre)=lower(p.nombre));