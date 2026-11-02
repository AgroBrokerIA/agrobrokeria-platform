"use client";
import { containsContactData, redactContactData } from "@/lib/mensajes/privacy";
import {useCallback,useEffect,useRef,useState} from "react";
import {supabase} from "@/lib/supabase/client";

type Msg={id:string;conversacion_id:string;remitente_profile_id:string;mensaje:string;creado_at:string;leido_at:string|null};
export default function PanelMensajesPublicacion({conversacionId,productoTitulo}:{conversacionId:string;productoTitulo:string}){
 const [mensajes,setMensajes]=useState<Msg[]>([]);
 const [texto,setTexto]=useState("");
 const [uid,setUid]=useState("");
 const [cargando,setCargando]=useState(true);
 const [enviando,setEnviando]=useState(false);
 const [error,setError]=useState("");
 const listRef=useRef<HTMLDivElement>(null);
 const cargar=useCallback(async()=>{
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Necesitás iniciar sesión.");setCargando(false);return}
  setUid(user.id);
  const {data,error}=await supabase.from("mensajes_publicaciones").select("id,conversacion_id,remitente_profile_id,mensaje,creado_at,leido_at").eq("conversacion_id",conversacionId).order("creado_at",{ascending:true});
  if(error){setError("No se pudieron cargar los mensajes: "+error.message);setCargando(false);return}
  setMensajes((data||[]) as Msg[]);
  const {error:readError}=await supabase.rpc("marcar_mensajes_publicacion_leidos",{p_conversacion_id:conversacionId});
  if(readError)console.error("No se pudo marcar como leído",readError);
  setCargando(false);
 },[conversacionId]);
 useEffect(()=>{
  setCargando(true);setError("");void cargar();
  const channel=supabase.channel("publicacion-chat-"+conversacionId)
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"mensajes_publicaciones",filter:"conversacion_id=eq."+conversacionId},payload=>{
    const row=payload.new as Msg;
    setMensajes(prev=>prev.some(m=>m.id===row.id)?prev:[...prev,row]);
    if(row.remitente_profile_id!==uid)void supabase.rpc("marcar_mensajes_publicacion_leidos",{p_conversacion_id:conversacionId});
   }).subscribe();
  return()=>{void supabase.removeChannel(channel)};
 },[cargar,conversacionId,uid]);
 useEffect(()=>{if(listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight},[mensajes.length]);
 async function enviar(){
  if(!texto.trim()||enviando)return;
  if(containsContactData(texto)){setError("Por seguridad, no se pueden compartir teléfonos, correos, enlaces ni direcciones antes del contrato definitivo.");return;}
  setEnviando(true);setError("");
  const {error}=await supabase.rpc("enviar_mensaje_publicacion",{p_conversacion_id:conversacionId,p_mensaje:texto.trim()});
  if(error)setError("No se pudo enviar el mensaje: "+error.message);
  else setTexto("");
  await cargar();setEnviando(false);
 }
 const time=(s:string)=>new Date(s).toLocaleString("es-AR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
 return <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:420,background:"#fff"}}>
  <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7eb",fontWeight:700,color:"#14532d"}}>Publicación: {productoTitulo}</div>
  {error&&<div role="alert" style={{padding:8,color:"#b91c1c",fontSize:12}}>{error}</div>}
  <div ref={listRef} style={{flex:1,overflowY:"auto",padding:16,background:"#f8fafc"}}>
   {cargando?<p>Cargando mensajes…</p>:mensajes.length===0?<p style={{textAlign:"center",color:"#64748b",padding:30}}>Todavía no hay mensajes en esta conversación.</p>:mensajes.map(m=><div key={m.id} style={{display:"flex",justifyContent:m.remitente_profile_id===uid?"flex-end":"flex-start",marginBottom:10}}><div style={{maxWidth:"80%",padding:"10px 13px",borderRadius:12,background:m.remitente_profile_id===uid?"#dcfce7":"#fff",border:"1px solid #e2e8f0"}}><div style={{whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{redactContactData(m.mensaje)}</div><small style={{display:"block",textAlign:"right",color:"#64748b",marginTop:5}}>{time(m.creado_at)} {m.remitente_profile_id===uid?(m.leido_at?"· ✓✓":"· ✓"):""}</small></div></div>)}
  </div>
  <div style={{display:"flex",gap:8,padding:12,borderTop:"1px solid #e5e7eb"}}>
   <textarea value={texto} onChange={e=>setTexto(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void enviar()}}} placeholder="Escribí un mensaje…" rows={2} style={{flex:1,resize:"none",border:"1px solid #cbd5e1",borderRadius:9,padding:10}}/>
   <button type="button" onClick={()=>void enviar()} disabled={!texto.trim()||enviando} style={{border:0,borderRadius:9,padding:"0 18px",background:!texto.trim()||enviando?"#cbd5e1":"#07864b",color:"#fff",fontWeight:700}}>{enviando?"Enviando…":"Enviar"}</button>
  </div>
 </div>
}
