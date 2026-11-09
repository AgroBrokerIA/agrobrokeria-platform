import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const allowed = new Set(["en", "zh-CN", "pt"]);
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Autenticación requerida." }, { status: 401 });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const apiKey = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Autenticación del servicio no configurada." }, { status: 503 });
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Sesión inválida o vencida." }, { status: 401 });
    if (!apiKey) return NextResponse.json({ error: "Falta configurar GOOGLE_CLOUD_TRANSLATE_API_KEY en el entorno de Vercel." }, { status: 503 });
    const body = await request.json();
    const target = String(body?.target || "");
    const texts = body?.texts;
    if (!allowed.has(target) || !Array.isArray(texts) || texts.length < 1 || texts.length > 128 || texts.some((x: unknown) => typeof x !== "string" || x.length > 5000)) {
      return NextResponse.json({ error: "Solicitud de traducción inválida." }, { status: 400 });
    }
    const total = texts.reduce((n: number, x: string) => n + x.length, 0);
    if (total > 30000) return NextResponse.json({ error: "El documento supera el límite de traducción." }, { status: 413 });
    const response = await fetch("https://translation.googleapis.com/language/translate/v2?key=" + encodeURIComponent(apiKey), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texts, source: "en", target, format: "text" }),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) return NextResponse.json({ error: result?.error?.message || "Google Cloud Translation no pudo traducir el documento." }, { status: 502 });
    const translations = result?.data?.translations;
    if (!Array.isArray(translations) || translations.length !== texts.length) return NextResponse.json({ error: "La respuesta de traducción está incompleta." }, { status: 502 });
    return NextResponse.json({ translations: translations.map((x: any) => String(x.translatedText || "")) });
  } catch {
    return NextResponse.json({ error: "No se pudo traducir el documento." }, { status: 500 });
  }
}
