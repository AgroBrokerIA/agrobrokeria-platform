import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
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

    // Create the Supabase client only when the endpoint is invoked.
    // Next.js evaluates route modules during build, when runtime secrets may not exist.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("ARCA WSCPE auth-test: faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return NextResponse.json(
        { ok: false, error: "El servicio de autenticación no está configurado en el entorno de ejecución." },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

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
