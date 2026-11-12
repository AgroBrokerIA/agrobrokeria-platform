-- Allow active BROKER company memberships to operate as intermediaries
-- without producer/acopio SISA accreditation. Producer/acopio KYC gates remain.
CREATE OR REPLACE FUNCTION public.perfil_habilitado_sisa(p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_onboarding public.account_onboarding%rowtype;
  v_company uuid;
  v_has_company_sisa boolean;
begin
  if p_profile_id is null then
    return false;
  end if;

  select * into v_onboarding
  from public.account_onboarding
  where user_id=p_profile_id;

  select active_company_id into v_company
  from public.profiles
  where id=p_profile_id;

  if v_company is not null and exists (
    select 1
    from public.company_users cu
    join public.company_empresa_map cem on cem.company_id=cu.company_id
    join public.empresas e on e.id=cem.empresa_id
    where cu.company_id=v_company
      and cu.profile_id=p_profile_id
      and cu.activo is true
      and e.activa is true
      and upper(trim(coalesce(e.tipo_empresa,''))) in ('INTERMEDIARIO','BROKER')
  ) then
    return true;
  end if;

  if upper(coalesce(v_onboarding.account_type,'PERSONA'))='EMPRESA' then
    return coalesce(
      v_onboarding.review_status='VERIFICADO'
      and v_onboarding.is_verified is true
      and v_onboarding.sisa_status='ACTIVO'
      and v_onboarding.sisa_categoria in ('1','2','3')
      and v_onboarding.actividad_agro_validada is true
      and exists(
        select 1 from public.account_onboarding_documents d
        where d.user_id=p_profile_id
          and d.document_type='SISA_CONSTANCIA'
          and d.review_status='APROBADO'
      )
      and exists(
        select 1
        from public.empresas e
        join lateral (
          select ev.estado,ev.vencimiento_at
          from public.empresas_verificaciones ev
          where ev.empresa_id=e.id and ev.organismo='ARCA'
          order by ev.consultado_at desc nulls last
          limit 1
        ) arca on true
        where regexp_replace(coalesce(e.cuit::text,''),'[^0-9]','','g')
            = regexp_replace(coalesce(v_onboarding.cuil_cuit,''),'[^0-9]','','g')
          and arca.estado='ARCA_VERIFICADA'
          and arca.vencimiento_at > now()
      ),
      false
    );
  end if;

  if v_company is not null then
    select exists(
      select 1
      from public.company_users cu
      join public.account_onboarding ao on ao.user_id=cu.profile_id
      join public.account_onboarding_documents d
        on d.user_id=cu.profile_id
       and d.document_type='SISA_CONSTANCIA'
       and d.review_status='APROBADO'
      join public.empresas e
        on regexp_replace(coalesce(e.cuit::text,''),'[^0-9]','','g')
         = regexp_replace(coalesce(ao.cuil_cuit,''),'[^0-9]','','g')
      join lateral (
        select ev.estado,ev.vencimiento_at
        from public.empresas_verificaciones ev
        where ev.empresa_id=e.id and ev.organismo='ARCA'
        order by ev.consultado_at desc nulls last
        limit 1
      ) arca on true
      where cu.company_id=v_company
        and cu.activo=true
        and ao.account_type='EMPRESA'
        and ao.review_status='VERIFICADO'
        and ao.is_verified is true
        and ao.sisa_status='ACTIVO'
        and ao.sisa_categoria in ('1','2','3')
        and ao.actividad_agro_validada is true
        and arca.estado='ARCA_VERIFICADA'
        and arca.vencimiento_at > now()
    ) into v_has_company_sisa;
    return coalesce(v_has_company_sisa,false);
  end if;

  return true;
end;
$function$;
