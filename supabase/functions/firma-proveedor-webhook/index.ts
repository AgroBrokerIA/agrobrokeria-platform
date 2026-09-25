import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
async function hexHmac(secret:string,body:string){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const b=new Uint8Array(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(body)));return Array.from(b).map(x=>x.toString(16).padStart(2,"0")).join("")}
Deno.serve(async req=>{
 try{
  if(req.method!=="POST")return new Response("method",{status:405});
  const raw=await req.text(),secret=Deno.env.get("SIGN_PROVIDER_WEBHOOK_SECRET");if(!secret)return new Response(JSON.stringify({error:"WEBHOOK_SECRET_NOT_CONFIGURED"}),{status:503});
  const sig=req.headers.get("x-signature")||"",expected=await hexHmac(secret,raw);if(sig.length!==expected.length||!crypto.timingSafeEqual(new TextEncoder().encode(sig),new TextEncoder().encode(expected)))return new Response(JSON.stringify({error:"INVALID_SIGNATURE"}),{status:401});
  const b=JSON.parse(raw),rid=String(b.requestId||b.externalReference||""),status=String(b.status||"");if(!rid)return new Response(JSON.stringify({error:"REQUEST_ID_REQUIRED"}),{status:400});
  const {data:s}=await db.from("firma_solicitudes").select("*").or("id.eq."+rid+",proveedor_request_id.eq."+rid).maybeSingle();if(!s)return new Response(JSON.stringify({error:"SIGN_REQUEST_NOT_FOUND"}),{status:404});
  const signed=status.toUpperCase()==="SIGNED"||status.toUpperCase()==="COMPLETED";
  await db.from("firma_solicitudes").update({proveedor_status:status,proveedor_signed_document_url:b.signedDocumentUrl||b.documentUrl||null,estado:signed?"FIRMADO":s.estado,firmado_at:signed?new Date().toISOString():s.firmado_at,actualizado_at:new Date().toISOString()}).eq("id",s.id);
  await db.from("firma_eventos").insert({solicitud_id:s.id,evento:signed?"PROVEEDOR_FIRMADO":"PROVEEDOR_EVENTO",metadata:b});
  return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json"}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"WEBHOOK_ERROR"}),{status:500})}
});