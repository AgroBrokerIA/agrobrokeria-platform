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
    const requiredTables = ["companies", "publicaciones", "ofertas_negociacion", "operaciones", "operacion_workflow", "operacion_liquidacion", "operacion_comisiones", "workflow_historial", "loi", "sco", "contratos", "documentos_operacion", "medios_cobro", "retiros_comisiones"];

    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
      checks["db_" + table] = error
        ? { ok: false, detail: error.message }
        : { ok: true };
    }

    checks.supabase = { ok: requiredTables.every(t => checks["db_" + t]?.ok), detail: `${requiredTables.length} tablas críticas verificadas` };

    // Integridad estructural del workflow: el flujo comercial publicado debe
    // conservar exactamente las 10 etapas obligatorias definidas para granos.
    try {
      const { data: workflow } = await supabase
        .from("workflows")
        .select("id,nombre,activo")
        .eq("activo", true)
        .eq("nombre", "Operación de granos")
        .maybeSingle();

      if (!workflow) {
        checks.workflow_definition = {
          ok: false,
          detail: "No existe un workflow activo de Operación de granos."
        };
      } else {
        const { data: stages, error: stagesError } = await supabase
          .from("workflow_etapas")
          .select("id,orden,nombre,obligatoria")
          .eq("workflow_id", workflow.id)
          .order("orden", { ascending: true });

        const validStages =
          !stagesError &&
          stages?.length === 10 &&
          stages.every((stage, index) =>
            stage.orden === index + 1 && stage.obligatoria === true
          );

        checks.workflow_definition = validStages
          ? { ok: true, detail: "Workflow de granos: 10/10 etapas obligatorias." }
          : {
              ok: false,
              detail: stagesError?.message ?? `Workflow inválido: ${stages?.length ?? 0} etapas.`
            };
      }
    } catch (error) {
      checks.workflow_definition = {
        ok: false,
        detail: error instanceof Error ? error.message : "No se pudo verificar el workflow."
      };
    }

    // Regla inmutable de comisión de plataforma: USD 1/TN.
    // Se valida contra el catálogo de monedas, sin hardcodear el ID de USD.
    try {
      const { data: usd } = await supabase
        .from("monedas")
        .select("id")
        .eq("codigo", "USD")
        .maybeSingle();

      if (!usd) {
        checks.platform_commission_rule = {
          ok: false,
          detail: "No se encontró la moneda USD en el catálogo."
        };
      } else {
        const { data: platformCommissions, error: commissionError } = await supabase
          .from("operacion_comisiones")
          .select("valor_unitario,moneda_id")
          .eq("tipo_comision", "PLATAFORMA");

        const invalidCount = commissionError
          ? -1
          : (platformCommissions ?? []).filter(
              (commission) =>
                Number(commission.valor_unitario) !== 1 ||
                commission.moneda_id !== usd.id
            ).length;

        checks.platform_commission_rule =
          commissionError
            ? { ok: false, detail: commissionError.message }
            : invalidCount === 0
              ? {
                  ok: true,
                  detail: `Regla USD 1/TN verificada en ${platformCommissions?.length ?? 0} registros.`
                }
              : {
                  ok: false,
                  detail: `Se detectaron ${invalidCount} registros de comisión de plataforma fuera de USD 1/TN.`
                };
      }
    } catch (error) {
      checks.platform_commission_rule = {
        ok: false,
        detail: error instanceof Error ? error.message : "No se pudo verificar la comisión de plataforma."
      };
    }

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

    // Integraciones externas necesarias para el alcance funcional comprometido.
    checks.signature_provider = {
      ok: Boolean(process.env.SIGN_PROVIDER_BASE_URL) && Boolean(process.env.SIGN_PROVIDER_API_KEY),
      detail: process.env.SIGN_PROVIDER_BASE_URL && process.env.SIGN_PROVIDER_API_KEY
        ? "Proveedor de firma configurado."
        : "Faltan SIGN_PROVIDER_BASE_URL y/o SIGN_PROVIDER_API_KEY."
    };
    checks.translation_provider = {
      ok: Boolean(process.env.TRANSLATION_API_URL) && Boolean(process.env.TRANSLATION_API_KEY),
      detail: process.env.TRANSLATION_API_URL && process.env.TRANSLATION_API_KEY
        ? "Proveedor de traducción configurado."
        : "Faltan TRANSLATION_API_URL y/o TRANSLATION_API_KEY."
    };
    checks.google_meet = {
      ok: Boolean(process.env.GOOGLE_CLIENT_ID) &&
          Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
          Boolean(process.env.GOOGLE_REFRESH_TOKEN),
      detail: process.env.GOOGLE_CLIENT_ID &&
              process.env.GOOGLE_CLIENT_SECRET &&
              process.env.GOOGLE_REFRESH_TOKEN
        ? "OAuth de Google configurado."
        : "Faltan credenciales OAuth de Google."
    };
    checks.market_cron_secret = {
      ok: Boolean(process.env.CRON_SECRET),
      detail: process.env.CRON_SECRET ? "CRON_SECRET configurado." : "Falta CRON_SECRET."
    };

    const allCore = checks.supabase.ok;
    const arcaReady = checks.arca_environment.ok && checks.arca_credentials.ok && checks.arca_connectivity.ok;
    const integrationsReady =
      checks.signature_provider.ok &&
      checks.translation_provider.ok &&
      checks.google_meet.ok &&
      checks.market_cron_secret.ok;
    const launchReady = allCore && arcaReady && integrationsReady;

    return NextResponse.json({
      ok: launchReady,
      status: launchReady ? "ready" : "blocked",
      core: allCore,
      arca: arcaReady,
      integrations: integrationsReady,
      latency_ms: Date.now() - started,
      checked_at: new Date().toISOString(),
      checks,
    }, { status: launchReady ? 200 : 503 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : "Error de preflight."
    }, { status: 503 });
  }
}
