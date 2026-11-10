import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Falta configuración segura de Supabase para métricas administrativas." }, { status: 503 });
    }

    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

    const { data: isAdmin, error: adminError } = await authClient.rpc("es_administrador_plataforma");
    if (adminError || isAdmin !== true) return NextResponse.json({ error: "Acceso exclusivo de administración." }, { status: 403 });

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const [users, companies, operations] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("companies").select("id", { count: "exact", head: true }),
      admin.from("operaciones").select("id", { count: "exact", head: true })
    ]);
    const error = users.error || companies.error || operations.error;
    if (error) return NextResponse.json({ error: error.message }, { status: 503 });

    return NextResponse.json({
      users: users.count ?? 0,
      companies: companies.count ?? 0,
      operations: operations.count ?? 0,
      checked_at: new Date().toISOString()
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "No se pudieron consultar las métricas."
    }, { status: 500 });
  }
}
