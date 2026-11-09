import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consultarPersonaPadron } from "@/lib/arca/padron";
import { arcaConfig } from "@/lib/arca/config";
import arcaPadronMock from "@/src/mocks/arcaPadronResponse.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail=(error:string,status:number)=>NextResponse.json({ok:false,error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:NextRequest){
 try{
  const body=await request.json().catch(()=>({}));
  const cuit=String(body?.cuit||"").replace(/\D/g,"");
  if(!/^\d{11}$/.test(cuit))return fail("CUIT_CUIL_MUST_HAVE_11_DIGITS",422);
  // Mock exclusivo de homologación/local: jamás habilitarlo en producción.
  if(process.env.ARCA_PADRON_MOCK==="true" && arcaConfig.environment==="HOMOLOGACION" && cuit==="27134987001"){
    const mock=arcaPadronMock;
    const g=mock.datosGenerales;
    return NextResponse.json({ok:true,result:{
      configured:true,found:true,source:mock.source,status:mock.status,
      estadoClave:g.estadoClave,tipoPersona:g.tipoPersona,nombre:g.nombre,apellido:g.apellido,razonSocial:g.razonSocial,
      fechaNacimiento:g.fechaNacimiento,genero:g.genero,nacionalidad:g.nacionalidad,
      domicilio:mock.domicilioFiscal.direccion,localidad:mock.domicilioFiscal.localidad,
      provincia:mock.domicilioFiscal.provincia,codigoPostal:mock.domicilioFiscal.codigoPostal,
      impuestos:mock.datosRegimenGeneral.impuestos.map(x=>x.descripcion),
      actividades:mock.datosRegimenGeneral.actividades.map(x=>x.descripcion),
      domicilioFiscal:mock.domicilioFiscal
    }},{headers:{"Cache-Control":"no-store"}});
  }
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;
  if(!url||!serviceKey)return fail("SUPABASE_SERVER_KEYS_NOT_CONFIGURED",503);
  const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const ip=request.headers.get("x-real-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("agrobrokeria-padron:"+ip));
  const ipHash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
  const {data:allowed,error:limitError}=await admin.rpc("permitir_consulta_padron",{p_ip_hash:ipHash});
  if(limitError)return fail("PADRON_RATE_LIMIT_UNAVAILABLE",503);
  if(allowed!==true)return fail("PADRON_LOOKUP_RATE_LIMIT_EXCEEDED",429);
  const result=await consultarPersonaPadron(cuit);
  return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store","Vary":"Authorization"}});
 }catch(error){
  const detail=error instanceof Error?error.message:"ARCA_PADRON_LOOKUP_FAILED";
  return fail(detail,502);
 }
}
