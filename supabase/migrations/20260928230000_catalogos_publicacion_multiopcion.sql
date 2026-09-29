alter table public.catalogo_puertos
  add column if not exists orden integer not null default 100;

insert into public.catalogo_puertos (codigo,nombre,pais,provincia,localidad,tipo,orden) values
('AR-ROS','Puerto Rosario','Argentina','Santa Fe','Rosario','FLUVIAL_CEREALERO',10),
('AR-SLO','Puerto San Lorenzo','Argentina','Santa Fe','San Lorenzo','FLUVIAL_CEREALERO',20),
('AR-GSM','Puerto General San Martín','Argentina','Santa Fe','Puerto General San Martín','FLUVIAL_CEREALERO',30),
('AR-TIM','Puerto Timbúes','Argentina','Santa Fe','Timbúes','FLUVIAL_CEREALERO',40),
('AR-ALS','Puerto Arroyo Seco','Argentina','Santa Fe','Arroyo Seco','FLUVIAL_CEREALERO',50),
('AR-GLA','Puerto General Lagos','Argentina','Santa Fe','General Lagos','FLUVIAL_CEREALERO',60),
('AR-VCO','Puerto Villa Constitución','Argentina','Santa Fe','Villa Constitución','FLUVIAL_CEREALERO',70),
('AR-SFE','Puerto Santa Fe','Argentina','Santa Fe','Santa Fe','FLUVIAL',80),
('AR-GAB','Puerto Gaboto','Argentina','Santa Fe','Puerto Gaboto','FLUVIAL',90),
('AR-REC','Puerto Reconquista','Argentina','Santa Fe','Reconquista','FLUVIAL',100),
('AR-VOC','Puerto Villa Ocampo','Argentina','Santa Fe','Villa Ocampo','FLUVIAL',110),
('AR-SNI','Puerto San Nicolás','Argentina','Buenos Aires','San Nicolás de los Arroyos','FLUVIAL_CEREALERO',120),
('AR-RAM','Puerto Ramallo','Argentina','Buenos Aires','Ramallo','FLUVIAL_CEREALERO',130),
('AR-SPD','Puerto San Pedro','Argentina','Buenos Aires','San Pedro','FLUVIAL_CEREALERO',140),
('AR-ZAR','Puerto Zárate','Argentina','Buenos Aires','Zárate','FLUVIAL',150),
('AR-CAM','Puerto Campana','Argentina','Buenos Aires','Campana','FLUVIAL',160),
('AR-LIM','Puerto Lima','Argentina','Buenos Aires','Lima','FLUVIAL',170),
('AR-BUE','Puerto Buenos Aires','Argentina','Buenos Aires','Buenos Aires','MARITIMO',180),
('AR-LPL','Puerto La Plata','Argentina','Buenos Aires','La Plata','MARITIMO',190),
('AR-BHB','Puerto Bahía Blanca','Argentina','Buenos Aires','Bahía Blanca','MARITIMO_CEREALERO',200),
('AR-QUE','Puerto Quequén','Argentina','Buenos Aires','Quequén','MARITIMO_CEREALERO',210),
('AR-MDP','Puerto Mar del Plata','Argentina','Buenos Aires','Mar del Plata','MARITIMO',220),
('AR-DIA','Puerto Diamante','Argentina','Entre Ríos','Diamante','FLUVIAL',230),
('AR-IBI','Puerto Ibicuy','Argentina','Entre Ríos','Ibicuy','FLUVIAL',240),
('AR-CUR','Puerto Concepción del Uruguay','Argentina','Entre Ríos','Concepción del Uruguay','FLUVIAL',250),
('AR-CON','Puerto Concordia','Argentina','Entre Ríos','Concordia','FLUVIAL',260),
('UY-MVD','Puerto de Montevideo','Uruguay','Montevideo','Montevideo','MARITIMO',300),
('UY-NPA','Puerto Nueva Palmira','Uruguay','Colonia','Nueva Palmira','FLUVIAL_MARITIMO',310),
('BR-RIG','Puerto de Río Grande','Brasil','Rio Grande do Sul','Rio Grande','MARITIMO',320),
('BR-PAR','Puerto de Paranaguá','Brasil','Paraná','Paranaguá','MARITIMO',330),
('BR-SAN','Puerto de Santos','Brasil','São Paulo','Santos','MARITIMO',340)
on conflict (codigo) do update set nombre=excluded.nombre,pais=excluded.pais,provincia=excluded.provincia,localidad=excluded.localidad,tipo=excluded.tipo,orden=excluded.orden,activo=true;

insert into public.catalogo_lugares_recepcion (codigo,nombre,descripcion,orden) values
('PUERTO','Puerto / Terminal portuaria','Entrega o recepción en puerto o terminal.',10),
('ACOPIO','Acopio','Planta de acopio o centro de recepción.',20),
('PLANTA','Planta industrial','Molinera, aceitera, procesadora o industria.',30),
('CAMPO','Campo / establecimiento','Retiro o recepción directamente en establecimiento.',40),
('DEPOSITO','Depósito / silo','Depósito, silo, elevador o almacenamiento.',50),
('TERMINAL','Terminal logística','Terminal multimodal o centro logístico.',60),
('FRONTERA','Paso fronterizo','Punto de entrega para comercio internacional terrestre.',70),
('OTRO','Otro lugar','Otro punto acordado entre las partes.',80)
on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,orden=excluded.orden,activo=true;

insert into public.productos (codigo,nombre,categoria,activo)
values ('TEFF','Teff','Pseudocereal y nicho',true)
on conflict (codigo) do update set nombre=excluded.nombre,categoria=excluded.categoria,activo=true;

create or replace function public.guardar_publicacion(p_publicacion_id uuid, p_datos jsonb)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_uid uuid:=auth.uid(); v_empresa uuid; v_id uuid; v_existing_empresa uuid;
  v_puertos text[]:=coalesce(array(select value from jsonb_array_elements_text(coalesce(p_datos->'puertos','[]'::jsonb)) x(value) where trim(value)<>''),'{}'::text[]);
  v_lugares text[]:=coalesce(array(select value from jsonb_array_elements_text(coalesce(p_datos->'lugares_recepcion','[]'::jsonb)) x(value) where trim(value)<>''),'{}'::text[]);
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select active_company_id into v_empresa from public.profiles where id=v_uid;
  if v_empresa is null or not exists(select 1 from public.company_users where company_id=v_empresa and profile_id=v_uid and activo=true) then raise exception 'Empresa activa inválida'; end if;

  if p_publicacion_id is null then
    if coalesce((p_datos->>'cantidad_tn')::numeric,0)<=0 or coalesce((p_datos->>'precio_tn')::numeric,0)<=0 then raise exception 'Cantidad y precio deben ser mayores a cero'; end if;
    insert into public.publicaciones(empresa_id,tipo,producto_id,cantidad_tn,precio_tn,moneda_id,incoterm_id,provincia,localidad,puerto,calidad,humedad,proteina,observaciones,estado,puertos,lugares_recepcion)
    values(v_empresa,p_datos->>'tipo',(p_datos->>'producto_id')::integer,(p_datos->>'cantidad_tn')::numeric,(p_datos->>'precio_tn')::numeric,(p_datos->>'moneda_id')::integer,(p_datos->>'incoterm_id')::integer,p_datos->>'provincia',p_datos->>'localidad',coalesce(nullif(p_datos->>'puerto',''),v_puertos[1]),nullif(p_datos->>'calidad',''),nullif(p_datos->>'humedad','')::numeric,nullif(p_datos->>'proteina','')::numeric,nullif(p_datos->>'observaciones',''),'PUBLICADA',v_puertos,v_lugares)
    returning id into v_id;
  else
    select empresa_id into v_existing_empresa from public.publicaciones where id=p_publicacion_id for update;
    if v_existing_empresa is distinct from v_empresa then raise exception 'No autorizado'; end if;
    update public.publicaciones set tipo=p_datos->>'tipo',producto_id=(p_datos->>'producto_id')::integer,cantidad_tn=(p_datos->>'cantidad_tn')::numeric,precio_tn=(p_datos->>'precio_tn')::numeric,moneda_id=(p_datos->>'moneda_id')::integer,incoterm_id=(p_datos->>'incoterm_id')::integer,provincia=p_datos->>'provincia',localidad=p_datos->>'localidad',puerto=coalesce(nullif(p_datos->>'puerto',''),v_puertos[1]),calidad=nullif(p_datos->>'calidad',''),humedad=nullif(p_datos->>'humedad','')::numeric,proteina=nullif(p_datos->>'proteina','')::numeric,observaciones=nullif(p_datos->>'observaciones',''),puertos=v_puertos,lugares_recepcion=v_lugares
    where id=p_publicacion_id returning id into v_id;
  end if;
  return v_id;
end;
$function$;
