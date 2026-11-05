"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Solicitud = {
  id: string;
  profile_id: string | null;
  nombre_completo: string | null;
  dni: string | null;
  cuit: string | null;
  empresa_transporte: string | null;
  telefono: string | null;
  dni_documento_path: string | null;
  foto_perfil_path: string | null;
  verificacion_estado: string;
  observaciones_verificacion: string | null;
};

export default function AdministracionTransportistasPage() {
  const [items, setItems] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase.from("transportistas").select("*").order("creado_en", { ascending: false });
    if (queryError) setError(queryError.message);
    else setItems((data || []) as Solicitud[]);
    setLoading(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function abrir(path: string | null) {
    if (!path) return;
    const { data, error: signedError } = await supabase.storage.from("agrobroker-private").createSignedUrl(path, 90);
    if (signedError || !data?.signedUrl) {
      setError("No se pudo abrir el documento: " + (signedError?.message || "enlace no disponible"));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function verificar(item: Solicitud, estado: "VERIFICADO" | "OBSERVADO") {
    const observaciones = estado === "OBSERVADO" ? window.prompt("Indicá qué debe corregir el transportista:") : "Identidad y documentación revisadas por Administración.";
    if (estado === "OBSERVADO" && !observaciones?.trim()) return;
    setBusy(item.profile_id || item.id);
    setError("");
    const { error: rpcError } = await supabase.rpc("verificar_transportista", {
      p_profile_id: item.profile_id,
      p_estado: estado,
      p_observaciones: observaciones,
    });
    if (rpcError) setError("No se pudo actualizar la verificación: " + rpcError.message);
    else setMensaje(estado === "VERIFICADO" ? "Transportista verificado. Ya puede recibir asignaciones." : "Solicitud observada y devuelta para corrección.");
    await cargar();
    setBusy("");
  }

  return (
    <main style={{ maxWidth: 1100, margin: "28px auto", padding: 20, color: "#0f172a", display: "grid", gap: 16 }}>
      <header>
        <div style={{ fontSize: 22, fontWeight: 850 }}>Verificación de transportistas</div>
        <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Revisión privada de identidad, fotografía y DNI. Solo Administración puede abrir el documento completo.</div>
      </header>
      {error && <div role="alert" style={{ padding: 12, background: "#fff1f2", color: "#9f1239", borderRadius: 9 }}>{error}</div>}
      {mensaje && <div role="status" style={{ padding: 12, background: "#ecfdf5", color: "#166534", borderRadius: 9 }}>{mensaje}</div>}
      {loading ? <div>Cargando solicitudes…</div> : items.length === 0 ? <div style={{ padding: 18, border: "1px solid #e2e8f0", borderRadius: 12 }}>No hay solicitudes de transportistas.</div> : items.map(item => (
        <section key={item.id} style={{ border: "1px solid #dbe3ed", borderRadius: 13, padding: 16, display: "grid", gap: 11, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 850 }}>{item.nombre_completo || item.id}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>DNI: {item.dni || "—"} · CUIT: {item.cuit || "—"}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{item.empresa_transporte || "Transportista independiente"} · {item.telefono || "Sin teléfono"}</div>
            </div>
            <span style={{ alignSelf: "flex-start", background: item.verificacion_estado === "VERIFICADO" ? "#dcfce7" : item.verificacion_estado === "OBSERVADO" ? "#fee2e2" : "#fef3c7", color: item.verificacion_estado === "VERIFICADO" ? "#166534" : item.verificacion_estado === "OBSERVADO" ? "#991b1b" : "#92400e", padding: "6px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800 }}>{item.verificacion_estado}</span>
          </div>
          {item.observaciones_verificacion && <div style={{ fontSize: 12, color: "#92400e" }}>Observaciones: {item.observaciones_verificacion}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void abrir(item.foto_perfil_path)} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 11px", background: "#fff", fontWeight: 700 }}>Ver fotografía</button>
            <button type="button" onClick={() => void abrir(item.dni_documento_path)} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 11px", background: "#fff", fontWeight: 700 }}>Ver DNI privado</button>
            {item.verificacion_estado !== "VERIFICADO" && <button disabled={busy === (item.profile_id || item.id)} type="button" onClick={() => void verificar(item, "VERIFICADO")} style={{ border: 0, borderRadius: 8, padding: "8px 12px", background: "#078b58", color: "#fff", fontWeight: 800 }}>Verificar identidad</button>}
            {item.verificacion_estado !== "OBSERVADO" && <button disabled={busy === (item.profile_id || item.id)} type="button" onClick={() => void verificar(item, "OBSERVADO")} style={{ border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", background: "#fff7f7", color: "#b91c1c", fontWeight: 800 }}>Observar solicitud</button>}
          </div>
        </section>
      ))}
    </main>
  );
}
