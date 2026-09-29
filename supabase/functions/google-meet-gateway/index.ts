import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";
const URL=Deno.env.get("SUPABASE_URL")!,SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,ANON=Deno.env.get("SUPABASE_ANON_KEY")!,db=createClient(URL,SERVICE);
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
Deno.serve(async req=>{try{
if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return json({error:"AUTH_REQUIRED"},401);
const uc=createClient(URL,ANON,{global:{headers:{Authorization:auth}}});const {data:{user}}=await uc.auth.getUser();if(!user)return json({error:"AUTH_REQUIRED"},401);
const b=await req.json().catch(()=>({}));const operationId=b.operation_id;const negotiationId=b.negotiation_id||null;const start=b.start_at||new Date().toISOString();const title=typeof b.title==="string"&&b.title.trim()?b.title.trim():"Reunión comercial AgroBrokerIA";
if(typeof operationId!=="string")return json({error:"INVALID_OPERATION_ID"},400);
const {data:id,error}=await db.rpc("crear_videollamada_comercial",{p_operacion_id:operationId,p_negociacion_id:negotiationId,p_inicio:start,p_titulo:title});if(error)return json({error:"VIDEO_CREATE_FAILED",message:error.message},422);
const {data:meeting}=await db.from("videollamadas_comerciales").select("id,operacion_id,negociacion_id,estado,inicio_at,fin_at,meeting_id,enlace,titulo,proveedor,error_codigo").eq("id",id).single();
const base=Deno.env.get("GOOGLE_MEET_API_URL");const token=Deno.env.get("GOOGLE_ACCESS_TOKEN")||Deno.env.get("GOOGLE_REFRESH_TOKEN");const clientId=Deno.env.get("GOOGLE_CLIENT_ID");const clientSecret=Deno.env.get("GOOGLE_CLIENT_SECRET");
if(!base||!token||!clientId||!clientSecret)return json({ok:true,status:"PENDIENTE_CONFIGURACION",meeting,message:"La videollamada quedó creada en AgroBrokerIA pero falta configurar Google; no se generó un enlace ficticio."},202);
const r=await fetch(base.replace(/\/$/,"")+"/meetings",{method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify({title,start_at:start,operation_id:operationId})});const j=await r.json().catch(()=>({}));
if(!r.ok){await db.from("videollamadas_comerciales").update({estado:"ERROR",proveedor:"GOOGLE_MEET",error_codigo:"GOOGLE_HTTP_"+r.status,actualizada_en:new Date().toISOString()}).eq("id",id);return json({error:"GOOGLE_MEET_ERROR",meeting_id:id},502);}
await db.from("videollamadas_comerciales").update({estado:"PROGRAMADA",proveedor:"GOOGLE_MEET",meeting_id:String(j.id||j.meeting_id||"")||null,enlace:j.url||j.meeting_url||j.hangoutLink||null,actualizada_en:new Date().toISOString()}).eq("id",id);
return json({ok:true,meeting_id:id,provider:j});
}catch(e){return json({error:e instanceof Error?e.message:"VIDEO_GATEWAY_ERROR"},500)}});