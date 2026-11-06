"use client";

import { useState, type FormEvent, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase/client";

const field: CSSProperties = { width: "100%", height: 44, border: "1px solid #cbd5e1", borderRadius: 9, padding: "9px 12px", boxSizing: "border-box", color: "#0f172a", background: "#fff" };

export default function RegistroTransportistaPage() {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [cuit, setCuit] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefono, setTelefono] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [documento, setDocumento] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk(false);
    if (!foto) {
      setError("Adjuntá una fotografía actual del conductor para la verificación de identidad.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(foto.type)) {
      setError("La fotografía debe estar en formato JPG, PNG o WEBP.");
      return;
    }
    if (documento && documento.type !== "application/pdf" && !documento.type.startsWith("image/")) {
      setError("El DNI debe adjuntarse como imagen o PDF.");
      return;
    }
    setLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("Iniciá sesión antes de registrar el perfil de transportista.");
      setLoading(false);
      return;
    }
    const uid = userData.user.id;
    const stamp = Date.now();
    const fotoPath = `transportistas/${uid}/foto/${stamp}-foto.${foto.name.split(".").pop() || "jpg"}`;
    const dniPath = documento ? `transportistas/${uid}/dni/${stamp}-dni.${documento.name.split(".").pop() || "pdf"}` : null;
    const fotoUpload = await supabase.storage.from("agrobroker-private").upload(fotoPath, foto, { contentType: foto.type, upsert: false });
    if (fotoUpload.error) {
      setError("No se pudo cargar la fotografía: " + fotoUpload.error.message);
      setLoading(false);
      return;
    }
    if (documento && dniPath) {
      const dniUpload = await supabase.storage.from("agrobroker-private").upload(dniPath, documento, { contentType: documento.type, upsert: false });
      if (dniUpload.error) {
        await supabase.storage.from("agrobroker-private").remove([fotoPath]);
        setError("No se pudo cargar el DNI: " + dniUpload.error.message);
        setLoading(false);
        return;
      }
    }
    const { error: rpcError } = await supabase.rpc("registrar_transportista", {
      p_nombre: nombre,
      p_dni: dni,
      p_cuit: cuit || null,
      p_empresa: empresa || null,
      p_telefono: telefono || null,
      p_dni_path: dniPath,
      p_foto_path: fotoPath,
    });
    if (rpcError) {
      await supabase.storage.from("agrobroker-private").remove(dniPath ? [fotoPath, dniPath] : [fotoPath]);
      setError("No se pudo registrar el perfil: " + rpcError.message);
    } else {
      setOk(true);
      setError("");
    }
    setLoading(false);
  }

  return (
    <main className="transporter-registration-page">
      <div className="transporter-registration-card">
        <div>
          <div style={{ fontSize: 22, fontWeight: 850 }}>Registro de transportista</div>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>Creá tu perfil para recibir asignaciones de viajes y actualizar el seguimiento de tus camiones en AgroBrokerIA.</p>
        </div>
        {ok ? (
          <div role="status" style={{ padding: 16, borderRadius: 10, background: "#ecfdf5", color: "#166534", border: "1px solid #a7f3d0" }}>
            <strong>Solicitud enviada.</strong>
            <p style={{ marginBottom: 0 }}>Tu perfil quedó pendiente de verificación por AgroBrokerIA. Hasta que se verifique no podrás recibir asignaciones de viajes.</p>
          </div>
        ) : (
          <form onSubmit={enviar} style={{ display: "grid", gap: 13 }}>
            <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Nombre y apellido
              <input required value={nombre} onChange={e => setNombre(e.target.value)} style={field} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>DNI
                <input required inputMode="numeric" value={dni} onChange={e => setDni(e.target.value)} style={field} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>CUIT (opcional)
                <input value={cuit} onChange={e => setCuit(e.target.value)} style={field} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Empresa de transporte (opcional)
                <input value={empresa} onChange={e => setEmpresa(e.target.value)} style={field} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Teléfono
                <input value={telefono} onChange={e => setTelefono(e.target.value)} style={field} />
              </label>
            </div>
            <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Fotografía actual del conductor
              <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFoto(e.target.files?.[0] || null)} />
              <span style={{ color: "#64748b", fontSize: 11, fontWeight: 400 }}>La fotografía podrá ser consultada por los participantes autorizados de los viajes que te asignen.</span>
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>DNI — imagen o PDF
              <input type="file" accept="image/*,application/pdf" onChange={e => setDocumento(e.target.files?.[0] || null)} />
              <span style={{ color: "#64748b", fontSize: 11, fontWeight: 400 }}>El documento será privado: solo vos y Administración podrán abrir el archivo completo.</span>
            </label>
            <div style={{ background: "#f8fafc", borderRadius: 9, padding: 12, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
              Los documentos se guardan en almacenamiento privado. Los vendedores, productores y compradores podrán comprobar tu fotografía y estado de verificación, pero no tendrán acceso a la imagen completa del DNI.
            </div>
            {error && <div role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}
            <button disabled={loading} type="submit" style={{ height: 45, border: 0, borderRadius: 9, background: "#078b58", color: "#fff", fontWeight: 800, cursor: "pointer" }}>{loading ? "Enviando solicitud…" : "Registrar perfil de transportista"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
