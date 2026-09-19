import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { procesarPublicacionConIA } from "@/lib/ia/motorCompatibilidad";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Sesión no autorizada." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Sesión no válida." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const publicacionId = String(body?.publicacionId ?? "").trim();

    if (!publicacionId) {
      return NextResponse.json(
        { ok: false, error: "Falta publicacionId." },
        { status: 400 }
      );
    }

    const resultados = await procesarPublicacionConIA(publicacionId);

    return NextResponse.json({
      ok: true,
      publicacionId,
      usuarioId: user.id,
      cantidadCompatibilidades: resultados.length,
      oportunidades: resultados.filter((r) => r.recomendada).length,
    });
  } catch (error) {
    console.error("Error procesando publicación con IA:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno procesando IA.",
      },
      { status: 500 }
    );
  }
}
