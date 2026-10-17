import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"content-type":"application/json","cache-control":"no-store"}
});
const ARCA_BASE="https://soa.afip.gob.ar/sr-padron/v2/persona/";
const isArcaRequest=(v:any)=>/ARCA/i.test(String(v?.organismo||""))||/ARCA_CUIT|CUIT_PADRON|DATOS FISCALES|MONOTRIBUTO/i.test(String(v?.tipo_consulta||""));

async function processArcaVerification(sb:any, verification:any) {
  const now=new Date().toISOString();
  const {data:company,error:companyError}=await sb.from("empresas")
    .select("id,cuit,tipo_empresa,razon_social").eq("id",verification.empresa_id).maybeSingle();
  if(companyError) throw companyError;
  if(!company) throw new Error("EMPRESA_NO_ENCONTRADA");

  const cuit=String(company.cuit||"").replace(/\D/g,"");
  if(!/^\d{11}$/.test(cuit)) {
    const result={cuit_consultado:cuit||null,consulta_ejecutada:false,motivo:"CUIT_INVALIDO"};
    const {error}=await sb.from("empresas_verificaciones").update({
      organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:"CUIT_INVALIDO",
      observaciones:"No se consultó ARCA: el CUIT cargado no tiene 11 dígitos. Corregí el dato para volver a solicitar la verificación.",
      fuente_oficial:ARCA_BASE+"{CUIT}",identificador_consulta:cuit||null,
      resultado:result,consultado_at:now
    }).eq("id",verification.id);
    if(error) throw error;
    return {id:verification.id,estado:"CUIT_INVALIDO",detalle:"El CUIT debe tener 11 dígitos."};
  }

  const source=ARCA_BASE+cuit;
  let response:Response;
  try {
    response=await fetch(source,{
      method:"GET",
      headers:{"accept":"application/json","user-agent":"AgroBrokerIA-Verificacion/1.0"},
      signal:AbortSignal.timeout(10000)
    });
  } catch {
    await sb.from("empresas_verificaciones").update({
      organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:"PENDIENTE",
      observaciones:"No se pudo conectar con la fuente pública de ARCA. No se asignó una verificación; se puede reintentar.",
      fuente_oficial:source,identificador_consulta:cuit,consultado_at:now,
      resultado:{cuit_consultado:cuit,consulta_ejecutada:false,motivo:"FUENTE_NO_DISPONIBLE"}
    }).eq("id",verification.id);
    return {id:verification.id,estado:"PENDIENTE",detalle:"La fuente oficial no respondió; no se inventó un resultado."};
  }

  if(!response.ok) {
    await sb.from("empresas_verificaciones").update({
      organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:"PENDIENTE",
      observaciones:`La fuente pública de ARCA respondió HTTP ${response.status}. La verificación queda pendiente de reintento.`,
      fuente_oficial:source,identificador_consulta:cuit,consultado_at:now,
      resultado:{cuit_consultado:cuit,consulta_ejecutada:false,http_status:response.status}
    }).eq("id",verification.id);
    return {id:verification.id,estado:"PENDIENTE",detalle:"La fuente oficial no permitió confirmar el CUIT."};
  }

  let payload:any;
  try { payload=await response.json(); } catch {
    await sb.from("empresas_verificaciones").update({
      organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:"PENDIENTE",
      observaciones:"ARCA respondió con un formato no reconocido. No se asignó estado de verificación.",
      fuente_oficial:source,identificador_consulta:cuit,consultado_at:now,
      resultado:{cuit_consultado:cuit,consulta_ejecutada:false,motivo:"RESPUESTA_NO_VALIDA"}
    }).eq("id",verification.id);
    return {id:verification.id,estado:"PENDIENTE",detalle:"Respuesta oficial no interpretable."};
  }

  const data=payload?.data;
  if(payload?.success!==true||!data||typeof data!=="object") {
    const result={cuit_consultado:cuit,consulta_ejecutada:true,encontrado:false};
    const {error}=await sb.from("empresas_verificaciones").update({
      organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:"ARCA_OBSERVADA",
      fecha_verificacion:now,observaciones:"La consulta pública de ARCA no devolvió una ficha válida para este CUIT. Requiere revisión del dato y, si corresponde, comprobación manual.",
      fuente_oficial:source,identificador_consulta:cuit,consultado_at:now,
      resultado:result,vencimiento_at:new Date(Date.now()+7*86400000).toISOString()
    }).eq("id",verification.id);
    if(error) throw error;
    return {id:verification.id,estado:"ARCA_OBSERVADA",detalle:"ARCA no devolvió una ficha válida para el CUIT consultado."};
  }

  const estadoClave=String(data.estadoClave||data.estado_clave||data.estado||"NO_INFORMADO").trim().toUpperCase();
  const impuestos=Array.isArray(data.impuestos)?data.impuestos:[];
  const regimenes=Array.isArray(data.regimenes)?data.regimenes:[];
  const taxLabels=[...impuestos,...regimenes].map((x:any)=>String(x?.descripcion||x?.nombre||x?.idImpuesto||x?.idRegimen||"")).filter(Boolean);
  const monotributo=taxLabels.some((x:string)=>/MONOTRIBUTO/i.test(x));
  const active=estadoClave==="ACTIVO";
  const result={
    cuit_consultado:cuit,
    consulta_ejecutada:true,
    encontrado:true,
    estado_clave:estadoClave,
    tipo_clave:data.tipoClave||data.tipo_clave||null,
    tipo_persona:data.tipoPersona||data.tipo_persona||null,
    regimenes_detectados:taxLabels.slice(0,30),
    monotributo_detectado:monotributo,
    monotributo_informado:taxLabels.length>0,
    fuente:"Padrón público ARCA"
  };
  const expiry=new Date(Date.now()+30*86400000).toISOString();
  const {error:updateError}=await sb.from("empresas_verificaciones").update({
    organismo:"ARCA",
    tipo_consulta:"ARCA_CUIT",
    estado:active?"ARCA_VERIFICADA":"ARCA_OBSERVADA",
    fecha_verificacion:now,
    observaciones:active
      ? (taxLabels.length
        ? (monotributo?"ARCA informa CUIT activo y se detectó una referencia a monotributo en los datos devueltos. Esto no acredita habilitación de corredor ni verificación integral de la empresa.":"ARCA informa CUIT activo. Los datos tributarios devueltos no permiten confirmar monotributo; la habilitación profesional requiere comprobación separada.")
        : "ARCA informa CUIT activo. La fuente no devolvió información suficiente para confirmar el régimen tributario específico; la habilitación profesional requiere comprobación separada.")
      : `ARCA devolvió estado de clave "${estadoClave}". No se marcó la empresa como verificada integralmente.`,
    fuente_oficial:source,
    identificador_consulta:cuit,
    resultado:result,
    consultado_at:now,
    vencimiento_at:expiry
  }).eq("id",verification.id);
  if(updateError) throw updateError;

  const {error:scheduleError}=await sb.from("verificaciones_programadas").upsert({
    empresa_id:company.id,organismo:"ARCA",proxima_consulta_at:expiry,frecuencia_dias:30,activa:true
  },{onConflict:"empresa_id,organismo"});
  if(scheduleError) throw scheduleError;

  return {id:verification.id,estado:active?"ARCA_VERIFICADA":"ARCA_OBSERVADA",detalle:active?"CUIT activo según la consulta pública de ARCA. La empresa no queda verificada integralmente por este único control.":`Estado de clave informado por ARCA: ${estadoClave}.`,monotributo_detectado:monotributo,monotributo_informado:taxLabels.length>0};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return json({error:"METHOD_NOT_ALLOWED"},405);
  try {
    const url=Deno.env.get("SUPABASE_URL");
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey=Deno.env.get("SUPABASE_ANON_KEY");
    if(!url||!serviceKey||!anonKey) return json({error:"SUPABASE_ENV_NOT_CONFIGURED"},503);
    const sb=createClient(url,serviceKey);
    const secret=Deno.env.get("CRON_SECRET");
    const authorization=req.headers.get("authorization")||"";
    const supplied=req.headers.get("x-cron-secret")||authorization.replace(/^Bearer\s+/i,"");
    const isCron=!!secret&&supplied===secret;
    const body=await req.json().catch(()=>({}));
    let ownCompanyIds:string[]=[];
    let isAdmin=false;

    if(!isCron) {
      const token=authorization.match(/^Bearer\s+(.+)$/i)?.[1];
      if(!token) return json({error:"AUTH_REQUIRED"},401);
      const userClient=createClient(url,anonKey,{global:{headers:{Authorization:`Bearer ${token}`}}});
      const {data:{user},error:userError}=await userClient.auth.getUser(token);
      if(userError||!user) return json({error:"INVALID_SESSION"},401);
      const {data:profile}=await sb.from("profiles").select("active_company_id,tipo_usuario").eq("id",user.id).maybeSingle();
      isAdmin=/ADMIN|ADMINISTRADOR|SUPERADMIN/i.test(String(profile?.tipo_usuario||""));
      if(!isAdmin&&profile?.active_company_id) {
        const {data:maps}=await sb.from("company_empresa_map").select("empresa_id").eq("company_id",profile.active_company_id);
        ownCompanyIds=(maps||[]).map((m:any)=>String(m.empresa_id));
      }
      if(!isAdmin&&ownCompanyIds.length===0) return json({error:"COMPANY_OWNERSHIP_NOT_CONFIRMED"},403);
      if(!body?.verification_id) return json({error:"VERIFICATION_ID_REQUIRED"},400);
    }

    let requests:any[]=[];
    if(isCron) {
      const {data:pending,error:pendingError}=await sb.from("empresas_verificaciones")
        .select("*").eq("estado","PENDIENTE").order("creado_en",{ascending:true}).limit(100);
      if(pendingError) throw pendingError;
      requests=(pending||[]).filter(isArcaRequest);
      const now=new Date().toISOString();
      const {data:due,error:dueError}=await sb.from("verificaciones_programadas")
        .select("*").eq("activa",true).lte("proxima_consulta_at",now).limit(100);
      if(dueError) throw dueError;
      for(const scheduled of due||[]) {
        if(!/ARCA/i.test(String(scheduled.organismo||""))) {
          const next=new Date(Date.now()+Math.max(1,Number(scheduled.frecuencia_dias)||30)*86400000).toISOString();
          await sb.from("verificaciones_programadas").update({proxima_consulta_at:next}).eq("id",scheduled.id);
          continue;
        }
        const {data:existing,error:existingError}=await sb.from("empresas_verificaciones")
          .select("*").eq("empresa_id",scheduled.empresa_id).eq("organismo","ARCA")
          .order("consultado_at",{ascending:false}).limit(1).maybeSingle();
        if(existingError) throw existingError;
        if(existing) requests.push(existing);
        else {
          const {data:created,error:createError}=await sb.from("empresas_verificaciones").insert({
            empresa_id:scheduled.empresa_id,organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:"PENDIENTE",
            fuente_oficial:ARCA_BASE,observaciones:"Reverificación periódica programada.",ejecutado_por:"verificaciones-sync",consultado_at:now
          }).select("*").single();
          if(createError) throw createError;
          requests.push(created);
        }
      }
    } else {
      const {data:verification,error}=await sb.from("empresas_verificaciones").select("*").eq("id",body.verification_id).maybeSingle();
      if(error) throw error;
      if(!verification) return json({error:"VERIFICATION_NOT_FOUND"},404);
      if(!isAdmin&&!ownCompanyIds.includes(String(verification.empresa_id))) return json({error:"FORBIDDEN_COMPANY"},403);
      if(!isArcaRequest(verification)) return json({ok:true,estado:"PENDIENTE",detalle:"Este tipo de verificación requiere un registro oficial o revisión manual; no se marcó como verificado."});
      requests=[verification];
    }

    const results=[];
    for(const verification of requests) {
      try { results.push(await processArcaVerification(sb,verification)); }
      catch(error) {
        results.push({id:verification.id,estado:"PENDIENTE",detalle:error instanceof Error?error.message:"ERROR_DE_CONSULTA"});
      }
    }
    return json({ok:true,procesadas:results.length,resultados:results});
  } catch(error) {
    return json({error:error instanceof Error?error.message:"SYNC_ERROR"},500);
  }
});
