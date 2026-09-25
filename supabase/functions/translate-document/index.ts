import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function translateText(text: string, source: string, target: string) {
  const url = Deno.env.get("TRANSLATION_API_URL");
  const key = Deno.env.get("TRANSLATION_API_KEY");
  const provider = (Deno.env.get("TRANSLATION_PROVIDER") || "").toLowerCase();
  if (!url || !key) return { pending: true as const };

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
  const response = provider.includes("openai")
    ? await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: Deno.env.get("TRANSLATION_MODEL") || "gpt-4o-mini",
          temperature: 0,
          messages: [
            { role: "system", content: "Translate the supplied commercial contract text faithfully. Preserve numbers, units, dates, legal identifiers, company names, prices, percentages and clause structure. Do not summarize, omit, invent or alter legal meaning. Return only the translated text." },
            { role: "user", content: `Source language: ${source}\nTarget language: ${target}\n\n${text}` },
          ],
        }),
      })
    : await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ text, source_language: source, target_language: target }),
      });

  if (!response.ok) throw new Error(`TRANSLATION_PROVIDER_HTTP_${response.status}`);
  const data = await response.json();
  const translated = data?.choices?.[0]?.message?.content || data?.translated_text || data?.translation || data?.text;
  if (!translated || typeof translated !== "string") throw new Error("TRANSLATION_PROVIDER_INVALID_RESPONSE");
  return { pending: false as const, translated: translated.trim() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "AUTH_REQUIRED" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
    if (!serviceKey) return json({ error: "SERVICE_KEY_NOT_CONFIGURED" }, 500);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return json({ error: "AUTH_REQUIRED" }, 401);

    const body = await req.json();
    const contractId = String(body.contract_id || "");
    const target = String(body.idioma_destino || "").toLowerCase();
    const source = String(body.idioma_origen || "es").toLowerCase();
    const allowed = new Set(["es", "en", "pt", "it", "fr", "de"]);
    if (!contractId || !allowed.has(target) || !allowed.has(source)) return json({ error: "INVALID_REQUEST" }, 400);
    if (target === source) return json({ error: "TARGET_EQUALS_SOURCE" }, 400);

    const { data: contract, error: contractError } = await admin
      .from("contratos")
      .select("id,operacion_id,contenido")
      .eq("id", contractId)
      .single();
    if (contractError || !contract) return json({ error: "CONTRACT_NOT_FOUND" }, 404);
    if (!contract.contenido?.trim()) return json({ error: "CONTRACT_CONTENT_EMPTY" }, 409);

    const { data: participant } = await admin
      .from("operacion_participantes")
      .select("empresa_id")
      .eq("operacion_id", contract.operacion_id);
    const companyIds = (participant || []).map((x) => x.empresa_id).filter(Boolean);
    const { data: membership } = companyIds.length
      ? await admin.from("company_users").select("company_id").eq("profile_id", user.id).eq("activo", true).in("company_id", companyIds).limit(1)
      : { data: [] as { company_id: string }[] };
    if (!membership?.length) return json({ error: "OPERATION_PARTICIPATION_REQUIRED" }, 403);

    const { data: latest } = await admin
      .from("documento_traducciones")
      .select("version")
      .eq("contrato_id", contractId)
      .eq("idioma_destino", target)
      .order("version", { ascending: false })
      .limit(1);
    const version = (latest?.[0]?.version || 0) + 1;

    const provider = Deno.env.get("TRANSLATION_PROVIDER") || null;
    const translated = await translateText(contract.contenido, source, target);

    if (translated.pending) {
      await admin.from("documento_traducciones").insert({
        contrato_id: contractId,
        idioma_origen: source,
        idioma_destino: target,
        version,
        estado: "PENDIENTE",
        proveedor: provider,
        solicitado_por: user.id,
        error_codigo: "TRANSLATION_PROVIDER_NOT_CONFIGURED",
      });
      return json({ ok: false, pending_external: true, error: "TRANSLATION_PROVIDER_NOT_CONFIGURED" }, 409);
    }

    const hash = await sha256(translated.translated);
    const path = `operations/${contract.operacion_id}/translations/contracts/${contractId}/${target}/v${version}.txt`;
    const upload = await admin.storage.from("agrobroker-private").upload(
      path,
      new Blob([translated.translated], { type: "text/plain; charset=utf-8" }),
      { upsert: true, contentType: "text/plain; charset=utf-8" },
    );
    if (upload.error) throw new Error(`TRANSLATION_STORAGE_${upload.error.message}`);

    const { error: insertError } = await admin.from("documento_traducciones").insert({
      contrato_id: contractId,
      idioma_origen: source,
      idioma_destino: target,
      version,
      estado: "TRADUCIDO",
      proveedor: provider,
      contenido_path: path,
      hash_sha256: hash,
      solicitado_por: user.id,
      traducido_en: new Date().toISOString(),
    });
    if (insertError) throw insertError;

    return json({ ok: true, estado: "TRADUCIDO", version, contenido_path: path, hash_sha256: hash });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "TRANSLATION_ERROR" }, 500);
  }
});
