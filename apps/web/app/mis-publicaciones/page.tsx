"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Publicacion = {
  id: string;
  tipo: string;
  cantidad_tn: number;
  precio_tn: number;
  estado: string;
  puerto: string;
  provincia: string;
  productos?: {
    nombre: string;
  }[] | null;
};

export default function MisPublicacionesPage() {
  const [publicaciones, setPublicaciones] = useState<
    Publicacion[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<
    string | null
  >(null);

  useEffect(() => {
    cargarPublicaciones();
  }, []);

  async function cargarPublicaciones() {
    setLoading(true);

    const { data, error } = await supabase
      .from("publicaciones")
      .select(`
        id,
        tipo,
        cantidad_tn,
        precio_tn,
        estado,
        puerto,
        provincia,
        productos(nombre)
      `)
      .order("creada_en", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error cargando publicaciones:",
        error
      );
    } else {
      setPublicaciones(
        (data as Publicacion[]) || []
      );
    }

    setLoading(false);
  }

  async function cambiarEstado(
    publicacion: Publicacion
  ) {
    const pausada =
      publicacion.estado === "PAUSADA";

    const nuevoEstado = pausada
      ? "PUBLICADA"
      : "PAUSADA";

    const pregunta = pausada
      ? "¿Querés volver a publicar esta publicación?"
      : "¿Querés pausar esta publicación? Dejará de estar disponible en el Marketplace.";

    if (!window.confirm(pregunta)) {
      return;
    }

    try {
      setProcesando(publicacion.id);

      const { error } = await supabase.rpc("cambiar_estado_publicacion", {
        p_publicacion_id: publicacion.id,
        p_nuevo_estado: nuevoEstado,
      });

      if (error) {
        console.error(error);

        alert(
          `No se pudo cambiar el estado: ${error.message}`
        );

        return;
      }

      setPublicaciones((anteriores) =>
        anteriores.map((p) =>
          p.id === publicacion.id
            ? {
                ...p,
                estado: nuevoEstado,
              }
            : p
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        "Ocurrió un error al cambiar el estado."
      );
    } finally {
      setProcesando(null);
    }
  }

  async function eliminarPublicacion(
    id: string
  ) {
    if (
      !window.confirm(
        "¿Estás segura de que querés eliminar esta publicación?"
      )
    ) {
      return;
    }

    try {
      setProcesando(id);

      const { error } = await supabase.rpc("eliminar_publicacion", {
        p_publicacion_id: id,
      });

      if (error) {
        console.error(error);

        alert(
          `No se pudo eliminar la publicación: ${error.message}`
        );

        return;
      }

      setPublicaciones((anteriores) =>
        anteriores.filter(
          (p) => p.id !== id
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        "Ocurrió un error al eliminar la publicación."
      );
    } finally {
      setProcesando(null);
    }
  }

  return (
    <main className="module-page publications-page">
      <div className="module-hero">
        <div><span className="eyebrow">MERCADO</span><h1>Mis Publicaciones</h1><p>Administrá tus oportunidades de compra y venta.</p></div>
        <div className="module-pill">{publicaciones.filter((p) => p.estado === "PUBLICADA").length} activas</div>
      </div>

      <section className="publication-toolbar">
        <div><strong>Mis oportunidades</strong><span>{publicaciones.length} publicaciones registradas</span></div>
        <Link href="/nueva-publicacion" className="primary-action">+ Nueva publicación</Link>
      </section>

      {loading ? (
        <div className="empty-module"><div className="empty-module-icon">◌</div><h2>Cargando publicaciones...</h2></div>
      ) : publicaciones.length === 0 ? (
        <div className="empty-module">
          <div className="empty-module-icon">▤</div><h2>No hay publicaciones</h2>
          <p>Creá tu primera oferta o demanda para comenzar a operar en el mercado.</p>
          <Link href="/nueva-publicacion" className="primary-action">Crear publicación →</Link>
        </div>
      ) : (
        <div className="publication-list">
          {publicaciones.map((p) => {
            const pausada = p.estado === "PAUSADA";
            const ocupado = procesando === p.id;
            return (
              <article key={p.id} className="publication-card">
                <div className="publication-card-top">
                  <div>
                    <div className="publication-tags"><span className={p.tipo === "DEMANDA" ? "demand-tag" : "sale-tag"}>{p.tipo}</span><span className={pausada ? "paused-tag" : "active-tag"}>● {p.estado}</span></div>
                    <h2>{p.productos?.[0]?.nombre ?? "Commodity"}</h2>
                    <p>{p.provincia || "Sin provincia"}{p.puerto ? ` · ${p.puerto}` : ""}</p>
                  </div>
                  <div className="publication-price"><strong>USD {Number(p.precio_tn).toLocaleString("es-AR")}</strong><span>/ TN</span></div>
                </div>
                <div className="publication-data">
                  <div><span>Cantidad</span><strong>{Number(p.cantidad_tn).toLocaleString("es-AR")} TN</strong></div>
                  <div><span>Tipo</span><strong>{p.tipo}</strong></div>
                  <div><span>Provincia</span><strong>{p.provincia || "—"}</strong></div>
                  <div><span>Puerto / entrega</span><strong>{p.puerto || "—"}</strong></div>
                </div>
                <div className="publication-actions">
                  <Link href={`/nueva-publicacion?id=${p.id}`} className="secondary-action">Editar</Link>
                  <button type="button" disabled={ocupado} onClick={() => cambiarEstado(p)} className={pausada ? "action-green" : "action-amber"}>{ocupado ? "Procesando..." : pausada ? "Publicar" : "Pausar"}</button>
                  <button type="button" disabled={ocupado} onClick={() => eliminarPublicacion(p.id)} className="action-danger">Eliminar</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
