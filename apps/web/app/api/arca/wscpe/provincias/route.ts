import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consultarProvinciasWSCPE } from "@/lib/arca/wscpe";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const access = await requirePlatformAdmin(request);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    const resultado=await consultarProvinciasWSCPE();
    return NextResponse.json(resultado,{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    console.error("Error WSCPE provincias:",error);
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Error desconocido"},{status:502});
  }
}
