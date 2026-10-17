import { arcaConfig } from "./config";
import { solicitarTicketServicio } from "./wsaa";

export type PadronResult = {
  configured: true;
  found: boolean;
  estadoClave?: string;
  tipoClave?: string;
  tipoPersona?: string;
  impuestos?: string[];
  actividades?: string[];
  monotributoDetectado?: boolean;
  monotributoInformado?: boolean;
  monotributoError?: string | null;
  error?: string;
};

const tag=(xml:string,name:string)=>xml.match(new RegExp("<(?:[A-Za-z0-9_]+:)?"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[A-Za-z0-9_]+:)?"+name+">","i"))?.[1]?.trim()||"";
const decodeXml=(s:string)=>s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'");
const escapeXml=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");

let cachedTicket:{token:string;sign:string;expirationTime:string|null}|null=null;
let ticketInFlight:Promise<{token:string;sign:string;expirationTime:string|null}>|null=null;

async function getTicket(){
  if(cachedTicket?.token&&cachedTicket.sign&&cachedTicket.expirationTime&&new Date(cachedTicket.expirationTime).getTime()>Date.now()+60000)return cachedTicket;
  if(ticketInFlight)return ticketInFlight;
  ticketInFlight=(async()=>{
    const t=await solicitarTicketServicio("ws_sr_constancia_inscripcion");
    const next={token:t.token,sign:t.sign,expirationTime:t.expirationTime};
    if(!next.token||!next.sign||!next.expirationTime)throw new Error("ARCA_WSAA_TICKET_INCOMPLETO");
    cachedTicket=next;return next;
  })();
  try{return await ticketInFlight}finally{ticketInFlight=null}
}

export async function consultarPersonaPadron(cuitInput:string):Promise<PadronResult>{
  const cuit=String(cuitInput||"").replace(/\\D/g,"");
  if(!/^\\d{11}$/.test(cuit))throw new Error("CUIT_INVALIDO");
  if(!arcaConfig.cuit)throw new Error("ARCA_CUIT_NO_CONFIGURADO");
  const ticket=await getTicket();
  const endpoint=arcaConfig.environment==="PRODUCCION"
    ?"https://aws.arca.gov.ar/sr-padron/webservices/personaServiceA5"
    :"https://awshomo.arca.gov.ar/sr-padron/webservices/personaServiceA5";
  const soap=`<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:a5="http://a5.soap.ws.server.puc.sr/">
  <soapenv:Header/>
  <soapenv:Body>
    <a5:getPersona_v2>
      <token>${escapeXml(ticket.token)}</token>
      <sign>${escapeXml(ticket.sign)}</sign>
      <cuitRepresentada>${escapeXml(arcaConfig.cuit)}</cuitRepresentada>
      <idPersona>${cuit}</idPersona>
    </a5:getPersona_v2>
  </soapenv:Body>
</soapenv:Envelope>`;
  const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8",Accept:"text/xml",SOAPAction:""},body:soap,signal:AbortSignal.timeout(25000)});
  const body=await response.text();
  if(!response.ok)throw new Error(`ARCA_PADRON_HTTP_${response.status}`);
  const fault=tag(body,"faultstring")||tag(body,"fault");
  if(fault)throw new Error("ARCA_PADRON_SOAP_FAULT");
  const general=tag(body,"datosGenerales");
  const errorConstancia=tag(body,"errorConstancia");
  if(!general||errorConstancia)return {configured:true,found:false,error:errorConstancia?"ARCA no devolvió una constancia válida":"SIN_DATOS_GENERALES"};
  const estadoClave=tag(general,"estadoClave").toUpperCase()||"NO_INFORMADO";
  const impuestos=[...body.matchAll(/<descripcionImpuesto>([\\s\\S]*?)<\\/descripcionImpuesto>/gi)].map(m=>decodeXml(m[1].trim())).filter(Boolean).slice(0,30);
  const actividades=[...body.matchAll(/<descripcionActividad>([\\s\\S]*?)<\\/descripcionActividad>/gi)].map(m=>decodeXml(m[1].trim())).filter(Boolean).slice(0,30);
  const monotributoBlock=tag(body,"datosMonotributo");
  const monotributoError=tag(body,"errorMonotributo")||null;
  const monotributoDetectado=!!monotributoBlock&&!monotributoError&&/(categoria|actividad|impuesto)/i.test(monotributoBlock);
  return {configured:true,found:true,estadoClave,tipoClave:tag(general,"tipoClave"),tipoPersona:tag(general,"tipoPersona"),impuestos,actividades,monotributoDetectado,monotributoInformado:!!monotributoBlock||!!monotributoError,monotributoError};
}
