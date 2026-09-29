import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";

const URL=Deno.env.get("SUPABASE_URL")!;
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(URL,KEY);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
function hex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function hmac(secret:string,body:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(body))))}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}

Deno.serve(async req=>{try{
 if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 const raw=await req.text(); const secret=Deno.env.get("PAYMENT_PROVIDER_WEBHOOK_SECRET"); if(!secret)return json({error:"WEBHOOK_NOT_CONFIGURED"},503);
 const supplied=(req.headers.get("x-payment-signature")||req.headers.get("x-webhook-signature")||"").toLowerCase(); const expected=(await hmac(secret,raw)).toLowerCase(); if(!supplied||!safeEqual(supplied,expected))return json({error:"INVALID_SIGNATURE"},401);
 const event=JSON.parse(raw); const provider=Deno.env.get("PAYMENT_PROVIDER_NAME")||"EXTERNAL"; const eventId=String(event.id||event.event_id||event.eventId||""); const type=String(event.type||event.event_type||event.status||"UNKNOWN").toUpperCase();
 const externalId=String(event.payment_id||event.paymentId||event.data?.id||event.data?.payment_id||""); const statusRaw=String(event.status||event.data?.status||type).toUpperCase();
 if(eventId){const {data:existingEvent}=await db.from("eventos_pago_externo").select("id").eq("proveedor",provider).eq("evento_id",eventId).maybeSingle(); if(existingEvent)return json({ok:true,idempotent:true});}
 let tx:any=null; if(externalId){const {data}=await db.from("transacciones_pago_externo").select("id,pago_id,estado").eq("proveedor",provider).eq("external_payment_id",externalId).maybeSingle(); tx=data;}
 const mapped=statusRaw.includes("SUCC")||statusRaw.includes("APPROV")||statusRaw.includes("PAID")||statusRaw.includes("COMPLET")?"PAGADO":statusRaw.includes("FAIL")||statusRaw.includes("REJECT")||statusRaw.includes("CANCEL")?"RECHAZADO":statusRaw.includes("PEND")||statusRaw.includes("PROCESS")?"PENDIENTE":"ACTUALIZADO";
 const {data:inserted,error:eventError}=await db.from("eventos_pago_externo").insert({transaccion_id:tx?.id||null,proveedor:provider,evento_id:eventId||null,tipo_evento:type,payload:event,firma_valida:true,procesado:false}).select("id").single(); if(eventError&&eventError.code!=="23505")return json({error:"EVENT_STORE_FAILED"},500);
 if(!tx)return json({ok:true,unmatched:true,event_id:inserted?.id||null},202);
 await db.from("transacciones_pago_externo").update({estado:mapped,provider_status:statusRaw,provider_response:event,actualizado_at:new Date().toISOString()}).eq("id",tx.id);
 if(tx.pago_id){const internal=mapped==="PAGADO"?"PAGADO":mapped==="RECHAZADO"?"RECHAZADO":"PENDIENTE"; const patch:any={estado:internal}; if(internal==="PAGADO")patch.fecha_pago=new Date().toISOString(); await db.from("pagos").update(patch).eq("id",tx.pago_id)}
 if(inserted?.id)await db.from("eventos_pago_externo").update({procesado:true}).eq("id",inserted.id);
 return json({ok:true,transaction_id:tx.id,status:mapped});
}catch(e){return json({error:e instanceof Error?e.message:"PAYMENT_WEBHOOK_ERROR"},500)}});