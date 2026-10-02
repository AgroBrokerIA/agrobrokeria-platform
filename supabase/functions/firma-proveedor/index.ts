import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(URL, KEY);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r/g, "").replace(/\n/g, " ");
}

function textToPdf(text: string): Uint8Array {
  const lines = text.split(/\r?\n/).flatMap(line => {
    const clean = line.trim();
    if (!clean) return [""];
    const words = clean.split(/\s+/);
    const out: string[] = [];
    let current = "";
    for (const word of words) {
      if ((current + " " + word).trim().length > 92) {
        out.push(current);
        current = word;
      } else current = (current ? current + " " : "") + word;
    }
    if (current) out.push(current);
    return out;
  });
  const pageLines = 48;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += pageLines) pages.push(lines.slice(i, i + pageLines));
  if (!pages.length) pages.push(["Contrato AgroBrokerIA"]);

  const objects: string[] = [];
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  const fontId = 3;
  const pagesId = 2;
  let nextId = 4;

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids ["; // completed below
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  for (const page of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageIds.push(pageId);
    contentIds.push(contentId);
    const commands = ["BT", "/F1 10 Tf", "50 760 Td"];
    page.forEach((line, idx) => {
      if (idx) commands.push("0 -15 Td");
      commands.push("(" + pdfEscape(line) + ") Tj");
    });
    commands.push("ET");
    const stream = commands.join("\n");
    objects[contentId] = "<< /Length " + new TextEncoder().encode(stream).length + " >>\nstream\n" + stream + "\nendstream";
    objects[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents " + contentId + " 0 R >>";
  }
  objects[2] = "<< /Type /Pages /Kids [" + pageIds.map(id => id + " 0 R").join(" ") + "] /Count " + pageIds.length + " >>";

  const chunks: string[] = ["%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"];
  const offsets: number[] = [0];
  let offset = new TextEncoder().encode(chunks[0]).length;
  for (let id = 1; id < objects.length; id++) {
    if (!objects[id]) continue;
    offsets[id] = offset;
    const chunk = id + " 0 obj\n" + objects[id] + "\nendobj\n";
    chunks.push(chunk);
    offset += new TextEncoder().encode(chunk).length;
  }
  const xrefOffset = offset;
  let xref = "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
  for (let id = 1; id < objects.length; id++) xref += String(offsets[id] || 0).padStart(10, "0") + " 00000 n \n";
  xref += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  chunks.push(xref);
  return new TextEncoder().encode(chunks.join(""));
}

async function adobeToken(companyId: string) {
  const { data: row, error } = await db.from("adobe_sign_oauth_tokens")
    .select("id,access_token,refresh_token,token_type,expires_at,api_access_point,web_access_point,scopes")
    .eq("provider", "adobe_sign").eq("company_id", companyId).is("revoked_at", null)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !row) throw new Error("ADOBE_SIGN_NOT_CONNECTED");

  if (new Date(row.expires_at).getTime() > Date.now() + 60_000) return row;

  const clientId = Deno.env.get("ADOBE_SIGN_CLIENT_ID");
  const clientSecret = Deno.env.get("ADOBE_SIGN_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("ADOBE_SIGN_CREDENTIALS_MISSING");

  const refreshUrl = row.api_access_point.replace(/\/$/, "") + "/oauth/v2/refresh";
  const response = await fetch(refreshUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.access_token !== "string") throw new Error("ADOBE_SIGN_REFRESH_FAILED");

  const expiresIn = Number(data.expires_in || 3600);
  const refreshed = {
    access_token: data.access_token,
    refresh_token: typeof data.refresh_token === "string" ? data.refresh_token : row.refresh_token,
    token_type: String(data.token_type || row.token_type || "Bearer"),
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    api_access_point: String(data.api_access_point || row.api_access_point).replace(/\/$/, ""),
    web_access_point: typeof data.web_access_point === "string" ? data.web_access_point.replace(/\/$/, "") : row.web_access_point,
    updated_at: new Date().toISOString()
  };
  await db.from("adobe_sign_oauth_tokens").update(refreshed).eq("id", row.id);
  return { ...row, ...refreshed };
}

Deno.serve(async req => {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "AUTH_REQUIRED" }, 401);
    const uc = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await uc.auth.getUser();
    if (!user) return json({ error: "AUTH_REQUIRED" }, 401);

    const { contract_id } = await req.json();
    if (typeof contract_id !== "string" || !/^[0-9a-f-]{36}$/i.test(contract_id)) return json({ error: "INVALID_CONTRACT_ID" }, 400);

    const { data: c } = await db.from("contratos").select("id,operacion_id,numero_contrato,contenido,storage_path,archivo_pdf").eq("id", contract_id).single();
    if (!c) return json({ error: "CONTRACT_NOT_FOUND" }, 404);

    const { data: p } = await db.from("operacion_participantes").select("empresa_id,rol").eq("operacion_id", c.operacion_id);
    const participantCompanies = (p || []).map((x: any) => x.empresa_id).filter(Boolean);
    if (!participantCompanies.length) return json({ error: "FORBIDDEN" }, 403);

    const { data: membership } = await db.from("company_users").select("company_id")
      .eq("profile_id", user.id).eq("activo", true).in("company_id", participantCompanies).limit(1);
    if (!membership?.length) return json({ error: "FORBIDDEN" }, 403);

    const companyId = membership[0].company_id;
    const token = await adobeToken(companyId);

    const { data: signers } = await db.from("contrato_firmantes")
      .select("id,empresa_id,rol,email,nombre,orden_firma")
      .eq("contrato_id", contract_id).order("orden_firma");

    const validSigners = (signers || []).filter((s: any) => typeof s.email === "string" && s.email.includes("@"));
    if (!validSigners.length) return json({ error: "NO_VALID_SIGNERS" }, 400);

    let pdfBytes: Uint8Array | null = null;
    if (c.storage_path) {
      const { data: file } = await db.storage.from("agrobroker-private").download(c.storage_path);
      if (file) pdfBytes = new Uint8Array(await file.arrayBuffer());
    }
    if (!pdfBytes && typeof c.archivo_pdf === "string" && c.archivo_pdf.startsWith("data:application/pdf;base64,")) {
      pdfBytes = Uint8Array.from(atob(c.archivo_pdf.split(",", 2)[1]), ch => ch.charCodeAt(0));
    }
    if (!pdfBytes) pdfBytes = textToPdf(String(c.contenido || "Contrato AgroBrokerIA"));

    const base = token.api_access_point.replace(/\/$/, "");
    const form = new FormData();
    form.append("File", new Blob([pdfBytes], { type: "application/pdf" }), "Contrato-" + c.numero_contrato + ".pdf");
    const upload = await fetch(base + "/api/rest/v6/transientDocuments", {
      method: "POST",
      headers: { Authorization: "Bearer " + token.access_token },
      body: form
    });
    const uploadData = await upload.json().catch(() => ({}));
    if (!upload.ok || typeof uploadData.transientDocumentId !== "string") {
      throw new Error("ADOBE_SIGN_UPLOAD_HTTP_" + upload.status);
    }

    const agreement = {
      fileInfos: [{ transientDocumentId: uploadData.transientDocumentId }],
      name: "AgroBrokerIA · Contrato " + c.numero_contrato,
      participantSetsInfo: validSigners.map((s: any, index: number) => ({
        memberInfos: [{ email: s.email }],
        order: Number(s.orden_firma || index + 1),
        role: "SIGNER"
      })),
      signatureType: "ESIGN",
      state: "IN_PROCESS"
    };

    const create = await fetch(base + "/api/rest/v6/agreements", {
      method: "POST",
      headers: { Authorization: "Bearer " + token.access_token, "Content-Type": "application/json", "Idempotency-Key": c.id },
      body: JSON.stringify(agreement)
    });
    const createData = await create.json().catch(() => ({}));
    if (!create.ok || typeof createData.id !== "string") {
      throw new Error("ADOBE_SIGN_AGREEMENT_HTTP_" + create.status);
    }

    await db.from("firma_solicitudes").update({
      proveedor: "ADOBE_ACROBAT_SIGN",
      proveedor_request_id: createData.id,
      proveedor_status: String(createData.status || "OUT_FOR_SIGNATURE"),
      autenticacion_metodo: "OAUTH2"
    }).eq("contrato_id", contract_id).eq("estado", "PENDIENTE");

    for (const s of validSigners) {
      await db.from("contrato_firmantes").update({
        proveedor: "ADOBE_ACROBAT_SIGN",
        proveedor_signer_id: s.email,
        autenticacion_metodo: "OAUTH2"
      }).eq("id", s.id);
    }

    return json({
      ok: true,
      provider: "ADOBE_ACROBAT_SIGN",
      agreement_id: createData.id,
      status: createData.status || "OUT_FOR_SIGNATURE",
      api_access_point: token.api_access_point
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "ADOBE_SIGN_ERROR" }, 502);
  }
});
