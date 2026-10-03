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

    // Resolve the commercial profile with the same authenticated account.
    // Some existing accounts have a profile row keyed differently from auth.users.id.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    const admin = serviceKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
      : null;

    let profile: { active_company_id: string | null } | null = null;

    if (admin) {
      const byId = await admin
        .from("profiles")
        .select("active_company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!byId.error && byId.data) profile = byId.data;

      if (!profile && user.email) {
        const byEmail = await admin
          .from("profiles")
          .select("active_company_id")
          .eq("email", user.email)
          .maybeSingle();
        if (!byEmail.error && byEmail.data) profile = byEmail.data;
      }
    } else {
      const byId = await supabase
        .from("profiles")
        .select("active_company_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!byId.error && byId.data) profile = byId.data;
    }

    let activeCompanyId = profile?.active_company_id ?? null;
    const resolvedProfileIds = [user.id];
    if (admin && user.email) {
      const { data: emailProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      if (emailProfile?.id) resolvedProfileIds.push(emailProfile.id);
    }

    // Final fallback: use an active administrator membership belonging to this account.
    // The membership profile can be resolved by auth id or by the profile email.
    if (!activeCompanyId) {
      const { data: memberships } = await (admin ?? supabase)
        .from("company_users")
        .select("company_id,profile_id,rol,activo")
        .in("profile_id", resolvedProfileIds)
        .eq("activo", true);

      const adminMembership = (memberships ?? []).find(
        (item) => String(item.rol).toLowerCase() === "administrador"
      );

      activeCompanyId = adminMembership?.company_id ?? null;
    }

    if (!activeCompanyId) {
      return NextResponse.json({
        ok: false,
        error: "No hay empresa activa con permisos de administrador para esta cuenta."
      }, { status: 403 });
    }

    const { data: membershipsForCompany } = await (admin ?? supabase)
      .from("company_users")
      .select("rol,activo,profile_id")
      .eq("company_id", activeCompanyId)
      .in("profile_id", resolvedProfileIds)
      .eq("activo", true);

    const membership = (membershipsForCompany ?? []).find(
      (item) => String(item.rol).toLowerCase() === "administrador"
    );

    if (!membership || String(membership.rol).toLowerCase() !== "administrador") {
      return NextResponse.json({
        ok: false,
        error: "Solo un administrador puede ejecutar el preflight de lanzamiento."
      }, { status: 403 });
    }

    const checks: Record<string, { ok: boolean; detail?: string }> = {};
    const checkDb = admin ?? supabase;
    const requiredTables = ["empresas", "publicaciones", "ofertas_negociacion", "operaciones", "operacion_workflow", "operacion_liquidacion", "operacion_comisiones", "workflow_historial", "loi", "sco", "contratos", "documentos_operacion", "medios_cobro", "retiros_comisiones"];

    for (const table of requiredTables) {
      const { error } = await checkDb.from(table).select("*", { count: "exact", head: true });
      checks["db_" + table] = error
        ? { ok: false, detail: error.message }
        : { ok: true };
    }

    checks.supabase = { ok: requiredTables.every(t => checks["db_" + t]?.ok), detail: `${requiredTables.length} tablas críticas verificadas` };

    // Integridad estructural del workflow: el flujo comercial publicado debe
    // conservar exactamente las 10 etapas obligatorias definidas para granos.
    try {
      const { data: workflow } = await checkDb
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
        const { data: stages, error: stagesError } = await checkDb
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
    // La moneda de la operación no cambia esta comisión de plataforma.
    try {
      const { data: usd } = await checkDb
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
        const { data: platformCommissions, error: commissionError } = await checkDb
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
        const raw = error instanceof Error ? error.message : "No fue posible verificar WSCPE.";
        const detail = raw.includes("Computador no autorizado a acceder al servicio")
          ? "ARCA rechazó el acceso al WSCPE: el certificado de producción aún no está delegado/autorizado para ese servicio, o se está usando otro certificado. Autorizar el certificado en Administrador de Relaciones de Clave Fiscal y volver a verificar."
          : raw;
        checks.arca_connectivity = { ok: false, detail };
      }
    } else {
      checks.arca_connectivity = { ok: false, detail: "No se ejecutó: faltan configuración o credenciales ARCA." };
    }

    // Firma electrónica: Adobe Acrobat Sign se considera listo solo cuando
    // las credenciales OAuth existen y existe un token conectado y no revocado.
    try {
      const adobeConfigured =
        Boolean(process.env.ADOBE_SIGN_CLIENT_ID) &&
        Boolean(process.env.ADOBE_SIGN_CLIENT_SECRET) &&
        Boolean(process.env.ADOBE_SIGN_REDIRECT_URI);

      if (!adobeConfigured) {
        checks.signature_provider = {
          ok: false,
          detail: "Faltan ADOBE_SIGN_CLIENT_ID, ADOBE_SIGN_CLIENT_SECRET y/o ADOBE_SIGN_REDIRECT_URI."
        };
      } else {
        const { data: adobeToken, error: adobeTokenError } = await checkDb
          .from("adobe_sign_oauth_tokens")
          .select("id,expires_at,revoked_at,api_access_point")
          .eq("provider", "adobe_sign")
          .is("revoked_at", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        checks.signature_provider =
          !adobeTokenError && Boolean(adobeToken?.id) && /^https:\/\//i.test(String(adobeToken?.api_access_point || ""))
            ? {
                ok: true,
                detail: new Date(String(adobeToken?.expires_at || 0)).getTime() > Date.now()
                  ? "Adobe Acrobat Sign conectado mediante OAuth."
                  : "Adobe Acrobat Sign conectado; el access token expiró y se renovará mediante refresh token."
              }
            : {
                ok: false,
                detail: adobeTokenError?.message ?? "Adobe Acrobat Sign aún no fue autorizado mediante OAuth."
              };
      }
    } catch (error) {
      checks.signature_provider = {
        ok: false,
        detail: error instanceof Error ? error.message : "No se pudo verificar Adobe Acrobat Sign."
      };
    }
    try {
      const hasProvider = Boolean(process.env.TRANSLATION_API_URL) && Boolean(process.env.TRANSLATION_API_KEY);
      if (hasProvider) {
        checks.translation_provider = {
          ok: true,
          detail: "Proveedor de traducción configurado."
        };
      } else {
        const { data: translationRows, error: translationError } = await checkDb
          .from("traducciones_ui")
          .select("idioma")
          .in("idioma", ["es", "en", "pt", "it", "fr", "de"]);
        const languages = new Set((translationRows ?? []).map((row) => row.idioma));
        checks.translation_provider = translationError
          ? { ok: false, detail: translationError.message }
          : languages.size >= 6
            ? { ok: true, detail: "Catálogo UI multilingüe operativo para ES, EN, PT, IT, FR y DE." }
            : { ok: false, detail: "No hay proveedor externo ni catálogo UI completo de 6 idiomas." };
      }
    } catch (error) {
      checks.translation_provider = {
        ok: false,
        detail: error instanceof Error ? error.message : "No se pudo verificar traducciones."
      };
    }
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
      if (!serviceKey) {
        checks.google_meet = {
          ok: false,
          detail: "No se pudo verificar el almacenamiento seguro de OAuth de Google."
        };
      } else {
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
        const { data: googleToken, error: googleTokenError } = await admin
          .from("google_oauth_tokens")
          .select("id,revoked_at,updated_at")
          .eq("provider", "google")
          .is("revoked_at", null)
          .maybeSingle();

        const configuredByEnv =
          Boolean(process.env.GOOGLE_CLIENT_ID) &&
          Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
          Boolean(process.env.GOOGLE_REFRESH_TOKEN);

        checks.google_meet =
          !googleTokenError && (Boolean(googleToken) || configuredByEnv)
            ? {
                ok: true,
                detail: googleToken
                  ? "OAuth de Google conectado mediante token seguro persistido."
                  : "OAuth de Google configurado mediante variables de entorno."
              }
            : {
                ok: false,
                detail: googleTokenError?.message ?? "Faltan credenciales OAuth de Google."
              };
      }
    } catch (error) {
      checks.google_meet = {
        ok: false,
        detail: error instanceof Error ? error.message : "No se pudo verificar OAuth de Google."
      };
    }
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
