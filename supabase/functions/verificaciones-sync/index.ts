import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async req=>{
 try{
  const secret=Deno.env.get("CRON_SECRET");if(!secret)return json({error:"CRON_NOT_CONFIGURED"},503);
  const supplied=req.headers.get("x-cron-secret")||req.headers.get("authorization")?.replace(/^Bearer /i,"");if(supplied!==secret)return json({error:"FORBIDDEN"},403);
  const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;const sb=createClient(url,key),now=new Date().toISOString();
  const {data:due,error}=await sb.from("verificaciones_programadas").select("*").eq("activa",true).lte("proxima_consulta_at",now).limit(100);if(error)throw error;
  let processed=0;
  for(const v of due||[]){
   const {error:ie}=await sb.from("empresas_verificaciones").insert({empresa_id:v.empresa_id,organismo:v.organismo,tipo_consulta:"PROGRAMADA",estado:"PENDIENTE",fuente_oficial:v.organismo,observaciones:"Consulta programada pendiente de integración/autorización externa.",ejecutado_por:"verificaciones-sync",consultado_at:now});if(ie)throw ie;
   const next=new Date(Date.now()+Math.max(1,Number(v.frecuencia_dias)||1)*86400000).toISOString();const {error:ue}=await sb.from("verificaciones_programadas").update({proxima_consulta_at:next}).eq("id",v.id);if(ue)throw ue;processed++;
  }
  return json({ok:true,procesadas:processed,pending_external:processed});
 }catch(e){return json({error:e instanceof Error?e.message:"SYNC_ERROR"},500)}
});