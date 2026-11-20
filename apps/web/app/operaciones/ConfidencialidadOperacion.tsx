"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type EstadoAceptacion = {
  rol: string;
  company_id: string;
  requerido: boolean;
  aceptado: boolean;
  aceptado_at: string | null;
  version: string;
  hash_sha256: string;
  documento_codigo: string;
  documento_titulo: string;
};

type DocumentoLegal = {
  titulo: string;
  version: string;
  vigencia_desde: string;
  contenido: string;
  hash_sha256: string;
};

const nombresRol: Record<string, string> = {
  VENDEDOR: "Vendedor / Productor",
  COMPRADOR: "Comprador",
  INTERMEDIARIO: "Intermediario",
};

export default function ConfidencialidadOperacion({ operacionId }: { operacionId: string }) {
  const [estados, setEstados] = useState<EstadoAceptacion[]>([]);
  const [documento, setDocumento] = useState<DocumentoLegal | null>(null);
  const [consentimientos, setConsentimientos] = useState<Record<string, boolean>>({});
  const [cargando, setCargando] = useState(true);
  const [aceptando, setAceptando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data, error: estadoError } = await (supabase.rpc as any)(
        "estado_confidencialidad_operacion",
        { p_operacion_id: operacionId }
      );
      if (estadoError) throw estadoError;
      const filas = (Array.isArray(data) ? data : []) as EstadoAceptacion[];
      setEstados(filas);

      const codigo = filas[0]?.documento_codigo;
      if (codigo) {
        const { data: doc, error: docError } = await supabase
          .from("documentos_legales")
          .select("titulo,version,vigencia_desde,contenido,hash_sha256")
          .eq("codigo", codigo)
          .eq("estado", "VIGENTE")
          .order("vigencia_desde", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (docError) throw docError;
        if (!doc) throw new Error("No se encontró el documento legal vigente para esta operación.");
        setDocumento(doc as DocumentoLegal);
      } else {
        setDocumento(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar la aceptación de confidencialidad.");
    } finally {
      setCargando(false);
    }
  }, [operacionId]);

  useEffect(() => { void cargar(); }, [cargar]);

  async function aceptar(rol: string) {
    if (!consentimientos[rol]) {
      setError("Leé el documento y marcá la casilla de conformidad antes de aceptar.");
      return;
    }
    setAceptando(rol);
    setError("");
    setMensaje("");
    try {
      const { error: rpcError } = await (supabase.rpc as any)(
        "aceptar_confidencialidad_operacion",
        { p_operacion_id: operacionId, p_rol: rol }
      );
      if (rpcError) throw rpcError;
      setConsentimientos((actual) => ({ ...actual, [rol]: false }));
      setMensaje("Aceptación registrada y auditada para tu empresa y tu rol. Esto no constituye una firma digital certificada.");
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la aceptación.");
    } finally {
      setAceptando(null);
    }
  }

  const pendientes = estados.filter((item) => item.requerido && !item.aceptado).length;

  return (
    <section style={{ marginTop: 18, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", display: "grid", gap: 12 }}>
      <div>
        <h3 style={{ margin: "0 0 6px" }}>Confidencialidad de la operación</h3>
        <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
          Cada empresa debe revisar y aceptar el documento vigente desde su propia cuenta. No podés aceptar en nombre de otra parte.
        </p>
      </div>

      {cargando ? <p style={{ margin: 0 }}>Consultando documento y estado de aceptación…</p> : null}
      {!cargando && estados.length === 0 && !error ? (
        <p style={{ margin: 0, padding: 12, borderRadius: 8, background: "#f8fafc", color: "#475569", fontSize: 13 }}>
          La cuenta activa no tiene una membresía habilitada en esta operación para aceptar por un rol participante. Ingresá con la cuenta de la empresa correspondiente.
        </p>
      ) : null}

      {documento && estados.length > 0 && (
        <>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: 12, background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <strong>{documento.titulo}</strong>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                Versión {documento.version} · Vigente desde {new Date(documento.vigencia_desde).toLocaleDateString("es-AR")}
              </div>
            </div>
            <div tabIndex={0} aria-label="Texto completo del documento de confidencialidad" style={{ maxHeight: 280, overflowY: "auto", padding: 14, whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 13 }}>
              {documento.contenido}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {estados.map((item) => (
              <div key={item.rol + item.company_id} style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong>{nombresRol[item.rol] || item.rol}</strong>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.aceptado ? "#166534" : "#92400e" }}>
                    {item.aceptado ? "ACEPTADO" : "PENDIENTE"}
                  </span>
                </div>
                {item.aceptado ? (
                  <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 12 }}>
                    Aceptado el {item.aceptado_at ? new Date(item.aceptado_at).toLocaleString("es-AR") : "fecha registrada en el sistema"} · Versión {item.version}
                  </p>
                ) : (
                  <>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10, fontSize: 13, lineHeight: 1.45 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(consentimientos[item.rol])}
                        onChange={(event) => setConsentimientos((actual) => ({ ...actual, [item.rol]: event.target.checked }))}
                      />
                      <span>Declaro que leí el documento completo y acepto sus condiciones en representación de la empresa a la que estoy habilitado para este rol.</span>
                    </label>
                    <button
                      type="button"
                      disabled={aceptando !== null || !consentimientos[item.rol]}
                      onClick={() => void aceptar(item.rol)}
                      style={{ marginTop: 10, padding: "9px 13px", border: 0, borderRadius: 8, background: consentimientos[item.rol] ? "#0f766e" : "#94a3b8", color: "#fff", fontWeight: 700, cursor: consentimientos[item.rol] ? "pointer" : "not-allowed" }}
                    >
                      {aceptando === item.rol ? "Registrando…" : "Aceptar documento para este rol"}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: pendientes === 0 ? "#166534" : "#92400e" }}>
            {pendientes === 0
              ? "Tu empresa ya completó las aceptaciones que le corresponden. Las demás partes deben aceptar desde sus propias cuentas."
              : "Tu empresa tiene " + pendientes + " aceptación(es) pendiente(s) para los roles habilitados en esta cuenta."}
          </p>
        </>
      )}

      {mensaje && <p role="status" style={{ margin: 0, padding: 10, borderRadius: 8, background: "#ecfdf5", color: "#166534", fontSize: 13 }}>{mensaje}</p>}
      {error && <p role="alert" style={{ margin: 0, padding: 10, borderRadius: 8, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>{error}</p>}
      <button type="button" onClick={() => void cargar()} disabled={cargando || aceptando !== null} style={{ justifySelf: "start", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff" }}>
        Actualizar estado
      </button>
    </section>
  );
}
