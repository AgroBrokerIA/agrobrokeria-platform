import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { arcaConfig, getArcaCertificateMaterial } from "@/lib/arca/config";
import { consultarProvinciasWSCPE } from "@/lib/arca/wscpe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  const started = Date.now();
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

    const supabase = authClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.active_company_id) {
      return NextResponse.json({ ok: false, error: "No hay empresa activa para esta cuenta." }, { status: 403 });
    }

    const { data: membership } = await supabase
      .from("company_users")
      .select("rol,activo")
      .eq("company_id", profile.active_company_id)
      .eq("profile_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (!membership || String(membership.rol).toLowerCase() !== "administrador") {
      return NextResponse.json({ ok: false, error: "Solo un administrador puede ejecutar el preflight de lanzamiento." }, { status: 403 });
    }

    const checks: Record<string, { ok: boolean; detail?: string }> = {};
    const requiredTables = ["companies", "publicaciones", "ofertas", "operaciones", "operacion_workflow", "operacion_liquidacion", "operacion_comisiones", "workflow_historial", "loi", "sco", "contratos", "documentos_operacion", "medios_cobro", "retiros_comisiones"];

    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
      checks["db_" + table] = error
        ? { ok: false, detail: error.message }
        : { ok: true };
    }

    checks.supabase = { ok: requiredTables.every(t => checks["db_" + t]?.ok), detail: `${requiredTables.length} tablas críticas verificadas` };
    checks.arca_environment = {
      ok: Boolean(arcaConfig.cuit) && Boolean(arcaConfig.environment),
      detail: arcaConfig.cuit ? arcaConfig.environment : "Falta ARCA_CUIT"
    };

    try {
      getArcaCertificateMaterial();
      checks.arca_credentials = { ok: true };
    } catch (error) {
      checks.arca_credentials = {
        ok: false,
        detail: error instanceof Error ? error.message : "Credenciales ARCA no configuradas."
      };
    }

    if (checks.arca_environment.ok && checks.arca_credentials.ok) {
      try {
        await consultarProvinciasWSCPE();
        checks.arca_connectivity = { ok: true, detail: "WSCPE respondió correctamente." };
      } catch (error) {
        checks.arca_connectivity = {
          ok: false,
          detail: error instanceof Error ? error.message : "No fue posible verificar WSCPE."
        };
      }
    } else {
      checks.arca_connectivity = { ok: false, detail: "No se ejecutó: faltan configuración o credenciales ARCA." };
    }

    const allCore = checks.supabase.ok;
    const arcaReady = checks.arca_environment.ok && checks.arca_credentials.ok && checks.arca_connectivity.ok;
    return NextResponse.json({
      ok: allCore && arcaReady,
      status: allCore && arcaReady ? "ready" : "blocked",
      core: allCore,
      arca: arcaReady,
      latency_ms: Date.now() - started,
      checked_at: new Date().toISOString(),
      checks,
    }, { status: allCore && arcaReady ? 200 : 503 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : "Error de preflight."
    }, { status: 503 });
  }
}
