"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Company = { id: string; razon_social: string; nombre_comercial: string | null; cuit: string; tipo_empresa: string };
type CompanyDocument = { id: string; tipo_documento: string; nombre_archivo: string | null; url_archivo: string | null; verificado: boolean | null; observaciones: string | null; creado_en: string | null };
type Verification = { id: string; estado: string; organismo: string | null; tipo_consulta: string | null; observaciones: string | null; consultado_at: string | null; fuente_oficial: string | null };

const DOCUMENT_TYPES = [
  { value: "ARCA_CONSTANCIA_INSCRIPCION", label: "Constancia de inscripción de ARCA" },
  { value: "ARCA_CONSTANCIA_CUIT", label: "Constancia de CUIT" },
  { value: "DOCUMENTACION_SOCIETARIA", label: "Estatuto / acta constitutiva / documentación de cooperativa" },
  { value: "RUCA_MATRICULA", label: "Matrícula o inscripción RUCA / registro sectorial" },
  { value: "HABILITACION_COMERCIAL", label: "Habilitación comercial o de actividad" },
  { value: "OTRO_DOCUMENTO_EMPRESA", label: "Otro documento respaldatorio" },
];
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

export default function VerificacionDocumentacionPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0].value);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Iniciá sesión para gestionar la documentación de tu empresa.");
      const { data: profile, error: profileError } = await supabase.from("profiles").select("active_company_id").eq("id", user.id).maybeSingle();
      if (profileError) throw profileError;
      if (!profile?.active_company_id) throw new Error("No hay una empresa activa vinculada a tu usuario.");
      const { data: mapping, error: mappingError } = await supabase.from("company_empresa_map").select("empresa_id").eq("company_id", profile.active_company_id).eq("verified", true).maybeSingle();
      if (mappingError) throw mappingError;
      if (!mapping?.empresa_id) throw new Error("No se encontró el vínculo verificado entre tu cuenta y la empresa operativa.");
      const { data: c, error: companyError } = await supabase.from("empresas").select("id,razon_social,nombre_comercial,cuit,tipo_empresa").eq("id", mapping.empresa_id).maybeSingle();
      if (companyError) throw companyError;
      if (!c) throw new Error("No se encontró la ficha de empresa.");
      setCompany(c as Company);
      const [{ data: docs, error: docsError }, { data: checks, error: checksError }] = await Promise.all([
        supabase.from("empresas_documentos").select("id,tipo_documento,nombre_archivo,url_archivo,verificado,observaciones,creado_en").eq("empresa_id", c.id).order("creado_en", { ascending: false }),
        supabase.from("empresas_verificaciones").select("id,estado,organismo,tipo_consulta,observaciones,consultado_at,fuente_oficial").eq("empresa_id", c.id).eq("organismo", "ARCA").order("consultado_at", { ascending: false }).limit(10),
      ]);
      if (docsError) throw docsError;
      if (checksError) throw checksError;
      setDocuments((docs || []) as CompanyDocument[]);
      setVerifications((checks || []) as Verification[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la documentación.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function openDocument(raw: string | null) {
    if (!raw) return;
    if (!raw.startsWith("storage://")) { setError("El documento no tiene una ruta privada válida."); return; }
    const value = raw.slice("storage://".length);
    const slash = value.indexOf("/");
    const bucket = value.slice(0, slash), path = value.slice(slash + 1);
    const { data, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (signedError || !data?.signedUrl) { setError(signedError?.message || "No se pudo abrir el documento."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function uploadAndRequestVerification() {
    setError(""); setMessage("");
    if (!company) { setError("No se encontró la empresa activa."); return; }
    if (!file) { setError("Seleccioná el documento que querés presentar."); return; }
    if (!ACCEPTED.includes(file.type)) { setError("Formato no admitido. Usá PDF, JPG o PNG."); return; }
    if (file.size <= 0 || file.size > MAX_BYTES) { setError("El archivo debe pesar hasta 10 MB."); return; }
    setBusy(true);
    let uploadedPath = "";
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("La sesión venció. Iniciá sesión nuevamente.");
      const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "documento";
      uploadedPath = `empresas/${company.id}/${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("agrobroker-private").upload(uploadedPath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: rowError } = await supabase.from("empresas_documentos").insert({
        empresa_id: company.id,
        tipo_documento: docType,
        nombre_archivo: file.name,
        url_archivo: "storage://agrobroker-private/" + uploadedPath,
        verificado: false,
        observaciones: "Documento presentado por la empresa. Pendiente de validación; la carga no equivale a aprobación oficial.",
      });
      if (rowError) {
        await supabase.storage.from("agrobroker-private").remove([uploadedPath]);
        throw rowError;
      }
      const { data: verificationId, error: requestError } = await supabase.rpc("solicitar_verificacion_arca", { p_empresa_id: company.id });
      if (requestError) throw new Error("Documento guardado, pero no se pudo crear la solicitud de consulta ARCA: " + requestError.message);
      const { data: { session } } = await supabase.auth.getSession();
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!session?.access_token || !base || !anon) throw new Error("Documento guardado y solicitud creada. Falta una sesión válida para ejecutar la consulta ARCA.");
      const response = await fetch(base + "/functions/v1/verificaciones-sync", {
        method: "POST",
        headers: { Authorization: "Bearer " + session.access_token, apikey: anon, "Content-Type": "application/json" },
        body: JSON.stringify({ verification_id: verificationId }),
      });
      const payload = await response.json().catch(() => ({}));
      const result = payload?.resultados?.[0];
      if (!response.ok || !payload?.ok) {
        setMessage("Documento guardado. La consulta oficial quedó pendiente: " + (payload?.error || "ARCA no respondió correctamente."));
      } else if (result?.estado === "ARCA_VERIFICADA") {
        setMessage("Consulta oficial completada: ARCA informa CUIT activo. Esto verifica la situación fiscal consultada, no la matrícula sectorial ni toda la documentación societaria.");
      } else if (result?.estado === "ARCA_OBSERVADA" || result?.estado === "CUIT_INVALIDO") {
        setMessage("La consulta terminó con observaciones. La empresa no se marcó como verificada integralmente; revisá el resultado y corregí los datos si corresponde.");
      } else {
        setMessage("Documento guardado y solicitud registrada. La consulta de ARCA sigue pendiente; la empresa no se marcó como verificada.");
      }
      setFile(null);
      const input = document.getElementById("company-verification-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el documento.");
      if (uploadedPath) {
        // Keep uploaded evidence when a subsequent official check fails; it is listed for retry/review.
      }
      await load();
    } finally { setBusy(false); }
  }

  return <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 48px", color: "var(--foreground, #0f172a)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
      <div><p style={{ color: "#64748b", marginBottom: 6 }}>AgroBrokerIA / Verificaciones / Documentación</p><h1 style={{ fontSize: 30, fontWeight: 750, margin: 0 }}>Documentación fiscal y societaria</h1><p style={{ color: "#64748b", marginTop: 8 }}>Presentá constancias de ARCA y documentación de respaldo de tu empresa o cooperativa.</p></div>
      <Link href="/verificaciones" style={{ border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 9, textDecoration: "none", color: "inherit" }}>Volver a verificaciones</Link>
    </div>
    {error && <div role="alert" style={{ background: "#fff1f2", border: "1px solid #fda4af", padding: 12, borderRadius: 8, marginBottom: 16, color: "#9f1239" }}>{error}</div>}
    {message && <div role="status" style={{ background: "#ecfdf5", border: "1px solid #86efac", padding: 12, borderRadius: 8, marginBottom: 16, color: "#166534" }}>{message}</div>}
    {loading ? <p>Cargando ficha de empresa…</p> : !company ? <p>La cuenta no tiene una empresa activa con vínculo verificado. Revisá el perfil de empresa o contactá a soporte.</p> : <>
      <section style={{ border: "1px solid #dbe3ec", borderRadius: 12, padding: 18, marginBottom: 20, background: "#f8fafc" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 19 }}>{company.nombre_comercial || company.razon_social}</h2>
        <p style={{ margin: 0, color: "#475569" }}>CUIT: <strong>{company.cuit}</strong> · Actividad: {company.tipo_empresa}</p>
        <p style={{ margin: "10px 0 0", color: "#475569", fontSize: 14 }}>La consulta automática compara el CUIT de la ficha con el padrón oficial de ARCA. El archivo adjunto se conserva como evidencia privada. La respuesta de ARCA no verifica por sí sola matrículas RUCA, habilitaciones ni estatutos.</p>
      </section>
      <section style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 20, marginBottom: 22 }}>
        <h2 style={{ fontSize: 21, marginTop: 0 }}>Subir documentación</h2>
        <label style={{ display: "block", marginBottom: 14, fontWeight: 600 }}>Tipo de documento<select value={docType} onChange={e => setDocType(e.target.value)} style={{ display: "block", width: "100%", padding: 12, marginTop: 6, border: "1px solid #cbd5e1", borderRadius: 8, background: "white" }}>{DOCUMENT_TYPES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Archivo (PDF, JPG o PNG; máximo 10 MB)<input id="company-verification-file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: "block", width: "100%", padding: 12, marginTop: 6, border: "1px solid #cbd5e1", borderRadius: 8, background: "white" }} /></label>
        <p style={{ color: "#64748b", fontSize: 13 }}>No adjuntes contraseñas, claves fiscales ni certificados privados. Los archivos se guardan en almacenamiento privado.</p>
        <button disabled={busy || !file} onClick={() => void uploadAndRequestVerification()} style={{ background: busy || !file ? "#94a3b8" : "#059669", color: "white", border: 0, borderRadius: 9, padding: "12px 18px", fontWeight: 700, cursor: busy || !file ? "not-allowed" : "pointer" }}>{busy ? "Subiendo y consultando…" : "Subir documento y consultar ARCA"}</button>
      </section>
      <section style={{ border: "1px solid #dbe3ec", borderRadius: 12, padding: 18, marginBottom: 22 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Estado de la verificación ARCA</h2>
        {!verifications.length ? <p style={{ color: "#64748b" }}>Todavía no hay consultas registradas.</p> : verifications.map(v => <div key={v.id} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}><strong>{v.estado === "ARCA_VERIFICADA" ? "CUIT activo según ARCA" : v.estado === "ARCA_OBSERVADA" ? "Con observaciones" : v.estado === "CUIT_INVALIDO" ? "CUIT inválido" : "Pendiente de confirmación"}</strong><p style={{ margin: "4px 0", color: "#64748b", fontSize: 13 }}>{v.observaciones || "La consulta todavía no produjo un resultado."}</p><small style={{ color: "#64748b" }}>{v.consultado_at ? new Date(v.consultado_at).toLocaleString("es-AR") : "Sin fecha"} · {v.fuente_oficial || "Fuente pendiente"}</small></div>)}
      </section>
      <section style={{ border: "1px solid #dbe3ec", borderRadius: 12, padding: 18 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Documentación presentada</h2>
        {!documents.length ? <p style={{ color: "#64748b" }}>Todavía no se presentaron documentos.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}><thead><tr><th style={{ padding: 10, borderBottom: "1px solid #cbd5e1" }}>Documento</th><th style={{ padding: 10, borderBottom: "1px solid #cbd5e1" }}>Fecha</th><th style={{ padding: 10, borderBottom: "1px solid #cbd5e1" }}>Estado</th><th style={{ padding: 10, borderBottom: "1px solid #cbd5e1" }}>Archivo</th></tr></thead><tbody>{documents.map(d => <tr key={d.id}><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>{DOCUMENT_TYPES.find(x => x.value === d.tipo_documento)?.label || d.tipo_documento}<br/><small style={{ color: "#64748b" }}>{d.nombre_archivo}</small></td><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>{d.creado_en ? new Date(d.creado_en).toLocaleDateString("es-AR") : "—"}</td><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>{d.verificado ? "Verificado" : "Pendiente de revisión"}</td><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}><button onClick={() => void openDocument(d.url_archivo)} style={{ border: "1px solid #cbd5e1", padding: "6px 10px", borderRadius: 7, background: "white" }}>Abrir</button></td></tr>)}</tbody></table></div>}
      </section>
    </>}
  </main>;
}
