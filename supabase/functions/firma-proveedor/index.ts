import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";
const URL=Deno.env.get("SUPABASE_URL")!,KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,ANON=Deno.env.get("SUPABASE_ANON_KEY")!;
const db=createClient(URL,KEY);
Deno.serve(async req=>{
 try{
  const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return new Response(JSON.stringify({error:"AUTH_REQUIRED"}),{status:401});
  const uc=createClient(URL,ANON,{global:{headers:{Authorization:auth}}});const {data:{user}}=await uc.auth.getUser();if(!user)return new Response(JSON.stringify({error:"AUTH_REQUIRED"}),{status:401});
  const {contract_id}=await req.json();if(typeof contract_id!=="string"||!/^[0-9a-f-]{36}$/i.test(contract_id))return new Response(JSON.stringify({error:"INVALID_CONTRACT_ID"}),{status:400});
  const {data:c}=await db.from("contratos").select("id,operacion_id,numero_contrato,contenido,storage_path").eq("id",contract_id).single();if(!c)return new Response(JSON.stringify({error:"CONTRACT_NOT_FOUND"}),{status:404});
  const {data:p}=await db.from("operacion_participantes").select("empresa_id,rol").eq("operacion_id",c.operacion_id);if(!p?.some(x=>x.empresa_id))return new Response(JSON.stringify({error:"FORBIDDEN"}),{status:403});
  const base=Deno.env.get("SIGN_PROVIDER_BASE_URL"),api=Deno.env.get("SIGN_PROVIDER_API_KEY");
  if(!base||!api)return new Response(JSON.stringify({error:"SIGN_PROVIDER_NOT_CONFIGURED",message:"Configure SIGN_PROVIDER_BASE_URL y SIGN_PROVIDER_API_KEY para activar el proveedor externo."}),{status:503});
  const {data:signers}=await db.from("contrato_firmantes").select("id,empresa_id,rol,email,nombre,orden_firma").eq("contrato_id",contract_id).order("orden_firma");
  const payload={externalReference:c.id,document:{name:"Contrato-"+c.numero_contrato,hash:null,storagePath:c.storage_path,content:c.contenido},signers:(signers||[]).map(s=>({id:s.id,role:s.rol,email:s.email,name:s.nombre,order:s.orden_firma}))};
  const r=await fetch(base.replace(/\/$/,"")+"/envelopes",{method:"POST",headers:{"authorization":"Bearer "+api,"content-type":"application/json","idempotency-key":c.id},body:JSON.stringify(payload)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error("SIGN_PROVIDER_HTTP_"+r.status);
  await db.from("firma_solicitudes").update({proveedor:Deno.env.get("SIGN_PROVIDER_NAME")||"EXTERNAL",proveedor_request_id:String(j.id||j.envelopeId||""),proveedor_status:String(j.status||"SENT"),autenticacion_metodo:String(j.authenticationMethod||"PROVIDER")}).eq("contrato_id",contract_id).eq("estado","PENDIENTE");
  return new Response(JSON.stringify({ok:true,provider:j}),{headers:{"content-type":"application/json"}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"SIGN_PROVIDER_ERROR"}),{status:502})}
});