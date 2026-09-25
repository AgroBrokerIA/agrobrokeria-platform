"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Operation = { id: string; codigo: string | null; estado: string | null };
type Meeting = {
  id: string; operacion_id: string; titulo: string | null; estado: string | null;
  inicio_at: string | null; enlace: string | null; proveedor: string | null; meeting_id: string | null;
};

export default function Videollamadas() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [operationId, setOperationId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [title, setTitle] = useState("Reunión comercial AgroBrokerIA");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: meetingData, error: meetingError }, { data: operationData, error: operationError }] = await Promise.all([
      supabase.from("videollamadas_comerciales").select("id,operacion_id,titulo,estado,inicio_at,enlace,proveedor,meeting_id").order("creada_en",{ascending:false}),
      supabase.from("operaciones").select("id,codigo,estado").order("creada_en",{ascending:false}).limit(100),
    ]);
    if (meetingError) setError(meetingError.message); else setMeetings((meetingData||[]) as Meeting[]);
    if (operationError) setError(operationError.message); else setOperations((operationData||[]) as Operation[]);
  }
  useEffect(()=>{ void load(); },[]);

  async function crear() {
    if (!operationId) return setError("Seleccioná una operación.");
    if (!startAt) return setError("Indicá fecha y hora de inicio.");
    setBusy(true); setError("");
    try {
      const { data:{session} }=await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("AUTH_REQUIRED");
      const { data, error: rpcError }=await supabase.rpc("crear_videollamada_comercial",{
        p_operacion_id:operationId,p_negociacion_id:null,p_inicio:new Date(startAt).toISOString(),p_titulo:title.trim()||"Reunión comercial AgroBrokerIA"
      });
      if (rpcError) throw rpcError;
      const response=await fetch("/api/videollamadas/google",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({videollamada_id:data})});
      const result=await response.json();
      if (!response.ok) throw new Error(result.detail||result.error||"No se pudo crear Google Meet.");
      setOperationId(""); setStartAt(""); await load();
    } catch(e) { setError(e instanceof Error?e.message:"No se pudo crear la videollamada."); }
    finally { setBusy(false); }
  }

  return <main className="module-page">
    <div className="module-hero"><div><span className="eyebrow">COMUNICACIÓN</span><h1>Videollamadas comerciales</h1><p>Reuniones vinculadas a operaciones y participantes autorizados.</p></div></div>
    <section className="company-card" style={{marginBottom:20}}>
      <h2>Programar reunión</h2>
      <div className="auth-two-col">
        <label>Operación<select value={operationId} onChange={e=>setOperationId(e.target.value)}><option value="">Seleccionar operación…</option>{operations.map(o=><option key={o.id} value={o.id}>{o.codigo||o.id} · {o.estado||"SIN ESTADO"}</option>)}</select></label>
        <label>Inicio<input type="datetime-local" value={startAt} onChange={e=>setStartAt(e.target.value)} /></label>
        <label>Título<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} /></label>
      </div>
      <button className="module-pill" disabled={busy||!operationId||!startAt} onClick={crear} type="button">{busy?"Creando…":"🎥 Crear videollamada"}</button>
    </section>
    {error&&<div className="module-alert module-alert-error">{error}</div>}
    <section className="company-grid">{meetings.map(m=><article className="company-card" key={m.id}>
      <div className="company-card-head"><div><h2>{m.titulo||"Reunión comercial"}</h2><p>{m.operacion_id}</p></div><span className="company-status">{m.estado}</span></div>
      <div className="company-details"><div><span>Proveedor</span><strong>{m.proveedor||"Pendiente externo"}</strong></div><div><span>Fecha</span><strong>{m.inicio_at?new Date(m.inicio_at).toLocaleString("es-AR"):"—"}</strong></div><div><span>Meeting ID</span><strong>{m.meeting_id||"Pendiente externo"}</strong></div></div>
      {m.enlace?<a className="module-pill" href={m.enlace} target="_blank" rel="noreferrer">Unirse a videollamada →</a>:<small>Google Meet pendiente de autorización externa.</small>}
    </article>)}</section>
  </main>;
}
