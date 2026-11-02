"use client";
import { containsContactData, redactContactData } from "@/lib/mensajes/privacy";
import {useCallback,useEffect,useRef,useState} from "react";
import {supabase} from "@/lib/supabase/client";

type Propuesta={id:string;propuesta_anterior_id:string|null;emisor_profile_id:string;emisor_nombre:string;precio_tn:number;cantidad_tn:number;moneda_id:number|null;observaciones:string|null;estado:string;operacion_id:string|null;creada_at:string};
type Moneda={id:number;codigo:string};
type Msg={id:string;conversacion_id:string;remitente_profile_id:string;mensaje:string;creado_at:string;leido_at:string|null};
export default function PanelMensajesPublicacion({conversacionId,productoTitulo}:{conversacionId:string;productoTitulo:string}){
 const [mensajes,setMensajes]=useState<Msg[]>([]);
 const [texto,setTexto]=useState("");
 const [uid,setUid]=useState("");
 const [cargando,setCargando]=useState(true);
 const [enviando,setEnviando]=useState(false);
 const [error,setError]=useState("");
 const [propuestas,setPropuestas]=useState<Propuesta[]>([]);
 const [monedas,setMonedas]=useState<Moneda[]>([]);
 const [monedaId,setMonedaId]=useState("");
 const [precio,setPrecio]=useState("");
 const [cantidad,setCantidad]=useState("");
 const [observaciones,setObservaciones]=useState("");
 const [mostrarOferta,setMostrarOferta]=useState(false);
 const [contraoferta,setContraoferta]=useState(false);
 const [accionando,setAccionando]=useState(false);
 const listRef=useRef<HTMLDivElement>(null);
 const cargarPropuestas=useCallback(async()=>{
  const {data,error}=await supabase.rpc("listar_propuestas_publicacion",{p_conversacion_id:conversacionId});
  if(error){setError("No se pudieron cargar las ofertas: "+error.message);return;}
  setPropuestas((data||[]) as Propuesta[]);
 },[conversacionId,cargarPropuestas]);
 const cargar=useCallback(async()=>{
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Necesitás iniciar sesión.");setCargando(false);return}
  setUid(user.id);
  const [{data:conv},{data:currencyRows}] = await Promise.all([
   supabase.from("conversaciones_publicaciones").select("publicacion_id").eq("id",conversacionId).maybeSingle(),
   supabase.from("monedas").select("id,codigo").order("codigo")
  ]);
  setMonedas((currencyRows||[]) as Moneda[]);
  if(conv?.publicacion_id){
   const {data:pub}=await supabase.from("publicaciones").select("precio_tn,cantidad_tn,moneda_id").eq("id",conv.publicacion_id).maybeSingle();
   if(pub){setCantidad(String(pub.cantidad_tn||""));setPrecio(pub.precio_tn?String(pub.precio_tn):"");setMonedaId(pub.moneda_id?String(pub.moneda_id):"");}
  }
  await cargarPropuestas();
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
 async function enviarPropuesta(){
  const p=Number(precio.replace(",","."));
  const q=Number(cantidad.replace(",","."));
  if(!Number.isFinite(p)||p<=0||!Number.isFinite(q)||q<=0){setError("Ingresá un precio y una cantidad mayores a cero.");return;}
  setAccionando(true);setError("");
  const {error}=await supabase.rpc("crear_propuesta_publicacion",{p_conversacion_id:conversacionId,p_precio_tn:p,p_cantidad_tn:q,p_moneda_id:monedaId?Number(monedaId):null,p_observaciones:observaciones.trim()||null});
  if(error)setError("No se pudo enviar la oferta: "+error.message);
  else {setMostrarOferta(false);setContraoferta(false);setObservaciones("");await cargarPropuestas();}
  setAccionando(false);
 }
 async function responder(id:string,accion:"ACEPTAR"|"RECHAZAR"){
  if(!window.confirm(accion==="ACEPTAR"?"¿Aceptás esta propuesta? Se creará la operación.":"¿Querés rechazar esta propuesta?"))return;
  setAccionando(true);setError("");
  const {data,error}=await supabase.rpc("responder_propuesta_publicacion",{p_propuesta_id:id,p_accion:accion});
  if(error)setError("No se pudo responder la oferta: "+error.message);
  else if(accion==="ACEPTAR" && data?.operacion_id){window.location.assign("/operaciones");}
  await cargarPropuestas();setAccionando(false);
 }
 const time=(s:string)=>new Date(s).toLocaleString("es-AR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
 return <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:420,background:"#fff"}}>
  <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7eb",fontWeight:700,color:"#14532d"}}>Publicación: {productoTitulo}</div>
  <section style={{padding:"12px 16px",borderBottom:"1px solid #e5e7eb",background:"#f8fafc"}}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
    <strong style={{color:"#0f172a"}}>Negociación comercial</strong>
    <button type="button" onClick={()=>{setMostrarOferta(v=>!v);setContraoferta(false);}} style={{border:0,borderRadius:8,padding:"9px 13px",background:"#07864b",color:"#fff",fontWeight:700}}>＋ Hacer una oferta</button>
   </div>
   {propuestas.length===0&&<p style={{margin:"8px 0 0",fontSize:13,color:"#64748b"}}>Todavía no hay ofertas. Podés iniciar la negociación desde acá, sin crear una operación.</p>}
   {propuestas.map(p=><div key={p.id} style={{marginTop:10,padding:12,border:"1px solid #dbe4e8",borderRadius:10,background:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><strong>{p.emisor_profile_id===uid?"Tu propuesta":p.emisor_nombre}</strong><span style={{fontSize:12,fontWeight:700,color:p.estado==="ACEPTADA"?"#15803d":p.estado==="RECHAZADA"?"#b91c1c":"#a16207"}}>{p.estado==="PENDIENTE"?"Pendiente":p.estado==="CONTRAOFERTADA"?"Reemplazada por contraoferta":p.estado==="ACEPTADA"?"Aceptada":p.estado==="RECHAZADA"?"Rechazada":p.estado}</span></div>
    <div style={{marginTop:6,fontSize:14}}><b>{p.precio_tn.toLocaleString("es-AR")} {monedas.find(m=>m.id===p.moneda_id)?.codigo||""}</b> / TN · {p.cantidad_tn.toLocaleString("es-AR")} TN</div>
    {p.observaciones&&<p style={{margin:"5px 0",fontSize:13,color:"#475569"}}>{p.observaciones}</p>}
    <small style={{color:"#64748b"}}>{time(p.creada_at)}</small>
    {p.estado==="PENDIENTE"&&p.emisor_profile_id!==uid&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
     <button type="button" disabled={accionando} onClick={()=>void responder(p.id,"ACEPTAR")} style={{border:0,borderRadius:7,padding:"8px 12px",background:"#15803d",color:"#fff",fontWeight:700}}>Aceptar</button>
     <button type="button" disabled={accionando} onClick={()=>void responder(p.id,"RECHAZAR")} style={{border:0,borderRadius:7,padding:"8px 12px",background:"#b91c1c",color:"#fff",fontWeight:700}}>Rechazar</button>
     <button type="button" disabled={accionando} onClick={()=>{setPrecio(String(p.precio_tn));setCantidad(String(p.cantidad_tn));setMonedaId(p.moneda_id?String(p.moneda_id):"");setContraoferta(true);setMostrarOferta(true);}} style={{border:"1px solid #0f766e",borderRadius:7,padding:"8px 12px",background:"#fff",color:"#0f766e",fontWeight:700}}>Contraofertar</button>
    </div>}
    {p.estado==="ACEPTADA"&&p.operacion_id&&<a href="/operaciones" style={{display:"inline-block",marginTop:9,color:"#047857",fontWeight:700}}>Ver operación creada →</a>}
   </div>)}
   {mostrarOferta&&<div style={{marginTop:12,padding:12,border:"1px solid #86b7a1",borderRadius:10,background:"#fff"}}>
    <strong>{contraoferta?"Enviar contraoferta":"Nueva oferta comercial"}</strong>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8,marginTop:10}}>
     <label style={{fontSize:12,color:"#475569"}}>Precio por TN<input type="number" min="0.01" step="0.01" value={precio} onChange={e=>setPrecio(e.target.value)} style={{display:"block",width:"100%",padding:9,border:"1px solid #cbd5e1",borderRadius:7}}/></label>
     <label style={{fontSize:12,color:"#475569"}}>Cantidad (TN)<input type="number" min="0.01" step="0.01" value={cantidad} onChange={e=>setCantidad(e.target.value)} style={{display:"block",width:"100%",padding:9,border:"1px solid #cbd5e1",borderRadius:7}}/></label>
     <label style={{fontSize:12,color:"#475569"}}>Moneda<select value={monedaId} onChange={e=>setMonedaId(e.target.value)} style={{display:"block",width:"100%",padding:9,border:"1px solid #cbd5e1",borderRadius:7}}><option value="">Seleccionar</option>{monedas.map(m=><option key={m.id} value={m.id}>{m.codigo}</option>)}</select></label>
    </div>
    <textarea value={observaciones} onChange={e=>setObservaciones(e.target.value)} placeholder="Condiciones u observaciones (opcional)" rows={2} style={{width:"100%",marginTop:8,padding:9,border:"1px solid #cbd5e1",borderRadius:7}}/>
    <div style={{display:"flex",gap:8,marginTop:8}}><button type="button" disabled={accionando} onClick={()=>void enviarPropuesta()} style={{border:0,borderRadius:7,padding:"9px 13px",background:"#07864b",color:"#fff",fontWeight:700}}>{accionando?"Enviando…":"Enviar oferta"}</button><button type="button" onClick={()=>setMostrarOferta(false)} style={{border:"1px solid #cbd5e1",borderRadius:7,padding:"9px 13px",background:"#fff"}}>Cancelar</button></div>
   </div>}
  </section>
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
