alter table public.arca_company_config
 add column if not exists cert_homologacion_secret_name text not null default 'ARCA_CERTIFICATE_HOMO_BASE64',
 add column if not exists private_key_homologacion_secret_name text not null default 'ARCA_PRIVATE_KEY_HOMO_BASE64';
