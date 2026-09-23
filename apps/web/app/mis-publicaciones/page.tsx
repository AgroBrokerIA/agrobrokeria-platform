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
    <div
      style={{
        padding: 30,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 34,
              marginBottom: 8,
            }}
          >
            📢 Mis Publicaciones
          </h1>

          <p
            style={{
              color: "#666",
              margin: 0,
            }}
          >
            Administrá todas tus publicaciones.
          </p>
        </div>

        <Link
          href="/nueva-publicacion"
          style={{
            display: "inline-block",
            background: "#16a34a",
            color: "white",
            padding: "12px 20px",
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Nueva publicación
        </Link>
      </div>

      {loading ? (
        <p>Cargando publicaciones...</p>
      ) : publicaciones.length === 0 ? (
        <div
          style={{
            background: "white",
            padding: 40,
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <h2>No hay publicaciones.</h2>

          <p>
            Creá tu primera publicación.
          </p>

          <Link
            href="/nueva-publicacion"
            style={{
              display: "inline-block",
              marginTop: 20,
              background: "#16a34a",
              color: "white",
              padding: "10px 18px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Crear publicación
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead
              style={{
                background: "#16a34a",
                color: "white",
              }}
            >
              <tr>
                <th style={{ padding: 15 }}>
                  Producto
                </th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Provincia</th>
                <th>Puerto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {publicaciones.map((p) => {
                const pausada =
                  p.estado === "PAUSADA";

                const ocupado =
                  procesando === p.id;

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    <td
                      style={{
                        padding: 15,
                      }}
                    >
                      {p.productos?.[0]
                        ?.nombre ?? "-"}
                    </td>

                    <td>{p.tipo}</td>

                    <td>
                      {p.cantidad_tn} TN
                    </td>

                    <td>
                      USD {p.precio_tn}
                    </td>

                    <td>
                      {p.provincia}
                    </td>

                    <td>
                      {p.puerto}
                    </td>

                    <td>
                      <span
                        style={{
                          display:
                            "inline-block",
                          padding:
                            "5px 9px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          background: pausada
                            ? "#fef3c7"
                            : "#dcfce7",
                          color: pausada
                            ? "#92400e"
                            : "#166534",
                        }}
                      >
                        {p.estado}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems:
                            "center",
                        }}
                      >
                        <Link
                          href={`/nueva-publicacion?id=${p.id}`}
                          style={{
                            background:
                              "#2563eb",
                            color: "white",
                            padding:
                              "6px 10px",
                            borderRadius: 6,
                            textDecoration:
                              "none",
                            fontSize: 14,
                          }}
                        >
                          Editar
                        </Link>

                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() =>
                            cambiarEstado(p)
                          }
                          style={{
                            background:
                              pausada
                                ? "#16a34a"
                                : "#f59e0b",
                            color: "white",
                            border: "none",
                            padding:
                              "6px 10px",
                            borderRadius: 6,
                            cursor: ocupado
                              ? "not-allowed"
                              : "pointer",
                            opacity: ocupado
                              ? 0.6
                              : 1,
                          }}
                        >
                          {ocupado
                            ? "Procesando..."
                            : pausada
                            ? "Publicar"
                            : "Pausar"}
                        </button>

                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() =>
                            eliminarPublicacion(
                              p.id
                            )
                          }
                          style={{
                            background:
                              "#dc2626",
                            color: "white",
                            border: "none",
                            padding:
                              "6px 10px",
                            borderRadius: 6,
                            cursor: ocupado
                              ? "not-allowed"
                              : "pointer",
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}