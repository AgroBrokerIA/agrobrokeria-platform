import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { solicitarTicketWSCPE } from "@/lib/arca/wsaa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token) return NextResponse.json({ ok:false,error:"No autorizado." },{status:401});
    const auth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data:{user},error}=await auth.auth.getUser(token);
    if(error||!user) return NextResponse.json({ok:false,error:"Sesión no válida."},{status:401});
    const resultado=await solicitarTicketWSCPE();
    return NextResponse.json({ok:true,ambiente:resultado.ambiente,servicio:resultado.servicio,expirationTime:resultado.expirationTime,mensaje:"Autenticación WSAA realizada correctamente."});
  } catch(error) {
    console.error("ARCA WSAA:",error);
    return NextResponse.json({ok:false,mensaje:"No fue posible autenticar contra ARCA WSAA."},{status:502});
  }
}
