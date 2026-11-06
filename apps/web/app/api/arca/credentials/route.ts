import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { obtenerCredencialesWSCPE } from "@/lib/arca/credentials";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";

export async function GET(request: Request) {
  try {
    const access = await requirePlatformAdmin(request);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    const credenciales = await obtenerCredencialesWSCPE();

    return NextResponse.json({
      ok: true,
      servicio: "wscpe",
      ambiente: process.env.ARCA_ENVIRONMENT ?? "HOMOLOGACION",
      tieneToken: Boolean(credenciales.token),
      tieneSign: Boolean(credenciales.sign),
      expirationTime: credenciales.expirationTime,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
