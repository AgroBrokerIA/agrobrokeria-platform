alter table public.operacion_aceptaciones_confidencialidad
  drop constraint if exists operacion_aceptaciones_confid_operacion_id_documento_legal__key;

insert into public.documentos_legales
  (codigo,titulo,version,vigencia_desde,contenido,hash_sha256,estado)
values
  ('CONFIDENCIALIDAD_OPERACION','Contrato de Confidencialidad de la Operación','1.0','2026-10-03T00:00:00Z',
$doc$CONTRATO DE CONFIDENCIALIDAD DE LA OPERACIÓN

Conste por el presente documento el Contrato de Confidencialidad de la Operación (en adelante, el "Contrato"), que se celebra entre las partes identificadas en el cuadro de firmas respecto de la operación comercial registrada en AgroBrokerIA.

PARTES
EL VENDEDOR: identificado en el cuadro de firmas.
EL COMPRADOR: identificado en el cuadro de firmas.

DECLARACIONES
I. Las partes intercambiarán información comercial, económica, técnica, operativa y logística necesaria para evaluar, negociar, documentar, ejecutar y liquidar la operación.
II. Las partes reconocen que determinada información de la operación puede no ser pública y que su divulgación o uso fuera del propósito de la operación puede perjudicar a la parte que la proporciona.

CLÁUSULAS

PRIMERA: OBJETO Y CONFIDENCIALIDAD
Las partes se obligan a mantener estricta reserva sobre la información no pública relacionada con la operación, incluyendo identidades, datos de contacto, cantidades, precios, condiciones comerciales, formas de pago, documentación, especificaciones técnicas y logísticas, datos de origen y destino y cualquier otra información intercambiada con motivo de la operación. La información no podrá divulgarse ni utilizarse para un fin ajeno a la operación sin autorización previa de la parte que la proporcionó, salvo obligación legal o requerimiento de autoridad competente.

SEGUNDA: USO LIMITADO
La información confidencial sólo podrá utilizarse para evaluar, negociar, documentar, ejecutar y liquidar la operación identificada en AgroBrokerIA. Cada parte deberá limitar el acceso a quienes necesiten conocerla para esos fines y resulten legítimamente habilitados.

TERCERA: PROTECCIÓN Y NOTIFICACIÓN
Cada parte adoptará medidas razonables para evitar acceso, copia, divulgación o uso no autorizado de la información confidencial y comunicará a la otra cualquier pérdida, acceso o divulgación no autorizada de la que tome conocimiento.

CUARTA: EXCEPCIONES
No se considerará confidencial la información que ya sea pública sin incumplimiento de este Contrato, que la parte receptora pueda acreditar que conocía legítimamente con anterioridad, o cuya divulgación sea exigida por ley o por una autoridad competente. Cuando legalmente sea posible, la parte requerida notificará previamente a la otra.

QUINTA: VIGENCIA
Este Contrato entra en vigor en la fecha de su aceptación y tendrá una duración de 3 (tres) años. La obligación de confidencialidad continuará durante 3 (tres) años adicionales respecto de la información recibida durante su vigencia.

SEXTA: INCUMPLIMIENTO
El incumplimiento del deber de confidencialidad dará lugar a las responsabilidades que correspondan conforme al contrato de la operación y la legislación aplicable, sin perjuicio de las medidas judiciales o extrajudiciales que pudieran corresponder.

SÉPTIMA: LEY APLICABLE Y JURISDICCIÓN
Este Contrato se regirá por la legislación aplicable que corresponda a la operación y por la jurisdicción consignada en el contrato comercial, sin perjuicio de las normas imperativas aplicables.

ACEPTACIÓN
EL VENDEDOR
Firma: ___________________________
Nombre:
DNI/Pasaporte:
Empresa:

EL COMPRADOR
Firma: ___________________________
Nombre:
DNI/Pasaporte:
Empresa:
$doc$,
'6dae60f4404d45aa43a9eb43221acf8c561bbdf69c50be36629396325711f9fe','VIGENTE')
on conflict (codigo,version) do update set titulo=excluded.titulo,vigencia_desde=excluded.vigencia_desde,contenido=excluded.contenido,hash_sha256=excluded.hash_sha256,estado='VIGENTE';

create or replace function public.aceptar_confidencialidad_operacion(p_operacion_id uuid,p_rol text,p_ip text default null,p_user_agent text default null)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_doc public.documentos_legales%rowtype; v_company uuid; v_id uuid; v_has_intermediary boolean; v_codigo text;
begin
 if v_uid is null then raise exception 'AUTENTICACION_REQUERIDA'; end if;
 p_rol:=upper(trim(coalesce(p_rol,'')));
 if p_rol not in('COMPRADOR','VENDEDOR','INTERMEDIARIO') then raise exception 'ROL_CONFIDENCIALIDAD_INVALIDO'; end if;
 if not public.usuario_participa_operacion(p_operacion_id) then raise exception 'NO_AUTORIZADO_OPERACION'; end if;
 select exists(select 1 from public.operacion_participantes op where op.operacion_id=p_operacion_id and upper(op.rol)='INTERMEDIARIO') into v_has_intermediary;
 if p_rol='INTERMEDIARIO' and not v_has_intermediary then raise exception 'NO_EXISTE_INTERMEDIARIO_EN_OPERACION'; end if;
 select cu.company_id into v_company
 from public.company_users cu join public.operacion_participantes op on op.empresa_id=cu.company_id
 where cu.profile_id=v_uid and cu.activo=true and op.operacion_id=p_operacion_id and upper(op.rol)=p_rol
 order by cu.company_id limit 1;
 if v_company is null then raise exception 'USUARIO_NO_CORRESPONDE_AL_ROL'; end if;
 v_codigo:=case when v_has_intermediary then 'CONFIDENCIALIDAD_INTERMEDIACION' else 'CONFIDENCIALIDAD_OPERACION' end;
 select * into v_doc from public.documentos_legales where codigo=v_codigo and estado='VIGENTE' order by vigencia_desde desc limit 1;
 if not found then raise exception 'CONFIDENCIALIDAD_NO_VIGENTE'; end if;
 insert into public.operacion_aceptaciones_confidencialidad(operacion_id,documento_legal_id,version,hash_sha256,rol,profile_id,company_id,ip,user_agent)
 values(p_operacion_id,v_doc.id,v_doc.version,v_doc.hash_sha256,p_rol,v_uid,v_company,p_ip,p_user_agent)
 on conflict (operacion_id,documento_legal_id,rol,company_id)
 do update set version=excluded.version,hash_sha256=excluded.hash_sha256,profile_id=excluded.profile_id,aceptado_at=now(),ip=excluded.ip,user_agent=excluded.user_agent
 returning id into v_id;
 insert into public.auditoria(tabla,registro_id,accion,descripcion,dispositivo)
 values('operacion_aceptaciones_confidencialidad',v_id,'ACEPTACION_CONFIDENCIALIDAD_OPERACION','Aceptación de confidencialidad para operación '||p_operacion_id::text||' por rol '||p_rol||' y empresa '||v_company::text||' usando '||v_codigo,'server');
 return v_id;
end;
$$;

create or replace function public.operacion_confidencialidad_completa(p_operacion_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
with cfg as (
 select case when exists(select 1 from public.operacion_participantes op where op.operacion_id=p_operacion_id and upper(op.rol)='INTERMEDIARIO') then 'CONFIDENCIALIDAD_INTERMEDIACION' else 'CONFIDENCIALIDAD_OPERACION' end as codigo
), required as (
 select distinct upper(op.rol) as rol,op.empresa_id as company_id
 from public.operacion_participantes op
 where op.operacion_id=p_operacion_id and upper(op.rol) in('COMPRADOR','VENDEDOR','INTERMEDIARIO')
), valid as (
 select r.* from required r,cfg
 where exists(select 1 from public.operacion_aceptaciones_confidencialidad a join public.documentos_legales d on d.id=a.documento_legal_id where a.operacion_id=p_operacion_id and a.company_id=r.company_id and upper(a.rol)=r.rol and d.codigo=cfg.codigo and d.estado='VIGENTE')
)
select exists(select 1 from public.operaciones o where o.id=p_operacion_id)
 and exists(select 1 from required where rol='COMPRADOR')
 and exists(select 1 from required where rol='VENDEDOR')
 and not exists(select 1 from required r where not exists(select 1 from valid v where v.rol=r.rol and v.company_id=r.company_id));
$$;

drop function if exists public.estado_confidencialidad_operacion(uuid);
create function public.estado_confidencialidad_operacion(p_operacion_id uuid)
returns table(rol text,company_id uuid,requerido boolean,aceptado boolean,aceptado_at timestamptz,version text,hash_sha256 text,documento_codigo text,documento_titulo text)
language sql stable security definer set search_path=''
as $$
with cfg as (
 select case when exists(select 1 from public.operacion_participantes op where op.operacion_id=p_operacion_id and upper(op.rol)='INTERMEDIARIO') then 'CONFIDENCIALIDAD_INTERMEDIACION' else 'CONFIDENCIALIDAD_OPERACION' end as codigo
), roles as (
 select distinct upper(op.rol) as rol,op.empresa_id as company_id
 from public.operacion_participantes op
 where op.operacion_id=p_operacion_id and upper(op.rol) in('COMPRADOR','VENDEDOR','INTERMEDIARIO')
 and (upper(op.rol)<>'INTERMEDIARIO' or (select codigo from cfg)='CONFIDENCIALIDAD_INTERMEDIACION')
), doc as (
 select d.* from public.documentos_legales d,cfg where d.codigo=cfg.codigo and d.estado='VIGENTE' order by d.vigencia_desde desc limit 1
)
select r.rol,r.company_id,true,
 exists(select 1 from public.operacion_aceptaciones_confidencialidad a,doc where a.operacion_id=p_operacion_id and a.company_id=r.company_id and upper(a.rol)=r.rol and a.documento_legal_id=doc.id),
 (select max(a.aceptado_at) from public.operacion_aceptaciones_confidencialidad a,doc where a.operacion_id=p_operacion_id and a.company_id=r.company_id and upper(a.rol)=r.rol and a.documento_legal_id=doc.id),
 doc.version,doc.hash_sha256,doc.codigo,doc.titulo
from roles r,doc
order by case r.rol when 'VENDEDOR' then 1 when 'COMPRADOR' then 2 when 'INTERMEDIARIO' then 3 else 4 end,r.company_id;
$$;

revoke all on function public.aceptar_confidencialidad_operacion(uuid,text,text,text) from public,anon;
grant execute on function public.aceptar_confidencialidad_operacion(uuid,text,text,text) to authenticated;
revoke all on function public.operacion_confidencialidad_completa(uuid) from public,anon,authenticated;
revoke all on function public.estado_confidencialidad_operacion(uuid) from public,anon;
grant execute on function public.estado_confidencialidad_operacion(uuid) to authenticated;
