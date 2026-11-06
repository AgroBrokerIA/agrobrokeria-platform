-- SECURITY DEFINER delivery RPCs are authenticated-only (PUBLIC grants are inherited otherwise).
REVOKE ALL ON FUNCTION public.confirmar_entrega_transportista(uuid,numeric,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirmar_recepcion_productor(uuid,numeric,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_entrega_transportista(uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_recepcion_productor(uuid,numeric,boolean,text) TO authenticated;