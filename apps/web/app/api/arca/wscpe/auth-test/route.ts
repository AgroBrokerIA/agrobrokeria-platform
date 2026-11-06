import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { consultarProvinciasWSCPE } from "@/lib/arca/wscpe";

export async function GET(request: NextRequest) {
  try {
    const access = await requirePlatformAdmin(request);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    const resultado = await consultarProvinciasWSCPE();

    return NextResponse.json({
      ok: resultado.ok,
      ambiente: process.env.ARCA_ENVIRONMENT ?? "HOMOLOGACION",
      servicio: "wscpe",
      usuario: access.user.email ?? null,
      mensaje: "Autenticación y consulta WSCPE realizadas correctamente.",
    });
  } catch (error) {
    const detalle =
      error instanceof Error ? error.message.slice(0, 2000) : "Error técnico desconocido.";

    console.error("ARCA WSCPE auth-test:", detalle);

    return NextResponse.json(
      {
        ok: false,
        error: "No fue posible completar la consulta WSCPE contra ARCA.",
        detalle,
      },
      { status: 502 }
    );
  }
}
