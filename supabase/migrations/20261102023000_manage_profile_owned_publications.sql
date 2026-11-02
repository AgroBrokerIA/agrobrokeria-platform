-- Show independent publisher listings in My Publications and allow safe owner deletion.
CREATE OR REPLACE FUNCTION public.eliminar_publicacion(p_publicacion_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_empresa uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT empresa_id INTO v_empresa
  FROM public.publicaciones
  WHERE id = p_publicacion_id
    AND (
      publicador_profile_id = v_uid
      OR (empresa_id IS NOT NULL AND public.usuario_es_miembro_empresa(empresa_id))
    )
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'PUBLICACION_NO_AUTORIZADA'; END IF;

  -- Preserve commercial/audit history once an operation or AI history exists.
  -- In that case the owner must pause the listing instead of deleting it.
  IF EXISTS (
    SELECT 1 FROM public.operaciones
    WHERE publicacion_compra_id = p_publicacion_id
       OR publicacion_venta_id = p_publicacion_id
  ) OR EXISTS (
    SELECT 1 FROM public.historial_ia WHERE publicacion_id = p_publicacion_id
  ) THEN
    RAISE EXCEPTION 'PUBLICACION_CON_HISTORIAL_NO_ELIMINABLE';
  END IF;

  DELETE FROM public.publicaciones WHERE id = p_publicacion_id;
  RETURN true;
END;
$function$;
