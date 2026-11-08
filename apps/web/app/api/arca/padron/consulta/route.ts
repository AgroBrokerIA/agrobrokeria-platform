import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consultarPersonaPadron } from "@/lib/arca/padron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail=(error:string,status:number)=>NextResponse.json({ok:false,error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:NextRequest){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!anon)return fail("SUPABASE_AUTH_NOT_CONFIGURED",503);
  const bearer=request.headers.get("authorization")||"";
  const token=bearer.match(/^Bearer\s+(.+)$/i)?.[1]||"";
  if(!token)return fail("AUTH_REQUIRED",401);
  const auth=createClient(url,anon,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user},error}=await auth.auth.getUser(token);
  if(error||!user)return fail("INVALID_SESSION",401);
  const body=await request.json().catch(()=>({}));
  const cuit=String(body?.cuit||"").replace(/\D/g,"");
  if(!/^\d{11}$/.test(cuit))return fail("CUIT_CUIL_MUST_HAVE_11_DIGITS",422);
  const result=await consultarPersonaPadron(cuit);
  return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store","Vary":"Authorization"}});
 }catch(error){
  const detail=error instanceof Error?error.message:"ARCA_PADRON_LOOKUP_FAILED";
  return fail(detail,502);
 }
}
