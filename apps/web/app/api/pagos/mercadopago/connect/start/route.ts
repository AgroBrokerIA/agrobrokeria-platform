import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { mercadoPagoAuthorizationUrl } from "@/lib/mercadopago/server";
import { signState } from "@/lib/mercadopago/crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth=request.headers.get("authorization");
    if(!auth?.startsWith("Bearer ")) return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
    const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user) return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
    const {data:profile}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).single();
    if(!profile?.active_company_id) return NextResponse.json({error:"ACTIVE_COMPANY_REQUIRED"},{status:400});
    const {data:membership}=await supabase.from("company_users").select("id").eq("company_id",profile.active_company_id).eq("profile_id",user.id).eq("activo",true).maybeSingle();
    if(!membership) return NextResponse.json({error:"FORBIDDEN"},{status:403});
    const payload=Buffer.from(JSON.stringify({companyId:profile.active_company_id,profileId:user.id,nonce:crypto.randomBytes(16).toString("hex"),exp:Date.now()+10*60*1000})).toString("base64url");
    const state=`${payload}.${signState(payload)}`;
    return NextResponse.json({authorization_url:mercadoPagoAuthorizationUrl(state)});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"MP_CONNECT_ERROR"},{status:500});}
}
