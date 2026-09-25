import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { procesarPublicacionConIA } from "@/lib/ia/motorCompatibilidad";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "JSON inválido." },
        { status: 400 }
      );
    }

    const publicacionId = String(
      (body as { publicacionId?: unknown })?.publicacionId ?? ""
    ).trim();

    if (!publicacionId || !UUID_RE.test(publicacionId)) {
      return NextResponse.json(
        { ok: false, error: "publicacionId inválido." },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAuth
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.active_company_id) {
      return NextResponse.json(
        { ok: false, error: "No se pudo determinar la empresa activa." },
        { status: 403 }
      );
    }

    const { data: publicacion, error: publicacionError } = await supabaseAuth
      .from("publicaciones")
      .select("empresa_id")
      .eq("id", publicacionId)
      .single();

    if (publicacionError || !publicacion) {
      return NextResponse.json(
        { ok: false, error: "Publicación no encontrada." },
        { status: 404 }
      );
    }

    if (publicacion.empresa_id !== profile.active_company_id) {
      return NextResponse.json(
        { ok: false, error: "No tenés autorización para procesar esta publicación." },
        { status: 403 }
      );
    }

    const resultados = await procesarPublicacionConIA(
      supabaseAuth,
      publicacionId
    );

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
        error: "No fue posible procesar la publicación con IA.",
      },
      { status: 500 }
    );
  }
}
