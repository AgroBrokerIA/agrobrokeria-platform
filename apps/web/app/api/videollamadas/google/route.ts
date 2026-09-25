import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer /i, "");
    if (!token) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const admin = createClient(url, service);

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const { videollamada_id } = await req.json();
    const { data: v, error: ve } = await sb
      .from("videollamadas_comerciales")
      .select("*")
      .eq("id", videollamada_id)
      .single();

    if (ve || !v) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const { data: profile } = await sb
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.active_company_id) {
      return NextResponse.json({ error: "ACTIVE_COMPANY_REQUIRED" }, { status: 409 });
    }

    const { data: cfg } = await sb
      .from("configuracion_empresa")
      .select("google_meet_habilitado")
      .eq("empresa_id", profile.active_company_id)
      .maybeSingle();

    if (!cfg?.google_meet_habilitado) {
      return NextResponse.json(
        {
          error: "GOOGLE_MEET_NOT_AUTHORIZED",
          detail: "La integración está preparada pero requiere autorización OAuth de Google.",
        },
        { status: 409 },
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        { error: "GOOGLE_CREDENTIALS_PENDING", detail: "Faltan credenciales OAuth de producción." },
        { status: 409 },
      );
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) throw new Error("GOOGLE_OAUTH_FAILED");

    const tokenData = await tokenResponse.json();
    const start = v.inicio_at || new Date(Date.now() + 3600000).toISOString();
    const end = new Date(new Date(start).getTime() + 3600000).toISOString();

    const googleResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: v.titulo || "Reunión comercial AgroBrokerIA",
          start: { dateTime: start },
          end: { dateTime: end },
          conferenceData: {
            createRequest: {
              requestId: v.id,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
          description: `Operación AgroBrokerIA: ${v.operacion_id}`,
        }),
      },
    );

    if (!googleResponse.ok) throw new Error("GOOGLE_MEET_CREATE_FAILED");

    const googleData = await googleResponse.json();
    const link =
      googleData.hangoutLink ||
      googleData.conferenceData?.entryPoints?.find((entry: { entryPointType?: string }) => entry.entryPointType === "video")?.uri;

    await admin
      .from("videollamadas_comerciales")
      .update({
        estado: "PROGRAMADA",
        meeting_id: googleData.id,
        enlace: link,
        actualizada_en: new Date().toISOString(),
      })
      .eq("id", v.id);

    await admin.from("videollamada_eventos").insert({
      videollamada_id: v.id,
      profile_id: user.id,
      evento: "MEET_CREADO",
      metadata: { provider: "GOOGLE_MEET", google_event_id: googleData.id },
    });

    return NextResponse.json({ ok: true, enlace: link, meeting_id: googleData.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GOOGLE_MEET_ERROR" },
      { status: 502 },
    );
  }
}
