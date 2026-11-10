import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const allowed = new Set(["es", "en", "zh-CN", "pt"]);
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Autenticación requerida." }, { status: 401 });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Servicio de traducción no configurado." }, { status: 503 });
    const body = await request.json();
    const target = String(body?.target || "");
    const texts = body?.texts;
    if (!allowed.has(target) || !Array.isArray(texts) || texts.length < 1 || texts.length > 128 || texts.some((x: unknown) => typeof x !== "string" || x.length > 5000)) {
      return NextResponse.json({ error: "Solicitud de traducción inválida." }, { status: 400 });
    }
    const total = texts.reduce((n: number, x: string) => n + x.length, 0);
    if (total > 30000) return NextResponse.json({ error: "El documento supera el límite de traducción." }, { status: 413 });
    const response = await fetch(`${supabaseUrl}/functions/v1/exportar-documento-comex`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: anonKey },
      body: JSON.stringify({ action: "translate", target, texts }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: result?.error || "El servicio de traducción no pudo completar el documento." }, { status: response.status });
    const translations = result?.translations;
    if (!Array.isArray(translations) || translations.length !== texts.length) return NextResponse.json({ error: "La respuesta de traducción está incompleta." }, { status: 502 });
    return NextResponse.json({ translations: translations.map((x: unknown) => String(x || "")) });
  } catch {
    return NextResponse.json({ error: "No se pudo traducir el documento." }, { status: 500 });
  }
}
