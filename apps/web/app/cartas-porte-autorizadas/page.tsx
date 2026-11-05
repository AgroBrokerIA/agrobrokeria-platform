"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type CPE = {
  id: string;
  operacion_id: string;
  viaje_id: string;
  numero_carta_porte: string;
  nombre_archivo: string;
  archivo_path: string;
  toneladas_declaradas: number | null;
  estado_verificacion: string;
  creada_at: string;
};

export default function CartasPorteAutorizadasPage() {
  const [items, setItems] = useState<CPE[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("viaje_cartas_porte")
      .select("id,operacion_id,viaje_id,numero_carta_porte,nombre_archivo,archivo_path,toneladas_declaradas,estado_verificacion,creada_at")
      .order("creada_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setItems((data || []) as CPE[]);
    setLoading(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function abrir(path: string) {
    const { data, error: signedError } = await supabase.storage.from("agrobroker-private").createSignedUrl(path, 90);
    if (signedError || !data?.signedUrl) {
      setError("No se pudo abrir el documento: " + (signedError?.message || "enlace no disponible"));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <main style={{ maxWidth: 1050, margin: "28px auto", padding: 20, display: "grid", gap: 15, color: "#0f172a" }}>
      <header>
        <div style={{ fontSize: 22, fontWeight: 850 }}>Cartas de Porte autorizadas</div>
        <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Acceso documental limitado a las operaciones para las que recibiste autorización. Esta vista no muestra viajes, transportistas, cantidades comerciales ni seguimiento logístico.</div>
      </header>
      {error && <div role="alert" style={{ background: "#fff1f2", color: "#9f1239", borderRadius: 9, padding: 11 }}>{error}</div>}
      {loading ? <div>Cargando documentos autorizados…</div> : items.length === 0 ? (
        <div style={{ border: "1px solid #dbe3ed", borderRadius: 12, padding: 18, color: "#64748b" }}>No tenés Cartas de Porte autorizadas para consultar.</div>
      ) : items.map(item => (
        <section key={item.id} style={{ border: "1px solid #dbe3ed", borderRadius: 12, background: "#fff", padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Carta de Porte {item.numero_carta_porte}</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{item.nombre_archivo} · {item.toneladas_declaradas ? Number(item.toneladas_declaradas).toLocaleString("es-AR") + " TN" : "Cantidad pendiente de revisión"}</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>Documento: {item.estado_verificacion.replaceAll("_", " ")} · Cargado {new Date(item.creada_at).toLocaleString("es-AR")}</div>
          </div>
          <button type="button" onClick={() => void abrir(item.archivo_path)} style={{ border: 0, borderRadius: 9, padding: "9px 13px", background: "#078b58", color: "#fff", fontWeight: 800 }}>Abrir PDF</button>
        </section>
      ))}
    </main>
  );
}
