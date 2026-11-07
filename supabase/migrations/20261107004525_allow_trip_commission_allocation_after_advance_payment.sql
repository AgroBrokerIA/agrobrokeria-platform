CREATE OR REPLACE FUNCTION public.sincronizar_asignacion_comision_viajes(p_retencion_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_r public.operacion_comision_retenciones%rowtype;v_total_tn numeric;v_count integer;
BEGIN
 SELECT * INTO v_r FROM public.operacion_comision_retenciones WHERE id=p_retencion_id FOR UPDATE;
 IF NOT FOUND OR v_r.estado NOT IN('RETENIDA','LIBERADA') THEN RETURN;END IF;
 IF EXISTS(SELECT 1 FROM public.operacion_comision_viajes WHERE retencion_id=p_retencion_id AND estado='LIBERADA') THEN RETURN;END IF;
 SELECT count(*),coalesce(sum(coalesce(nullif(carta_porte_tn,0),nullif(kilos_cargados,0)/1000.0)),0) INTO v_count,v_total_tn FROM public.viajes WHERE operacion_id=v_r.operacion_id;
 IF v_count=0 OR v_total_tn<=0 THEN RETURN;END IF;
 DELETE FROM public.operacion_comision_viajes WHERE retencion_id=p_retencion_id AND estado<>'LIBERADA';
 INSERT INTO public.operacion_comision_viajes(retencion_id,operacion_id,viaje_id,importe_asignado,moneda_id)
 SELECT p_retencion_id,v_r.operacion_id,x.id,
 CASE WHEN x.rn=x.cnt THEN round(v_r.importe-coalesce(sum(round(v_r.importe*x.toneladas/v_total_tn,2)) OVER(ORDER BY x.rn ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0),2)
 ELSE round(v_r.importe*x.toneladas/v_total_tn,2) END,v_r.moneda_id
 FROM(SELECT v.id,coalesce(nullif(v.carta_porte_tn,0),nullif(v.kilos_cargados,0)/1000.0) toneladas,row_number() over(order by v.creado_en,v.id) rn,count(*) over() cnt FROM public.viajes v WHERE v.operacion_id=v_r.operacion_id)x WHERE x.toneladas>0;
END $$;
CREATE OR REPLACE FUNCTION public.asignar_comision_por_viaje()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN IF NEW.estado='RETENIDA' AND (TG_OP='INSERT' OR OLD.estado IS DISTINCT FROM NEW.estado) THEN PERFORM public.sincronizar_asignacion_comision_viajes(NEW.id);END IF;RETURN NEW;END $$;
DROP TRIGGER IF EXISTS trg_asignar_comision_por_viaje ON public.operacion_comision_retenciones;
CREATE TRIGGER trg_asignar_comision_por_viaje AFTER INSERT OR UPDATE OF estado ON public.operacion_comision_retenciones FOR EACH ROW WHEN(NEW.estado='RETENIDA') EXECUTE FUNCTION public.asignar_comision_por_viaje();
CREATE OR REPLACE FUNCTION public.bloquear_nuevo_viaje_despues_retencion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN IF EXISTS(SELECT 1 FROM public.operacion_comision_retenciones r JOIN public.operacion_comision_viajes a ON a.retencion_id=r.id WHERE r.operacion_id=NEW.operacion_id AND a.estado='LIBERADA') THEN RAISE EXCEPTION 'TRIP_MANIFEST_LOCKED_AFTER_FIRST_COMMISSION_RELEASE';END IF;RETURN NEW;END $$;
DROP TRIGGER IF EXISTS trg_bloquear_nuevo_viaje_despues_retencion ON public.viajes;
CREATE TRIGGER trg_bloquear_nuevo_viaje_despues_retencion BEFORE INSERT ON public.viajes FOR EACH ROW EXECUTE FUNCTION public.bloquear_nuevo_viaje_despues_retencion();
CREATE OR REPLACE FUNCTION public.actualizar_asignacion_comision_al_cambiar_viaje()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_retencion_id uuid;
BEGIN SELECT id INTO v_retencion_id FROM public.operacion_comision_retenciones WHERE operacion_id=NEW.operacion_id AND estado='RETENIDA' ORDER BY creado_at DESC LIMIT 1;IF v_retencion_id IS NOT NULL THEN PERFORM public.sincronizar_asignacion_comision_viajes(v_retencion_id);END IF;RETURN NEW;END $$;
DROP TRIGGER IF EXISTS trg_actualizar_asignacion_comision_al_cambiar_viaje ON public.viajes;
CREATE TRIGGER trg_actualizar_asignacion_comision_al_cambiar_viaje AFTER INSERT OR UPDATE OF carta_porte_tn,kilos_cargados ON public.viajes FOR EACH ROW EXECUTE FUNCTION public.actualizar_asignacion_comision_al_cambiar_viaje();
REVOKE ALL ON FUNCTION public.sincronizar_asignacion_comision_viajes(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.actualizar_asignacion_comision_al_cambiar_viaje() FROM PUBLIC,anon,authenticated;