-- Bootstrap of the latest official CAC board prices available at development close.
-- Idempotent by the same fingerprint used by market-data-sync.
with q(commodity_id,price) as (
  values
    ('290206c3-0400-47e2-bfcd-16d6b93b6fde'::uuid,565000::numeric),
    ('d119de42-8ddc-43cf-a307-c540d3bb6d34'::uuid,297234::numeric),
    ('fd74acb3-0c2c-43e4-861c-538539cb9c71'::uuid,345762::numeric),
    ('525fe093-ad5e-418e-a110-b837b27dfbd8'::uuid,765830::numeric),
    ('61f4942b-260f-4f94-86b3-5c8858dc8231'::uuid,288135::numeric)
)
insert into public.market_quotes
(source,source_reference,market_date,obtained_at,commodity_id,position,market,port,price_type,price,currency,unit,status,freshness,previous_value,variation,payload,fingerprint)
select
  'BCR/CAC',
  'https://www.cac.bcr.com.ar/es',
  date '2026-09-25',
  now(),
  commodity_id,
  'SPOT',
  'ROSARIO',
  'ROSARIO',
  'PIZARRA_CAC',
  price,
  'ARS',
  'T',
  'VALID',
  'UPDATED',
  null,
  null,
  jsonb_build_object('bootstrap','official_cac','published_market_date','2026-09-25','source_note','Precios Pizarra CAC oficiales de Rosario'),
  md5('BCR/CAC|PIZARRA_CAC|2026-09-25|'||commodity_id::text||'|'||price::text)
from q
on conflict (fingerprint) do nothing;
