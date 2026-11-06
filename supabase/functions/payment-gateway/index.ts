import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON=Deno.env.get("SUPABASE_ANON_KEY")!;
const db=createClient(URL,SERVICE);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f-]{36}$/i.test(v);
Deno.serve(async req=>{
 try{
  if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
  const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return json({error:"AUTH_REQUIRED"},401);
  const uc=createClient(URL,ANON,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await uc.auth.getUser();if(!user)return json({error:"AUTH_REQUIRED"},401);
  const b=await req.json().catch(()=>({}));
  const operationId=b.operation_id,amount=Number(b.amount),currencyId=Number(b.currency_id);
  const method=typeof b.method==="string"?b.method.trim().toUpperCase():"";
  const reference=typeof b.reference==="string"?b.reference.trim():"";
  if(!uuid(operationId)||!Number.isFinite(amount)||amount<=0||!Number.isInteger(currencyId))return json({error:"INVALID_PAYMENT_REQUEST"},400);
  if(method!=="TRANSFERENCIA")return json({error:"BANK_TRANSFER_ONLY"},400);
  if(!reference)return json({error:"BANK_TRANSFER_REFERENCE_REQUIRED"},400);
  const participation=await uc.rpc("usuario_participa_operacion",{p_operacion_id:operationId});
  if(participation.error||!participation.data)return json({error:"FORBIDDEN"},403);
  const {data:profile}=await db.from("profiles").select("active_company_id").eq("id",user.id).single();
  if(!profile?.active_company_id)return json({error:"ACTIVE_COMPANY_REQUIRED"},403);
  const {data:participants}=await db.from("operacion_participantes").select("empresa_id").eq("operacion_id",operationId);
  const companies=new Set((participants||[]).map((p:any)=>p.empresa_id).filter(Boolean));
  if(!companies.has(profile.active_company_id))return json({error:"FORBIDDEN"},403);
  const {data:operation}=await db.from("operaciones").select("id,empresa_vendedora_id,empresa_compradora_id,importe_total").eq("id",operationId).single();
  if(!operation)return json({error:"OPERATION_NOT_FOUND"},404);
  const payer=profile.active_company_id;
  const seller=operation.empresa_vendedora_id,buyer=operation.empresa_compradora_id;
  if(payer!==seller&&payer!==buyer)return json({error:"FORBIDDEN"},403);
  const payee=payer===seller?buyer:seller;
  const {data:paymentId,error}=await uc.rpc("registrar_pago_operacion",{
   p_operacion_id:operationId,p_empresa_pagadora:payer,p_empresa_cobradora:payee,
   p_importe:amount,p_moneda_id:currencyId,p_metodo_pago:"TRANSFERENCIA",
   p_referencia:reference,p_comprobante:typeof b.comprobante_url==="string"?b.comprobante_url:null
  });
  if(error)return json({error:"PAYMENT_REGISTRATION_FAILED",message:error.message},422);
  return json({ok:true,status:"PENDIENTE_VERIFICACION",payment_id:paymentId,method:"TRANSFERENCIA",message:"La transferencia queda pendiente de conciliación administrativa. No se acreditó ni liberó automáticamente."},202);
 }catch(e){return json({error:e instanceof Error?e.message:"PAYMENT_GATEWAY_ERROR"},500)}
});