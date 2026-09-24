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
        <p>Cargando oportunidades IA...</p>
      </main>
    );
  }

  return (
    <main className="module-page">
      <div>
        <h1 className="text-2xl font-bold">
          Oportunidades IA
        </h1>

        <p className="text-gray-600 mt-1">
          AgroBroker IA detecta automáticamente
          publicaciones compatibles con tu empresa.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {!error &&
        oportunidades.length === 0 && (
          <div className="rounded-xl border bg-white p-8 text-center">
            <div className="text-4xl mb-3">
              🤖
            </div>

            <h2 className="text-lg font-semibold">
              Todavía no hay oportunidades
            </h2>

            <p className="text-gray-600 mt-1">
              La IA mostrará acá las publicaciones
              compatibles cuando encuentre coincidencias.
            </p>
          </div>
        )}

      <div className="grid gap-4">
        {oportunidades.map(
          (oportunidad) => {
            const publicacion =
              oportunidad.publicacion;

            return (
              <article
                key={oportunidad.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                        🤖 IA
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                        {oportunidad.estado}
                      </span>
                    </div>

                    <h2 className="text-lg font-semibold">
                      {publicacion
                        ? `${publicacion.tipo} · ${publicacion.cantidad_tn} TN`
                        : "Publicación"}
                    </h2>

                    {publicacion && (
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          Precio:{" "}
                          <strong>
                            {publicacion.precio_tn}
                          </strong>{" "}
                          · Moneda ID{" "}
                          {publicacion.moneda_id}
                        </p>

                        {(
                          publicacion.provincia ||
                          publicacion.localidad ||
                          publicacion.puerto
                        ) && (
                          <p>
                            Ubicación:{" "}
                            {
                              [
                                publicacion.localidad,
                                publicacion.provincia,
                                publicacion.puerto,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                            }
                          </p>
                        )}

                        <p>
                          Detectada:{" "}
                          {formatoFecha(
                            oportunidad.creada_en
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-3">
                    <div
                      className={`text-3xl font-bold ${colorPuntaje(
                        Number(
                          oportunidad.indice_compatibilidad
                        )
                      )}`}
                    >
                      {Number(
                        oportunidad.indice_compatibilidad
                      )}
                      %
                    </div>

                    <span className="text-sm text-gray-500">
                      Índice de compatibilidad
                    </span>

                    <Link
                      href={`/marketplace?publicacion=${oportunidad.publicacion_id}`}
                      className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Ver publicación
                    </Link>
                  </div>
                </div>
              </article>
            );
          }
        )}
      </div>
    </main>
  );
}
