"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Publicacion = {
  id: string;
  tipo: string;
  cantidad_tn: number;
  precio_tn: number;
  moneda_id?: number | null;
  estado: string;
  puerto: string;
  categoria_destino?: string | null;
  destino_homologado_id?: number | null;
  nombre_establecimiento_destino?: string | null;
  localidad_destino?: string | null;
  provincia_destino?: string | null;
  direccion_destino?: string | null;
  puertos?: string[] | null;
  lugares_recepcion?: string[] | null;
  calidad?: string | null;
  observaciones?: string | null;
  provincia: string;
  productos?: { nombre: string } | { nombre: string }[] | null;
};

export default function MisPublicacionesPage() {
  const [publicaciones, setPublicaciones] = useState<
    Publicacion[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [monedas, setMonedas] = useState<Record<number,string>>({});

  useEffect(() => {
    cargarPublicaciones();
  }, []);

  async function cargarPublicaciones() {
    setLoading(true);
    try {
      const { data: monedaData } = await supabase.from("monedas").select("id,codigo");
      setMonedas(Object.fromEntries((monedaData || []).map((m: {id:number;codigo:string}) => [m.id, m.codigo])));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPublicaciones([]); return; }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("active_company_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      let empresaId: string | null = null;
      if (profile?.active_company_id) {
        const { data: mapping, error: mappingError } = await supabase
          .from("company_empresa_map")
          .select("empresa_id")
          .eq("company_id", profile.active_company_id)
          .maybeSingle();
        if (mappingError) console.error("Error resolviendo empresa comercial:", mappingError);
        if (mapping?.empresa_id) empresaId = mapping.empresa_id;
        else {
          const { data: legacy } = await supabase
            .from("empresas").select("id")
            .eq("id", profile.active_company_id).eq("activa", true).maybeSingle();
          if (legacy?.id) empresaId = legacy.id;
        }
      }

      let query = supabase.from("publicaciones").select(`
        id,tipo,moneda_id,cantidad_tn,precio_tn,estado,puerto,categoria_destino,destino_homologado_id,nombre_establecimiento_destino,localidad_destino,provincia_destino,direccion_destino,puertos,
        lugares_recepcion,provincia,productos(nombre)
      `).order("creada_en", { ascending: false });

      // Las publicaciones independientes pertenecen al perfil publicador,
      // no a una empresa. Incluir ambos caminos para cuentas mixtas/legadas.
      query = empresaId
        ? query.or(`publicador_profile_id.eq.${user.id},empresa_id.eq.${empresaId}`)
        : query.eq("publicador_profile_id", user.id);

      const { data, error } = await query;
      if (error) throw error;
      setPublicaciones((data as Publicacion[]) || []);
    } catch (error) {
      console.error("Error cargando publicaciones propias:", error);
      setPublicaciones([]);
      alert("No se pudieron cargar tus publicaciones. " + (error instanceof Error ? error.message : ""));
    } finally {
      setLoading(false);
    }
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
                    <h2>{(Array.isArray(p.productos) ? p.productos[0]?.nombre : p.productos?.nombre) ?? "Producto sin identificar"}</h2>
                    <p>{p.provincia || "Sin provincia"}{p.puerto ? ` · ${p.puerto}` : ""}{p.nombre_establecimiento_destino ? ` · Descarga: ${p.nombre_establecimiento_destino} (${p.localidad_destino || ""}, ${p.provincia_destino || ""})` : ""}{Array.isArray(p.puertos) && p.puertos.length > 1 ? ` · +${p.puertos.length - 1} puertos` : ""}</p>
                  </div>
                  <div className="publication-price"><strong>{monedas[p.moneda_id ?? 0] || "Moneda no informada"} {Number(p.precio_tn).toLocaleString("es-AR")}</strong><span>/ TN</span></div>
                </div>
                <div className="publication-data">
                  <div><span>Cantidad</span><strong>{Number(p.cantidad_tn).toLocaleString("es-AR")} TN</strong></div>
                  <div><span>Tipo</span><strong>{p.tipo}</strong></div>
                  <div><span>Provincia</span><strong>{p.provincia || "—"}</strong></div>
                  <div><span>Puertos / entrega</span><strong>{Array.isArray(p.puertos) && p.puertos.length ? p.puertos.slice(0, 3).join(" · ") + (p.puertos.length > 3 ? ` · +${p.puertos.length - 3}` : "") : p.puerto || "—"}</strong></div><div><span>Destino homologado</span><strong>{p.nombre_establecimiento_destino ? [p.nombre_establecimiento_destino,p.direccion_destino,p.localidad_destino,p.provincia_destino].filter(Boolean).join(" · ") : "No especificado"}</strong></div><div><span>Lugares de recepción</span><strong>{Array.isArray(p.lugares_recepcion) && p.lugares_recepcion.length ? p.lugares_recepcion.join(" · ") : "—"}</strong></div><div><span>Calidad</span><strong>{p.calidad?.trim() || "No especificada"}</strong></div><div className="publication-observations"><span>Observaciones y condiciones</span><strong style={{whiteSpace:"pre-wrap"}}>{p.observaciones?.trim() || "Sin observaciones adicionales."}</strong></div>
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
