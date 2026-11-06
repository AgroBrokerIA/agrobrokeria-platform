import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";
const URL=Deno.env.get("SUPABASE_URL")!,SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,ANON=Deno.env.get("SUPABASE_ANON_KEY")!,db=createClient(URL,SERVICE);
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
const langs=["es","en","pt","it","fr","de"];
Deno.serve(async req=>{try{
if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return json({error:"AUTH_REQUIRED"},401);
const uc=createClient(URL,ANON,{global:{headers:{Authorization:auth}}});const {data:{user}}=await uc.auth.getUser();if(!user)return json({error:"AUTH_REQUIRED"},401);
const b=await req.json().catch(()=>({}));const documentId=b.document_id;const contractId=b.contract_id||null;const target=typeof b.target_language==="string"?b.target_language.toLowerCase():"";const source=typeof b.source_language==="string"?b.source_language.toLowerCase():"";
if(typeof documentId!=="string"||!langs.includes(target)||!langs.includes(source)||target===source)return json({error:"INVALID_REQUEST"},400);
let q=db.from("documentos").select("*").eq("id",documentId).single();const {data:doc,error:docError}=await q;if(docError||!doc)return json({error:"DOCUMENT_NOT_FOUND"},404);
const {data:memberships,error:membershipError}=await db.from("company_users").select("company_id").eq("profile_id",user.id).eq("activo",true);
if(membershipError)return json({error:"MEMBERSHIP_LOOKUP_FAILED"},500);
const companyIds=(memberships||[]).map((m:any)=>String(m.company_id)).filter(Boolean);
const authorizedCompanyIds=new Set(companyIds);
if(companyIds.length){
 const {data:maps,error:mapError}=await db.from("company_empresa_map").select("empresa_id").in("company_id",companyIds);
 if(mapError)return json({error:"COMPANY_MAPPING_LOOKUP_FAILED"},500);
 for(const row of maps||[])authorizedCompanyIds.add(String(row.empresa_id));
}
let allowed=false;
if(contractId){
 const {data:contract}=await db.from("contratos").select("id,operacion_id").eq("id",contractId).maybeSingle();
 if(contract){
  const {data:participants,error:participantError}=await db.from("operacion_participantes").select("empresa_id").eq("operacion_id",contract.operacion_id);
  if(participantError)return json({error:"CONTRACT_ACCESS_LOOKUP_FAILED"},500);
  allowed=(participants||[]).some((p:any)=>authorizedCompanyIds.has(String(p.empresa_id)));
 }
}
if(!allowed){
 const docCompany=doc.empresa_id||doc.company_id||null;
 allowed=!!docCompany&&authorizedCompanyIds.has(String(docCompany));
}
if(!allowed)return json({error:"FORBIDDEN"},403);
const {data:last}=await db.from("documento_traducciones").select("version").eq("documento_id",documentId).eq("idioma_destino",target).order("version",{ascending:false}).limit(1).maybeSingle();const version=(last?.version||0)+1;
const api=Deno.env.get("TRANSLATION_API_URL")||"https://translation.googleapis.com/language/translate/v2",key=Deno.env.get("TRANSLATION_API_KEY"),provider=Deno.env.get("TRANSLATION_PROVIDER")||"GOOGLE_CLOUD_TRANSLATION_BASIC";
const {data:pending,error:insertError}=await db.from("documento_traducciones").insert({documento_id:documentId,contrato_id:contractId,idioma_origen:source,idioma_destino:target,version,estado:"PENDIENTE",proveedor:provider,solicitado_por:user.id}).select("*").single();if(insertError)return json({error:"TRANSLATION_REQUEST_FAILED",message:insertError.message},422);
if(!api||!key){await db.from("documento_traducciones").update({estado:"NO_DISPONIBLE",error_codigo:"TRANSLATION_PROVIDER_NOT_CONFIGURED"}).eq("id",pending.id);return json({ok:false,status:"PENDIENTE_CONFIGURACION",translation_id:pending.id},202);}
const sourceText=String(doc.contenido||doc.texto||doc.descripcion||"");if(!sourceText){await db.from("documento_traducciones").update({estado:"ERROR",error_codigo:"DOCUMENT_TEXT_UNAVAILABLE"}).eq("id",pending.id);return json({error:"DOCUMENT_TEXT_UNAVAILABLE"},422);}
const google=provider==="GOOGLE_CLOUD_TRANSLATION_BASIC"||api.includes("translation.googleapis.com");const r=await fetch(api,{method:"POST",headers:google?{"X-Goog-Api-Key":key,"content-type":"application/json"}:{authorization:"Bearer "+key,"content-type":"application/json"},body:JSON.stringify(google?{q:sourceText,source,target,format:"text"}:{text:sourceText,source_language:source,target_language:target})});const j=await r.json().catch(()=>({}));if(!r.ok){await db.from("documento_traducciones").update({estado:"ERROR",error_codigo:"TRANSLATION_PROVIDER_ERROR"}).eq("id",pending.id);return json({error:"TRANSLATION_PROVIDER_ERROR"},502);}
const translated=String(google?j?.data?.translations?.[0]?.translatedText:(j.translation||j.translated_text||j.text||""));if(!translated){await db.from("documento_traducciones").update({estado:"ERROR",error_codigo:"EMPTY_TRANSLATION"}).eq("id",pending.id);return json({error:"EMPTY_TRANSLATION"},502);}
const bytes=new TextEncoder().encode(translated);const digest=await crypto.subtle.digest("SHA-256",bytes);const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");const path=`translations/${documentId}/${target}/v${version}.txt`;
const upload=await db.storage.from("agrobroker-private").upload(path,bytes,{contentType:"text/plain; charset=utf-8",upsert:false});if(upload.error){await db.from("documento_traducciones").update({estado:"ERROR",error_codigo:"TRANSLATION_STORAGE_ERROR"}).eq("id",pending.id);return json({error:"TRANSLATION_STORAGE_ERROR"},500);}
const {data:row}=await db.from("documento_traducciones").update({estado:"TRADUCIDO",contenido_path:path,hash_sha256:hash,traducido_en:new Date().toISOString(),error_codigo:null}).eq("id",pending.id).select("*").single();return json({ok:true,translation:row});
}catch(e){return json({error:e instanceof Error?e.message:"DOCUMENT_TRANSLATION_ERROR"},500)}});