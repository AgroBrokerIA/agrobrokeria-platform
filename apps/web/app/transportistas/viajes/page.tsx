"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Viaje = { id: string; operacion_id: string; estado: string; origen: string | null; destino: string | null; origen_nombre: string | null; destino_nombre: string | null; patente_camion: string | null; patente_acoplado: string | null };
type Evento = { id: string; estado: string; lugar: string | null; empresa_nombre: string | null; registrado_at: string; observaciones: string | null };
type CPE = { id: string; numero_carta_porte: string; archivo_path: string; nombre_archivo: string; estado_verificacion: string; toneladas_declaradas: number | null };

const etapas = [
 ["ARRIBO_ORIGEN","Llegué a la planta de origen"],
 ["INICIO_CARGA","Comenzó la carga"],
 ["CARGA_FINALIZADA","Carga finalizada"],
 ["SALIDA_ORIGEN","Salí de origen"],
 ["EN_TRANSITO","En tránsito"],
 ["ARRIBO_DESTINO","Llegué al destino"],
 ["INICIO_DESCARGA","Comenzó la descarga"],
 ["DESCARGA_FINALIZADA","Descarga finalizada"],
] as const;

const label = (s:string) => ({
 ASIGNADO:"Camión asignado",CAMION_ASIGNADO:"Camión asignado",ARRIBO_ORIGEN:"Arribo a planta de origen",
 INICIO_CARGA:"Inicio de carga",CARGA_FINALIZADA:"Carga finalizada",SALIDA_ORIGEN:"Salida de origen",
 EN_TRANSITO:"En tránsito",ARRIBO_DESTINO:"Arribo a destino",INICIO_DESCARGA:"Inicio de descarga",
 DESCARGA_FINALIZADA:"Descarga finalizada",ENTREGA_CONFIRMADA:"Entrega confirmada",
}[s] || s.replaceAll("_"," "));
const fecha=(s:string)=>new Date(s).toLocaleString("es-AR");

export default function MisViajesTransportistaPage(){
 const [uid,setUid]=useState("");
 const [viajes,setViajes]=useState<Viaje[]>([]);
 const [eventos,setEventos]=useState<Evento[]>([]);
 const [cartas,setCartas]=useState<CPE[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [mensaje,setMensaje]=useState("");

 const cargar=useCallback(async()=>{
  setLoading(true);setError("");
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setError("Iniciá sesión para consultar tus viajes.");setLoading(false);return;}
  setUid(auth.user.id);
  const {data:v,error:ve}=await supabase.from("viajes").select("*").eq("transportista_profile_id",auth.user.id).order("creado_en",{ascending:false});
  if(ve){setError(ve.message);setLoading(false);return;}
  const rows=(v||[]) as Viaje[];setViajes(rows);
  if(rows.length){
   const ids=rows.map(x=>x.id);
   const [ev,cp]=await Promise.all([
    supabase.from("viaje_eventos").select("*").in("viaje_id",ids).order("registrado_at",{ascending:true}),
    supabase.from("viaje_cartas_porte").select("*").in("viaje_id",ids).order("creada_at",{ascending:false})
   ]);
   if(ev.error)setError(ev.error.message);else setEventos((ev.data||[]) as Evento[]);
   if(cp.error)setError(cp.error.message);else setCartas((cp.data||[]) as CPE[]);
  }else{setEventos([]);setCartas([]);}
  setLoading(false);
 },[]);

 useEffect(()=>{void cargar();},[cargar]);

 async function actualizar(v:Viaje,estado:string){
  setBusy(true);setError("");setMensaje("");
  const origen=["ARRIBO_ORIGEN","INICIO_CARGA","CARGA_FINALIZADA","SALIDA_ORIGEN"].includes(estado);
  const {error:e}=await supabase.rpc("registrar_evento_viaje",{
   p_viaje_id:v.id,p_estado:estado,p_lugar:origen?(v.origen||v.origen_nombre):(v.destino||v.destino_nombre),
   p_empresa_nombre:origen?(v.origen_nombre||""):(v.destino_nombre||""),p_toneladas:null,p_observaciones:null
  });
  if(e)setError("No se pudo actualizar el viaje: "+e.message);
  else setMensaje("Seguimiento actualizado: "+label(estado));
  await cargar();setBusy(false);
 }

 async function abrir(path:string){
  const {data,error:e}=await supabase.storage.from("agrobroker-private").createSignedUrl(path,90);
  if(e||!data?.signedUrl){setError("No se pudo abrir el PDF: "+(e?.message||"sin enlace"));return;}
  window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }

 if(loading)return <main style={{padding:24}}>Cargando tus viajes…</main>;
 return <main style={{maxWidth:1000,margin:"28px auto",padding:20,display:"grid",gap:15,color:"#0f172a"}}>
  <header><div style={{fontSize:22,fontWeight:850}}>Mis viajes asignados</div><div style={{fontSize:13,color:"#64748b",marginTop:4}}>Actualizá cada etapa del recorrido desde tu cuenta. Solo ves los viajes que te asignaron.</div></header>
  {error&&<div role="alert" style={{background:"#fff1f2",color:"#9f1239",padding:11,borderRadius:9}}>{error}</div>}
  {mensaje&&<div role="status" style={{background:"#ecfdf5",color:"#166534",padding:11,borderRadius:9}}>{mensaje}</div>}
  {!viajes.length&&<div style={{padding:18,border:"1px solid #dbe3ed",borderRadius:12,color:"#64748b"}}>Todavía no tenés viajes asignados.</div>}
  {viajes.map(v=>{
   const ev=eventos.filter(x=>eventos.length&&x.id&&true).filter(x=>(x as any).viaje_id===v.id);
   const cp=cartas.filter(x=>(x as any).viaje_id===v.id);
   const next=etapas.find(([s])=>!ev.some(x=>x.estado===s));
   return <section key={v.id} style={{border:"1px solid #dbe3ed",borderRadius:13,padding:16,background:"#fff",display:"grid",gap:12}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
     <div><div style={{fontWeight:850}}>Camión {v.patente_camion||"sin patente"} {v.patente_acoplado?"· Acoplado "+v.patente_acoplado:""}</div><div style={{fontSize:12,color:"#64748b",marginTop:4}}>{v.origen_nombre||v.origen} → {v.destino_nombre||v.destino}</div></div>
     <span style={{fontSize:11,fontWeight:800,padding:"6px 10px",borderRadius:99,background:"#eaf2ff",color:"#1d4ed8"}}>{label(v.estado)}</span>
    </div>
    <div><div style={{fontSize:13,fontWeight:800,marginBottom:7}}>Cartas de Porte de tu viaje</div>{cp.length?cp.map(x=><div key={x.id} style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",padding:9,border:"1px solid #e2e8f0",borderRadius:8,marginTop:6}}><div style={{fontSize:12}}><strong>CPE {x.numero_carta_porte}</strong><div style={{color:"#64748b"}}>{x.nombre_archivo} · {x.estado_verificacion}</div></div><button type="button" onClick={()=>void abrir(x.archivo_path)} style={{border:"1px solid #cbd5e1",borderRadius:8,padding:"7px 10px",background:"#fff",fontWeight:700}}>Ver PDF</button></div>):<div style={{fontSize:12,color:"#64748b"}}>Todavía no hay documentos asociados.</div>}</div>
    <div><div style={{fontSize:13,fontWeight:800,marginBottom:7}}>Historial del recorrido</div>{ev.map(x=><div key={x.id} style={{padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}><div style={{fontSize:12,fontWeight:750}}>{label(x.estado)}</div><div style={{fontSize:11,color:"#64748b"}}>{x.empresa_nombre||""}{x.lugar?" · "+x.lugar:""} · {fecha(x.registrado_at)}</div></div>)}</div>
    {next&&v.estado!=="ENTREGADO_CONFIRMADO"&&<button disabled={busy} type="button" onClick={()=>void actualizar(v,next[0])} style={{border:0,borderRadius:9,padding:"10px 14px",background:"#078b58",color:"#fff",fontWeight:800,justifySelf:"start"}}>{busy?"Actualizando…":"Registrar: "+next[1]}</button>}
   </section>
  })}
 </main>;
}
