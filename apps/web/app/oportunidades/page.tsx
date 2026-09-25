"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Oportunidad = {
  id: string;
  publicacion_id: string;
  empresa_id: string;
  indice_compatibilidad: number;
  estado: string;
  creada_en: string;
};

type Publicacion = {
  id: string;
  tipo: string;
  cantidad_tn: number;
  precio_tn: number;
  moneda_id: number;
  provincia?: string | null;
  localidad?: string | null;
  puerto?: string | null;
};

type OportunidadVista = Oportunidad & {
  publicacion?: Publicacion;
};

export default function OportunidadesPage() {
  const [oportunidades, setOportunidades] =
    useState<OportunidadVista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargarOportunidades() {
    setCargando(true);
    setError("");

    try {
      const { data: usuarioData } =
        await supabase.auth.getUser();

      const user = usuarioData.user;

      if (!user) {
        setError("Tenés que iniciar sesión.");
        setCargando(false);
        return;
      }

      const { data: perfil, error: perfilError } =
        await supabase
          .from("profiles")
          .select("active_company_id")
          .eq("id", user.id)
          .single();

      if (perfilError || !perfil?.active_company_id) {
        setError(
          "No se encontró la empresa activa."
        );
        setCargando(false);
        return;
      }

      const { data, error: oportunidadesError } =
        await supabase
          .from("oportunidades")
          .select("*")
          .eq(
            "empresa_id",
            perfil.active_company_id
          )
          .order(
            "indice_compatibilidad",
            { ascending: false }
          )
          .order(
            "creada_en",
            { ascending: false }
          );

      if (oportunidadesError) {
        throw oportunidadesError;
      }

      const oportunidadesBase =
        (data ?? []) as Oportunidad[];

      const publicacionIds =
        oportunidadesBase.map(
          (oportunidad) =>
            oportunidad.publicacion_id
        );

      let publicaciones: Publicacion[] = [];

      if (publicacionIds.length > 0) {
        const { data: publicacionesData } =
          await supabase
            .from("publicaciones")
            .select(
              `
              id,
              tipo,
              cantidad_tn,
              precio_tn,
              moneda_id,
              provincia,
              localidad,
              puerto
              `
            )
            .in(
              "id",
              publicacionIds
            );

        publicaciones =
          (publicacionesData ??
            []) as Publicacion[];
      }

      const mapaPublicaciones =
        new Map(
          publicaciones.map(
            (publicacion) => [
              publicacion.id,
              publicacion,
            ]
          )
        );

      setOportunidades(
        oportunidadesBase.map(
          (oportunidad) => ({
            ...oportunidad,
            publicacion:
              mapaPublicaciones.get(
                oportunidad.publicacion_id
              ),
          })
        )
      );
    } catch (e) {
      console.error(e);

      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron cargar las oportunidades."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarOportunidades();
  }, []);

  function colorPuntaje(
    puntaje: number
  ) {
    if (puntaje >= 90) return "text-green-700";
    if (puntaje >= 80) return "text-blue-700";
    if (puntaje >= 70) return "text-yellow-700";
    return "text-gray-600";
  }

  function formatoFecha(
    fecha: string
  ) {
    return new Date(fecha).toLocaleString(
      "es-AR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );
  }

  if (cargando) {
    return (
      <main className="module-page">
        <div className="module-hero">
          <div><span className="eyebrow">INTELIGENCIA COMERCIAL</span><h1>Oportunidades IA</h1><p>Smart Match encuentra coincidencias entre tu empresa y el mercado.</p></div>
          <div className="module-pill">IA activa</div>
        </div>
        <div className="dashboard-panel">Analizando oportunidades comerciales...</div>
      </main>
    );
  }

  return (
    <main className="module-page opportunities-page">
      <div className="module-hero">
        <div><span className="eyebrow">INTELIGENCIA COMERCIAL</span><h1>Oportunidades IA</h1><p>Smart Match encuentra coincidencias entre tu empresa y el mercado.</p></div>
        <div className="module-pill">{oportunidades.length} coincidencias</div>
      </div>

      {error && <div className="module-alert error">{error}</div>}

      {!error && oportunidades.length === 0 && (
        <div className="empty-module">
          <div className="empty-module-icon">✦</div>
          <h2>La IA todavía no encontró coincidencias</h2>
          <p>Cuando detectemos una oportunidad compatible con tu empresa, aparecerá automáticamente acá.</p>
          <Link href="/marketplace" className="secondary-action">Explorar mercado →</Link>
        </div>
      )}

      {!error && oportunidades.length > 0 && (
        <div className="opportunity-list">
          {oportunidades.map((oportunidad) => {
            const publicacion = oportunidad.publicacion;
            const score = Number(oportunidad.indice_compatibilidad);
            return (
              <article key={oportunidad.id} className="opportunity-card">
                <div className="opportunity-main">
                  <div>
                    <div className="opportunity-tags"><span className="ai-tag">✦ IA MATCH</span><span className="neutral-tag">{oportunidad.estado}</span></div>
                    <h2>{publicacion ? `${publicacion.tipo} · ${publicacion.cantidad_tn} TN` : "Publicación compatible"}</h2>
                    {publicacion && (
                      <div className="opportunity-details">
                        <span>USD {Number(publicacion.precio_tn).toLocaleString("es-AR")} / TN</span>
                        <span>{[publicacion.localidad, publicacion.provincia].filter(Boolean).join(", ") || "Ubicación no informada"}</span>
                        {publicacion.puerto && <span>Entrega: {publicacion.puerto}</span>}
                        <span>Detectada {formatoFecha(oportunidad.creada_en)}</span>
                      </div>
                    )}
                  </div>
                  <div className="opportunity-score">
                    <strong>{score}%</strong><span>compatibilidad</span>
                    <Link href={`/marketplace?publicacion=${oportunidad.publicacion_id}`} className="primary-action">Ver oportunidad →</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
