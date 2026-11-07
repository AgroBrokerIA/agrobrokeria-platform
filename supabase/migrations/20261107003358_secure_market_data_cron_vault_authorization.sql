-- Secure 15-minute BCR/CAC market sync using Supabase Vault + pg_net + pg_cron.
-- The secret itself is provisioned in Supabase Vault and must never be committed.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.validar_cron_market_sync(p_token text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path=public,vault,pg_temp
AS $$
 SELECT coalesce(
  (SELECT decrypted_secret=p_token FROM vault.decrypted_secrets
   WHERE name='agrobrokeria_market_sync_cron_secret' LIMIT 1),
  false
 )
$$;
REVOKE ALL ON FUNCTION public.validar_cron_market_sync(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validar_cron_market_sync(text) TO service_role;

SELECT cron.schedule('agrobrokeria-market-data-sync-15m','*/15 * * * *',
$$SELECT net.http_post(
 url:='https://hlviozkqskdhdaykgtis.supabase.co/functions/v1/market-data-sync',
 headers:=jsonb_build_object(
  'Content-Type','application/json',
  'apikey','sb_publishable_BhyO13dKEl8i4ZnH0ONSrg_hIUUTh_l',
  'Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets
     WHERE name='agrobrokeria_market_sync_cron_secret')
 ),
 body:='{}'::jsonb,
 timeout_milliseconds:=55000
);$$);
