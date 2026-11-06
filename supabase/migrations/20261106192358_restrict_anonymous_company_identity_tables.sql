-- Company membership and legacy-to-current company mapping are private authorization data.
REVOKE ALL PRIVILEGES ON TABLE public.company_users, public.company_empresa_map
FROM anon, PUBLIC;
