import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: "PROFILE_LOOKUP_FAILED" }, { status: 500 });
    }

    if (!profile?.active_company_id) {
      return NextResponse.json({ connected: false, connection: null });
    }

    // Recheck active membership before exposing company integration metadata.
    const { data: membership, error: membershipError } = await supabase
      .from("company_users")
      .select("id")
      .eq("company_id", profile.active_company_id)
      .eq("profile_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: "MEMBERSHIP_LOOKUP_FAILED" }, { status: 500 });
    }
    if (!membership) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("mercadopago_conexiones")
      .select("estado,mp_user_id,token_expires_at,live_mode,public_key,actualizado_at")
      .eq("company_id", profile.active_company_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "MERCADOPAGO_STATUS_LOOKUP_FAILED" }, { status: 500 });
    }

    return NextResponse.json({
      connected: Boolean(data && data.estado === "CONECTADA"),
      connection: data
        ? {
            estado: data.estado,
            mp_user_id: data.mp_user_id,
            token_expires_at: data.token_expires_at,
            live_mode: data.live_mode,
            public_key: data.public_key,
            actualizado_at: data.actualizado_at,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "MP_STATUS_ERROR" }, { status: 500 });
  }
}
