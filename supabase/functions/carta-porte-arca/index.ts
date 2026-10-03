import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";
import forge from "npm:node-forge@1.3.1";

const URL=Deno.env.get("SUPABASE_URL")!, ANON=Deno.env.get("SUPABASE_ANON_KEY")!, SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(URL,SERVICE);

const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});

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
  const xml=await r.text(); if(!r.ok||hasFault(xml))throw new Error("ARCA_WSCPE_"+method+"_HTTP_"+r.status+" "+(nodeText(xml,"faultstring")||""));
  return xml;
}

function requiredString(v:unknown,name:string){const s=String(v??"").trim();if(!s)throw new Error("WSCPE_REQUIRED_"+name);return s}
function optionalXml(name:string,v:unknown){const s=String(v??"").trim();return s?"<"+name+">"+esc(s)+"</"+name+">":""}

Deno.serve(async req=>{
  try{
    if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
    const auth=req.headers.get("authorization"); if(!auth?.startsWith("Bearer "))return json({error:"AUTH_REQUIRED"},401);
    const uc=createClient(URL,ANON,{global:{headers:{Authorization:auth}}}); const {data:{user}}=await uc.auth.getUser();
    if(!user)return json({error:"AUTH_REQUIRED"},401);
    const b=await req.json().catch(()=>({}));
    const operationId=requiredString(b.operation_id,"OPERATION_ID");
    const {data:profile}=await db.from("profiles").select("active_company_id").eq("id",user.id).maybeSingle();
    const companyId=profile?.active_company_id;
    if(!companyId)return json({error:"NO_ACTIVE_COMPANY"},409);
    const {data:participant}=await db.from("operacion_participantes").select("id").eq("operacion_id",operationId).eq("empresa_id",companyId).limit(1);
    if(!participant?.length)return json({error:"FORBIDDEN_OPERATION"},403);

    const {data:company}=await db.from("empresas").select("id,cuit").eq("id",companyId).maybeSingle();
    if(!company?.cuit)return json({error:"ARCA_COMPANY_CUIT_NOT_CONFIGURED"},409);
    const {data:cfg}=await db.from("arca_company_config").select("environment,punto_venta,enabled,cert_secret_name,private_key_secret_name,cuit_secret_name").eq("company_id",companyId).maybeSingle();
    const configured=!!cfg?.enabled;
    const environment=(cfg?.environment||Deno.env.get("ARCA_WSCPE_ENVIRONMENT")||"production")==="production"?"production":"homologacion";
    const cuit=(cfg?.cuit_secret_name?Deno.env.get(cfg.cuit_secret_name):"")||Deno.env.get("ARCA_WSCPE_CUIT")||company.cuit;
    const cert=envPem(cfg?.cert_secret_name||"ARCA_WSCPE_CERT_PEM","ARCA_WSCPE_CERTIFICATE_BASE64")||envPem("ARCA_CERT_PEM","ARCA_CERTIFICATE_BASE64");
    const key=envPem(cfg?.private_key_secret_name||"ARCA_WSCPE_PRIVATE_KEY_PEM","ARCA_WSCPE_PRIVATE_KEY_BASE64")||envPem("ARCA_PRIVATE_KEY_PEM","ARCA_PRIVATE_KEY_BASE64");
    if(!configured && (!Deno.env.get("ARCA_WSCPE_CUIT") && !Deno.env.get("ARCA_CUIT")))return json({error:"ARCA_WSCPE_COMPANY_NOT_CONFIGURED"},409);
    if(!cert||!key)return json({error:"ARCA_WSCPE_CREDENTIALS_NOT_CONFIGURED"},409);

    const tipoCP=requiredString(b.tipo_cp,"TIPO_CP"), sucursal=Number(b.sucursal||cfg?.punto_venta||Deno.env.get("ARCA_WSCPE_PUNTO_VENTA")||1);
    if(!Number.isInteger(sucursal)||sucursal<1)throw new Error("WSCPE_INVALID_SUCURSAL");
    const cuitSolicitante=requiredString(b.cuit_solicitante,cuit);
    const tipoGrano=requiredString(b.cod_grano,"COD_GRANO");
    const pesoBruto=requiredString(b.peso_bruto_kg,"PESO_BRUTO_KG");
    const pesoTara=requiredString(b.peso_tara_kg,"PESO_TARA_KG");
    const origenProvincia=requiredString(b.origen_provincia,"ORIGEN_PROVINCIA");
    const origenLocalidad=requiredString(b.origen_localidad,"ORIGEN_LOCALIDAD");
    const destinoCuit=requiredString(b.destino_cuit,"DESTINO_CUIT");
    const destinoProvincia=requiredString(b.destino_provincia,"DESTINO_PROVINCIA");
    const destinoLocalidad=requiredString(b.destino_localidad,"DESTINO_LOCALIDAD");
    const destinatarioCuit=requiredString(b.destinatario_cuit,"DESTINATARIO_CUIT");
    const transportistaCuit=requiredString(b.transportista_cuit,"TRANSPORTISTA_CUIT");
    const dominio=requiredString(b.dominio_camion,"DOMINIO_CAMION");
    const fechaPartida=requiredString(b.fecha_hora_partida,"FECHA_HORA_PARTIDA");
    const km=requiredString(b.km_recorrer,"KM_RECORRER");
    const choferCuit=requiredString(b.chofer_cuit,"CHOFER_CUIT");
    const pagadorFlete=requiredString(b.cuit_pagador_flete,"CUIT_PAGADOR_FLETE");
    const intermediarioFlete=requiredString(b.cuit_intermediario_flete,"CUIT_INTERMEDIARIO_FLETE");
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
    const inter='<intervinientes>'+optionalXml("cuitRemitenteComercialVentaPrimaria",b.cuit_remitente_comercial_venta_primaria)+optionalXml("cuitRemitenteComercialVentaSecundaria",b.cuit_remitente_comercial_venta_secundaria)+optionalXml("cuitCorredorVentaPrimaria",b.cuit_corredor_venta_primaria)+optionalXml("cuitCorredorVentaSecundaria",b.cuit_corredor_venta_secundaria)+'</intervinientes>';
    const load='<datosCarga><codGrano>'+esc(tipoGrano)+'</codGrano>'+optionalXml("cosecha",b.cosecha)+'<pesoBruto>'+esc(pesoBruto)+'</pesoBruto><pesoTara>'+esc(pesoTara)+'</pesoTara></datosCarga>';
    const dest='<destino><cuit>'+esc(destinoCuit)+'</cuit><esDestinoCampo>'+String(Boolean(b.es_destino_campo))+'</esDestinoCampo><codProvincia>'+esc(destinoProvincia)+'</codProvincia><codLocalidad>'+esc(destinoLocalidad)+'</codLocalidad>'+optionalXml("planta",b.planta)+'</destino><destinatario><cuit>'+esc(destinatarioCuit)+'</cuit></destinatario>';
    const transport='<transporte><cuitTransportista>'+esc(transportistaCuit)+'</cuitTransportista><dominio>'+esc(dominio)+'</dominio><fechaHoraPartida>'+esc(fechaPartida)+'</fechaHoraPartida><kmRecorrer>'+esc(km)+'</kmRecorrer>'+optionalXml("codigoTurno",b.codigo_turno)+'<cuitChofer>'+esc(choferCuit)+'</cuitChofer>'+optionalXml("tarifa",b.tarifa)+'<cuitPagadorFlete>'+esc(pagadorFlete)+'</cuitPagadorFlete><cuitIntermediarioFlete>'+esc(intermediarioFlete)+'</cuitIntermediarioFlete><mercaderiaFumigada>'+fumigada+'</mercaderiaFumigada></transporte>';
    const inner='<solicitud><cabecera><tipoCP>'+esc(tipoCP)+'</tipoCP><cuitSolicitante>'+esc(cuitSolicitante)+'</cuitSolicitante><sucursal>'+sucursal+'</sucursal><nroOrden>'+nroOrden+'</nroOrden></cabecera>'+origin+'<correspondeRetiroProductor>'+String(Boolean(b.corresponde_retiro_productor))+'</correspondeRetiroProductor>'+inter+load+dest+transport+optionalXml("observaciones",b.observaciones)+'</solicitud>';

    let xml:string;
    try{xml=await soap(environment,"AutorizarCPEAutomotorReq",inner,{token:token.token,sign:token.sign,cuit})}
    catch(first){
      const q=await soap(environment,"ConsultarCPEAutomotorReq",'<solicitud><cuitSolicitante>'+esc(cuitSolicitante)+'</cuitSolicitante><cartaPorte><tipoCPE>'+esc(tipoCP)+'</tipoCPE><sucursal>'+sucursal+'</sucursal><nroOrden>'+nroOrden+'</nroOrden></cartaPorte></solicitud>',{token:token.token,sign:token.sign,cuit});
      const ctg=nodeText(q,"nroCTG"); if(!ctg)throw first; xml=q;
    }

    const errors=allErrors(xml),ctg=nodeText(xml,"nroCTG"),estado=nodeText(xml,"estado"),fechaEmision=nodeText(xml,"fechaEmision"),fechaVto=nodeText(xml,"fechaVencimiento");
    const ok=!!ctg && errors.length===0;
    await db.from("operacion_logistica").update({
      carta_porte_numero:ctg||null,carta_porte_estado:ok?"EMITIDA":"OBSERVADA",carta_porte_origen:"ARCA_WSCPE",
      carta_porte_codigo:String(nroOrden),carta_porte_fecha_emision:fechaEmision||null,carta_porte_fecha_vencimiento:fechaVto||null,
      carta_porte_response:{service:"wscpe",environment,request:inner,response:xml,errors},updated_at:new Date().toISOString(),actualizado_por:user.id
    }).eq("operacion_id",operationId);

    if(!ok)return json({ok:false,operation_id:operationId,nro_orden:nroOrden,errors,response:xml},422);
    return json({ok:true,operation_id:operationId,nro_ctg:ctg,nro_orden:nroOrden,estado,fecha_emision:fechaEmision,fecha_vencimiento:fechaVto,errors});
  }catch(e){
    return json({ok:false,error:e instanceof Error?e.message:"ARCA_WSCPE_ERROR"},502);
  }
});