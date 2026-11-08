"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import PanelMensajes from "@/components/mensajes/PanelMensajes";
import PanelMensajesPublicacion from "@/components/mensajes/PanelMensajesPublicacion";

type Conversacion={operacion_id:string;codigo:string;ultimo_mensaje:string;ultimo_mensaje_at:string;no_leidos:number;recibidos:number;tipo:"operacion"|"publicacion";conversacion_id?:string;publicacion_id?:string;producto?:string;cantidad_tn?:number;tipo_publicacion?:string;otro_usuario?:string};
type EmpresaInfo={nombre:string;nombreUsuario:string;rol:string;pais:string;provincia?:string;ciudad?:string;verificada:boolean;confiable:boolean;productos:string[];direccion:string;telefono:string;email:string;profileId?:string|null;score?:number|null;scoreLabel?:string|null;scoreColor?:string|null;scoreCoverage?:number|null;operationsEvaluated?:number;tripsEvaluated?:number;verificationStatus?:string;companyVerified?:boolean;razonSocial?:string;cuit?:string;tipoEmpresa?:string;tipoOperador?:string;sitioWeb?:string;descripcion?:string;contactoHabilitado?:boolean;contratoNumero?:string|null;contratoEstado?:string|null};
type OperacionDisponible={id:string;codigo:string;estado?:string|null;rol?:string|null};

export default function MensajesPage(){
 const [conversacionSolicitada,setConversacionSolicitada]=useState<string|null>(null);
 const [conversaciones,setConversaciones]=useState<Conversacion[]>([]);
 const [seleccionada,setSeleccionada]=useState<Conversacion|null>(null);
 const [empresa,setEmpresa]=useState<EmpresaInfo|null>(null);
 const [cargando,setCargando]=useState(true);
 const [error,setError]=useState("");
 const [aviso,setAviso]=useState("");
 const [menuAcciones,setMenuAcciones]=useState(false);
 const [tab,setTab]=useState("Información");
 const [busqueda,setBusqueda]=useState("");
 const [filtroConversaciones,setFiltroConversaciones]=useState<"todas"|"no_leidas">("todas");
 const [mostrarSelectorOperacion,setMostrarSelectorOperacion]=useState(false);
 const [cargandoOperaciones,setCargandoOperaciones]=useState(false);
 const [operacionesDisponibles,setOperacionesDisponibles]=useState<OperacionDisponible[]>([]);
 const [busquedaOperacion,setBusquedaOperacion]=useState("");
 const [errorSelector,setErrorSelector]=useState("");
 const accionHeader=(accion:string)=>{if(!seleccionada)return;if(accion==="videollamada"){window.location.href=`/videollamadas?operacion=${seleccionada.operacion_id}`;return}if(accion==="copiar"){void navigator.clipboard?.writeText(seleccionada.codigo).then(()=>{setAviso("Código de operación copiado.");setMenuAcciones(false)}).catch(()=>setError("No se pudo copiar el código. Seleccionalo manualmente."));return}if(accion==="informacion"){setTab("Información");setMenuAcciones(false);return}if(accion==="verificaciones"){window.location.href="/verificaciones";return}};

 useEffect(()=>{const params=new URLSearchParams(window.location.search);setConversacionSolicitada(params.get("conversacion"));void cargarConversaciones()},[]);
 useEffect(()=>{if(!conversacionSolicitada||!conversaciones.length)return;const target=conversaciones.find(c=>c.conversacion_id===conversacionSolicitada);if(target)setSeleccionada(target)},[conversacionSolicitada,conversaciones]);
 async function abrirSelectorOperacion(){
  setMostrarSelectorOperacion(true);setCargandoOperaciones(true);setErrorSelector("");setOperacionesDisponibles([]);
  try{
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Necesitás iniciar sesión.");
   const {data:perfil,error:pe}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).maybeSingle();if(pe)throw pe;
   if(!perfil?.active_company_id)throw new Error("Seleccioná una empresa activa antes de iniciar una conversación.");
   // La RPC resuelve el ID de empresa comercial desde la empresa activa
   // y valida la membresía en servidor, evitando lecturas parciales por RLS.
   const {data:ops,error:oe}=await supabase.rpc("listar_operaciones_mensajes_disponibles");
   if(oe)throw oe;
   const disponibles=(ops||[]) as OperacionDisponible[];
   setOperacionesDisponibles(disponibles);
   if(!disponibles.length)setErrorSelector("Tu empresa activa no participa todavía en ninguna operación registrada.");
  }catch(e){setErrorSelector(e instanceof Error?e.message:"No se pudieron cargar las operaciones.");}finally{setCargandoOperaciones(false)}
 }
 function iniciarDesdeOperacion(op:OperacionDisponible){
  const nueva:Conversacion={operacion_id:op.id,codigo:op.codigo,tipo:"operacion",ultimo_mensaje:"Iniciar conversación",ultimo_mensaje_at:new Date().toISOString(),no_leidos:0,recibidos:0};
  setConversaciones(actuales=>actuales.some(x=>x.operacion_id===op.id)?actuales:[nueva,...actuales]);setSeleccionada(nueva);setMostrarSelectorOperacion(false);setTab("Información");
 }
 async function cargarConversaciones(){
  setCargando(true);setError("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Necesitás iniciar sesión.");setCargando(false);return}
  const [comerciales,pubChats]=await Promise.all([
   supabase.from("mensajes_comerciales").select("operacion_id,mensaje,creado_at,destinatario_profile_id,remitente_profile_id,estado,leido_at").or(`remitente_profile_id.eq.${user.id},destinatario_profile_id.eq.${user.id}`).order("creado_at",{ascending:false}),
   supabase.rpc("listar_conversaciones_publicaciones")
  ]);
  if(comerciales.error){setError("No se pudieron cargar los mensajes de operaciones: "+comerciales.error.message);setCargando(false);return}
  if(pubChats.error){setError("No se pudieron cargar los mensajes de publicaciones: "+pubChats.error.message);setCargando(false);return}
  const ids=[...new Set((comerciales.data||[]).map(m=>m.operacion_id))];
  const opsResult=ids.length?await supabase.from("operaciones").select("id,codigo,cantidad_tn,modalidad_comercial,publicacion_compra_id,publicacion_venta_id").in("id",ids):{data:[],error:null};
  if(opsResult.error){setError(opsResult.error.message);setCargando(false);return}
  const pubIds=[...new Set((opsResult.data||[]).flatMap(o=>[o.publicacion_compra_id,o.publicacion_venta_id]).filter(Boolean))];
  const productsResult=pubIds.length?await supabase.from("publicaciones").select("id,producto_id,productos(nombre)").in("id",pubIds):{data:[],error:null};
  if(productsResult.error){setError(productsResult.error.message);setCargando(false);return}
  const productMap=new Map((productsResult.data||[]).map((p:any)=>[p.id,Array.isArray(p.productos)?p.productos[0]?.nombre:p.productos?.nombre]));
  const opMap=new Map((opsResult.data||[]).map(o=>[o.id,o]));
  const grouped=new Map<string,Conversacion>();
  for(const m of comerciales.data||[]){
   const op=opMap.get(m.operacion_id);
   const prod=op?(productMap.get(op.publicacion_venta_id)||productMap.get(op.publicacion_compra_id)):"";
   if(!grouped.has(m.operacion_id))grouped.set(m.operacion_id,{operacion_id:m.operacion_id,codigo:op?`${(op as any).codigo||"Operación"} · ${prod||"Producto"} · ${Number((op as any).cantidad_tn||0).toLocaleString("es-AR")} TN`:"Operación",ultimo_mensaje:m.mensaje,ultimo_mensaje_at:m.creado_at,no_leidos:0,recibidos:0,tipo:"operacion",producto:prod||"Producto no informado"});
   const row=grouped.get(m.operacion_id)!;
   if(m.destinatario_profile_id===user.id){row.recibidos++;if(!m.leido_at&&m.estado!=="LEIDO")row.no_leidos++;}
  }
  const pubs=(pubChats.data||[]) as any[];
  for(const p of pubs){
   const title=`${p.producto||"Producto"} · ${Number(p.cantidad_tn||0).toLocaleString("es-AR")} TN · ${p.tipo_publicacion==="VENTA"?"Oferta de venta":"Demanda de compra"}`;
   grouped.set("pub:"+p.conversacion_id,{operacion_id:"pub:"+p.conversacion_id,codigo:title,ultimo_mensaje:p.ultimo_mensaje||"Conversación iniciada",ultimo_mensaje_at:p.ultimo_mensaje_at,no_leidos:Number(p.no_leidos||0),recibidos:Number(p.no_leidos||0),tipo:"publicacion",conversacion_id:p.conversacion_id,publicacion_id:p.publicacion_id,producto:p.producto||"Producto",cantidad_tn:Number(p.cantidad_tn||0),tipo_publicacion:p.tipo_publicacion,otro_usuario:p.otro_usuario_nombre||"Usuario AgroBrokerIA"});
  }
  const list=[...grouped.values()].sort((a,b)=>new Date(b.ultimo_mensaje_at).getTime()-new Date(a.ultimo_mensaje_at).getTime());
  setConversaciones(list);
  if(list.length)setSeleccionada(list[0]);else setSeleccionada(null);
  setCargando(false);
 }
 useEffect(()=>{if(seleccionada?.tipo==="operacion")void cargarEmpresa(seleccionada.operacion_id);else setEmpresa(null)},[seleccionada?.operacion_id,seleccionada?.tipo]);
 async function cargarEmpresa(operacionId:string){
  setEmpresa(null);
  const {data,error}=await supabase.rpc("obtener_perfil_participante_operacion",{p_operacion_id:operacionId});
  if(error){
   console.error("No se pudo cargar el perfil de la contraparte",error);
   setError(error.message==="NOT_OPERATION_PARTICIPANT"?"Tu empresa no figura como participante de esta operación.":"No se pudo cargar la identidad de la contraparte.");
   return;
  }
  const x=Array.isArray(data)?data[0]:data;
  if(!x){
   setError("La contraparte no tiene un perfil registrado vinculado a esta operación. Administración debe revisar la vinculación de la cuenta.");
   return;
  }
  const roleLabels:Record<string,string>={VENDEDOR:"Vendedor",COMPRADOR:"Comprador",INTERMEDIARIO:"Intermediario",CORREDOR:"Corredor",ACOPIO:"Acopio",PRODUCTOR:"Productor",TRANSPORTISTA:"Transportista"};
  setEmpresa({
   nombre:x.empresa_nombre||x.razon_social||"Empresa participante",
   nombreUsuario:x.nombre_usuario||"Usuario registrado",
   rol:roleLabels[x.rol]||x.rol||"Participante",
   pais:x.pais||"País no informado",provincia:x.provincia||"",ciudad:x.ciudad||"",
   verificada:Boolean(x.verificada),confiable:false,productos:[],
   direccion:[x.direccion,x.ciudad,x.provincia,x.pais].filter(Boolean).join(", ")||"Ubicación no informada",
   telefono:x.telefono||"",email:x.email||"",profileId:x.profile_id||null,
   score:x.score??null,scoreLabel:x.score_label||null,scoreColor:x.score_color||null,
   scoreCoverage:x.cobertura_pct??null,operationsEvaluated:Number(x.operaciones_evaluadas||0),tripsEvaluated:Number(x.viajes_evaluados||0),
   verificationStatus:x.estado_verificacion||"NO_VERIFICADO",companyVerified:Boolean(x.empresa_verificada),
   razonSocial:x.razon_social||"",cuit:x.cuit||"",tipoEmpresa:x.tipo_empresa||"",tipoOperador:x.tipo_operador||"",
   sitioWeb:x.sitio_web||"",descripcion:x.descripcion||"",contactoHabilitado:Boolean(x.contacto_habilitado),
   contratoNumero:x.contrato_numero||null,contratoEstado:x.contrato_estado||null
  });
 }
 const fecha=(s:string)=>new Date(s).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
 const initials=(s:string)=>s.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
 const rows=useMemo(()=>conversaciones.map(c=>({...c,nombre:c.tipo==="publicacion"?(c.otro_usuario||"Usuario AgroBrokerIA"):(empresa?.nombre&&c.operacion_id===seleccionada?.operacion_id?empresa.nombre:c.codigo),flag:c.tipo==="publicacion"?c.codigo:(empresa?.pais&&c.operacion_id===seleccionada?.operacion_id?empresa.pais:"")})).filter(c=>(filtroConversaciones==="todas"||c.no_leidos>0)&&(!busqueda||`${c.nombre} ${c.codigo} ${c.ultimo_mensaje}`.toLowerCase().includes(busqueda.toLowerCase()))),[conversaciones,empresa,seleccionada,busqueda,filtroConversaciones]);
 return <main className="messages-reference">
  <header className="messages-head"><div><h1>Mensajes</h1><p>Comunícate de forma segura con productores, acopios, compradores e intermediarios</p></div><button className="messages-new" onClick={()=>void abrirSelectorOperacion()}>＋ Iniciar desde una operación</button></header>
  {error&&<div className="messages-error">{error}</div>}{aviso&&<div className="messages-notice">{aviso}<button type="button" onClick={()=>setAviso("")}>Cerrar</button></div>}
  {cargando?<div className="messages-loading">Cargando conversaciones...</div>:<div className="messages-workspace">
   <aside className="messages-list-panel">
    <label className="messages-search">⌕ <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar conversaciones..." aria-label="Buscar conversaciones"/></label>
    <div className="messages-list-tabs"><button type="button" className={filtroConversaciones==="todas"?"active":""} aria-pressed={filtroConversaciones==="todas"} onClick={()=>setFiltroConversaciones("todas")}>Todas</button><button type="button" className={filtroConversaciones==="no_leidas"?"active":""} aria-pressed={filtroConversaciones==="no_leidas"} onClick={()=>setFiltroConversaciones("no_leidas")}>No leídas <i className="messages-count">{conversaciones.filter(c=>c.no_leidos>0).length}</i></button></div>
    <div className="messages-conversations">{rows.length===0?<div className="messages-empty">{filtroConversaciones==="no_leidas"?"No tenés conversaciones sin leer.":"Todavía no hay conversaciones."}</div>:rows.map((c,i)=><button key={c.operacion_id} className={seleccionada?.operacion_id===c.operacion_id?"selected":""} onClick={()=>setSeleccionada(c)}><div className="company-avatar">{initials(c.nombre)}</div><div className="conversation-copy"><div><strong>{c.nombre}</strong><small>{c.flag}</small></div><p>{c.ultimo_mensaje}</p></div><div className="conversation-meta"><time>{fecha(c.ultimo_mensaje_at)}</time>{c.no_leidos>0&&<em>{c.no_leidos}</em>}</div></button>)}</div>
   </aside>
   <section className="messages-chat">
    {seleccionada?<>{seleccionada.tipo==="publicacion"?<div className="chat-head"><div className="company-avatar large">{initials(seleccionada.otro_usuario||"US")}</div><div className="chat-company"><h2>{seleccionada.producto} · {seleccionada.cantidad_tn?.toLocaleString("es-AR")} TN</h2><p>{seleccionada.tipo_publicacion==="VENTA"?"Oferta de venta":"Demanda de compra"} · {seleccionada.otro_usuario}</p><span>Conversación de Marketplace</span></div></div>:<div className="chat-head"><div className="company-avatar large">{initials(empresa?.nombre||rows.find(x=>x.operacion_id===seleccionada.operacion_id)?.nombre||"EM")}</div><div className="chat-company"><h2>{empresa?.nombre||rows.find(x=>x.operacion_id===seleccionada.operacion_id)?.nombre}</h2><p>{empresa?.pais||"País no informado"} | {empresa?.rol||"Rol no informado"}{empresa?.verificada&&<b> ✓</b>}</p><span>Estado no informado</span></div><div className="chat-actions"><button onClick={()=>accionHeader("videollamada")} aria-label="Iniciar videollamada">▣</button><button onClick={()=>setTab("Archivos")} aria-label="Ver archivos">⌕</button><div className="chat-more-wrap"><button type="button" onClick={()=>setMenuAcciones(v=>!v)} aria-label="Más acciones" aria-expanded={menuAcciones}>⋮</button>{menuAcciones&&<div className="chat-more-menu"><button type="button" onClick={()=>accionHeader("copiar")}>Copiar código de operación</button><button type="button" onClick={()=>accionHeader("informacion")}>Ver información de la empresa</button><button type="button" onClick={()=>accionHeader("verificaciones")}>Ir a verificaciones de empresas</button></div>}</div></div></div>}<div className="chat-body">{seleccionada.tipo==="publicacion"&&seleccionada.conversacion_id?<PanelMensajesPublicacion conversacionId={seleccionada.conversacion_id} productoTitulo={seleccionada.codigo}/>:<PanelMensajes operacionId={seleccionada.operacion_id} codigoOperacion={seleccionada.codigo}/>}</div></>:<div className="messages-empty">Seleccioná una conversación</div>}
   </section>
   <aside className="messages-info">
    <div className="info-tabs">{["Información","Archivos","Operaciones"].map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
    {tab==="Información"&&seleccionada?.tipo==="publicacion"?<><div className="info-company"><div className="company-avatar huge">{initials(seleccionada.otro_usuario||"US")}</div><h2>{seleccionada.otro_usuario||"Usuario AgroBrokerIA"}</h2><p>Contacto de Marketplace</p><div className="badges"><span>{seleccionada.tipo_publicacion==="VENTA"?"Oferta de venta":"Demanda de compra"}</span></div></div><div className="info-block"><h3>Datos de la publicación</h3><p>Producto: {seleccionada.producto}</p><p>Cantidad: {seleccionada.cantidad_tn?.toLocaleString("es-AR")} TN</p><p>Tipo: {seleccionada.tipo_publicacion==="VENTA"?"Venta":"Compra"}</p><p>Publicación: {seleccionada.publicacion_id}</p></div></>:tab==="Información"&&<><div className="info-company"><div className="company-avatar huge">{initials(empresa?.nombre||"Ag")}</div><h2>{empresa?.nombre||"Empresa participante"}{empresa?.companyVerified&&<b> ✓</b>}</h2><p>{empresa?.nombreUsuario||"Usuario registrado"} · {empresa?.rol||"Participante"}</p><p>{[empresa?.ciudad,empresa?.provincia,empresa?.pais].filter(Boolean).join(" · ")||"Ubicación no informada"}</p><div className="badges">{empresa?.verificada&&<span>✓ Usuario verificado</span>}{empresa?.companyVerified&&<span>✓ Empresa verificada</span>}{!empresa?.verificada&&!empresa?.companyVerified&&<span>{empresa?.verificationStatus==="PENDIENTE"?"Verificación pendiente":"Usuario no verificado"}</span>}{empresa?.score!=null&&<span style={{color:empresa.scoreColor||"#334155"}}>Scoring {empresa.score}/100</span>}</div><div className="info-buttons"><button disabled={!empresa} onClick={()=>seleccionada?.tipo==="operacion"&&window.location.assign(`/perfil-participante/${seleccionada.operacion_id}`)}>Ver perfil completo</button><button onClick={()=>accionHeader("videollamada")}>▣ Iniciar videollamada</button></div></div><div className="info-block"><h3>Datos de la empresa</h3><p>♙ &nbsp; {empresa?.nombreUsuario||"Usuario registrado"} · {empresa?.rol||"Participante"}</p><p>⌖ &nbsp; {empresa?.direccion||"Ubicación no informada"}</p>{empresa?.razonSocial&&empresa.razonSocial!==empresa.nombre&&<p>Razón social: {empresa.razonSocial}</p>}{empresa?.cuit&&<p>CUIT: {empresa.cuit}</p>}{empresa?.tipoOperador&&<p>Actividad: {empresa.tipoOperador}</p>}{empresa?.sitioWeb&&<p>Sitio web: <a href={empresa.sitioWeb} target="_blank" rel="noreferrer">{empresa.sitioWeb}</a></p>}{empresa?.descripcion&&<p>{empresa.descripcion}</p>}<h3>Datos de contacto</h3>{empresa?.contactoHabilitado?<><p>✉ &nbsp; {empresa.email||"Correo no registrado"}</p><p>☎ &nbsp; {empresa.telefono||"Teléfono no registrado"}</p></>:<p>El correo y el teléfono se habilitan para ambas partes cuando la operación alcanza Contrato Definitivo.</p>}</div><div className="info-block"><h3>Reputación y scoring</h3><p><strong>{empresa?.score!=null?`${empresa.score}/100 · ${empresa.scoreLabel||"Scoring registrado"}`:"Historial insuficiente"}</strong></p><p>Cobertura de evidencia: {empresa?.scoreCoverage!=null?`${empresa.scoreCoverage}%`:"No disponible"}</p><p>Operaciones evaluadas: {empresa?.operationsEvaluated??0}</p><p>Viajes evaluados: {empresa?.tripsEvaluated??0}</p><p>Verificación de usuario: {empresa?.verificationStatus||"No informada"}</p></div><div className="info-block"><h3>Contrato de esta operación</h3>{empresa?.contactoHabilitado?<><p>Número: {empresa?.contratoNumero||"No informado"}</p><p>Estado: {empresa?.contratoEstado||"En formalización"}</p></>:<p>Los datos contractuales y de contacto se habilitan al llegar a Contrato Definitivo.</p>}</div><div className="info-block"><h3>Productos de interés</h3><p>{empresa?.productos?.length?empresa.productos.map(x=><span key={x}>{x}</span>):"No hay productos de interés registrados."}</p></div><div className="info-block"><h3>Operaciones recientes <Link href="/historial">Ver todas →</Link></h3>{conversaciones.slice(0,3).map(c=><p key={c.operacion_id}><span>{c.codigo}</span><em>{c.ultimo_mensaje_at? "Activa":"—"}</em></p>)}</div><div className="info-block notes"><h3>Notas</h3><div>Las notas comerciales se gestionan desde el expediente de la operación.</div></div></>}
    {tab==="Archivos"&&<div className="info-placeholder">Archivos compartidos de la conversación.</div>}
    {tab==="Operaciones"&&<div className="info-placeholder">Operaciones vinculadas a la conversación.</div>}
   </aside>
  </div>}
  {mostrarSelectorOperacion&&<div role="dialog" aria-modal="true" aria-labelledby="selector-operacion-title" className="operation-picker-backdrop" onClick={()=>setMostrarSelectorOperacion(false)}><section className="operation-picker" onClick={e=>e.stopPropagation()}><header><div><h2 id="selector-operacion-title">Iniciar conversación desde una operación</h2><p>Elegí una operación en la que participa tu empresa activa.</p></div><button type="button" aria-label="Cerrar" onClick={()=>setMostrarSelectorOperacion(false)}>✕</button></header><input value={busquedaOperacion} onChange={e=>setBusquedaOperacion(e.target.value)} placeholder="Buscar por código de operación…" aria-label="Buscar operación"/>{errorSelector&&<div className="messages-error">{errorSelector}</div>}{cargandoOperaciones?<p className="operation-picker-empty">Cargando operaciones…</p>:operacionesDisponibles.filter(op=>!busquedaOperacion||op.codigo.toLowerCase().includes(busquedaOperacion.toLowerCase())||(op.estado||"").toLowerCase().includes(busquedaOperacion.toLowerCase())).length===0?<p className="operation-picker-empty">No hay operaciones disponibles para la empresa activa. Verificá que figure como participante de una operación.</p>:<div className="operation-picker-list">{operacionesDisponibles.filter(op=>!busquedaOperacion||op.codigo.toLowerCase().includes(busquedaOperacion.toLowerCase())||(op.estado||"").toLowerCase().includes(busquedaOperacion.toLowerCase())).map(op=><button type="button" key={op.id} onClick={()=>iniciarDesdeOperacion(op)}><span><strong>{op.codigo}</strong><small>{op.rol?("Tu rol: "+op.rol):"Operación vinculada"}{op.estado?(" · "+op.estado):""}</small></span><b>Abrir conversación →</b></button>)}</div>}<footer><button type="button" onClick={()=>setMostrarSelectorOperacion(false)}>Cancelar</button></footer></section></div>}
 </main>
}