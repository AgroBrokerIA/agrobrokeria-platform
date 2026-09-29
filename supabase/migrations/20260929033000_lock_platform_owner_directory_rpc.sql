revoke execute on function admin_private.is_platform_admin() from authenticated;
revoke execute on function public.admin_listar_directorio_empresas(integer,integer) from authenticated;
revoke execute on function public.admin_listar_directorio_contactos(integer,integer) from authenticated;
revoke execute on function public.admin_listar_directorio_intereses(integer,integer) from authenticated;
grant execute on function admin_private.is_platform_admin() to service_role;
grant execute on function public.admin_listar_directorio_empresas(integer,integer) to service_role;
grant execute on function public.admin_listar_directorio_contactos(integer,integer) to service_role;
grant execute on function public.admin_listar_directorio_intereses(integer,integer) to service_role;