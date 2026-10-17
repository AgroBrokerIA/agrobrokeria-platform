import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const PADRON_SERVICE="ws_sr_constancia_inscripcion";
const SOAP_NS="http://a5.soap.ws.server.puc.sr/";
const tag=(xml:string,name:string)=>xml.match(new RegExp("<(?:[A-Za-z0-9_]+:)?"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[A-Za-z0-9_]+:)?"+name+">","i"))?.[1]?.trim()||"";
const decodeXml=(s:string)=>s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'");
const escapeXml=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const isArcaRequest=(v:any)=>/ARCA/i.test(String(v?.organismo||""))||/ARCA_CUIT|CUIT_PADRON|DATOS FISCALES|MONOTRIBUTO/i.test(String(v?.tipo_consulta||""));
const environment=()=>/^(PRODUCCION|PRODUCTION|PROD)$/i.test(Deno.env.get("ARCA_ENVIRONMENT")||"")?"PRODUCCION":"HOMOLOGACION";

function getPem(key:string):string {
  const raw=Deno.env.get(key)||"";
  if(!raw)return "";
  if(raw.includes("-----BEGIN"))return raw;
  try { const decoded=atob(raw); if(decoded.includes("-----BEGIN"))return decoded; } catch { /* not base64 PEM */ }
  return raw;
}
function createTRA():string {
  const now=new Date(), expires=new Date(now.getTime()+10*60*1000);
  const dest=environment()==="PRODUCCION"?"cn=wsaa,o=afip,c=ar,serialNumber=CUIT 33693450239":"cn=wsaahomo,o=afip,c=ar,serialNumber=CUIT 33693450239";
  const cuit=Deno.env.get("ARCA_CUIT")||"";
  if(!/^\d{11}$/.test(cuit))throw new Error("ARCA_CUIT_NO_CONFIGURADO");
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0"><header><destination>${escapeXml(dest)}</destination><uniqueId>${Math.floor(Date.now()/1000)%4294967295}</uniqueId><generationTime>${now.toISOString()}</generationTime><expirationTime>${expires.toISOString()}</expirationTime></header><service>${PADRON_SERVICE}</service></loginTicketRequest>`;
}
function signTRA(tra:string,certPem:string,keyPem:string):string {
  const cert=forge.pki.certificateFromPem(certPem),key=forge.pki.privateKeyFromPem(keyPem);
  const p7=forge.pkcs7.createSignedData();p7.content=forge.util.createBuffer(tra,"utf8");p7.addCertificate(cert);
  p7.addSigner({key,certificate:cert,digestAlgorithm:forge.pki.oids.sha1,authenticatedAttributes:[
    {type:forge.pki.oids.contentType,value:forge.pki.oids.data},
    {type:forge.pki.oids.messageDigest},
    {type:forge.pki.oids.signingTime,value:new Date().toISOString()}
  ]});
  p7.sign({detached:false});
  return btoa(forge.asn1.toDer(p7.toAsn1()).getBytes());
}
async function obtainTicket(cert:string,key:string) {
  const prod=environment()==="PRODUCCION";
  const wsaa=prod?"https://wsaa.afip.gov.ar/ws/services/LoginCms":"https://wsaahomo.afip.gov.ar/ws/services/LoginCms";
  const cms=signTRA(createTRA(),cert,key);
  const envelope=`<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"><soapenv:Header/><soapenv:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soapenv:Body></soapenv:Envelope>`;
  const response=await fetch(wsaa,{method:"POST",headers:{"content-type":"text/xml; charset=utf-8",SOAPAction:"urn:LoginCms"},body:envelope,signal:AbortSignal.timeout(25000)});
  const body=await response.text();
  if(!response.ok)throw new Error("WSAA_HTTP_"+response.status);
  const inner=decodeXml(tag(body,"loginCmsReturn"));
  const token=tag(inner,"token"),sign=tag(inner,"sign"),expiry=tag(inner,"expirationTime");
  if(!token||!sign)throw new Error("WSAA_TOKEN_SIGN_NO_DISPONIBLE");
  return {token,sign,expiry};
}
async function queryOfficialPadron(cuit:string,verificationId:string,actorToken:string) {
  const cert=getPem("ARCA_CERTIFICATE_BASE64")||getPem("ARCA_CERTIFICATE_PEM");
  const key=getPem("ARCA_PRIVATE_KEY_BASE64")||getPem("ARCA_PRIVATE_KEY_PEM");
  if(!cert||!key||!Deno.env.get("ARCA_CUIT")) {
    const proxyUrl=Deno.env.get("ARCA_PADRON_PROXY_URL")||"https://agrobrokeria-platform-agrobroker.vercel.app/api/arca/padron";
    const response=await fetch(proxyUrl,{
      method:"POST",
      headers:{Authorization:`Bearer ${actorToken}`,"Content-Type":"application/json"},
      body:JSON.stringify({verification_id:verificationId}),
      signal:AbortSignal.timeout(30000)
    });
    const payload:any=await response.json().catch(()=>({}));
    if(!response.ok||!payload?.ok||!payload?.result)throw new Error(payload?.error||`ARCA_PADRON_PROXY_HTTP_${response.status}`);
    return payload.result;
  }
  const ticket=await obtainTicket(cert,key);
  const endpoint=environment()==="PRODUCCION"
    ?"https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5"
    :"https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA5";
  const soap=`<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:a5="${SOAP_NS}"><soapenv:Header/><soapenv:Body><a5:getPersona_v2><token>${escapeXml(ticket.token)}</token><sign>${escapeXml(ticket.sign)}</sign><cuitRepresentada>${escapeXml(Deno.env.get("ARCA_CUIT")||"")}</cuitRepresentada><idPersona>${cuit}</idPersona></a5:getPersona_v2></soapenv:Body></soapenv:Envelope>`;
  const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"text/xml; charset=utf-8",accept:"text/xml"},body:soap,signal:AbortSignal.timeout(25000)});
  const body=await response.text();
  if(!response.ok)throw new Error("PADRON_ARCA_HTTP_"+response.status);
  if(!body.includes("Envelope"))throw new Error("RESPUESTA_PADRON_ARCA_INVALIDA");
  const general=tag(body,"datosGenerales"),errorConstancia=tag(body,"errorConstancia");
  if(!general||errorConstancia)return {configured:true,found:false,error:errorConstancia||"SIN_DATOS_GENERALES"};
  const estadoClave=tag(general,"estadoClave").toUpperCase()||"NO_INFORMADO";
  const impuestos=[...body.matchAll(/<descripcionImpuesto>([\s\S]*?)<\/descripcionImpuesto>/gi)].map(m=>decodeXml(m[1].trim())).filter(Boolean).slice(0,30);
  const actividades=[...body.matchAll(/<descripcionActividad>([\s\S]*?)<\/descripcionActividad>/gi)].map(m=>decodeXml(m[1].trim())).filter(Boolean).slice(0,30);
  const monotributoBlock=tag(body,"datosMonotributo"),monotributoError=tag(body,"errorMonotributo")||null;
  const monotributoDetectado=!!monotributoBlock&&!monotributoError&&/(categoria|actividad|impuesto)/i.test(monotributoBlock);
  return {configured:true,found:true,estadoClave,tipoClave:tag(general,"tipoClave"),tipoPersona:tag(general,"tipoPersona"),impuestos,actividades,monotributoDetectado,monotributoInformado:!!monotributoBlock||!!monotributoError,monotributoError};
}

async function processArcaVerification(sb:any,verification:any,actorToken:string) {
  const now=new Date().toISOString();
  const {data:company,error:companyError}=await sb.from("empresas").select("id,cuit,tipo_empresa").eq("id",verification.empresa_id).maybeSingle();
  if(companyError)throw companyError;if(!company)throw new Error("EMPRESA_NO_ENCONTRADA");
  const cuit=String(company.cuit||"").replace(/\D/g,"");
  if(!/^\d{11}$/.test(cuit)){
    const {error}=await sb.from("empresas_verificaciones").update({organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:"CUIT_INVALIDO",observaciones:"No se consultó ARCA: el CUIT cargado no tiene 11 dígitos. Corregí el dato para reintentar.",fuente_oficial:"ARCA WS ws_sr_constancia_inscripcion",identificador_consulta:cuit||null,resultado:{cuit_consultado:cuit||null,consulta_ejecutada:false,motivo:"CUIT_INVALIDO"},consultado_at:now}).eq("id",verification.id);
    if(error)throw error;return {id:verification.id,estado:"CUIT_INVALIDO",detalle:"El CUIT debe tener 11 dígitos."};
  }
  let padron:any;
  try{padron=await queryOfficialPadron(cuit,verification.id,actorToken);}catch(error){
    const detail=error instanceof Error?error.message:"ERROR_PADRON_ARCA";
    await sb.from("empresas_verificaciones").update({organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:"PENDIENTE",observaciones:"No se pudo completar la consulta autenticada al padrón oficial de ARCA. No se asignó un resultado positivo; revisar credenciales, autorización del servicio y conectividad.",fuente_oficial:"ARCA ws_sr_constancia_inscripcion",identificador_consulta:cuit,consultado_at:now,resultado:{cuit_consultado:cuit,consulta_ejecutada:false,error_tecnico:detail}}).eq("id",verification.id);
    return {id:verification.id,estado:"PENDIENTE",detalle:detail==="CREDENCIALES_ARCA_NO_CONFIGURADAS"?"Faltan credenciales oficiales de ARCA en el entorno de servidor.":"ARCA no pudo confirmar la consulta; queda pendiente de reintento."};
  }
  if(!padron.configured){
    await sb.from("empresas_verificaciones").update({organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:"PENDIENTE",observaciones:"La consulta no se ejecutó porque faltan las credenciales X.509 de ARCA en el entorno de servidor. No se considera verificada.",fuente_oficial:"ARCA ws_sr_constancia_inscripcion",identificador_consulta:cuit,consultado_at:now,resultado:{cuit_consultado:cuit,consulta_ejecutada:false,motivo:padron.reason}}).eq("id",verification.id);
    return {id:verification.id,estado:"PENDIENTE",detalle:"Faltan credenciales oficiales de ARCA en el entorno de servidor."};
  }
  const active=padron.found&&padron.estadoClave==="ACTIVO";
  const status=padron.found?(active?"ARCA_VERIFICADA":"ARCA_OBSERVADA"):"ARCA_OBSERVADA";
  const result={cuit_consultado:cuit,consulta_ejecutada:true,encontrado:padron.found,estado_clave:padron.found?padron.estadoClave:null,tipo_clave:padron.found?padron.tipoClave:null,tipo_persona:padron.found?padron.tipoPersona:null,impuestos:padron.found?padron.impuestos:[],actividades:padron.found?padron.actividades:[],monotributo_detectado:padron.found?padron.monotributoDetectado:false,monotributo_informado:padron.found?padron.monotributoInformado:false,monotributo_error:padron.found?padron.monotributoError:null,fuente:"ARCA ws_sr_constancia_inscripcion"};
  const expiry=new Date(Date.now()+(active?30:7)*86400000).toISOString();
  const obs=!padron.found?"ARCA no devolvió datos de constancia para el CUIT consultado. Requiere revisión.":active
    ?(padron.monotributoInformado?(padron.monotributoDetectado?"ARCA informa CUIT activo y datos de monotributo. Esto no acredita matrícula de corredor ni verificación integral de la empresa.":"ARCA informa CUIT activo; la respuesta no confirma inscripción en monotributo. Esto no acredita matrícula de corredor ni verificación integral de la empresa."):"ARCA informa CUIT activo; el régimen de monotributo no pudo confirmarse con la respuesta recibida.")
    :`ARCA informa estado de clave "${padron.estadoClave}". La empresa no se marca como verificada integralmente.`;
  const {error:updateError}=await sb.from("empresas_verificaciones").update({organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:status,fecha_verificacion:now,observaciones:obs,fuente_oficial:"ARCA ws_sr_constancia_inscripcion",identificador_consulta:cuit,resultado:result,consultado_at:now,vencimiento_at:expiry}).eq("id",verification.id);
  if(updateError)throw updateError;
  await syncIdentityRequirement(sb,company,active,now);
  const {error:scheduleError}=await sb.from("verificaciones_programadas").upsert({empresa_id:company.id,organismo:"ARCA",proxima_consulta_at:expiry,frecuencia_dias:active?30:7,activa:true},{onConflict:"empresa_id,organismo"});
  if(scheduleError)throw scheduleError;
  return {id:verification.id,estado:status,detalle:obs,monotributo_detectado:padron.found?padron.monotributoDetectado:false,monotributo_informado:padron.found?padron.monotributoInformado:false};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anonKey=Deno.env.get("SUPABASE_ANON_KEY");
    if(!url||!serviceKey||!anonKey)return json({error:"SUPABASE_ENV_NOT_CONFIGURED"},503);
    const sb=createClient(url,serviceKey),secret=Deno.env.get("CRON_SECRET"),authorization=req.headers.get("authorization")||"";
    const bearerToken=authorization.replace(/^Bearer\\s+/i,"");
    const supplied=req.headers.get("x-cron-secret")||bearerToken;
    const isCron=(!!secret&&(supplied===secret||bearerToken===secret))||bearerToken===serviceKey;
    const body=await req.json().catch(()=>({}));
    let ownCompanyIds:string[]=[],isAdmin=false,actorToken=serviceKey;
    if(!isCron){
      const token=authorization.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return json({error:"AUTH_REQUIRED"},401);
      const userClient=createClient(url,anonKey,{global:{headers:{Authorization:`Bearer ${token}`}}});
      const {data:{user},error:userError}=await userClient.auth.getUser(token);if(userError||!user)return json({error:"INVALID_SESSION"},401);
      const {data:profile}=await sb.from("profiles").select("active_company_id,tipo_usuario").eq("id",user.id).maybeSingle();
      isAdmin=/ADMIN|ADMINISTRADOR|SUPERADMIN/i.test(String(profile?.tipo_usuario||""));
      if(!isAdmin&&profile?.active_company_id){const {data:maps}=await sb.from("company_empresa_map").select("empresa_id").eq("company_id",profile.active_company_id);ownCompanyIds=(maps||[]).map((m:any)=>String(m.empresa_id));}
      if(!isAdmin&&ownCompanyIds.length===0)return json({error:"COMPANY_OWNERSHIP_NOT_CONFIRMED"},403);
      if(!body?.verification_id)return json({error:"VERIFICATION_ID_REQUIRED"},400);
    }
    let requests:any[]=[];
    if(isCron){
      const {data:pending,error:pendingError}=await sb.from("empresas_verificaciones").select("*").eq("estado","PENDIENTE").order("creado_en",{ascending:true}).limit(100);
      if(pendingError)throw pendingError;requests=(pending||[]).filter(isArcaRequest);
      const now=new Date().toISOString();
      const {data:due,error:dueError}=await sb.from("verificaciones_programadas").select("*").eq("activa",true).lte("proxima_consulta_at",now).limit(100);
      if(dueError)throw dueError;
      for(const scheduled of due||[]){
        if(!/ARCA/i.test(String(scheduled.organismo||""))){const next=new Date(Date.now()+Math.max(1,Number(scheduled.frecuencia_dias)||30)*86400000).toISOString();await sb.from("verificaciones_programadas").update({proxima_consulta_at:next}).eq("id",scheduled.id);continue;}
        const {data:existing,error:existingError}=await sb.from("empresas_verificaciones").select("*").eq("empresa_id",scheduled.empresa_id).eq("organismo","ARCA").order("consultado_at",{ascending:false}).limit(1).maybeSingle();
        if(existingError)throw existingError;
        if(existing)requests.push(existing);else{const {data:created,error:createError}=await sb.from("empresas_verificaciones").insert({empresa_id:scheduled.empresa_id,organismo:"ARCA",tipo_consulta:"ARCA_CUIT",estado:"PENDIENTE",fuente_oficial:"ARCA ws_sr_constancia_inscripcion",observaciones:"Reverificación periódica programada.",ejecutado_por:"verificaciones-sync",consultado_at:now}).select("*").single();if(createError)throw createError;requests.push(created);}
      }
    }else{
      const {data:verification,error}=await sb.from("empresas_verificaciones").select("*").eq("id",body.verification_id).maybeSingle();
      if(error)throw error;if(!verification)return json({error:"VERIFICATION_NOT_FOUND"},404);
      if(!isAdmin&&!ownCompanyIds.includes(String(verification.empresa_id)))return json({error:"FORBIDDEN_COMPANY"},403);
      if(!isArcaRequest(verification))return json({ok:true,estado:"PENDIENTE",detalle:"Este tipo requiere el registro oficial o revisión manual; no se marcó como verificado."});
      requests=[verification];
    }
    const results=[];
    for(const verification of requests){try{results.push(await processArcaVerification(sb,verification,actorToken));}catch(error){results.push({id:verification.id,estado:"PENDIENTE",detalle:error instanceof Error?error.message:"ERROR_DE_CONSULTA"});}}
    return json({ok:true,procesadas:results.length,resultados:results});
  }catch(error){return json({error:error instanceof Error?error.message:"SYNC_ERROR"},500);}
});
