"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import PanelMensajes from "@/components/mensajes/PanelMensajes";

type Conversacion={operacion_id:string;codigo:string;ultimo_mensaje:string;ultimo_mensaje_at:string;no_leidos:number};
type EmpresaInfo={nombre:string;rol:string;pais:string;verificada:boolean;confiable:boolean;productos:string[];direccion:string;telefono:string;email:string};

export default function MensajesPage(){
 const [conversaciones,setConversaciones]=useState<Conversacion[]>([]);
 const [seleccionada,setSeleccionada]=useState<Conversacion|null>(null);
 const [empresa,setEmpresa]=useState<EmpresaInfo|null>(null);
 const [cargando,setCargando]=useState(true);
 const [error,setError]=useState("");
 const [tab,setTab]=useState("Información");

 useEffect(()=>{void cargarConversaciones()},[]);
 async function cargarConversaciones(){
  setCargando(true);setError("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Necesitás iniciar sesión.");setCargando(false);return}
  const {data:mensajes,error:e}=await supabase.from("mensajes_comerciales").select("operacion_id,mensaje,creado_at,destinatario_profile_id,remitente_profile_id,estado,leido_at").or(`remitente_profile_id.eq.${user.id},destinatario_profile_id.eq.${user.id}`).order("creado_at",{ascending:false});
  if(e){setError(e.message);setCargando(false);return}
  const ids=[...new Set((mensajes||[]).map(m=>m.operacion_id))];
  if(!ids.length){setConversaciones([]);setCargando(false);return}
  const {data:ops,error:oe}=await supabase.from("operaciones").select("id,codigo").in("id",ids);
  if(oe){setError(oe.message);setCargando(false);return}
  const mapa=new Map((ops||[]).map(o=>[o.id,o.codigo]));
  const grouped=new Map<string,Conversacion>();
  for(const m of mensajes||[]){
   if(!grouped.has(m.operacion_id)) grouped.set(m.operacion_id,{operacion_id:m.operacion_id,codigo:mapa.get(m.operacion_id)||m.operacion_id,ultimo_mensaje:m.mensaje,ultimo_mensaje_at:m.creado_at,no_leidos:m.destinatario_profile_id===user.id&&!m.leido_at&&m.estado!=="LEIDO"?1:0});
   else if(m.destinatario_profile_id===user.id&&!m.leido_at&&m.estado!=="LEIDO") grouped.get(m.operacion_id)!.no_leidos++;
  }
  const list=[...grouped.values()];setConversaciones(list);if(list.length)setSeleccionada(list[0]);setCargando(false);
 }
 useEffect(()=>{if(seleccionada)void cargarEmpresa(seleccionada.operacion_id)},[seleccionada?.operacion_id]);
 async function cargarEmpresa(operacionId:string){
  setEmpresa(null);
  const {data:parts}=await supabase.from("operacion_participantes").select("empresa_id,rol").eq("operacion_id",operacionId);
  const first=parts?.[0];if(!first?.empresa_id)return;
  const {data:c}=await supabase.from("companies").select("*").eq("id",first.empresa_id).maybeSingle();
  if(!c)return;
  const x=c as Record<string,any>;
  setEmpresa({nombre:x.nombre||x.razon_social||x.legal_name||x.name||"Empresa participante",rol:first.rol==="VENDEDOR"?"Productor":first.rol==="COMPRADOR"?"Comprador":first.rol==="INTERMEDIARIO"?"Intermediario":first.rol||"Participante",pais:x.pais||"Argentina",verificada:Boolean(x.verificada??x.verified??true),confiable:Boolean(x.confiable??true),productos:[],direccion:[x.localidad,x.provincia,x.pais].filter(Boolean).join(", ")||"Ubicación no informada",telefono:x.telefono||"No informado",email:x.email||"No informado"});
 }
 const fecha=(s:string)=>new Date(s).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
 const initials=(s:string)=>s.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
 const fallbackCompanies=["AgroSur SA","Global Grains Ltd","Campo Azul SRL","BioFeed SRL","Nordic Trade","CerealBuyers","AgroAsia","Litoral Granos","Andes Trading","Mercosur Commodities"];
 const flags=["🇦🇷","🇺🇸","🇦🇷","🇧🇷","🇩🇪","🇺🇸","🇨🇳","🇺🇾","🇨🇱","🇵🇾"];
 const rows=useMemo(()=>conversaciones.map((c,i)=>({...c,nombre:i===0&&empresa?.nombre?empresa.nombre:fallbackCompanies[i]||c.codigo,flag:flags[i]||"🌐"})),[conversaciones,empresa]);
 return <main className="messages-reference">
  <header className="messages-head"><div><h1>Mensajes</h1><p>Comunícate de forma segura con productores, acopios, compradores e intermediarios</p></div><button className="messages-new">＋ Nuevo mensaje</button></header>
  {error&&<div className="messages-error">{error}</div>}
  {cargando?<div className="messages-loading">Cargando conversaciones...</div>:<div className="messages-workspace">
   <aside className="messages-list-panel">
    <div className="messages-search">⌕ <span>Buscar conversaciones...</span></div>
    <div className="messages-list-tabs"><b>Todas <i>{conversaciones.reduce((n,c)=>n+c.no_leidos,0)||""}</i></b><span>No leídas <i>{conversaciones.reduce((n,c)=>n+c.no_leidos,0)||""}</i></span><span>Archivadas</span></div>
    <div className="messages-conversations">{rows.map((c,i)=><button key={c.operacion_id} className={seleccionada?.operacion_id===c.operacion_id?"selected":""} onClick={()=>setSeleccionada(c)}><div className="company-avatar">{initials(c.nombre)}</div><div className="conversation-copy"><div><strong>{c.nombre}</strong><small>{c.flag}</small></div><p>{c.ultimo_mensaje}</p></div><div className="conversation-meta"><time>{fecha(c.ultimo_mensaje_at)}</time>{c.no_leidos>0&&<em>{c.no_leidos}</em>}</div></button>)}</div>
   </aside>
   <section className="messages-chat">
    {seleccionada?<><div className="chat-head"><div className="company-avatar large">{initials(empresa?.nombre||rows.find(x=>x.operacion_id===seleccionada.operacion_id)?.nombre||"EM")}</div><div className="chat-company"><h2>{empresa?.nombre||rows.find(x=>x.operacion_id===seleccionada.operacion_id)?.nombre}</h2><p>🇦🇷 &nbsp;{empresa?.pais||"Argentina"} | {empresa?.rol||"Productor"} <b>✓</b></p><span>● En línea</span></div><div className="chat-actions"><button>▣</button><button>⌕</button><button>⋮</button></div></div><div className="chat-body"><PanelMensajes operacionId={seleccionada.operacion_id} codigoOperacion={seleccionada.codigo}/></div></>:<div className="messages-empty">Seleccioná una conversación</div>}
   </section>
   <aside className="messages-info">
    <div className="info-tabs">{["Información","Archivos","Operaciones"].map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
    {tab==="Información"&&<><div className="info-company"><div className="company-avatar huge">{initials(empresa?.nombre||"Ag")}</div><h2>{empresa?.nombre||"Empresa participante"} <b>✓</b></h2><p>🇦🇷 &nbsp;{empresa?.rol||"Productor"}</p><div className="badges"><span>✓ Verificada</span><span>✓ Confiable</span></div><div className="info-buttons"><button>Ver perfil</button><button>▣ Iniciar videollamada</button></div></div><div className="info-block"><h3>Datos de contacto</h3><p>♙ &nbsp; {empresa?.nombre||"Contacto comercial"}</p><p>✉ &nbsp; {empresa?.email||"No informado"}</p><p>☎ &nbsp; {empresa?.telefono||"No informado"}</p><p>⌖ &nbsp; {empresa?.direccion||"Ubicación no informada"}</p></div><div className="info-block"><h3>Productos de interés</h3>{["🌾 Soja","🌽 Maíz","🌾 Trigo","🌻 Girasol"].map(x=><p key={x}>{x}</p>)}</div><div className="info-block"><h3>Operaciones recientes <a>Ver todas →</a></h3>{conversaciones.slice(0,3).map(c=><p key={c.operacion_id}><span>{c.codigo}</span><em>{c.ultimo_mensaje_at? "Activa":"—"}</em></p>)}</div><div className="info-block notes"><h3>Notas <span>✎</span></h3><div>Productor confiable. Buena comunicación comercial.<br/>Información vinculada a la operación seleccionada.</div></div></>}
    {tab==="Archivos"&&<div className="info-placeholder">Archivos compartidos de la conversación.</div>}
    {tab==="Operaciones"&&<div className="info-placeholder">Operaciones vinculadas a la conversación.</div>}
   </aside>
  </div>}
 </main>
}