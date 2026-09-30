"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";

type Operation={id:string;codigo:string|null;estado:string|null};
type Meeting={id:string;operacion_id:string|null;titulo:string|null;estado:string|null;inicio_at:string|null;enlace:string|null;proveedor:string|null;meeting_id:string|null};
type Participant={id:string;name:string;company:string;role:string;initials:string};

export default function Videollamadas(){
 const [meetings,setMeetings]=useState<Meeting[]>([]),[operations,setOperations]=useState<Operation[]>([]),[selected,setSelected]=useState<Meeting|null>(null);
 const [operationId,setOperationId]=useState(""),[startAt,setStartAt]=useState(""),[title,setTitle]=useState("Reunión comercial AgroBrokerIA"),[error,setError]=useState(""),[busy,setBusy]=useState(false),[running,setRunning]=useState(false),[chat,setChat]=useState(""),[messages,setMessages]=useState<{name:string;text:string;mine?:boolean}[]>([]),[userName,setUserName]=useState("Tú");
 const [view,setView]=useState<"sala"|"programar"|"reuniones"|"grabaciones"|"config">("sala"),[sideTab,setSideTab]=useState<"participantes"|"chat"|"documentos">("participantes"),[mic,setMic]=useState(true),[camera,setCamera]=useState(true),[recording,setRecording]=useState(false),[notice,setNotice]=useState("");
 const [elapsed,setElapsed]=useState(0);

 async function load(){
  setError("");
  const [{data:meetingData,error:meetingError},{data:operationData,error:operationError},{data:{user}}]=await Promise.all([
   supabase.from("videollamadas_comerciales").select("id,operacion_id,titulo,estado,inicio_at,enlace,proveedor,meeting_id").order("creada_en",{ascending:false}),
   supabase.from("operaciones").select("id,codigo,estado").order("creada_en",{ascending:false}).limit(100),
   supabase.auth.getUser()
  ]);
  if(meetingError)setError(meetingError.message);else{const rows=(meetingData||[]) as Meeting[];setMeetings(rows);if(!selected&&rows[0]){setSelected(rows[0]);setRunning(String(rows[0].estado||"").toUpperCase()==="EN_CURSO");}}
  if(operationError)setError(operationError.message);else setOperations((operationData||[]) as Operation[]);
  const m=user?.user_metadata||{};setUserName(m.nombre||m.full_name||user?.email?.split("@")[0]||"Tú");
 }
 useEffect(()=>{void load();const google=new URLSearchParams(window.location.search).get("google");if(google==="connected")setNotice("Google quedó conectado correctamente.");else if(google&&google!=="connected")setError("No se pudo completar la autorización de Google ("+google+").")},[]);
 useEffect(()=>{if(!running){setElapsed(0);return}const started=selected?.inicio_at?new Date(selected.inicio_at).getTime():Date.now();const tick=()=>setElapsed(Math.max(0,Math.floor((Date.now()-started)/1000)));tick();const id=window.setInterval(tick,1000);return()=>window.clearInterval(id)},[running,selected]);
 async function conectarGoogle(){
  setBusy(true);setError("");
  try{const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error("AUTH_REQUIRED");const response=await fetch("/api/videollamadas/google/start",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}});const result=await response.json();if(!response.ok)throw new Error(result.detail||result.error||"No se pudo iniciar la autorización de Google.");window.location.assign(result.authorization_url)}catch(e){setError(e instanceof Error?e.message:"No se pudo conectar Google.")}finally{setBusy(false)}
 }
 async function crear(){
  if(!startAt)return setError("Indicá fecha y hora de inicio.");
  setBusy(true);setError("");
  try{const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error("AUTH_REQUIRED");
   const {data,error:rpcError}=await supabase.rpc("crear_videollamada_comercial",{p_operacion_id:operationId||null,p_negociacion_id:null,p_inicio:new Date(startAt).toISOString(),p_titulo:title.trim()||"Reunión comercial AgroBrokerIA"});
   if(rpcError)throw rpcError;
   const response=await fetch("/api/videollamadas/google",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({videollamada_id:data})});
   const result=await response.json();if(!response.ok)throw new Error(result.detail||result.error||"No se pudo crear Google Meet.");
   setOperationId("");setStartAt("");setView("reuniones");await load();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo crear la videollamada.")}finally{setBusy(false)}
 }
 const active=selected||meetings[0]||null;
 const operation=useMemo(()=>operations.find(o=>o.id===active?.operacion_id),[operations,active]);
 const participants:Participant[]=[{id:"me",name:userName,company:"AgroBrokerIA",role:"Organizadora",initials:userName.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()||"TU"}];
 const formatTime=(s:number)=>[Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,"0")).join(":");
 const notify=(message:string)=>{setNotice(message);window.setTimeout(()=>setNotice(""),2500)};
 const send=()=>{if(!chat.trim())return;setMessages(x=>[...x,{name:userName,text:chat.trim(),mine:true}]);setChat("")};
 const copyLink=async()=>{if(!active?.enlace)return;try{await navigator.clipboard.writeText(active.enlace);notify("Enlace copiado.")}catch{setError("No se pudo copiar el enlace.")}};
 const shareInvite=async()=>{if(!active?.enlace)return;try{if(navigator.share)await navigator.share({title:active.titulo||"Reunión AgroBrokerIA",url:active.enlace});else await copyLink()}catch{}};
 const tab=(next:typeof view)=>{setView(next);if(next==="programar")window.setTimeout(()=>document.getElementById("meet-create")?.scrollIntoView({behavior:"smooth"}),0)};
 return <main className="meet-reference">
  <header className="meet-head"><div><h1>Videollamada</h1><p>Reuniones seguras para negociar, coordinar operaciones y fortalecer conexiones comerciales</p></div><button className="meet-new" onClick={()=>tab("programar")}>＋ Nueva reunión</button></header>
  <nav className="meet-tabs">{([["sala","▣","Sala de reunión"],["programar","▣","Programar reunión"],["reuniones","▦","Mis reuniones"],["grabaciones","▣","Grabaciones"],["config","⚙","Configuración"]] as const).map(([k,icon,label])=><button key={k} className={view===k?"active":""} onClick={()=>tab(k)}>{icon}&nbsp; {label}</button>)}</nav>
  {view==="config"&&<section className="meet-create"><h2>Configuración de videollamadas</h2><p>Las reuniones se crean mediante la integración configurada y quedan vinculadas a la operación correspondiente.</p><div className="meet-feature-row"><Feature icon="✓" title="Integración" text="Google Meet se utiliza cuando la integración está disponible."/><Feature icon="文" title="Idioma" text="La traducción se gestiona según las capacidades habilitadas en la reunión."/><Feature icon="🔒" title="Acceso" text="Los enlaces se muestran únicamente en el contexto de la reunión."/><button className="commission-action-link" onClick={conectarGoogle} disabled={busy}>{busy?"Conectando…":"Conectar Google"}</button><Link href="/configuracion" className="commission-action-link">Abrir configuración general</Link></div></section>}
  {view==="grabaciones"&&<section className="meet-empty"><h2>Grabaciones</h2><p>No hay grabaciones almacenadas en los datos disponibles para este usuario.</p><small>Las grabaciones no se inventan: aparecerán aquí cuando exista un registro real asociado.</small></section>}
  {view==="reuniones"&&<section className="meet-create"><h2>Mis reuniones</h2>{meetings.length?<div>{meetings.map(m=><article key={m.id} className="meet-feature"><i>▣</i><div><b>{m.titulo||"Reunión comercial"}</b><span>{m.operacion_id?`Operación ${operations.find(o=>o.id===m.operacion_id)?.codigo||m.operacion_id}`:"Reunión general"} · {m.estado||"Sin estado"}</span></div><button onClick={()=>{setSelected(m);setView("sala")}}>Abrir</button></article>)}</div>:<p>No hay reuniones registradas.</p>}</section>}
  {view==="programar"&&<section id="meet-create" className="meet-create"><h2>Programar reunión</h2><div><label>Operación<select value={operationId} onChange={e=>setOperationId(e.target.value)}><option value="">Reunión general (sin operación)</option>{operations.map(o=><option key={o.id} value={o.id}>{o.codigo||o.id} · {o.estado||"SIN ESTADO"}</option>)}</select><small>Podés vincularla a una operación o crear una reunión general.</small></label><label>Inicio<input type="datetime-local" value={startAt} onChange={e=>setStartAt(e.target.value)}/></label><label>Título<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></label><button onClick={crear} disabled={busy||!startAt}>{busy?"Creando…":"🎥 Crear videollamada"}</button></div></section>}
  {view==="sala"&&(active?<><section className="meet-room-head"><div><h2>{active.titulo||"Reunión comercial"}</h2><p>{active.operacion_id?`Operación ${operation?.codigo||active.operacion_id}`:"Reunión general"} &nbsp;|&nbsp; {active.proveedor||"AgroBrokerIA"}</p></div><div className="meet-status">{running?"● En curso":"● Programada / finalizada"}</div><strong className="meet-timer">{formatTime(elapsed)}</strong><div className="meet-room-actions"><button onClick={()=>notify(`${participants.length} participante(s)`)}>♙ {participants.length}</button>{active.enlace&&<button onClick={()=>window.open(active.enlace||"", "_blank","noopener,noreferrer")}>Abrir Meet</button>}<button onClick={()=>notify("La reunión está vinculada a la operación.")}>ⓘ</button></div></section>
  <section className="meet-workspace"><div className="meet-main"><div className="meet-grid">{participants.map((p,i)=><article className={"meet-tile tile-"+i} key={p.id}><div className="meet-avatar-large">{p.initials}</div><div className="meet-tile-label"><b>♟ &nbsp;{p.name} (Tú)</b><small>{p.company} | {p.role}</small></div></article>)}</div>
    <div className="meet-controls"><button onClick={()=>setMic(v=>!v)}>{mic?"♩":"🔇"}<small>{mic?"Micrófono":"Micrófono apagado"}</small></button><button onClick={()=>setCamera(v=>!v)}>{camera?"▣":"◻"}<small>{camera?"Cámara":"Cámara apagada"}</small></button><button onClick={()=>notify("Compartir pantalla se realiza desde Google Meet.")}>▤<small>Compartir</small></button><button onClick={()=>setSideTab("chat")}>▢<small>Chat</small></button><button onClick={()=>setSideTab("participantes")}>♙<small>Participantes</small><b>{participants.length}</b></button><button onClick={()=>setRecording(v=>!v)}>◉<small>{recording?"Detener grabación":"Grabar"}</small></button><button onClick={()=>notify("Los subtítulos se gestionan dentro de Google Meet.")}>CC<small>Subtítulos</small></button><button onClick={()=>notify("La traducción depende de la configuración disponible en la reunión.")}>◎<small>Traducir</small></button><button onClick={()=>notify("Más opciones disponibles al abrir Google Meet.")}>•••<small>Más</small></button><span/><button className="meet-end" onClick={()=>{setRunning(false);setRecording(false);notify("Reunión finalizada en esta sesión.")}}>☎<small>Finalizar</small></button></div></div>
   <aside className="meet-side"><div className="meet-side-tabs"><button className={sideTab==="participantes"?"active":""} onClick={()=>setSideTab("participantes")}>Participantes ({participants.length})</button><button className={sideTab==="chat"?"active":""} onClick={()=>setSideTab("chat")}>Chat</button><button className={sideTab==="documentos"?"active":""} onClick={()=>setSideTab("documentos")}>Documentos</button></div>
   {sideTab==="participantes"&&<div className="meet-participants">{participants.map(p=><div className="meet-person" key={p.id}><i>{p.initials}</i><div><b>{p.name} (Tú)</b><small>{p.company} | {p.role}</small><em>Organizadora</em></div></div>)}<div className="meet-side-actions"><button onClick={shareInvite}>♙ Invitar participantes</button>{active.enlace&&<button onClick={copyLink}>🔗 Copiar enlace</button>}</div></div>}
   {sideTab==="chat"&&<div className="meet-chat"><h3>Chat de la reunión</h3>{messages.length?messages.map((m,i)=><div className={m.mine?"chat-line mine":"chat-line"} key={i}><b>{m.name}</b><small>{m.text}</small></div>):<div className="chat-line"><b>Chat de la reunión</b><small>La conversación aparecerá aquí.</small></div>}<div className="meet-chat-input"><button onClick={()=>notify("Adjuntos se gestionan en el módulo Documentos.")}>📎</button><input value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Escribe un mensaje..."/><button onClick={send}>➤</button></div></div>}
   {sideTab==="documentos"&&<div className="meet-empty"><p>No hay documentos adjuntos a esta reunión en los datos cargados.</p><Link href="/documentos">Abrir Documentos</Link></div>}
   </aside></section><section className="meet-feature-row"><Feature icon="✓" title="Reuniones seguras" text="Comunicación privada dentro del proveedor de videollamada configurado."/><Feature icon="文" title="Idiomas" text="La traducción se muestra según las funciones disponibles en la reunión."/><Feature icon="▤" title="Documentos" text="Los documentos se gestionan desde el módulo Documentos."/></section></>:<section className="meet-empty">No hay una reunión seleccionada. Programá una nueva o abrí una reunión existente.</section>)}
  {notice&&<div className="meet-success" style={{background:"#ecfdf5",color:"#047857",border:"1px solid #a7f3d0"}}>{notice}</div>}{error&&<div className="meet-error">{error}</div>}
 </main>
}
function Feature({icon,title,text}:{icon:string;title:string;text:string}){return <div className="meet-feature"><i>{icon}</i><div><b>{title}</b><span>{text}</span></div></div>}
