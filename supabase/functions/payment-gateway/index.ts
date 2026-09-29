import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";

const URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON=Deno.env.get("SUPABASE_ANON_KEY")!;
const db=createClient(URL,SERVICE);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f-]{36}$/i.test(v);

Deno.serve(async req=>{
 try{
  if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
  const auth=req.headers.get("authorization"); if(!auth?.startsWith("Bearer "))return json({error:"AUTH_REQUIRED"},401);
  const uc=createClient(URL,ANON,{global:{headers:{Authorization:auth}}}); const {data:{user}}=await uc.auth.getUser(); if(!user)return json({error:"AUTH_REQUIRED"},401);
  const b=await req.json().catch(()=>({})); const operationId=b.operation_id; const amount=Number(b.amount); const currencyId=Number(b.currency_id); const method=typeof b.method==="string"?b.method.trim():""; const reference=typeof b.reference==="string"?b.reference.trim():"";
  if(!uuid(operationId)||!Number.isFinite(amount)||amount<=0||!Number.isInteger(currencyId)||!method)return json({error:"INVALID_PAYMENT_REQUEST"},400);
  const participation=await db.rpc("usuario_participa_operacion",{p_operacion_id:operationId}); if(participation.error||!participation.data)return json({error:"FORBIDDEN"},403);
  const {data:profile}=await db.from("profiles").select("active_company_id").eq("id",user.id).single(); if(!profile?.active_company_id)return json({error:"ACTIVE_COMPANY_REQUIRED"},403);
  const {data:participants}=await db.from("operacion_participantes").select("empresa_id").eq("operacion_id",operationId); const companies=new Set((participants||[]).map((p:any)=>p.empresa_id).filter(Boolean)); if(!companies.has(profile.active_company_id))return json({error:"FORBIDDEN"},403);
  const provider=Deno.env.get("PAYMENT_PROVIDER_NAME")||"EXTERNAL"; const environment=Deno.env.get("PAYMENT_PROVIDER_ENVIRONMENT")||"SANDBOX"; const idempotencyKey=reference||[operationId,profile.active_company_id,currencyId,amount,method].join(":");
  const {data:existing}=await db.from("transacciones_pago_externo").select("id,estado,external_payment_id,external_order_id,checkout_url,provider_status").eq("proveedor",provider).eq("ambiente",environment).eq("idempotency_key",idempotencyKey).maybeSingle(); if(existing)return json({ok:true,idempotent:true,transaction:existing});
  const {data:operation}=await db.from("operaciones").select("id,empresa_vendedora_id,empresa_compradora_id,importe_total").eq("id",operationId).single(); if(!operation)return json({error:"OPERATION_NOT_FOUND"},404);
  const payer=profile.active_company_id; const seller=operation.empresa_vendedora_id; const buyer=operation.empresa_compradora_id; if(payer!==seller&&payer!==buyer)return json({error:"FORBIDDEN"},403);
  const payee=payer===seller?buyer:seller;
  const {data:paymentId,error:paymentError}=await db.rpc("registrar_pago_operacion",{p_operacion_id:operationId,p_empresa_pagadora:payer,p_empresa_cobradora:payee,p_importe:amount,p_moneda_id:currencyId,p_metodo_pago:method,p_referencia:reference||null,p_comprobante:null});
  if(paymentError)return json({error:"PAYMENT_REGISTRATION_FAILED",message:paymentError.message},422);
  const {data:tx,error:txError}=await db.from("transacciones_pago_externo").insert({pago_id:paymentId,operacion_id:operationId,empresa_id:payer,proveedor:provider,ambiente:environment,idempotency_key:idempotencyKey,estado:"PENDIENTE",importe:amount,moneda_id:currencyId}).select("id,estado").single();
  if(txError)return json({error:"EXTERNAL_TRANSACTION_CREATE_FAILED",message:txError.message},500);
  const base=Deno.env.get("PAYMENT_PROVIDER_URL"); const apiKey=Deno.env.get("PAYMENT_PROVIDER_API_KEY");
  if(!base||!apiKey)return json({ok:true,status:"PENDIENTE_CONFIGURACION",transaction:tx,message:"La transacción quedó registrada. Falta configurar el proveedor externo; no se simuló ningún pago."},202);
  const providerResponse=await fetch(base.replace(/\/$/,"")+"/payments",{method:"POST",headers:{authorization:"Bearer "+apiKey,"content-type":"application/json","idempotency-key":idempotencyKey},body:JSON.stringify({amount,currency_id:currencyId,operation_id:operationId,reference:idempotencyKey,payment_method:method,return_url:b.return_url||null,webhook_url:b.webhook_url||null})});
  const providerBody=await providerResponse.json().catch(()=>({}));
  if(!providerResponse.ok){await db.from("transacciones_pago_externo").update({estado:"ERROR",provider_status:String(providerBody.status||providerResponse.status),provider_response:providerBody,error_code:"HTTP_"+providerResponse.status,error_message:"El proveedor rechazó la creación del pago",actualizado_at:new Date().toISOString()}).eq("id",tx.id); return json({error:"PAYMENT_PROVIDER_ERROR",transaction_id:tx.id},502);}
  const externalId=String(providerBody.id||providerBody.payment_id||providerBody.paymentId||"");
  await db.from("transacciones_pago_externo").update({estado:"CREADO",external_payment_id:externalId||null,external_order_id:providerBody.order_id||providerBody.orderId||null,checkout_url:providerBody.checkout_url||providerBody.checkoutUrl||providerBody.init_point||null,provider_status:String(providerBody.status||"CREATED"),provider_response:providerBody,actualizado_at:new Date().toISOString()}).eq("id",tx.id);
  return json({ok:true,transaction_id:tx.id,provider:providerBody});
 }catch(e){return json({error:e instanceof Error?e.message:"PAYMENT_GATEWAY_ERROR"},500)}
});