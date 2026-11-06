-- Matching/notification failures must not roll back a valid publication.
CREATE OR REPLACE FUNCTION public.trigger_procesar_smart_match_publicacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_type text;
  v_other_id uuid;
BEGIN
  IF upper(trim(NEW.estado::text)) NOT IN ('PUBLICADA', 'ACTIVA') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    BEGIN
      PERFORM public.procesar_smart_match_publicacion(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Smart Match calculation skipped for publication %: %', NEW.id, SQLERRM;
    END;
  END IF;

  IF auth.uid() IS NULL OR NEW.empresa_id IS NULL OR NEW.producto_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_type := upper(trim(NEW.tipo::text));

  IF v_type IN ('COMPRA', 'DEMANDA', 'BUY', 'PURCHASE', 'NECESIDAD') THEN
    FOR v_other_id IN
      SELECT p.id FROM public.publicaciones p
      WHERE p.id <> NEW.id
        AND p.producto_id = NEW.producto_id
        AND upper(trim(p.tipo::text)) IN ('VENTA', 'OFERTA', 'SELL', 'SELLING')
        AND upper(trim(p.estado::text)) IN ('PUBLICADA', 'ACTIVA')
    LOOP
      BEGIN
        PERFORM public.registrar_alerta_oportunidad(NEW.id, v_other_id);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'IA Matching notification skipped for purchase %, sale %: %',
          NEW.id, v_other_id, SQLERRM;
      END;
    END LOOP;
  ELSIF v_type IN ('VENTA', 'OFERTA', 'SELL', 'SELLING') THEN
    FOR v_other_id IN
      SELECT p.id FROM public.publicaciones p
      WHERE p.id <> NEW.id
        AND p.producto_id = NEW.producto_id
        AND upper(trim(p.tipo::text)) IN ('COMPRA', 'DEMANDA', 'BUY', 'PURCHASE', 'NECESIDAD')
        AND upper(trim(p.estado::text)) IN ('PUBLICADA', 'ACTIVA')
    LOOP
      BEGIN
        PERFORM public.registrar_alerta_oportunidad(v_other_id, NEW.id);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'IA Matching notification skipped for purchase %, sale %: %',
          v_other_id, NEW.id, SQLERRM;
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
