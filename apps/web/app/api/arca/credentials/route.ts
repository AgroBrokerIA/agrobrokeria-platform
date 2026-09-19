import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { obtenerCredencialesWSCPE } from "@/lib/arca/credentials";

export async function GET() {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const credenciales = await obtenerCredencialesWSCPE();

    return NextResponse.json({
      ok: true,
      servicio: "wscpe",
      ambiente: "HOMOLOGACION",
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
