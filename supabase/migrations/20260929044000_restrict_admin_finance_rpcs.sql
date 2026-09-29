revoke execute on function public.admin_listar_medios_cobro() from authenticated;
revoke execute on function public.admin_listar_retiros_comisiones() from authenticated;
revoke execute on function public.admin_resolver_medio_cobro(uuid,text,text) from authenticated;
revoke execute on function public.finalizar_retiro_comision(uuid,text,uuid,text,text,text,text) from authenticated;