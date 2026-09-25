import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async(req)=>{
 try{
  const auth=req.headers.get("authorization")||"";const token=auth.replace(/^Bearer /i,"");if(!token)return json({error:"AUTH_REQUIRED"},401);
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}}});const admin=createClient(url,service);
  const {data:{user}}=await userClient.auth.getUser();if(!user)return json({error:"AUTH_REQUIRED"},401);
  const body=await req.json();const mensaje_id=body.mensaje_id;const target=body.idioma_destino;
  const {data:m,error:me}=await userClient.from("mensajes_comerciales").select("*").eq("id",mensaje_id).single();if(me||!m)return json({error:"NOT_FOUND"},404);
  if(m.remitente_profile_id!==user.id&&m.destinatario_profile_id!==user.id)return json({error:"FORBIDDEN"},403);
  const source=m.idioma_origen||"es";if(!target||target===source)return json({ok:true,status:"NO_REQUERIDA",texto:m.mensaje});
  const {data:existing}=await userClient.from("mensajes_traducciones").select("*").eq("mensaje_id",mensaje_id).eq("idioma_destino",target).order("version",{ascending:false}).limit(1).maybeSingle();
  if(existing?.estado==="TRADUCIDO")return json(existing);
  if(existing?.estado==="NO_DISPONIBLE" && (!Deno.env.get("TRANSLATION_API_URL") || !Deno.env.get("TRANSLATION_API_KEY")))return json({...existing,pending_external:true},409);
  const api=Deno.env.get("TRANSLATION_API_URL"),key=Deno.env.get("TRANSLATION_API_KEY"),provider=Deno.env.get("TRANSLATION_PROVIDER")||"external";
  if(!api||!key){
   const {data:r}=await admin.from("mensajes_traducciones").insert({mensaje_id,idioma_origen:source,idioma_destino:target,texto_original:m.mensaje,estado:"NO_DISPONIBLE",proveedor:provider,solicitado_por:user.id,error_codigo:"TRANSLATION_PROVIDER_NOT_CONFIGURED"}).select().single();
   return json({...r,pending_external:true},409);
  }
  const tr=await fetch(api,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${key}`},body:JSON.stringify({text:m.mensaje,source_language:source,target_language:target})});
  if(!tr.ok){await admin.from("mensajes_traducciones").insert({mensaje_id,idioma_origen:source,idioma_destino:target,texto_original:m.mensaje,estado:"ERROR",proveedor:provider,solicitado_por:user.id,error_codigo:"TRANSLATION_PROVIDER_ERROR"});return json({error:"TRANSLATION_PROVIDER_ERROR"},502);}
  const td=await tr.json();const translated=td.translation||td.texto_traducido||td.text;if(typeof translated!=="string"||!translated.trim())return json({error:"TRANSLATION_EMPTY"},502);
  const {data:r,error:re}=await admin.from("mensajes_traducciones").insert({mensaje_id,idioma_origen:source,idioma_destino:target,texto_original:m.mensaje,texto_traducido:translated,estado:"TRADUCIDO",proveedor:provider,solicitado_por:user.id,traducido_en:new Date().toISOString()}).select().single();if(re)throw re;
  await admin.from("auditoria").insert({tabla:"mensajes_traducciones",registro_id:r.id,accion:"MENSAJE_TRADUCIDO",descripcion:`Traducción ${source} -> ${target}`,dispositivo:"edge"});
  return json(r);
 }catch(e){return json({error:e instanceof Error?e.message:"TRANSLATION_ERROR"},500)}
});