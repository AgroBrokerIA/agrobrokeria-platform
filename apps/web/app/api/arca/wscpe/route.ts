import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { solicitarTicketWSCPE } from "@/lib/arca/wsaa";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const access = await requirePlatformAdmin(request);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    const resultado=await solicitarTicketWSCPE();
    return NextResponse.json({ok:true,ambiente:resultado.ambiente,servicio:resultado.servicio,expirationTime:resultado.expirationTime,mensaje:"Autenticación WSAA realizada correctamente."});
  } catch(error) {
    console.error("ARCA WSAA:",error);
    return NextResponse.json({ok:false,mensaje:"No fue posible autenticar contra ARCA WSAA."},{status:502});
  }
}
