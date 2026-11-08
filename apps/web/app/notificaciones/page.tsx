"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type Notificacion={id:string;profile_id:string|null;cuenta_id:string|null;titulo:string|null;mensaje:string|null;tipo:string|null;leida:boolean|null;creada_en:string|null;actualizado_at:string|null;operacion_id:string|null;oferta_id:string|null;publicacion_id?:string|null;conversacion_id?:string|null};

const typeMeta=(tipo:string|null)=>{
 const t=(tipo||"GENERAL").toUpperCase();
 if(t.includes("MENSAJ"))return{label:"Mensajes",icon:"▰",tone:"blue"};
 if(t.includes("CONTRAT"))return{label:"Contratos",icon:"♧",tone:"red"};
 if(t.includes("PAGO")||t.includes("FACTUR"))return{label:"Pagos",icon:"▤",tone:"yellow"};
 if(t.includes("LOG")||t.includes("RECEPCION")||t.includes("CAMION")||t.includes("VIAJE"))return{label:"Logística",icon:"▣",tone:"purple"};
 if(t.includes("IA")||t.includes("OPORT"))return{label:"Oportunidades IA",icon:"★",tone:"yellow"};
 if(t.includes("DOC"))return{label:"Documentación",icon:"▤",tone:"green"};
 if(t.includes("OPER")||t.includes("OFERTA")||t.includes("DEMANDA"))return{label:"Operaciones",icon:"◆",tone:"green"};
 return{label:"Sistema",icon:"▥",tone:"green"};
};

export default function NotificacionesPage(){
 const [notificaciones,setNotificaciones]=useState<Notificacion[]>([]);
 const [seleccionada,setSeleccionada]=useState<Notificacion|null>(null);
 const [cargando,setCargando]=useState(true);
 const [error,setError]=useState("");
 const [filtro,setFiltro]=useState("Todas");
 const [orden,setOrden]=useState("recentes");
 const [buscando,setBuscando]=useState("");
 const [filtros,setFiltros]=useState<Record<string,boolean>>({Operaciones:true,Mensajes:true,Contratos:true,Pagos:true,Logística:true,Sistema:true,"Oportunidades IA":true,Documentación:true});
 const [canales,setCanales]=useState<Record<string,boolean>>({"En la plataforma":true,Email:true,"Notificaciones push":true,SMS:true});
 const [actionMessage,setActionMessage]=useState("");
 const [seleccionadasIds,setSeleccionadasIds]=useState<string[]>([]);
 const accionRapida=(accion:string)=>{if(!seleccionada?.operacion_id)return;window.location.href=`/operaciones/${seleccionada.operacion_id}?accion=${encodeURIComponent(accion)}`;};
 const toggleCanal=()=>window.location.href="/configuracion";

 useEffect(()=>{let canal:ReturnType<typeof supabase.channel>|null=null;async function iniciar(){
  setCargando(true);setError("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Necesitás iniciar sesión.");setCargando(false);return}
  const {data,error:e}=await supabase.from("notificaciones").select("*").or(`profile_id.eq.${user.id},cuenta_id.eq.${user.id}`).order("creada_en",{ascending:false});
  if(e){setError(e.message);setCargando(false);return}
  const rows=(data||[]) as Notificacion[];setNotificaciones(rows);setSeleccionada(rows[0]||null);setCargando(false);
  canal=supabase.channel(`notificaciones-${user.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"notificaciones"},payload=>{const n=payload.new as Notificacion;if(n.profile_id===user.id||n.cuenta_id===user.id){setNotificaciones(a=>[n,...a.filter(x=>x.id!==n.id)]);setSeleccionada(n)}}).subscribe();
 }iniciar();return()=>{if(canal)supabase.removeChannel(canal)}} ,[]);

 async function marcarLeida(id:string){const ahora=new Date().toISOString();const {error:e}=await supabase.rpc("marcar_notificacion_leida",{p_notificacion_id:id});if(e){setError("No se pudo marcar como leída: "+e.message);return}setNotificaciones(a=>a.map(n=>n.id===id?{...n,leida:true,actualizado_at:ahora}:n));setSeleccionada(s=>s?.id===id?{...s,leida:true,actualizado_at:ahora}:s)}
 async function marcarSeleccionadasLeidas(){const ids=seleccionadasIds.filter(id=>visibles.some(n=>n.id===id));if(!ids.length){setError("Seleccioná las notificaciones que querés marcar como leídas.");return}const resultados=await Promise.all(ids.map(id=>supabase.rpc("marcar_notificacion_leida",{p_notificacion_id:id})));const fallo=resultados.find(r=>r.error);if(fallo?.error){setError("No se pudieron marcar las notificaciones seleccionadas: "+fallo.error.message);return}const ahora=new Date().toISOString();setNotificaciones(a=>a.map(n=>ids.includes(n.id)?{...n,leida:true,actualizado_at:ahora}:n));setSeleccionada(s=>s&&ids.includes(s.id)?{...s,leida:true,actualizado_at:ahora}:s);setSeleccionadasIds([]);setError("");}
 const pendientes=notificaciones.filter(n=>!n.leida).length;
 const counts=useMemo(()=>{const c:Record<string,number>={Todas:pendientes};notificaciones.forEach(n=>{const k=typeMeta(n.tipo).label;c[k]=(c[k]||0)+(!n.leida?1:0)});return c},[notificaciones,pendientes]);
 const visibles=(()=>{let rows=notificaciones.filter(n=>{const meta=typeMeta(n.tipo);return filtros[meta.label]!==false&&(filtro==="Todas"||meta.label===filtro)&&((n.titulo||"").toLowerCase().includes(buscando.toLowerCase())||(n.mensaje||"").toLowerCase().includes(buscando.toLowerCase()))});if(orden==="oldest")rows=[...rows].reverse();return rows})();
 const todasVisiblesSeleccionadas=visibles.length>0&&visibles.every(n=>seleccionadasIds.includes(n.id));
 const fecha=(s:string|null)=>s?new Date(s).toLocaleString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
 const relativo=(s:string|null)=>s?fecha(s):"";
 return <main className="notifications-reference">
  <header className="notifications-head"><div><h1>Notificaciones</h1><p>Mantente al día con todas las novedades de tus operaciones y del mercado</p></div><Link className="notifications-config" href="/configuracion">⚙ &nbsp; Configurar notificaciones</Link></header>
  <div className="notification-tabs">{["Todas","Operaciones","Mensajes","Contratos","Pagos","Logística","Sistema"].map(x=><button key={x} className={filtro===x?"active":""} onClick={()=>setFiltro(x)}>{x}{(counts[x]||0)>0&&<b>{counts[x]}</b>}</button>)}</div>
  {(error||actionMessage)&&<div className="notifications-error">{error||actionMessage}</div>}
  {cargando?<div className="notifications-loading">Cargando notificaciones...</div>:<div className="notifications-grid">
   <section className="notifications-main">
    <div className="notifications-list-toolbar"><button type="button" className="notifications-select-all" aria-pressed={todasVisiblesSeleccionadas} onClick={()=>setSeleccionadasIds(todasVisiblesSeleccionadas?[]:visibles.map(n=>n.id))}>{todasVisiblesSeleccionadas?"☐  Deseleccionar todas":"☑  Seleccionar todas"}</button><span className="notifications-selection-count">{seleccionadasIds.length} seleccionadas</span><button type="button" onClick={()=>void marcarSeleccionadasLeidas()} disabled={seleccionadasIds.length===0}>♜ &nbsp; Marcar seleccionadas como leídas</button><select value={orden} onChange={e=>setOrden(e.target.value)}><option value="recentes">Más recientes</option><option value="oldest">Más antiguas</option></select></div>
    <div className="notifications-list">{visibles.map(n=>{const meta=typeMeta(n.tipo);return <button key={n.id} className={seleccionada?.id===n.id?"notification-row selected":"notification-row"} onClick={()=>{setSeleccionada(n);if(!n.leida)void marcarLeida(n.id)}}><span className={`notification-icon ${meta.tone}`}>{meta.icon}</span><span className="notification-copy"><strong>{n.titulo||"Notificación"}</strong><em className={meta.tone}>{meta.label}</em><small>{n.mensaje||""}</small></span><span className="notification-time">{relativo(n.creada_en)}<i>›</i></span></button>})}</div>
   </section>
   <aside className="notification-detail">{seleccionada?<><div className={`detail-icon ${typeMeta(seleccionada.tipo).tone}`}>{typeMeta(seleccionada.tipo).icon}</div><h2>{seleccionada.titulo||"Notificación"}</h2><time>{fecha(seleccionada.creada_en)}</time><span className={`detail-tag ${typeMeta(seleccionada.tipo).tone}`}>{typeMeta(seleccionada.tipo).label}</span><p className="detail-message">{seleccionada.mensaje||""}</p><div className="offer-details"><h3>Detalles de la notificación</h3><div><span>Operación</span><strong>{seleccionada.operacion_id||"No vinculada"}</strong></div><div><span>Producto</span><strong>{seleccionada.publicacion_id?"Vinculado":"No vinculado"}</strong></div><div><span>Estado</span><strong>{seleccionada.leida?"Leída":"Nueva"}</strong></div><div><span>Fecha</span><strong>{fecha(seleccionada.creada_en)}</strong></div></div><Link className="detail-primary" href={seleccionada.conversacion_id?`/mensajes?conversacion=${seleccionada.conversacion_id}`:seleccionada.operacion_id?`/operaciones/${seleccionada.operacion_id}`:seleccionada.publicacion_id?`/marketplace?publicacion=${seleccionada.publicacion_id}`:"/historial"}>{seleccionada.conversacion_id?"Abrir conversación": "Ver detalle completo"}&nbsp; →</Link>{seleccionada.leida?<button className="detail-secondary" disabled>✓ &nbsp; Ya está leída</button>:<button className="detail-secondary" onClick={()=>void marcarLeida(seleccionada.id)}>✓ &nbsp; Marcar como leída</button>}{seleccionada.operacion_id&&!typeMeta(seleccionada.tipo).label.includes("Mensajes")&&<><h3 className="quick-title">Acciones de la operación</h3><div className="quick-actions"><button onClick={()=>accionRapida("aceptar")}>✓<small>Aceptar</small></button><button onClick={()=>accionRapida("negociar")}>☁<small>Negociar</small></button><button onClick={()=>accionRapida("rechazar")}>×<small>Rechazar</small></button><button onClick={()=>accionRapida("guardar")}>★<small>Guardar</small></button></div></>}</>:<div className="detail-empty">Seleccioná una notificación.</div>}</aside>
   <aside className="notifications-sidebar"><div className="side-card"><h2>Filtros de notificaciones <a onClick={()=>setFiltros({Operaciones:true,Mensajes:true,Contratos:true,Pagos:true,Logística:true,Sistema:true,"Oportunidades IA":true,Documentación:true})}>Limpiar filtros</a></h2>{Object.keys(filtros).map(k=><label key={k}><span><i className={typeMeta(k).tone}>{typeMeta(k).icon}</i>{k}</span><input type="checkbox" checked={filtros[k]} onChange={e=>setFiltros({...filtros,[k]:e.target.checked})}/><b className={filtros[k]?"on":""}></b></label>)}</div><div className="side-card channels"><h2>Canales de notificación</h2>{["En la plataforma","Email","Notificaciones push","SMS"].map(x=><label key={x} onClick={()=>toggleCanal()}><span>♧ &nbsp; {x}<small>{canales[x]?"Activo":"Desactivado"}</small></span><b className={canales[x]?"on":""}></b></label>)}</div><div className="side-card summary"><h2>Resumen</h2><div><strong>{pendientes}</strong><span>🔵 &nbsp; No leídas</span></div><div><strong>{notificaciones.length}</strong><span>▥ &nbsp; Este mes</span></div></div></aside>
  </div>}
 </main>
}