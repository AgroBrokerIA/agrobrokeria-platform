"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import MarketplaceSearch from "../../components/marketplace/MarketplaceSearch";
import MarketplaceFilters from "../../components/marketplace/MarketplaceFilters";
import MarketplaceCard from "../../components/marketplace/MarketplaceCard";
import MarketplacePagination from "../../components/marketplace/MarketplacePagination";

type Publicacion = {
  id: string; tipo: string; cantidad_tn: number; precio_tn: number; moneda_id: number | null; moneda_codigo?: string | null; estado: string;
  provincia: string; localidad?: string; puerto: string; calidad?: string;
  humedad?: number; proteina?: number; observaciones?: string; creada_en?: string;
  productos?: { nombre: string } | null; monedas?: { codigo: string } | null;
  empresas?: { razon_social: string; tipo_empresa?: string | null; verificada?: boolean | null; reputacion_score?: number | null; operaciones_realizadas?: number | null; toneladas_operadas?: number | null } | null;
};

export default function MarketplacePage() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [provincia, setProvincia] = useState("");
  const [producto, setProducto] = useState("");
  const [loading, setLoading] = useState(true);
  const [catalogProvincias, setCatalogProvincias] = useState<string[]>([]);
  const [catalogProductos, setCatalogProductos] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBusqueda(params.get("search") || "");
    const tipoParam = params.get("tipo") || "";
    setTipo(tipoParam === "DEMANDA" ? "COMPRA" : tipoParam);
    async function cargar() {
      setLoading(true); setError("");
      const [{ data, error }, { data: productCatalog, error: productError }, { data: provinceCatalog, error: provinceError }] = await Promise.all([
        supabase.from("publicaciones")
          .select("*, productos(nombre), monedas(codigo), empresas(razon_social, tipo_empresa, verificada, reputacion_score, operaciones_realizadas, toneladas_operadas)")
          .eq("estado", "PUBLICADA").order("creada_en", { ascending: false }),
        supabase.from("productos").select("id,nombre").eq("activo", true).order("nombre"),
        supabase.from("provincias").select("id,nombre").eq("pais_id", 1).eq("activo", true).order("nombre")
      ]);
      if (error || productError || provinceError) {
        setError((error || productError || provinceError)?.message || "No se pudieron cargar los datos del marketplace.");
      } else {
        setPublicaciones(((data as Publicacion[]) || []).map((row:any) => ({ ...row, moneda_codigo: row.monedas?.codigo || null })));
        setCatalogProductos((productCatalog || []).map((row:any) => row.nombre));
        setCatalogProvincias((provinceCatalog || []).map((row:any) => row.nombre));
      }
      setLoading(false);
    }
    void cargar();
  }, []);

  const tipos = ["COMPRA", "VENTA"];
  const provincias = catalogProvincias;
  const productos = catalogProductos;

  const filtradas = useMemo(() => publicaciones.filter((p) => {
    const texto = [p.tipo, p.provincia, p.localidad, p.puerto, p.productos?.nombre, p.empresas?.razon_social].join(" ").toLowerCase();
    return texto.includes(busqueda.toLowerCase())
      && (!tipo || p.tipo === tipo)
      && (!provincia || p.provincia === provincia)
      && (!producto || p.productos?.nombre === producto);
  }), [publicaciones, busqueda, tipo, provincia, producto]);

  return (
    <main className="module-page marketplace-page">
      <div className="module-hero marketplace-hero"><div><span className="eyebrow">MERCADO DE COMMODITIES</span><h1>Marketplace</h1><p>Publicaciones reales de compra y venta, con condiciones comerciales trazables.</p><div className="marketplace-hero-meta"><span>Compra y venta</span><span>Ofertas directas</span><span>Datos sin inventar</span></div></div><div className="marketplace-hero-side"><strong>{filtradas.length}</strong><span>publicaciones visibles</span><small>Mercado activo</small></div></div>
      <div className="marketplace-toolbar"><MarketplaceSearch value={busqueda} onChange={setBusqueda} /><span className="marketplace-result-count">{filtradas.length} resultados</span></div>
      <MarketplaceFilters tipo={tipo} provincia={provincia} producto={producto}
        onTipoChange={setTipo} onProvinciaChange={setProvincia} onProductoChange={setProducto}
        tipos={tipos} provincias={provincias} productos={productos} />

      {loading && <div style={panel}>Cargando publicaciones...</div>}
      {error && <div style={{ ...panel, background: "#fee2e2", color: "#991b1b" }}>{error}</div>}

      {!loading && !error && filtradas.length === 0 && (
        <div style={panel}><h2>No hay publicaciones que coincidan.</h2><p>Probá cambiar la búsqueda o los filtros.</p></div>
      )}

      {!loading && !error && filtradas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
          {filtradas.map((publicacion) => (
            <div key={publicacion.id} id={`publicacion-${publicacion.id}`}>
              <MarketplaceCard publicacion={publicacion} />
            </div>
          ))}
        </div>
      )}
      <MarketplacePagination />
    </main>
  );
}

const panel = { background: "white", padding: 30, borderRadius: 12, textAlign: "center" as const, marginTop: 20 };
