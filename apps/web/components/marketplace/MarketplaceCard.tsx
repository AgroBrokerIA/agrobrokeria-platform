"use client";

import { useState } from "react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { supabase } from "@/lib/supabase/client";

type Props = { publicacion: any };

export default function MarketplaceCard({ publicacion }: Props) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [cantidadOferta, setCantidadOferta] = useState(String(publicacion.cantidad_tn ?? ""));
  const [precioOferta, setPrecioOferta] = useState(String(publicacion.precio_tn ?? ""));
  const [monedaOferta, setMonedaOferta] = useState(String(publicacion.moneda_id ?? ""));
  const [observaciones, setObservaciones] = useState("");

  async function mostrarInteres() {
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setError("Necesitás iniciar sesión para realizar una oferta."); return; }
    setMostrarFormulario(true);
  }

  async function enviarOferta() {
    setError("");
    const cantidad = Number(cantidadOferta);
    const precio = Number(precioOferta);
    const moneda = Number(monedaOferta);

    if (!Number.isFinite(cantidad) || cantidad <= 0) { setError("Ingresá una cantidad válida de toneladas."); return; }
    if (!Number.isFinite(precio) || precio <= 0) { setError("Ingresá un precio válido por tonelada."); return; }
    if (cantidad > Number(publicacion.cantidad_tn)) { setError(`La cantidad ofertada no puede superar las ${publicacion.cantidad_tn} TN publicadas.`); return; }
    if (!Number.isInteger(moneda) || moneda <= 0) { setError("Seleccioná una moneda válida."); return; }

    setEnviando(true);
    try {
      const { data, error } = await supabase.rpc("crear_oferta_desde_publicacion", {
        p_publicacion_id: publicacion.id,
        p_cantidad_tn: cantidad,
        p_precio_tn: precio,
        p_moneda_id: moneda,
        p_observaciones: observaciones.trim(),
      });

      if (error) { setError(`No se pudo enviar la oferta: ${error.message}`); return; }

      console.log("Oferta creada:", data);
      setEnviado(true);
      setMostrarFormulario(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error al enviar la oferta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Badge>{publicacion.tipo}</Badge><div style={{ fontSize: 28 }}>⭐</div>
      </div>
      <h2 style={{ marginTop: 15, marginBottom: 5, fontSize: 34 }}>🌽 {publicacion.productos?.nombre ?? "Producto"}</h2>
      <p style={{ color: "#666", marginBottom: 30 }}>{publicacion.empresas?.razon_social ?? "Empresa"}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
        <div><p style={{ color: "#666" }}>Cantidad publicada</p><h3>{publicacion.cantidad_tn} TN</h3><br /><p style={{ color: "#666" }}>Provincia</p><h3>{publicacion.provincia}</h3></div>
        <div><p style={{ color: "#666" }}>Precio publicado</p><h3>USD {publicacion.precio_tn}</h3><br /><p style={{ color: "#666" }}>Puerto</p><h3>{publicacion.puerto}</h3></div>
      </div>

      {error && <div style={{ marginTop: 20, background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8 }}>{error}</div>}
      {enviado && <div style={{ marginTop: 20, background: "#dcfce7", color: "#166534", padding: 12, borderRadius: 8 }}>✅ Oferta enviada correctamente.</div>}

      {mostrarFormulario && (
        <div style={{ marginTop: 25, padding: 20, border: "1px solid #ddd", borderRadius: 10 }}>
          <h3 style={{ marginTop: 0 }}>Hacer oferta</h3>
          <div style={{ display: "grid", gap: 15 }}>
            <label>Cantidad ofertada (TN)<input type="number" min="0.01" step="0.01" value={cantidadOferta} onChange={(e) => setCantidadOferta(e.target.value)} style={inputStyle} /></label>
            <label>Precio ofertado por TN<input type="number" min="0.01" step="0.01" value={precioOferta} onChange={(e) => setPrecioOferta(e.target.value)} style={inputStyle} /></label>
            <label>Moneda<select value={monedaOferta} onChange={(e) => setMonedaOferta(e.target.value)} style={inputStyle}>
              <option value="">Seleccionar moneda</option><option value="2">USD - Dólares</option><option value="1">ARS - Pesos argentinos</option>
            </select></label>
            <label>Observaciones / condiciones<textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={4} placeholder="Pago, entrega, calidad, plazo, etc." style={inputStyle} /></label>
          </div>
          <div style={{ marginTop: 20, padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
            <strong>Importe estimado:</strong>{" "}
            {(() => {
  const cantidad = Number(cantidadOferta);
  const precio = Number(precioOferta);
  const importe = cantidad * precio;
  return Number.isFinite(importe) ? importe.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00";
})()} {monedaOferta === "2" ? "USD" : monedaOferta === "1" ? "ARS" : ""}
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <Button variant="secondary" onClick={() => { setMostrarFormulario(false); setError(""); }}>Cancelar</Button>
            <Button onClick={enviarOferta}>{enviando ? "Enviando..." : "Enviar oferta"}</Button>
          </div>
        </div>
      )}

      {!mostrarFormulario && (
        <div style={{ marginTop: 30, display: "flex", gap: 15 }}>
          <Button>Ver publicación</Button>
          <Button variant="secondary" onClick={mostrarInteres}>{enviado ? "Oferta enviada" : "Hacer oferta"}</Button>
        </div>
      )}
    </Card>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: 10, borderRadius: 6, border: "1px solid #ccc" };
