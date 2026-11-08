import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";
import forge from "npm:node-forge@1.3.1";

const URL=Deno.env.get("SUPABASE_URL")!, ANON=Deno.env.get("SUPABASE_ANON_KEY")!, SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(URL,SERVICE);

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json",...corsHeaders}});

function envPem(name:string,b64Name:string){
  const p=Deno.env.get(name)||""; if(p)return p;
  const b=Deno.env.get(b64Name)||""; if(!b)return "";
  try{return new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g,"")),c=>c.charCodeAt(0)))}catch{return ""}
}
function esc(v:unknown){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function nodeText(xml:string,name:string){
  const d=new DOMParser().parseFromString(xml,"text/xml");
  const n=d?.getElementsByTagName(name)[0]||d?.getElementsByTagNameNS("*",name)[0];
  return n?.textContent?.trim()||null;
}
function allErrors(xml:string){
  const d=new DOMParser().parseFromString(xml,"text/xml");
  return Array.from(d?.getElementsByTagName("error")||[]).map(x=>({
    code:x.getElementsByTagName("codigo")[0]?.textContent?.trim()||"",
    description:x.getElementsByTagName("descripcion")[0]?.textContent?.trim()||""
  }));
}
function hasFault(xml:string){return !!nodeText(xml,"faultstring")||!!nodeText(xml,"Fault")}

function makeCms(certPem:string,keyPem:string){
  if(!certPem||!keyPem)throw new Error("ARCA_WSCPE_CREDENTIALS_NOT_CONFIGURED");
  const cert=forge.pki.certificateFromPem(certPem), key=forge.pki.privateKeyFromPem(keyPem), now=new Date();
  const fmt=(d:Date)=>{const z=new Date(d.getTime()-3*60*60*1000);return z.toISOString().replace(/\.\d{3}Z$/,"-03:00")};
  const tra='<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header><uniqueId>'+Math.floor(now.getTime()/1000)+'<\/uniqueId><generationTime>'+fmt(new Date(now.getTime()-60000))+'<\/generationTime><expirationTime>'+fmt(new Date(now.getTime()+600000))+'<\/expirationTime><\/header><service>wscpe<\/service><\/loginTicketRequest>';
  const p7=forge.pkcs7.createSignedData();
  p7.content=forge.util.createBuffer(tra,"utf8"); p7.addCertificate(cert);
  p7.addSigner({key,certificate:cert,digestAlgorithm:forge.pki.oids.sha1,authenticatedAttributes:[
    {type:forge.pki.oids.contentType,value:forge.pki.oids.data},{type:forge.pki.oids.messageDigest},{type:forge.pki.oids.signingTime,value:now}
  ]});
  p7.sign({detached:true});
  return forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());
}

const cache=new Map<string,{token:string,sign:string,expiresAt:number}>();
const inflight=new Map<string,Promise<{token:string,sign:string,expiresAt:number}>>();

async function getToken(environment:string,cuit:string,cert:string,key:string){
  const k=environment+"|"+cuit+"|"+cert.slice(0,64), now=Date.now();
  const hit=cache.get(k); if(hit&&hit.expiresAt>now+60000)return hit;
  const p=inflight.get(k); if(p)return p;
  const promise=(async()=>{
    const homo=environment!=="production";
    const url=homo?"https://wsaahomo.afip.gov.ar/ws/services/LoginCms":"https://wsaa.afip.gov.ar/ws/services/LoginCms";
    const cms=makeCms(cert,key);
    const body='<?xml version="1.0"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><loginCms xmlns="http://wsaa.afip.gov.ar/ws/services/LoginCms"><in0>'+cms+'</in0></loginCms></soapenv:Body></soapenv:Envelope>';
    const ac=new AbortController(), timer=setTimeout(()=>ac.abort(),30000);
    let r:Response;
    try{r=await fetch(url,{method:"POST",headers:{"content-type":"text/xml; charset=utf-8"},body,signal:ac.signal})}
    catch(e){if((e as any)?.name==="AbortError")throw new Error("ARCA_WSAA_TIMEOUT");throw e}
    finally{clearTimeout(timer)}
    const xml=await r.text(); if(!r.ok)throw new Error("ARCA_WSAA_HTTP_"+r.status);
    const token=nodeText(xml,"token"), sign=nodeText(xml,"sign"), exp=nodeText(xml,"expirationTime");
    if(!token||!sign)throw new Error("ARCA_WSAA_INVALID_RESPONSE");
    const out={token,sign,expiresAt:exp?Date.parse(exp):Date.now()+10*60*60*1000}; cache.set(k,out); return out;
  })().finally(()=>inflight.delete(k));
  inflight.set(k,promise); return promise;
}

async function soap(environment:string,method:string,inner:string,auth:{token:string,sign:string,cuit:string}){
  const url=environment==="production"?"https://cpea-ws.afip.gob.ar/wscpe/services/soap":"https://cpea-ws-qaext.afip.gob.ar/wscpe/services/soap";
  const body='<?xml version="1.0"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsc="https://serviciosjava.afip.gob.ar/wscpe/"><soapenv:Header/><soapenv:Body><wsc:'+method+'><auth><token>'+esc(auth.token)+'</token><sign>'+esc(auth.sign)+'</sign><cuitRepresentada>'+esc(auth.cuit)+'</cuitRepresentada></auth>'+inner+'</wsc:'+method+'></soapenv:Body></soapenv:Envelope>';
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),30000); let r:Response;
  try{r=await fetch(url,{method:"POST",headers:{"content-type":"text/xml; charset=utf-8","SOAPAction":"\"https://serviciosjava.afip.gob.ar/wscpe/"+method+"\""},body,signal:ac.signal})}
  catch(e){if((e as any)?.name==="AbortError")throw new Error("ARCA_WSCPE_TIMEOUT");throw e}
  finally{clearTimeout(timer)}
  const raw=new Uint8Array(await r.arrayBuffer());
  const contentType=r.headers.get("content-type")||"";
  let xml=new TextDecoder().decode(raw);
  if(contentType.toLowerCase().includes("multipart/related")){
    const boundary=contentType.match(/boundary="?([^";]+)"?/i)?.[1];
    if(boundary){
      const enc=new TextEncoder(), marker=enc.encode("--"+boundary), separator=enc.encode("\r\n\r\n");
      const indexOf=(hay:Uint8Array,needle:Uint8Array,from:number)=>{
        outer:for(let i=from;i<=hay.length-needle.length;i++){for(let j=0;j<needle.length;j++)if(hay[i+j]!==needle[j])continue outer;return i;}return -1;
      };
      let cursor=0,xmlPart="",pdfPart:Uint8Array|null=null;
      while(true){
        const start=indexOf(raw,marker,cursor);if(start<0)break;
        let partStart=start+marker.length;
        if(raw[partStart]===45&&raw[partStart+1]===45)break;
        if(raw[partStart]===13&&raw[partStart+1]===10)partStart+=2;
        const headerEnd=indexOf(raw,separator,partStart);if(headerEnd<0)break;
        const headers=new TextDecoder().decode(raw.subarray(partStart,headerEnd)).toLowerCase();
        const bodyStart=headerEnd+separator.length;
        const next=indexOf(raw,marker,bodyStart);
        let bodyEnd=next<0?raw.length:next;
        while(bodyEnd>bodyStart&&(raw[bodyEnd-1]===10||raw[bodyEnd-1]===13))bodyEnd--;
        if(headers.includes("application/xop+xml")||headers.includes("text/xml"))xmlPart=new TextDecoder().decode(raw.subarray(bodyStart,bodyEnd));
        else if(headers.includes("application/pdf")||headers.includes("application/octet-stream"))pdfPart=raw.slice(bodyStart,bodyEnd);
        if(next<0)break;cursor=next;
      }
      if(xmlPart)xml=xmlPart;
      if(pdfPart){
        let binary="";
        for(let i=0;i<pdfPart.length;i+=0x8000)binary+=String.fromCharCode(...pdfPart.subarray(i,Math.min(i+0x8000,pdfPart.length)));
        const pdfBase64=btoa(binary);
        if(/<pdf[^>]*>[\s\S]*?<\/pdf>/i.test(xml))xml=xml.replace(/<pdf[^>]*>[\s\S]*?<\/pdf>/i,"<pdf>"+pdfBase64+"</pdf>");
        else if(/<pdf[^>]*\/>/i.test(xml))xml=xml.replace(/<pdf[^>]*\/>/i,"<pdf>"+pdfBase64+"</pdf>");
      }
    }
  }
  if(!r.ok||hasFault(xml))throw new Error("ARCA_WSCPE_"+method+"_HTTP_"+r.status+" "+(nodeText(xml,"faultstring")||""));
  return xml;
}

function requiredString(v:unknown,name:string){const s=String(v??"").trim();if(!s)throw new Error("WSCPE_REQUIRED_"+name);return s}
function optionalXml(name:string,v:unknown){const s=String(v??"").trim();return s?"<"+name+">"+esc(s)+"</"+name+">":""}
function cuitDigits(v:unknown,name:string,optional=false){const s=String(v??"").replace(/\D/g,"");if(optional&&!s)return "";if(s.length!==11)throw new Error("WSCPE_INVALID_CUIT_"+name);return s}
function optionalCuitXml(name:string,v:unknown){const s=String(v??"").trim();return s?optionalXml(name,cuitDigits(s,name,true)):""}

Deno.serve(async req=>{
  try{
    if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
    if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
    const auth=req.headers.get("authorization"); if(!auth?.startsWith("Bearer "))return json({error:"AUTH_REQUIRED"},401);
    const uc=createClient(URL,ANON,{global:{headers:{Authorization:auth}}}); const {data:{user}}=await uc.auth.getUser();
    if(!user)return json({error:"AUTH_REQUIRED"},401);
    const b=await req.json().catch(()=>({}));
    if(b.action==="health"){
      const {data:admin,error:adminError}=await db.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();
      if(adminError)return json({error:"ADMIN_LOOKUP_FAILED"},500);
      if(!admin)return json({error:"PLATFORM_ADMIN_REQUIRED"},403);
      const {data:profile}=await db.from("profiles").select("active_company_id").eq("id",user.id).maybeSingle();
      const companyId=profile?.active_company_id;
      if(!companyId)return json({error:"NO_ACTIVE_COMPANY"},409);
      const {data:companyMap,error:mapError}=await db.from("company_empresa_map").select("empresa_id").eq("company_id",companyId).eq("verified",true).order("created_at",{ascending:true}).limit(1).maybeSingle();
      if(mapError)return json({error:"COMPANY_MAP_LOOKUP_FAILED"},500);
      const empresaId=companyMap?.empresa_id||companyId;
      const {data:company}=await db.from("empresas").select("id,cuit").eq("id",empresaId).maybeSingle();
      if(!company?.cuit)return json({error:"ARCA_COMPANY_CUIT_NOT_CONFIGURED"},409);
      const {data:cfg}=await db.from("arca_company_config").select("environment,punto_venta,enabled,production_enabled,cert_secret_name,private_key_secret_name,cert_homologacion_secret_name,private_key_homologacion_secret_name,cuit_secret_name").eq("company_id",companyId).maybeSingle();
      if(!cfg?.enabled)return json({error:"ARCA_WSCPE_COMPANY_NOT_CONFIGURED"},409);
      const environment=cfg.environment==="production"?"production":"homologacion";
      if(environment==="production"&&!cfg.production_enabled)return json({error:"ARCA_PRODUCTION_LOCKED_UNTIL_EXPLICIT_APPROVAL"},423);
      const cuit=cuitDigits((cfg.cuit_secret_name?Deno.env.get(cfg.cuit_secret_name):"")||company.cuit,"REPRESENTADA");
      const certSecretName=environment==="production"?(cfg.cert_secret_name||"ARCA_CERTIFICATE_BASE64"):(cfg.cert_homologacion_secret_name||"ARCA_CERTIFICATE_HOMO_BASE64");
      const keySecretName=environment==="production"?(cfg.private_key_secret_name||"ARCA_PRIVATE_KEY_BASE64"):(cfg.private_key_homologacion_secret_name||"ARCA_PRIVATE_KEY_HOMO_BASE64");
      const cert=envPem(certSecretName,certSecretName),key=envPem(keySecretName,keySecretName);
      if(!cert||!key)return json({ok:false,environment,cuit_configured:true,certificate_configured:!!cert,private_key_configured:!!key,error:environment==="production"?"ARCA_WSCPE_PRODUCTION_CREDENTIALS_NOT_CONFIGURED":"ARCA_WSCPE_HOMOLOGATION_CREDENTIALS_NOT_CONFIGURED"},409);
      try{
        const certificate=forge.pki.certificateFromPem(cert),privateKey=forge.pki.privateKeyFromPem(key);
        const publicFromKey=forge.pki.rsa.setPublicKey((privateKey as any).n,(privateKey as any).e);
        const privateKeyMatches=forge.pki.publicKeyToPem(certificate.publicKey)===forge.pki.publicKeyToPem(publicFromKey);
        const now=new Date(),certificateValid=certificate.validity.notBefore<=now&&certificate.validity.notAfter>=now;
        if(!privateKeyMatches||!certificateValid)return json({ok:false,environment,certificate_configured:true,private_key_configured:true,certificate_valid:certificateValid,private_key_matches:privateKeyMatches,error:"ARCA_HOMOLOGATION_CERTIFICATE_INVALID_OR_MISMATCHED"},409);
        const ticket=await getToken(environment,cuit,cert,key);
        const response=await soap(environment,"ConsultarProvinciasReq","",{token:ticket.token,sign:ticket.sign,cuit});
        if(hasFault(response))return json({ok:false,environment,wsaa:"OK",wscpe:"FAULT",errors:allErrors(response),error:"ARCA_WSCPE_HOMOLOGATION_QUERY_FAILED"},502);
        return json({ok:true,environment,certificate_valid:true,private_key_matches:true,wsaa:"OK",wscpe:"OK",message:"Autenticación y consulta de provincias WSCPE completadas. No se emitió ninguna Carta de Porte."});
      }catch(e){return json({ok:false,environment,error:e instanceof Error?e.message:"ARCA_HOMOLOGATION_DIAGNOSTIC_FAILED"},502);}
    }
    const operationId=requiredString(b.operation_id,"OPERATION_ID");
    const viajeId=requiredString(b.viaje_id,"VIAJE_ID");
    const {data:viaje,error:viajeError}=await db.from("viajes").select("id,operacion_id,transportista_profile_id,patente_camion,patente_acoplado,carta_porte_ctg").eq("id",viajeId).eq("operacion_id",operationId).maybeSingle();
    if(viajeError)return json({error:"TRIP_LOOKUP_FAILED"},500);
    if(!viaje)return json({error:"TRIP_NOT_FOUND_FOR_OPERATION"},404);
    if(viaje.carta_porte_ctg)return json({error:"TRIP_ALREADY_HAS_CTG",nro_ctg:viaje.carta_porte_ctg},409);
    if(!viaje.transportista_profile_id)return json({error:"TRIP_WITHOUT_ASSIGNED_TRANSPORTISTA"},409);
    const {data:transportista,error:transportistaError}=await db.from("transportistas").select("profile_id,cuit,nombre_completo,verificacion_estado").eq("profile_id",viaje.transportista_profile_id).maybeSingle();
    if(transportistaError)return json({error:"TRANSPORTISTA_LOOKUP_FAILED"},500);
    if(!transportista||transportista.verificacion_estado!=="VERIFICADO")return json({error:"TRANSPORTISTA_NOT_VERIFIED"},409);
    const {data:profile}=await db.from("profiles").select("active_company_id").eq("id",user.id).maybeSingle();
    const companyId=profile?.active_company_id;
    if(!companyId)return json({error:"NO_ACTIVE_COMPANY"},409);
    const {data:companyMap}=await db.from("company_empresa_map").select("empresa_id").eq("company_id",companyId).order("verified",{ascending:false}).limit(1).maybeSingle();
    const empresaId=companyMap?.empresa_id||companyId;
    const {data:participant}=await db.from("operacion_participantes").select("id").eq("operacion_id",operationId).eq("empresa_id",empresaId).limit(1);
    if(!participant?.length)return json({error:"FORBIDDEN_OPERATION"},403);

    const {data:platformAdmin,error:adminError}=await db.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();
    if(adminError)return json({error:"ADMIN_LOOKUP_FAILED"},500);
    const {data:memberships,error:membershipError}=await db.from("company_users").select("company_id").eq("profile_id",user.id).eq("activo",true).eq("rol","administrador");
    if(membershipError)return json({error:"COMPANY_MEMBERSHIP_LOOKUP_FAILED"},500);
    const companyIds=(memberships||[]).map((m:any)=>String(m.company_id)).filter(Boolean);
    let companyAdmin=companyIds.includes(String(companyId));
    if(!companyAdmin&&companyIds.length){
      const {data:maps,error:mapError}=await db.from("company_empresa_map").select("empresa_id").in("company_id",companyIds);
      if(mapError)return json({error:"COMPANY_MAPPING_LOOKUP_FAILED"},500);
      companyAdmin=(maps||[]).some((m:any)=>String(m.empresa_id)===String(companyId));
    }
    const {data:brokerAuthorization,error:authorizationError}=await db.from("operacion_carta_porte_autorizaciones")
      .select("id").eq("operacion_id",operationId).eq("corredor_profile_id",user.id).is("revocado_at",null).maybeSingle();
    if(authorizationError)return json({error:"BROKER_AUTHORIZATION_LOOKUP_FAILED"},500);
    if(!platformAdmin&&!companyAdmin&&!brokerAuthorization)return json({error:"COMPANY_ADMIN_OR_AUTHORIZED_BROKER_REQUIRED"},403);

    const {data:company}=await db.from("empresas").select("id,cuit").eq("id",empresaId).maybeSingle();
    if(!company?.cuit)return json({error:"ARCA_COMPANY_CUIT_NOT_CONFIGURED"},409);
    const {data:cfg}=await db.from("arca_company_config").select("environment,punto_venta,enabled,production_enabled,cert_secret_name,private_key_secret_name,cuit_secret_name").eq("company_id",companyId).maybeSingle();
    if(!cfg?.enabled)return json({error:"ARCA_WSCPE_COMPANY_NOT_CONFIGURED"},409);
    const environment=cfg.environment==="production"?"production":"homologacion";
    if(environment==="production"&&!cfg.production_enabled)return json({error:"ARCA_PRODUCTION_LOCKED_UNTIL_EXPLICIT_APPROVAL"},423);
    const cuit=cuitDigits((cfg.cuit_secret_name?Deno.env.get(cfg.cuit_secret_name):"")||company.cuit,"REPRESENTADA");
    // Homologation and production credentials are deliberately isolated.
    const certSecretName=environment==="production"?(cfg.cert_secret_name||"ARCA_CERTIFICATE_BASE64"):"ARCA_CERTIFICATE_HOMO_BASE64";
    const keySecretName=environment==="production"?(cfg.private_key_secret_name||"ARCA_PRIVATE_KEY_BASE64"):"ARCA_PRIVATE_KEY_HOMO_BASE64";
    const cert=envPem(certSecretName,certSecretName), key=envPem(keySecretName,keySecretName);
    if(!cert||!key)return json({error:environment==="production"?"ARCA_WSCPE_PRODUCTION_CREDENTIALS_NOT_CONFIGURED":"ARCA_WSCPE_HOMOLOGATION_CREDENTIALS_NOT_CONFIGURED"},409);

    const tipoCP=requiredString(b.tipo_cp,"TIPO_CP"), sucursal=Number(b.sucursal||cfg.punto_venta);
    if(!Number.isInteger(sucursal)||sucursal<1)throw new Error("WSCPE_INVALID_SUCURSAL");
    const cuitSolicitante=cuitDigits(b.cuit_solicitante,"SOLICITANTE");
    const tipoGrano=requiredString(b.cod_grano,"COD_GRANO");
    const pesoBruto=requiredString(b.peso_bruto_kg,"PESO_BRUTO_KG");
    const pesoTara=requiredString(b.peso_tara_kg,"PESO_TARA_KG");
    const origenProvincia=requiredString(b.origen_provincia,"ORIGEN_PROVINCIA");
    const origenLocalidad=requiredString(b.origen_localidad,"ORIGEN_LOCALIDAD");
    const destinoCuit=cuitDigits(b.destino_cuit,"DESTINO");
    const destinoProvincia=requiredString(b.destino_provincia,"DESTINO_PROVINCIA");
    const destinoLocalidad=requiredString(b.destino_localidad,"DESTINO_LOCALIDAD");
    const destinatarioCuit=cuitDigits(b.destinatario_cuit,"DESTINATARIO");
    const transportistaCuit=cuitDigits(b.transportista_cuit||transportista.cuit,"TRANSPORTISTA");
    const dominio=requiredString(b.dominio_camion||viaje.patente_camion,"DOMINIO_CAMION");
    const dominioAcoplado=String(b.dominio_acoplado||viaje.patente_acoplado||"").trim();
    const fechaPartidaRaw=requiredString(b.fecha_hora_partida,"FECHA_HORA_PARTIDA"); const fechaPartida=fechaPartidaRaw.length===16?fechaPartidaRaw+":00":fechaPartidaRaw;
    const km=requiredString(b.km_recorrer,"KM_RECORRER");
    const choferCuit=cuitDigits(b.chofer_cuit||transportista.cuit,"CHOFER");
    const pagadorFlete=cuitDigits(b.cuit_pagador_flete,"PAGADOR_FLETE");
    const intermediarioFlete=cuitDigits(b.cuit_intermediario_flete,"INTERMEDIARIO_FLETE",true);
    const fumigada=String(b.mercaderia_fumigada??"false");

    const token=await getToken(environment,cuit,cert,key);
    let nroOrden=Number(b.nro_orden||0);
    if(!nroOrden){
      const q=await soap(environment,"ConsultarUltNroOrdenReq","<solicitud><sucursal>"+sucursal+"</sucursal><tipoCPE>"+esc(tipoCP)+"</tipoCPE></solicitud>",{token:token.token,sign:token.sign,cuit});
      const errors=allErrors(q); if(errors.length)throw new Error("WSCPE_ULTIMO_ORDEN_"+errors.map(e=>e.code+":"+e.description).join(" | "));
      nroOrden=Number(nodeText(q,"nroOrden")||"0")+1;
    }
    if(!Number.isInteger(nroOrden)||nroOrden<1)throw new Error("WSCPE_INVALID_NRO_ORDEN");

    const origin='<origen><productor><codProvincia>'+esc(origenProvincia)+'</codProvincia><codLocalidad>'+esc(origenLocalidad)+'</codLocalidad>'+optionalXml("nroRenspa",b.nro_renspa)+'</productor></origen>';
    const inter='<intervinientes>'+optionalCuitXml("cuitRemitenteComercialVentaPrimaria",b.cuit_remitente_comercial_venta_primaria)+optionalCuitXml("cuitRemitenteComercialVentaSecundaria",b.cuit_remitente_comercial_venta_secundaria)+optionalCuitXml("cuitCorredorVentaPrimaria",b.cuit_corredor_venta_primaria)+optionalCuitXml("cuitCorredorVentaSecundaria",b.cuit_corredor_venta_secundaria)+'</intervinientes>';
    const load='<datosCarga><codGrano>'+esc(tipoGrano)+'</codGrano>'+optionalXml("cosecha",b.cosecha)+'<pesoBruto>'+esc(pesoBruto)+'</pesoBruto><pesoTara>'+esc(pesoTara)+'</pesoTara></datosCarga>';
    const dest='<destino><cuit>'+esc(destinoCuit)+'</cuit><esDestinoCampo>'+String(Boolean(b.es_destino_campo))+'</esDestinoCampo><codProvincia>'+esc(destinoProvincia)+'</codProvincia><codLocalidad>'+esc(destinoLocalidad)+'</codLocalidad>'+optionalXml("planta",b.planta)+'</destino><destinatario><cuit>'+esc(destinatarioCuit)+'</cuit></destinatario>';
    const transport='<transporte><cuitTransportista>'+esc(transportistaCuit)+'</cuitTransportista><dominio>'+esc(dominio)+'</dominio>'+optionalXml("dominio",dominioAcoplado)+'<fechaHoraPartida>'+esc(fechaPartida)+'</fechaHoraPartida><kmRecorrer>'+esc(km)+'</kmRecorrer>'+optionalXml("codigoTurno",b.codigo_turno)+'<cuitChofer>'+esc(choferCuit)+'</cuitChofer>'+optionalXml("tarifa",b.tarifa)+'<cuitPagadorFlete>'+esc(pagadorFlete)+'</cuitPagadorFlete>'+optionalXml("cuitIntermediarioFlete",intermediarioFlete)+'<mercaderiaFumigada>'+fumigada+'</mercaderiaFumigada></transporte>';
    const inner='<solicitud><cabecera><tipoCP>'+esc(tipoCP)+'</tipoCP><cuitSolicitante>'+esc(cuitSolicitante)+'</cuitSolicitante><sucursal>'+sucursal+'</sucursal><nroOrden>'+nroOrden+'</nroOrden></cabecera>'+origin+'<correspondeRetiroProductor>'+String(Boolean(b.corresponde_retiro_productor))+'</correspondeRetiroProductor><esSolicitanteCampo>'+String(Boolean(b.es_solicitante_campo))+'</esSolicitanteCampo>'+inter+load+dest+transport+optionalXml("observaciones",b.observaciones)+'</solicitud>';

    let xml:string;
    try{xml=await soap(environment,"AutorizarCPEAutomotorReq",inner,{token:token.token,sign:token.sign,cuit})}
    catch(first){
      const q=await soap(environment,"ConsultarCPEAutomotorReq",'<solicitud><cuitSolicitante>'+esc(cuitSolicitante)+'</cuitSolicitante><cartaPorte><tipoCPE>'+esc(tipoCP)+'</tipoCPE><sucursal>'+sucursal+'</sucursal><nroOrden>'+nroOrden+'</nroOrden></cartaPorte></solicitud>',{token:token.token,sign:token.sign,cuit});
      const ctg=nodeText(q,"nroCTG"); if(!ctg)throw first; xml=q;
    }

    const errors=allErrors(xml),ctg=nodeText(xml,"nroCTG"),estado=nodeText(xml,"estado"),fechaEmision=nodeText(xml,"fechaEmision"),fechaVto=nodeText(xml,"fechaVencimiento");
    const blockingErrors=errors.filter(e=>e.code!=="550");
    const ok=!!ctg && blockingErrors.length===0;
    const responseForStorage=xml.replace(/<pdf[^>]*>[\s\S]*?<\/pdf>/i,"<pdf>[PDF almacenado en almacenamiento privado]</pdf>");
    let pdfDisponible=false,pdfPath:string|null=null,pdfError:string|null=null;
    if(ok){
      const pesoBrutoKg=Number(b.peso_bruto_kg),pesoTaraKg=Number(b.peso_tara_kg);
      const kilosNetos=Number.isFinite(pesoBrutoKg)&&Number.isFinite(pesoTaraKg)&&pesoBrutoKg>=pesoTaraKg?pesoBrutoKg-pesoTaraKg:null;
      const pdfBase64=nodeText(xml,"pdf");
      if(pdfBase64){
        try{
          const compact=pdfBase64.replace(/\s/g,"");
          const pdfBytes=Uint8Array.from(atob(compact),ch=>ch.charCodeAt(0));
          const safeCtg=String(ctg).replace(/[^0-9A-Za-z_-]/g,"");
          pdfPath="cpe/"+operationId+"/"+viajeId+"/ARCA-CTG-"+safeCtg+".pdf";
          const upload=await db.storage.from("agrobroker-private").upload(pdfPath,new Blob([pdfBytes],{type:"application/pdf"}),{contentType:"application/pdf",upsert:false});
          if(upload.error)throw upload.error;
          const digest=await crypto.subtle.digest("SHA-256",pdfBytes);
          const sha256=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
          const {error:docError}=await db.from("viaje_cartas_porte").insert({viaje_id:viajeId,operacion_id:operationId,numero_carta_porte:String(ctg),archivo_path:pdfPath,nombre_archivo:"Carta-de-Porte-ARCA-"+safeCtg+".pdf",sha256,kilos_declarados:kilosNetos,toneladas_declaradas:kilosNetos===null?null:kilosNetos/1000,estado_verificacion:"PENDIENTE_REVISION",cargada_por:user.id});
          if(docError){await db.storage.from("agrobroker-private").remove([pdfPath]);throw docError;}
          pdfDisponible=true;
        }catch(e){pdfError=String(e);}
      }else pdfError="ARCA_NO_INCLUYO_PDF_EN_LA_RESPUESTA";
      const {error:tripSaveError}=await db.from("viajes").update({carta_porte_ctg:ctg,carta_porte_nro_orden:nroOrden,carta_porte_estado:"EMITIDA",carta_porte_emitida_at:fechaEmision||new Date().toISOString(),carta_porte_environment:environment,carta_porte_response:{service:"wscpe",environment,request:inner,response:responseForStorage,errors,pdf_path:pdfPath},carta_porte_tn:kilosNetos===null?null:kilosNetos/1000,kilos_cargados:kilosNetos,actualizado_at:new Date().toISOString()}).eq("id",viajeId).eq("operacion_id",operationId);
      if(tripSaveError)return json({error:"ARCA_EMITIDA_BUT_TRIP_SAVE_FAILED",nro_ctg:ctg,nro_orden:nroOrden},500);
    }
    const {error:logSaveError}=await db.from("operacion_logistica").update({carta_porte_numero:ctg||null,carta_porte_estado:ok?"EMITIDA":"OBSERVADA",carta_porte_origen:"ARCA_WSCPE",carta_porte_codigo:String(nroOrden),carta_porte_fecha_emision:fechaEmision||null,carta_porte_fecha_vencimiento:fechaVto||null,carta_porte_response:{service:"wscpe",environment,request:inner,response:responseForStorage,errors},updated_at:new Date().toISOString(),actualizado_por:user.id}).eq("operacion_id",operationId);
    if(logSaveError)return json({error:"ARCA_RESULT_SAVE_FAILED",nro_ctg:ctg||null},500);
    if(!ok)return json({ok:false,operation_id:operationId,viaje_id:viajeId,nro_orden:nroOrden,errors,response:xml},422);
    return json({ok:true,operation_id:operationId,viaje_id:viajeId,nro_ctg:ctg,nro_orden:nroOrden,estado,fecha_emision:fechaEmision,fecha_vencimiento:fechaVto,pdf_disponible:pdfDisponible,pdf_error:pdfError,errors});
  }catch(e){
    return json({ok:false,error:e instanceof Error?e.message:"ARCA_WSCPE_ERROR"},502);
  }
});