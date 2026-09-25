"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Operation = { id: string; codigo: string | null; estado: string | null };

type Meeting = {
  id: string;
  operacion_id: string;
  titulo: string | null;
  estado: string | null;
  inicio_at: string | null;
  enlace: string | null;
  proveedor: string | null;
  meeting_id: string | null;
};

export default function Videollamadas() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [operationId, setOperationId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: meetingData, error: meetingError }, { data: operationData, error: operationError }] =
      await Promise.all([
        supabase
          .from("videollamadas_comerciales")
          .select("id,operacion_id,titulo,estado,inicio_at,enlace,proveedor,meeting_id")
          .order("creada_en", { ascending: false }),
        supabase
          .from("operaciones")
          .select("id,codigo,estado")
          .order("creada_en", { ascending: false })
          .limit(100),
      ]);

    if (meetingError) setError(meetingError.message);
    else setMeetings((meetingData || []) as Meeting[]);

    if (operationError) setError(operationError.message);
    else setOperations((operationData || []) as Operation[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function crear() {
    if (!operationId) {
      setError("Seleccioná una operación.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("AUTH_REQUIRED");
      }

      const { data, error: rpcError } = await supabase.rpc(
        "crear_videollamada_comercial",
        {
          p_operacion_id: operationId,
          p_negociacion_id: null,
          p_inicio: startAt ? new Date(startAt).toISOString() : null,
          p_titulo: "Reunión comercial AgroBrokerIA",
        },
      );

      if (rpcError) throw rpcError;

      const response = await fetch("/api/videollamadas/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ videollamada_id: data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || result.error || "No se pudo crear Google Meet.");
      }

      setOperationId("");
      setStartAt("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la videollamada.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="module-page">
      <div className="module-hero">
        <div>
          <span className="eyebrow">COMUNICACIÓN</span>
          <h1>Videollamadas comerciales</h1>
          <p>Cada reunión queda vinculada a una operación y a sus participantes autorizados.</p>
        </div>
      </div>

      <section className="company-card" style={{ marginBottom: 20 }}>
        <h2>Programar reunión</h2>
        <div className="auth-two-col">
          <label>
            Operación
            <select value={operationId} onChange={(event) => setOperationId(event.target.value)}>
              <option value="">Seleccionar operación…</option>
              {operations.map((operation) => (
                <option key={operation.id} value={operation.id}>
                  {operation.codigo || operation.id} · {operation.estado || "SIN ESTADO"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Inicio
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </label>
        </div>
        <button className="module-pill" disabled={busy || !operationId} onClick={crear} type="button">
          {busy ? "Creando…" : "🎥 Crear videollamada"}
        </button>
      </section>

      {error && <div className="module-alert module-alert-error">{error}</div>}

      <section className="company-grid">
        {meetings.map((meeting) => (
          <article className="company-card" key={meeting.id}>
            <div className="company-card-head">
              <div>
                <h2>{meeting.titulo || "Reunión comercial"}</h2>
                <p>{meeting.operacion_id}</p>
              </div>
              <span className="company-status">{meeting.estado}</span>
            </div>
            <div className="company-details">
              <div><span>Proveedor</span><strong>{meeting.proveedor || "Pendiente externo"}</strong></div>
              <div><span>Fecha</span><strong>{meeting.inicio_at ? new Date(meeting.inicio_at).toLocaleString("es-AR") : "—"}</strong></div>
              <div><span>Meeting ID</span><strong>{meeting.meeting_id || "Pendiente externo"}</strong></div>
            </div>
            {meeting.enlace && (
              <a className="module-pill" href={meeting.enlace} target="_blank" rel="noreferrer">
                Unirse a videollamada →
              </a>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
