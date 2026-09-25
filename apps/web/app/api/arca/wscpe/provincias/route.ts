import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consultarProvinciasWSCPE } from "@/lib/arca/wscpe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token) return NextResponse.json({ ok:false,error:"No autorizado." },{status:401});
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data:{user},error}=await auth.auth.getUser(token);
    if(error||!user) return NextResponse.json({ok:false,error:"Sesión no válida."},{status:401});
    const resultado=await consultarProvinciasWSCPE();
    return NextResponse.json(resultado,{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    console.error("Error WSCPE provincias:",error);
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Error desconocido"},{status:502});
  }
}
