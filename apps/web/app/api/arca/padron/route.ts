import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consultarPersonaPadron } from "@/lib/arca/padron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responseError(message:string,status:number){
  return NextResponse.json({ok:false,error:message},{status,headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:NextRequest){
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;
    if(!url||!anon||!serviceKey)return responseError("SUPABASE_SERVER_KEYS_NOT_CONFIGURED",503);

    const authorization=request.headers.get("authorization")||"";
    const token=authorization.match(/^Bearer\\s+(.+)$/i)?.[1]||"";
    if(!token)return responseError("AUTH_REQUIRED",401);
    const isServiceCall=token===serviceKey;
    const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
    const body=await request.json().catch(()=>({}));
    const verificationId=String(body?.verification_id||"");
    if(!verificationId)return responseError("VERIFICATION_ID_REQUIRED",400);

    let allowedCompanyIds:string[]=[];
    let isAdmin=false;
    if(!isServiceCall){
      const authClient=createClient(url,anon,{auth:{autoRefreshToken:false,persistSession:false}});
      const {data:{user},error:userError}=await authClient.auth.getUser(token);
      if(userError||!user)return responseError("INVALID_SESSION",401);
      const {data:profile,error:profileError}=await admin.from("profiles").select("active_company_id,tipo_usuario").eq("id",user.id).maybeSingle();
      if(profileError)return responseError("PROFILE_LOOKUP_FAILED",500);
      isAdmin=/ADMIN|ADMINISTRADOR|SUPERADMIN/i.test(String(profile?.tipo_usuario||""));
      if(!isAdmin&&profile?.active_company_id){
        const {data:maps,error:mapError}=await admin.from("company_empresa_map").select("empresa_id").eq("company_id",profile.active_company_id);
        if(mapError)return responseError("COMPANY_MEMBERSHIP_LOOKUP_FAILED",500);
        allowedCompanyIds=(maps||[]).map((m:any)=>String(m.empresa_id));
      }
      if(!isAdmin&&allowedCompanyIds.length===0)return responseError("COMPANY_OWNERSHIP_NOT_CONFIRMED",403);
    }

    const {data:verification,error:verificationError}=await admin.from("empresas_verificaciones")
      .select("id,empresa_id,organismo,tipo_consulta,estado").eq("id",verificationId).maybeSingle();
    if(verificationError)return responseError("VERIFICATION_LOOKUP_FAILED",500);
    if(!verification)return responseError("VERIFICATION_NOT_FOUND",404);
    if(!isServiceCall&&!isAdmin&&!allowedCompanyIds.includes(String(verification.empresa_id)))return responseError("FORBIDDEN_COMPANY",403);
    const isArca=/ARCA/i.test(String(verification.organismo||""))||/ARCA_CUIT|CUIT_PADRON|DATOS FISCALES|MONOTRIBUTO/i.test(String(verification.tipo_consulta||""));
    if(!isArca)return responseError("THIS_CHECK_REQUIRES_ANOTHER_OFFICIAL_REGISTRY",400);

    const {data:company,error:companyError}=await admin.from("empresas").select("id,cuit,tipo_empresa").eq("id",verification.empresa_id).maybeSingle();
    if(companyError)return responseError("COMPANY_LOOKUP_FAILED",500);
    if(!company)return responseError("COMPANY_NOT_FOUND",404);
    const cuit=String(company.cuit||"").replace(/\\D/g,"");
    if(!/^\\d{11}$/.test(cuit))return responseError("CUIT_INVALIDO",422);

    const result=await consultarPersonaPadron(cuit);
    return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const detail=error instanceof Error?error.message:"ARCA_PADRON_LOOKUP_FAILED";
    return NextResponse.json({ok:false,error:detail},{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
