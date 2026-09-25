import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";
import forge from "npm:node-forge@1.3.1";

const URL=Deno.env.get("SUPABASE_URL")!;
const ANON=Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(URL,SERVICE);
const homo=Deno.env.get("ARCA_ENVIRONMENT")!=="production";
const WSAA=homo?"https://wsaahomo.afip.gov.ar/ws/services/LoginCms":"https://wsaa.afip.gov.ar/ws/services/LoginCms";
const WSFE=homo?"https://wswhomo.afip.gov.ar/wsfev1/service.asmx":"https://servicios1.afip.gov.ar/wsfev1/service.asmx";

function nodeText(xml:string,name:string){const d=new DOMParser().parseFromString(xml,"text/xml");const n=d?.getElementsByTagName(name)[0]||d?.getElementsByTagNameNS("*",name)[0];return n?.textContent?.trim()||null}
function allText(xml:string,name:string){const d=new DOMParser().parseFromString(xml,"text/xml");return Array.from(d?.getElementsByTagName(name)||[]).map(x=>x.textContent?.trim()||"")}
function esc(v:string){return v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}

function makeCms(){
 const certPem=Deno.env.get("ARCA_CERT_PEM"),keyPem=Deno.env.get("ARCA_PRIVATE_KEY_PEM");
 if(!certPem||!keyPem) throw new Error("ARCA_CREDENTIALS_NOT_CONFIGURED");
 const cert=forge.pki.certificateFromPem(certPem),key=forge.pki.privateKeyFromPem(keyPem),now=new Date();
 const fmt=(d:Date)=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"-03:00");
 const tra="<?xml version=\"1.0\" encoding=\"UTF-8\"?><loginTicketRequest version=\"1.0\"><header><uniqueId>"+Math.floor(now.getTime()/1000)+"</uniqueId><generationTime>"+fmt(new Date(now.getTime()-60000))+"</generationTime><expirationTime>"+fmt(new Date(now.getTime()+600000))+"</expirationTime></header><service>wsfe</service></loginTicketRequest>";
 const p7=forge.pkcs7.createSignedData();p7.content=forge.util.createBuffer(tra,"utf8");p7.addCertificate(cert);
 p7.addSigner({key,certificate:cert,digestAlgorithm:forge.pki.oids.sha1,authenticatedAttributes:[{type:forge.pki.oids.contentType,value:forge.pki.oids.data},{type:forge.pki.oids.messageDigest},{type:forge.pki.oids.signingTime,value:now}]});
 p7.sign({detached:true});return forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());
}
async function getToken(){
 const cms=makeCms();
 const body="<?xml version=\"1.0\"?><soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\"><soapenv:Body><loginCms xmlns=\"http://wsaa.afip.gov.ar/ws/services/LoginCms\"><in0>"+cms+"</in0></loginCms></soapenv:Body></soapenv:Envelope>";
 const r=await fetch(WSAA,{method:"POST",headers:{"content-type":"text/xml; charset=utf-8"},body});const xml=await r.text();if(!r.ok)throw new Error("ARCA_WSAA_HTTP_"+r.status);
 const token=nodeText(xml,"token"),sign=nodeText(xml,"sign");if(!token||!sign)throw new Error("ARCA_WSAA_INVALID_RESPONSE");return {token,sign};
}
async function soap(method:string,inner:string,a:{token:string,sign:string}){
 const body="<?xml version=\"1.0\"?><soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\"><soapenv:Body><"+method+" xmlns=\"http://ar.gov.afip.dif.FEV1/\"><Auth><Token>"+esc(a.token)+"</Token><Sign>"+esc(a.sign)+"</Sign><Cuit>"+esc(Deno.env.get("ARCA_CUIT")||"")+"</Cuit></Auth>"+inner+"</"+method+"></soapenv:Body></soapenv:Envelope>";
 const r=await fetch(WSFE,{method:"POST",headers:{"content-type":"text/xml; charset=utf-8","SOAPAction":"\"http://ar.gov.afip.dif.FEV1/"+method+"\""},body});return {ok:r.ok,status:r.status,xml:await r.text()};
}
async function authorize(i:any){
 const a=await getToken();const last=await soap("FECompUltimoAutorizado","<PtoVta>"+i.punto_venta+"</PtoVta><CbteTipo>"+i.tipo_comprobante_codigo+"</CbteTipo>",a);
 const next=Number(nodeText(last.xml,"CbteNro")||nodeText(last.xml,"CbteDesde")||"0")+1;
 const date=String(i.fecha_emision).replace(/-/g,""),total=Number(i.importe_total).toFixed(2),net=Number(i.importe_neto).toFixed(2),iva=Number(i.importe_iva||0).toFixed(2),mon=i.moneda_id===1?"PES":"DOL";
 const ivaXml=Number(i.importe_iva||0)>0?"<Iva><AlicIva><Id>5</Id><BaseImp>"+net+"</BaseImp><Importe>"+iva+"</Importe></AlicIva></Iva>":"";
 const cond=i.condicion_iva_receptor?"<CondicionIVAReceptorId>"+i.condicion_iva_receptor+"</CondicionIVAReceptorId>":"";
 const inner="<FeCAEReq><FeCabReq><CantReg>1</CantReg><PtoVta>"+i.punto_venta+"</PtoVta><CbteTipo>"+i.tipo_comprobante_codigo+"</CbteTipo></FeCabReq><FeDetReq><FECAEDetRequest><Concepto>1</Concepto><DocTipo>80</DocTipo><DocNro>"+esc(i.cuit_receptor)+"</DocNro><CbteDesde>"+next+"</CbteDesde><CbteHasta>"+next+"</CbteHasta><CbteFch>"+date+"</CbteFch><ImpTotal>"+total+"</ImpTotal><ImpTotConc>0.00</ImpTotConc><ImpNeto>"+net+"</ImpNeto><ImpOpEx>0.00</ImpOpEx><ImpIVA>"+iva+"</ImpIVA><ImpTrib>0.00</ImpTrib><MonId>"+mon+"</MonId><MonCotiz>1</MonCotiz>"+cond+ivaXml+"</FECAEDetRequest></FeDetReq></FeCAEReq>";
 const res=await soap("FECAESolicitar",inner,a);return {request:inner,response:res.xml,result:nodeText(res.xml,"Resultado"),cae:nodeText(res.xml,"CAE"),venc:nodeText(res.xml,"CAEFchVto"),cbte:Number(nodeText(res.xml,"CbteDesde")||next),codes:allText(res.xml,"Code"),messages:allText(res.xml,"Msg")};
}
Deno.serve(async req=>{
 try{
  if(req.method!=="POST")return new Response(JSON.stringify({error:"METHOD_NOT_ALLOWED"}),{status:405});
  const bearer=req.headers.get("authorization");if(!bearer?.startsWith("Bearer "))return new Response(JSON.stringify({error:"AUTH_REQUIRED"}),{status:401});
  const uc=createClient(URL,ANON,{global:{headers:{Authorization:bearer}}});const {data:{user}}=await uc.auth.getUser();if(!user)return new Response(JSON.stringify({error:"AUTH_REQUIRED"}),{status:401});
  const b=await req.json(),id=b?.invoice_id;if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))return new Response(JSON.stringify({error:"INVALID_INVOICE_ID"}),{status:400});
  const {data:i}=await db.from("facturas").select("*").eq("id",id).single();if(!i)return new Response(JSON.stringify({error:"INVOICE_NOT_FOUND"}),{status:404});
  const {data:profile}=await db.from("profiles").select("active_company_id").eq("id",user.id).maybeSingle();const {data:p}=await db.from("operacion_participantes").select("empresa_id").eq("operacion_id",i.operacion_id).eq("empresa_id",i.empresa_id).limit(1);if(user.id!==i.usuario_responsable&&(profile?.active_company_id!==i.empresa_id||!p?.length))return new Response(JSON.stringify({error:"FORBIDDEN"}),{status:403});
  if(i.estado==="AUTORIZADA")return new Response(JSON.stringify({ok:true,reused:true,invoice_id:id}),{headers:{"content-type":"application/json"}});
  await db.from("facturas").update({estado:"PENDIENTE_ARCA",arca_environment:homo?"HOMOLOGACION":"PRODUCCION",arca_service:"wsfev1",actualizada_en:new Date().toISOString()}).eq("id",id);
  try{
   const o=await authorize(i),ok=o.result==="A"&&!!o.cae,v=o.venc&&/^\d{8}$/.test(o.venc)?o.venc.slice(0,4)+"-"+o.venc.slice(4,6)+"-"+o.venc.slice(6,8):null;
   await db.from("facturas").update({estado:ok?"AUTORIZADA":o.result==="O"?"OBSERVADA":"RECHAZADA",numero_comprobante:o.cbte,cae:o.cae,cae_vencimiento:v,arca_resultado:o.result,arca_codigo:o.codes.join(","),arca_mensaje:o.messages.join(" | "),arca_request_xml:o.request,arca_response_xml:o.response,arca_autorizado_at:ok?new Date().toISOString():null,actualizada_en:new Date().toISOString()}).eq("id",id);
   await db.from("factura_eventos").insert({factura_id:id,actor_profile_id:user.id,evento:ok?"ARCA_AUTORIZADA":"ARCA_RECHAZADA",metadata:{resultado:o.result,codes:o.codes,messages:o.messages,cae:o.cae}});
   return new Response(JSON.stringify({ok,invoice_id:id,resultado:o.result,cae:o.cae,cae_vencimiento:v,comprobante:o.cbte,errores:{codes:o.codes,messages:o.messages}}),{headers:{"content-type":"application/json"}});
  }catch(e){
   const msg=e instanceof Error?e.message:"ARCA_INTEGRATION_ERROR";await db.from("facturas").update({estado:"ERROR_INTEGRACION",arca_mensaje:msg,actualizada_en:new Date().toISOString()}).eq("id",id);await db.from("factura_eventos").insert({factura_id:id,actor_profile_id:user.id,evento:"ARCA_ERROR",metadata:{error:msg}});return new Response(JSON.stringify({ok:false,error:msg}),{status:502});
  }
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"INTERNAL_ERROR"}),{status:500})}
});