import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { consultarProvinciasWSCPE } from "@/lib/arca/wscpe";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "No autorizado. Iniciá sesión en AgroBrokerIA y ejecutá la prueba desde /arca-test." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Sesión de AgroBrokerIA inválida o vencida." },
        { status: 401 }
      );
    }

    const resultado = await consultarProvinciasWSCPE();

    return NextResponse.json({
      ok: resultado.ok,
      ambiente: process.env.ARCA_ENVIRONMENT ?? "HOMOLOGACION",
      servicio: "wscpe",
      usuario: user.email ?? null,
      mensaje: "Autenticación y consulta WSCPE realizadas correctamente.",
    });
  } catch (error) {
    const detalle =
      error instanceof Error ? error.message.slice(0, 500) : "Error técnico desconocido.";

    console.error("ARCA WSCPE auth-test:", detalle);

    return NextResponse.json(
      {
        ok: false,
        error: "No fue posible autenticar contra ARCA WSCPE.",
        detalle,
      },
      { status: 502 }
    );
  }
}
