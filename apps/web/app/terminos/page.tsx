"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type LegalDoc = {
  id: string;
  titulo: string;
  version: string;
  vigencia_desde: string;
  contenido: string;
  hash_sha256: string;
  estado: string;
};

export default function Terminos() {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase
      .from("documentos_legales")
      .select("id,titulo,version,vigencia_desde,contenido,hash_sha256,estado")
      .eq("codigo", "TERMINOS")
      .eq("estado", "VIGENTE")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setDoc(data);
      });
  }, []);

  return (
    <main className="module-page" style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px" }}>
      <div className="module-hero">
        <div>
          <span className="eyebrow">LEGAL · TÉRMINOS</span>
          <h1>Términos y Condiciones</h1>
          <p>Condiciones de uso vigentes de AgroBrokerIA.</p>
        </div>
      </div>

      {err && <div className="module-alert module-alert-error">{err}</div>}

      {doc ? (
        <article className="company-card" style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
          <div className="company-card-head">
            <div>
              <h2>{doc.titulo}</h2>
              <p>Versión {doc.version} · Vigente desde {new Date(doc.vigencia_desde).toLocaleDateString("es-AR")}</p>
            </div>
          </div>
          <div>{doc.contenido}</div>
          <small style={{ display: "block", marginTop: 24, wordBreak: "break-all" }}>
            Hash SHA-256: {doc.hash_sha256}
          </small>
        </article>
      ) : !err ? (
        <div className="company-card">No se pudieron cargar los Términos vigentes.</div>
      ) : null}
    </main>
  );
}
