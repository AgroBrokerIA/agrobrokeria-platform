import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime="nodejs";

export async function GET(request:NextRequest){
  try{
    const auth=request.headers.get("authorization");
    if(!auth?.startsWith("Bearer ")) return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
    const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
    const {data:profile}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).single();
    if(!profile?.active_company_id) return NextResponse.json({connected:false});
    const admin=getSupabaseAdmin();
    const {data}=await admin.from("mercadopago_conexiones").select("estado,mp_user_id,token_expires_at,live_mode,public_key,actualizado_at").eq("company_id",profile.active_company_id).maybeSingle();
    return NextResponse.json({connected:Boolean(data&&data.estado==="CONECTADA"),connection:data?{estado:data.estado,mp_user_id:data.mp_user_id,token_expires_at:data.token_expires_at,live_mode:data.live_mode,public_key:data.public_key,actualizado_at:data.actualizado_at}:null});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"MP_STATUS_ERROR"},{status:500});}
}
