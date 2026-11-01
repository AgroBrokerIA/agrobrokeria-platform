"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function PublicacionChat() {
  const { id } = useParams<{id:string}>();
  const [conversation, setConversation] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [user, setUser] = useState("");
  const [title, setTitle] = useState("Conversación comercial");
  const [contactName,setContactName]=useState("Contacto comercial");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  async function refresh(cid:string) {
    const {data,error} = await supabase.from("mensajes_publicaciones").select("id,remitente_profile_id,mensaje,creado_at").eq("conversacion_id",cid).order("creado_at");
    if(error) throw error;
    setMessages(data || []);
  }
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const {data:{user:u}} = await supabase.auth.getUser();
        if(!u) throw new Error("Iniciá sesión para contactar al publicador.");
        if(!live) return;
        setUser(u.id);
        const {data:p,error:pe} = await supabase.from("publicaciones").select("tipo,producto_id,cantidad_tn,provincia,localidad,estado,empresas(razon_social,cuentas(email))").eq("id",id).single();
        if(pe) throw pe;
        if(p.estado !== "PUBLICADA") throw new Error("La publicación ya no está disponible.");
        setTitle((p.tipo === "COMPRA" ? "Demanda" : "Oferta") + " · " + p.cantidad_tn + " TN · " + (p.localidad || p.provincia || "AgroBrokerIA"));
        const {data:cid,error:ce} = await supabase.rpc("iniciar_conversacion_publicacion",{p_publicacion_id:id});
        if(ce) throw ce;
        if(!live) return;
        setConversation(cid);
        const {data:conv,error:convError}=await supabase.from("conversaciones_publicaciones").select("publicador_profile_id,interesado_profile_id").eq("id",cid).single();
        if(convError) throw convError;
        const otherId=conv.publicador_profile_id===u.id?conv.interesado_profile_id:conv.publicador_profile_id;
        const {data:other}=await supabase.from("profiles").select("nombre,empresa").eq("id",otherId).maybeSingle();
        setContactName(other?.nombre||other?.empresa||"Contacto comercial");
        await refresh(cid);
      } catch(e:any) { if(live) setError(e?.message || "No se pudo abrir la conversación."); }
      finally { if(live) setBusy(false); }
    })();
    return () => { live=false; };
  },[id]);

  async function send(e:any) {
    e.preventDefault();
    if(!draft.trim() || !conversation) return;
    setBusy(true); setError("");
    const {error:e1} = await supabase.rpc("enviar_mensaje_publicacion",{p_conversacion_id:conversation,p_mensaje:draft.trim()});
    if(e1) setError("No se pudo enviar el mensaje. Intentá nuevamente.");
    else { setDraft(""); try { await refresh(conversation); } catch { setError("El mensaje se envió, pero no se pudo actualizar la conversación."); } }
    setBusy(false);
  }
  return <main style={{maxWidth:900,margin:"30px auto",padding:20}}>
    <Link href="/marketplace">← Volver a publicaciones</Link>
    <section style={{marginTop:16,border:"1px solid #dbe4e8",borderRadius:14,background:"#fff",overflow:"hidden"}}>
      <header style={{padding:20,borderBottom:"1px solid #e5e7eb"}}><h1 style={{margin:0,fontSize:23}}>{contactName}</h1><p>{title}</p></header>
      <div style={{padding:20,minHeight:300,maxHeight:500,overflowY:"auto"}}>
        {messages.map(m=><div key={m.id} style={{textAlign:m.remitente_profile_id===user?"right":"left",margin:"12px 0"}}><span style={{display:"inline-block",padding:12,borderRadius:12,background:m.remitente_profile_id===user?"#dcfce7":"#f1f5f9",maxWidth:"80%",textAlign:"left"}}>{m.mensaje}<small style={{display:"block",color:"#64748b",marginTop:6}}>{new Date(m.creado_at).toLocaleString("es-AR")}</small></span></div>)}
        {!messages.length && !busy && <p>Iniciá la conversación con un mensaje.</p>}
        {busy && <p>Cargando conversación…</p>}
      </div>
      {error && <p role="status" style={{padding:"0 20px",color:"#b45309"}}>{error}</p>}
      <form onSubmit={send} style={{display:"flex",gap:10,padding:16,borderTop:"1px solid #e5e7eb"}}>
        <input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Escribí tu mensaje…" maxLength={10000} style={{flex:1,minWidth:0,padding:12,border:"1px solid #cbd5e1",borderRadius:8}} />
        <button disabled={busy || !draft.trim() || !conversation} style={{padding:"0 20px",border:0,borderRadius:8,background:"#078b5a",color:"#fff"}}>Enviar</button>
      </form>
    </section>
  </main>;
}
