"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import PanelMensajes from "@/components/mensajes/PanelMensajes";

type Conversacion = {
  operacion_id: string;
  codigo: string;
  ultimo_mensaje: string;
  ultimo_mensaje_at: string;
  no_leidos: number;
};

export default function MensajesPage() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [operacionSeleccionada, setOperacionSeleccionada] =
    useState<Conversacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarConversaciones();
  }, []);

  async function cargarConversaciones() {
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

    const { data: mensajes, error: errorMensajes } = await supabase
      .from("mensajes_comerciales")
      .select(
        "operacion_id, mensaje, creado_at, destinatario_profile_id, remitente_profile_id, estado, leido_at"
      )
      .or(
        `remitente_profile_id.eq.${user.id},destinatario_profile_id.eq.${user.id}`
      )
      .order("creado_at", { ascending: false });

    if (errorMensajes) {
      setError(errorMensajes.message);
      setCargando(false);
      return;
    }

    const ids = [
      ...new Set((mensajes || []).map((m) => m.operacion_id)),
    ];

    if (ids.length === 0) {
      setConversaciones([]);
      setCargando(false);
      return;
    }

    const { data: operaciones, error: errorOperaciones } =
      await supabase
        .from("operaciones")
        .select("id, codigo")
        .in("id", ids);

    if (errorOperaciones) {
      setError(errorOperaciones.message);
      setCargando(false);
      return;
    }

    const mapaOperaciones = new Map(
      (operaciones || []).map((o) => [o.id, o.codigo])
    );

    const agrupadas = new Map<string, Conversacion>();

    for (const mensaje of mensajes || []) {
      if (!agrupadas.has(mensaje.operacion_id)) {
        agrupadas.set(mensaje.operacion_id, {
          operacion_id: mensaje.operacion_id,
          codigo:
            mapaOperaciones.get(mensaje.operacion_id) ||
            mensaje.operacion_id,
          ultimo_mensaje: mensaje.mensaje,
          ultimo_mensaje_at: mensaje.creado_at,
          no_leidos:
            mensaje.destinatario_profile_id === user.id &&
            !mensaje.leido_at &&
            mensaje.estado !== "LEIDO"
              ? 1
              : 0,
        });
      } else if (
        mensaje.destinatario_profile_id === user.id &&
        !mensaje.leido_at &&
        mensaje.estado !== "LEIDO"
      ) {
        const actual = agrupadas.get(mensaje.operacion_id)!;
        actual.no_leidos += 1;
      }
    }

    setConversaciones([...agrupadas.values()]);
    setCargando(false);
  }

  function formatearFecha(fecha: string) {
    return new Date(fecha).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main
      style={{
        padding: 30,
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 25 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 800,
          }}
        >
          💬 Mensajes comerciales
        </h1>

        <p
          style={{
            marginTop: 8,
            color: "#64748b",
          }}
        >
          Conversaciones vinculadas a operaciones de AgroBrokerIA.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: 14,
            marginBottom: 20,
            borderRadius: 10,
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {cargando ? (
        <div>Cargando conversaciones...</div>
      ) : conversaciones.length === 0 ? (
        <div
          style={{
            padding: 40,
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            background: "#fff",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          Todavía no tenés conversaciones comerciales.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            {conversaciones.map((conversacion) => {
              const activa =
                operacionSeleccionada?.operacion_id ===
                conversacion.operacion_id;

              return (
                <button
                  key={conversacion.operacion_id}
                  type="button"
                  onClick={() =>
                    setOperacionSeleccionada(conversacion)
                  }
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: 0,
                    borderBottom: "1px solid #e5e7eb",
                    padding: 16,
                    background: activa ? "#f0fdf4" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <strong>{conversacion.codigo}</strong>

                    {conversacion.no_leidos > 0 && (
                      <span
                        style={{
                          minWidth: 22,
                          height: 22,
                          padding: "0 6px",
                          borderRadius: 999,
                          background: "#dc2626",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {conversacion.no_leidos}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      fontSize: 13,
                      color: "#64748b",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {conversacion.ultimo_mensaje}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "#94a3b8",
                    }}
                  >
                    {formatearFecha(
                      conversacion.ultimo_mensaje_at
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            {operacionSeleccionada ? (
              <PanelMensajes
                operacionId={operacionSeleccionada.operacion_id}
                codigoOperacion={operacionSeleccionada.codigo}
              />
            ) : (
              <div
                style={{
                  minHeight: 350,
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                }}
              >
                Seleccioná una conversación.
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
