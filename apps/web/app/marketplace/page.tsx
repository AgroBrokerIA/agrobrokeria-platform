"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import MarketplaceHeader from "../../components/marketplace/MarketplaceHeader";
import MarketplaceSearch from "../../components/marketplace/MarketplaceSearch";
import MarketplaceFilters from "../../components/marketplace/MarketplaceFilters";
import MarketplaceCard from "../../components/marketplace/MarketplaceCard";
import MarketplacePagination from "../../components/marketplace/MarketplacePagination";

type Publicacion = {
  id: string; tipo: string; cantidad_tn: number; precio_tn: number; estado: string;
  provincia: string; localidad?: string; puerto: string; calidad?: string;
  humedad?: number; proteina?: number; observaciones?: string; creada_en?: string;
  productos?: { nombre: string } | null;
  empresas?: { razon_social: string } | null;
};

export default function MarketplacePage() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [provincia, setProvincia] = useState("");
  const [producto, setProducto] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargar() {
      setLoading(true); setError("");
      const { data, error } = await supabase.from("publicaciones")
        .select("*, productos(nombre), empresas(razon_social)")
        .eq("estado", "PUBLICADA").order("creada_en", { ascending: false });
      if (error) setError("No se pudieron cargar las publicaciones.");
      else setPublicaciones((data as Publicacion[]) || []);
      setLoading(false);
    }
    void cargar();
  }, []);

  const tipos = useMemo(() => [...new Set(publicaciones.map((p) => p.tipo).filter(Boolean))], [publicaciones]);
  const provincias = useMemo(() => [...new Set(publicaciones.map((p) => p.provincia).filter(Boolean))].sort(), [publicaciones]);
  const productos = useMemo(() => [...new Set(publicaciones.map((p) => p.productos?.nombre).filter(Boolean) as string[])].sort(), [publicaciones]);

  const filtradas = useMemo(() => publicaciones.filter((p) => {
    const texto = [p.tipo, p.provincia, p.localidad, p.puerto, p.productos?.nombre, p.empresas?.razon_social].join(" ").toLowerCase();
    return texto.includes(busqueda.toLowerCase())
      && (!tipo || p.tipo === tipo)
      && (!provincia || p.provincia === provincia)
      && (!producto || p.productos?.nombre === producto);
  }), [publicaciones, busqueda, tipo, provincia, producto]);

  return (
    <main style={{ maxWidth: 1200, margin: "40px auto", padding: 20 }}>
      <MarketplaceHeader />
      <MarketplaceSearch value={busqueda} onChange={setBusqueda} />
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
