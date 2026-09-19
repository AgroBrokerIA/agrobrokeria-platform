"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Notificacion = {
  id: string;
  profile_id: string | null;
  cuenta_id: string | null;
  titulo: string | null;
  mensaje: string | null;
  tipo: string | null;
  leida: boolean | null;
  creada_en: string | null;
  actualizado_at: string | null;
  operacion_id: string | null;
  oferta_id: string | null;
};

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let canal: ReturnType<typeof supabase.channel> | null = null;

    async function iniciar() {
      setCargando(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Necesitás iniciar sesión.");
        setCargando(false);
        return;
      }

      const { data, error: errorDatos } = await supabase
        .from("notificaciones")
        .select("*")
        .or(
          `profile_id.eq.${user.id},cuenta_id.eq.${user.id}`
        )
        .order("creada_en", { ascending: false });

      if (errorDatos) {
        setError(errorDatos.message);
        setCargando(false);
        return;
      }

      setNotificaciones((data || []) as Notificacion[]);
      setCargando(false);

      canal = supabase
        .channel(`notificaciones-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notificaciones",
          },
          (payload) => {
            const nueva = payload.new as Notificacion;

            if (
              nueva.profile_id === user.id ||
              nueva.cuenta_id === user.id
            ) {
              setNotificaciones((actuales) => [
                nueva,
                ...actuales.filter(
                  (item) => item.id !== nueva.id
                ),
              ]);
            }
          }
        )
        .subscribe();
    }

    iniciar();

    return () => {
      if (canal) {
        supabase.removeChannel(canal);
      }
    };
  }, []);

  async function marcarLeida(id: string) {
    const ahora = new Date().toISOString();

    const { error: errorUpdate } = await supabase
      .from("notificaciones")
      .update({
        leida: true,
        actualizado_at: ahora,
      })
      .eq("id", id);

    if (errorUpdate) {
      setError(errorUpdate.message);
      return;
    }

    setNotificaciones((actuales) =>
      actuales.map((item) =>
        item.id === id
          ? {
              ...item,
              leida: true,
              actualizado_at: ahora,
            }
          : item
      )
    );
  }

  async function marcarTodasLeidas() {
    const pendientes = notificaciones.filter(
      (item) => !item.leida
    );

    if (!pendientes.length) return;

    const ahora = new Date().toISOString();

    const ids = pendientes.map((item) => item.id);

    const { error: errorUpdate } = await supabase
      .from("notificaciones")
      .update({
        leida: true,
        actualizado_at: ahora,
      })
      .in("id", ids);

    if (errorUpdate) {
      setError(errorUpdate.message);
      return;
    }

    setNotificaciones((actuales) =>
      actuales.map((item) =>
        ids.includes(item.id)
          ? {
              ...item,
              leida: true,
              actualizado_at: ahora,
            }
          : item
      )
    );
  }

  function formatearFecha(fecha: string | null) {
    if (!fecha) return "";

    return new Date(fecha).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const pendientes = notificaciones.filter(
    (item) => !item.leida
  ).length;

  return (
    <main
      style={{
        padding: 30,
        maxWidth: 1000,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          marginBottom: 25,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            🔔 Notificaciones
          </h1>

          <p
            style={{
              marginTop: 8,
              color: "#64748b",
            }}
          >
            Avisos y eventos importantes de AgroBrokerIA.
          </p>
        </div>

        {pendientes > 0 && (
          <button
            type="button"
            onClick={marcarTodasLeidas}
            style={{
              border: 0,
              borderRadius: 9,
              padding: "10px 15px",
              background: "#166534",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✓ Marcar todas como leídas
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            borderRadius: 10,
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {cargando ? (
        <div>Cargando notificaciones...</div>
      ) : notificaciones.length === 0 ? (
        <div
          style={{
            padding: 45,
            textAlign: "center",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            background: "#fff",
            color: "#64748b",
          }}
        >
          No tenés notificaciones todavía.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {notificaciones.map((notificacion) => (
            <div
              key={notificacion.id}
              style={{
                padding: 18,
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: notificacion.leida
                  ? "#ffffff"
                  : "#f0fdf4",
                boxShadow: notificacion.leida
                  ? "none"
                  : "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 15,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    {notificacion.titulo || "Notificación"}
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      color: "#475569",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {notificacion.mensaje || ""}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: "#94a3b8",
                    }}
                  >
                    {notificacion.tipo || "GENERAL"}
                    {" · "}
                    {formatearFecha(notificacion.creada_en)}
                  </div>
                </div>

                {!notificacion.leida && (
                  <button
                    type="button"
                    onClick={() =>
                      marcarLeida(notificacion.id)
                    }
                    style={{
                      alignSelf: "flex-start",
                      border: "1px solid #bbf7d0",
                      borderRadius: 8,
                      padding: "7px 10px",
                      background: "#fff",
                      color: "#166534",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Marcar leída
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
