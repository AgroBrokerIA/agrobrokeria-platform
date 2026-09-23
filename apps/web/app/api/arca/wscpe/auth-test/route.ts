import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { consultarProvinciasWSCPE } from "@/lib/arca/wscpe";

export async function GET() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    }

    const resultado = await consultarProvinciasWSCPE();

    return NextResponse.json({
      ok: resultado.ok,
      ambiente: process.env.ARCA_ENVIRONMENT ?? "HOMOLOGACION",
      servicio: "wscpe",
      mensaje: "Autenticación y consulta WSCPE realizadas correctamente.",
    });
  } catch (error) {
    console.error("ARCA WSCPE auth-test:", error);
    return NextResponse.json(
      { ok: false, error: "No fue posible autenticar contra ARCA WSCPE." },
      { status: 502 }
    );
  }
}
