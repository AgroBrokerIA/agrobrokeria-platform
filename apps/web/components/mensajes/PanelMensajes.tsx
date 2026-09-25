"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Mensaje = {
  id: string;
  operacion_id: string;
  remitente_profile_id: string | null;
  remitente_empresa_id: string | null;
  destinatario_profile_id: string | null;
  destinatario_empresa_id: string | null;
  mensaje: string;
  idioma_origen: string | null;
  tipo_mensaje: string;
  estado: string;
  leido_at: string | null;
  creado_at: string;
};

type Participante = {
  empresa_id: string;
  rol: string;
};

type CompanyUser = {
  profile_id: string;
  company_id: string;
};

type Props = {
  operacionId: string;
  codigoOperacion?: string;
};

export default function PanelMensajes({
  operacionId,
  codigoOperacion,
}: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [destinatarios, setDestinatarios] = useState<
    { profileId: string; empresaId: string; rol: string }[]
  >([]);
  const [destinatarioSeleccionado, setDestinatarioSeleccionado] =
    useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [traducciones, setTraducciones] = useState<Record<string, string>>({});
  const [traduciendo, setTraduciendo] = useState<string | null>(null);
  const [idiomaUsuario, setIdiomaUsuario] = useState("es");
  const traduccionesAutomaticasRef = useRef<Set<string>>(new Set());

  const mensajesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let canal: ReturnType<typeof supabase.channel> | null = null;

    async function iniciar() {
      setCargando(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Necesitás iniciar sesión para utilizar los mensajes.");
        setCargando(false);
        return;
      }

      setUsuarioId(user.id);

      const { data: perfil, error: errorPerfil } = await supabase
        .from("profiles")
        .select("active_company_id, idioma")
        .eq("id", user.id)
        .maybeSingle();

      if (errorPerfil) {
        setError(errorPerfil.message);
        setCargando(false);
        return;
      }

      const miEmpresaId = perfil?.active_company_id || null;
      const idiomaPreferido = perfil?.idioma || localStorage.getItem("agrobrokeria.language") || "es";
      setIdiomaUsuario(idiomaPreferido);
      setEmpresaId(miEmpresaId);

      const { data: participantes, error: errorParticipantes } =
        await supabase
          .from("operacion_participantes")
          .select("empresa_id, rol")
          .eq("operacion_id", operacionId);

      if (errorParticipantes) {
        setError(
          `No se pudieron cargar los participantes: ${errorParticipantes.message}`
        );
        setCargando(false);
        return;
      }

      const empresasParticipantes = (participantes || []) as Participante[];

      const empresasDestino = empresasParticipantes.filter(
        (participante) =>
          participante.empresa_id &&
          participante.empresa_id !== miEmpresaId
      );

      const idsEmpresa = [
        ...new Set(empresasDestino.map((p) => p.empresa_id)),
      ];

      let usuariosEmpresa: CompanyUser[] = [];

      if (idsEmpresa.length > 0) {
        const { data: usuarios, error: errorUsuarios } = await supabase
          .from("company_users")
          .select("profile_id, company_id")
          .in("company_id", idsEmpresa);

        if (errorUsuarios) {
          setError(
            `No se pudieron cargar los usuarios participantes: ${errorUsuarios.message}`
          );
          setCargando(false);
          return;
        }

        usuariosEmpresa = (usuarios || []) as CompanyUser[];
      }

      const destinos = empresasDestino.flatMap((participante) => {
        return usuariosEmpresa
          .filter(
            (usuario) =>
              usuario.company_id === participante.empresa_id &&
              usuario.profile_id !== user.id
          )
          .map((usuario) => ({
            profileId: usuario.profile_id,
            empresaId: participante.empresa_id,
            rol: participante.rol,
          }));
      });

      setDestinatarios(destinos);

      if (destinos.length > 0) {
        setDestinatarioSeleccionado(destinos[0].profileId);
      }

      const mensajesIniciales = await cargarMensajes(user.id);
      void traducirEntrantesAutomaticamente(user.id, idiomaPreferido, mensajesIniciales);

      canal = supabase
        .channel(`mensajes-operacion-${operacionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mensajes_comerciales",
            filter: `operacion_id=eq.${operacionId}`,
          },
          (payload) => {
            const nuevo = payload.new as Mensaje;

            setMensajes((actuales) => {
              if (actuales.some((m) => m.id === nuevo.id)) {
                return actuales;
              }

              return [...actuales, nuevo];
            });
            if (nuevo.destinatario_profile_id === user.id) {
              void traducirMensajeAutomaticamente(nuevo, idiomaPreferido, user.id);
            }
          }
        )
        .subscribe();

      setCargando(false);
    }

    iniciar();

    return () => {
      if (canal) {
        supabase.removeChannel(canal);
      }
    };
  }, [operacionId]);

  async function cargarMensajes(userId: string): Promise<Mensaje[]> {
    const { data, error: errorMensajes } = await supabase
      .from("mensajes_comerciales")
      .select("*")
      .eq("operacion_id", operacionId)
      .or(
        `remitente_profile_id.eq.${userId},destinatario_profile_id.eq.${userId}`
      )
      .order("creado_at", { ascending: true });

    if (errorMensajes) {
      console.error(errorMensajes);
      setError(errorMensajes.message);
      return [];
    }

    const cargados = (data || []) as Mensaje[];
    setMensajes(cargados);

    setTimeout(() => {
      mensajesRef.current?.scrollTo({
        top: mensajesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
    return cargados;
  }

  async function enviarMensaje() {
    const contenido = texto.trim();

    if (
      !contenido ||
      !usuarioId ||
      !empresaId ||
      !destinatarioSeleccionado ||
      enviando
    ) {
      return;
    }

    const destino = destinatarios.find(
      (item) => item.profileId === destinatarioSeleccionado
    );

    if (!destino) {
      setError("Seleccioná un participante destinatario.");
      return;
    }

    setEnviando(true);
    setError("");

    const { data: messageId, error: errorEnvio } = await supabase.rpc("enviar_mensaje_comercial_seguro", {
      p_operacion_id: operacionId,
      p_destinatario_profile_id: destino.profileId,
      p_destinatario_empresa_id: destino.empresaId,
      p_mensaje: contenido,
      p_idioma_origen: document.documentElement.lang || "es",
    });

    if (errorEnvio) {
      console.error(errorEnvio);
      setError(`No se pudo enviar el mensaje: ${errorEnvio.message}`);
      setEnviando(false);
      return;
    }

    if (messageId) {
      const { data } = await supabase.from("mensajes_comerciales").select("*").eq("id", messageId).single();
      if (data) setMensajes((actuales) => actuales.some((m) => m.id === data.id) ? actuales : [...actuales, data]);
    }

    setTexto("");
    setEnviando(false);

    setTimeout(() => {
      mensajesRef.current?.scrollTo({
        top: mensajesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
    return cargados;
  }

  async function traducirMensajeAutomaticamente(mensaje: Mensaje, target: string, currentUserId: string) {
    if (
      mensaje.remitente_profile_id === currentUserId ||
      !target ||
      mensaje.idioma_origen === target ||
      traduccionesAutomaticasRef.current.has(mensaje.id)
    ) {
      return;
    }

    traduccionesAutomaticasRef.current.add(mensaje.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!session?.access_token || !base) return;

      const response = await fetch(base + "/functions/v1/translate-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({ mensaje_id: mensaje.id, idioma_destino: target }),
      });
      const result = await response.json();
      if (result?.texto_traducido) {
        setTraducciones((actuales) => ({
          ...actuales,
          [mensaje.id]: result.texto_traducido,
        }));
      }
    } catch {
      // La traducción automática no debe impedir la conversación original.
    }
  }

  async function traducirEntrantesAutomaticamente(userId: string, target: string, lista: Mensaje[]) {
    const entrantes = lista.filter(
      (mensaje) =>
        mensaje.destinatario_profile_id === userId &&
        mensaje.remitente_profile_id !== userId
    );
    for (const mensaje of entrantes) {
      await traducirMensajeAutomaticamente(mensaje, target, userId);
    }
  }

  async function marcarComoLeidos() {
    if (!usuarioId) return;

    const pendientes = mensajes.filter(
      (m) =>
        m.destinatario_profile_id === usuarioId &&
        !m.leido_at
    );

    if (!pendientes.length) return;

    const ids = pendientes.map((m) => m.id);
    const ahora = new Date().toISOString();
    const { error: errorLectura } = await supabase.rpc("marcar_mensajes_comerciales_leidos", { p_ids: ids });
    if (errorLectura) {
      console.error(errorLectura);
      return;
    }

    setMensajes((actuales) =>
      actuales.map((m) =>
        ids.includes(m.id)
          ? {
              ...m,
              estado: "LEIDO",
              leido_at: ahora,
            }
          : m
      )
    );
  }

  useEffect(() => {
    if (!cargando) {
      marcarComoLeidos();
    }
  }, [cargando, mensajes.length, usuarioId]);

  async function traducirMensaje(mensaje: Mensaje) {
    if (traducciones[mensaje.id] || traduciendo === mensaje.id) return;
    const target = idiomaUsuario || localStorage.getItem("agrobrokeria.language") || document.documentElement.lang || "es";
    setTraduciendo(mensaje.id);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("AUTH_REQUIRED");
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!base) throw new Error("SUPABASE_URL_MISSING");
      const response = await fetch(base + "/functions/v1/translate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ mensaje_id: mensaje.id, idioma_destino: target }),
      });
      const result = await response.json();
      if (!response.ok && result?.estado !== "NO_DISPONIBLE") {
        throw new Error(result?.error || result?.error_codigo || "No se pudo traducir el mensaje.");
      }
      if (result?.texto_traducido) {
        setTraducciones((actuales) => ({ ...actuales, [mensaje.id]: result.texto_traducido }));
      } else if (result?.pending_external) {
        setError("La traducción automática está pendiente de configurar el proveedor externo.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo traducir el mensaje.");
    } finally {
      setTraduciendo(null);
    }
  }

  function formatearFecha(fecha: string) {
    return new Date(fecha).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function nombreRol(rol: string) {
    if (rol === "VENDEDOR") return "Vendedor";
    if (rol === "COMPRADOR") return "Comprador";
    if (rol === "INTERMEDIARIO") return "Intermediario";
    return rol;
  }

  return (
    <div
      style={{
        marginTop: 20,
        border: "1px solid #d9dee7",
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #e5e7eb",
          background: "#f8fafc",
        }}
      >
        <strong>💬 Mensajes comerciales</strong>

        {codigoOperacion && (
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "#64748b",
            }}
          >
            Operación {codigoOperacion}
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            margin: 12,
            padding: 10,
            borderRadius: 8,
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {destinatarios.length > 0 && (
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 700,
              color: "#475569",
            }}
          >
            Destinatario
          </label>

          <select
            value={destinatarioSeleccionado}
            onChange={(e) =>
              setDestinatarioSeleccionado(e.target.value)
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            {destinatarios.map((destino) => (
              <option
                key={`${destino.profileId}-${destino.rol}`}
                value={destino.profileId}
              >
                {nombreRol(destino.rol)} — {destino.profileId.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        ref={mensajesRef}
        style={{
          height: 320,
          overflowY: "auto",
          padding: 16,
          background: "#f8fafc",
        }}
      >
        {cargando ? (
          <div style={{ color: "#64748b" }}>
            Cargando conversación...
          </div>
        ) : mensajes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "#64748b",
            }}
          >
            {destinatarios.length === 0 ? (
              <>
                No hay otros usuarios asociados a las empresas
                participantes de esta operación.
              </>
            ) : (
              <>
                Todavía no hay mensajes en esta operación.
                <br />
                Iniciá la conversación.
              </>
            )}
          </div>
        ) : (
          mensajes.map((m) => {
            const propio = m.remitente_profile_id === usuarioId;

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: propio
                    ? "flex-end"
                    : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "10px 13px",
                    borderRadius: 12,
                    background: propio ? "#dcfce7" : "#ffffff",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {traducciones[m.id] || m.mensaje}
                  </div>

                  {traducciones[m.id] ? (
                    <button
                      type="button"
                      onClick={() => setTraducciones((actuales) => { const next = { ...actuales }; delete next[m.id]; return next; })}
                      style={{ marginTop: 6, border: 0, background: "transparent", padding: 0, fontSize: 11, color: "#475569", cursor: "pointer" }}
                    >
                      Ver original
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void traducirMensaje(m)}
                      disabled={traduciendo === m.id}
                      style={{ marginTop: 6, border: 0, background: "transparent", padding: 0, fontSize: 11, color: "#166534", cursor: "pointer" }}
                    >
                      {traduciendo === m.id ? "Traduciendo…" : "Traducir"}
                    </button>
                  )}

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 10,
                      color: "#64748b",
                      textAlign: "right",
                    }}
                  >
                    {formatearFecha(m.creado_at)}
                    {propio && (
                      <>
                        {" "}
                        · {m.leido_at ? "✓✓" : "✓"}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 12,
          borderTop: "1px solid #e5e7eb",
          background: "#fff",
        }}
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviarMensaje();
            }
          }}
          placeholder="Escribí un mensaje comercial..."
          rows={2}
          disabled={destinatarios.length === 0}
          style={{
            flex: 1,
            resize: "none",
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            padding: 10,
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={enviarMensaje}
          disabled={
            !texto.trim() ||
            !destinatarioSeleccionado ||
            enviando ||
            destinatarios.length === 0
          }
          style={{
            alignSelf: "stretch",
            minWidth: 90,
            border: "none",
            borderRadius: 10,
            background:
              !texto.trim() ||
              !destinatarioSeleccionado ||
              enviando ||
              destinatarios.length === 0
                ? "#cbd5e1"
                : "#166534",
            color: "#fff",
            fontWeight: 600,
            cursor:
              !texto.trim() ||
              !destinatarioSeleccionado ||
              enviando ||
              destinatarios.length === 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          {enviando ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
