insert into public.market_quotes
(source,source_reference,market_date,published_at,commodity_id,product_id,variety,position,market,port,price_type,price,currency,unit,status,freshness,previous_value,variation,payload,fingerprint)
select v.source,v.source_reference,v.market_date,null,c.id,null,null,v.position,v.market,v.port,v.price_type,v.price,v.currency,'T','VALID','VERIFIED',null,null,v.payload,
       md5(concat_ws('|',v.source_reference,v.market_date::text,v.code,v.price_type,v.position,coalesce(v.price::text,''),coalesce(v.currency,'')))
from (values
 ('BCR/CAC','BCR_AVAILABLE','2026-09-28'::date,'TRIGO','C/Desc. hasta el 15/10.','ROSARIO','PIZARRA_DISPONIBLE',220::numeric,'USD','Exp/SM-Tmb',jsonb_build_object('official_source','BCR','source_date','2026-09-28','quality','Cond. Cámara')),
 ('BCR/CAC','BCR_AVAILABLE','2026-09-28'::date,'MAIZ','C/Desc.','ROSARIO','PIZARRA_DISPONIBLE',190::numeric,'USD','Exp/SM-Tmb-GL',jsonb_build_object('official_source','BCR','source_date','2026-09-28','quality','Grado 2')),
 ('BCR/CAC','BCR_AVAILABLE','2026-09-28'::date,'SOJA','C/Desc. desde el 30/09.','ROSARIO','PIZARRA_DISPONIBLE',565000::numeric,'ARS','Fca/SM',jsonb_build_object('official_source','BCR','source_date','2026-09-28','quality','EPA')),
 ('BCR/CAC','BCR_AVAILABLE','2026-09-28'::date,'GIRASOL','C/Desc.','ROSARIO','PIZARRA_DISPONIBLE',500::numeric,'USD','Fca/SL',jsonb_build_object('official_source','BCR','source_date','2026-09-28')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'TRIGO','Spot','ARGENTINA','FOB_BID',263::numeric,'USD','SAGyP',jsonb_build_object('official_source','BCR','source_date','2026-09-24')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'TRIGO','Spot','ARGENTINA','FAS_THEORETICAL',232.51::numeric,'USD','SAGyP',jsonb_build_object('official_source','BCR','source_date','2026-09-24')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'MAIZ','Spot','ARGENTINA','FOB_BID',223::numeric,'USD','SAGyP',jsonb_build_object('official_source','BCR','source_date','2026-09-24')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'MAIZ','Spot','ARGENTINA','FAS_THEORETICAL',190.20::numeric,'USD','SAGyP',jsonb_build_object('official_source','BCR','source_date','2026-09-24')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'SOJA','Spot','ARGENTINA','FOB_BID',510::numeric,'USD','SAGyP',jsonb_build_object('official_source','BCR','source_date','2026-09-24')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'SOJA','Spot','ARGENTINA','FAS_THEORETICAL',366.57::numeric,'USD','SAGyP',jsonb_build_object('official_source','BCR','source_date','2026-09-24')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'GIRASOL','Spot','ARGENTINA','FOB_BID',569::numeric,'USD','SAGyP',jsonb_build_object('official_source','BCR','source_date','2026-09-24')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'GIRASOL','Spot','ARGENTINA','FAS_THEORETICAL',429.37::numeric,'USD','SAGyP',jsonb_build_object('official_source','BCR','source_date','2026-09-24')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'ACEITE_SOJA','Oct-26','ARGENTINA','FOB_OIL',1218::numeric,'USD','Up River',jsonb_build_object('official_source','BCR','source_date','2026-09-24','complex','soja')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'PELLETS_SOJA','Oct-26','ARGENTINA','FOB_MEAL',433.9::numeric,'USD','Up River',jsonb_build_object('official_source','BCR','source_date','2026-09-24','complex','soja')),
 ('BCR/CAC','BCR_FOB','2026-09-24'::date,'ACEITE_SOJA','Oct-26','ARGENTINA','FAS_THEORETICAL',384.5::numeric,'USD','Up River',jsonb_build_object('official_source','BCR','source_date','2026-09-24','complex','soja'))
) v(source,source_reference,market_date,code,position,market,price_type,price,currency,port,payload)
join public.commodities c on upper(c.codigo)=v.code
on conflict (fingerprint) do nothing;