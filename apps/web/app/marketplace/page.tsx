"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

import MarketplaceHeader from "../../components/marketplace/MarketplaceHeader";
import MarketplaceSearch from "../../components/marketplace/MarketplaceSearch";
import MarketplaceFilters from "../../components/marketplace/MarketplaceFilters";
import MarketplaceCard from "../../components/marketplace/MarketplaceCard";
import MarketplacePagination from "../../components/marketplace/MarketplacePagination";

type Publicacion = {
  id: string;
  tipo: string;
  cantidad_tn: number;
  precio_tn: number;
  estado: string;
  provincia: string;
  localidad?: string;
  puerto: string;
  calidad?: string;
  humedad?: number;
  proteina?: number;
  observaciones?: string;
  creada_en?: string;

  productos?: {
    nombre: string;
  } | null;

  empresas?: {
    razon_social: string;
  } | null;
};

export default function MarketplacePage() {
  const [publicaciones, setPublicaciones] =
    useState<Publicacion[]>([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    cargarPublicaciones();
  }, []);

  async function cargarPublicaciones() {
    try {
      setLoading(true);
      setError("");

      /*
       * MARKETPLACE
       *
       * Solamente mostramos publicaciones
       * que estén PUBLICADAS.
       *
       * Las PAUSADAS quedan fuera automáticamente.
       */

      const { data, error } =
        await supabase
          .from("publicaciones")
          .select(`
            *,
            productos(nombre),
            empresas(razon_social)
          `)
          .eq("estado", "PUBLICADA")
          .order("creada_en", {
            ascending: false,
          });

      if (error) {
        console.error(
          "Error Marketplace:",
          error
        );

        setError(
          "No se pudieron cargar las publicaciones."
        );

        return;
      }

      setPublicaciones(
        (data as Publicacion[]) || []
      );
    } catch (e) {
      console.error(e);

      setError(
        "Ocurrió un error al cargar el Marketplace."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * BÚSQUEDA
   */

  const publicacionesFiltradas =
    publicaciones.filter((p) => {
      const texto = `
        ${p.tipo ?? ""}
        ${p.provincia ?? ""}
        ${p.localidad ?? ""}
        ${p.puerto ?? ""}
        ${p.productos?.nombre ?? ""}
        ${p.empresas?.razon_social ?? ""}
      `.toLowerCase();

      return texto.includes(
        busqueda.toLowerCase()
      );
    });

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <MarketplaceHeader />

      <MarketplaceSearch
        value={busqueda}
        onChange={setBusqueda}
      />

      <MarketplaceFilters />

      {loading && (
        <div
          style={{
            background: "white",
            padding: 30,
            borderRadius: 12,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          <p>
            Cargando publicaciones...
          </p>
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 20,
            borderRadius: 12,
            marginTop: 20,
          }}
        >
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        publicacionesFiltradas.length ===
          0 && (
          <div
            style={{
              background: "white",
              padding: 40,
              borderRadius: 12,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            <h2>
              No hay publicaciones disponibles.
            </h2>

            <p
              style={{
                color: "#666",
              }}
            >
              No encontramos ofertas que
              coincidan con tu búsqueda.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        publicacionesFiltradas.length >
          0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              marginTop: 20,
            }}
          >
            {publicacionesFiltradas.map(
              (publicacion) => (
                <MarketplaceCard
                  key={publicacion.id}
                  publicacion={publicacion}
                />
              )
            )}
          </div>
        )}

      <MarketplacePagination />
    </main>
  );
}