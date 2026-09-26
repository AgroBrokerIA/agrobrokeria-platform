"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Viaje={id:string;operacion_id:string;vehiculo_id:string|null;origen:string|null;destino:string|null;fecha_salida:string|null;fecha_llegada:string|null;estado:string|null};
type Operacion={id:string;codigo:string|null;cantidad_tn:number|null;estado:string|null};
type Entrega={viaje_id:string;toneladas_entregadas:number|null;fecha_entrega:string|null;recibido_por:string|null};
type Logistica={operacion_id:string;estado:string|null;carta_porte_numero:string|null;carta_porte_estado:string|null;transportista:string|null;transportista_cuit:string|null;chofer_nombre:string|null;patente_camion:string|null;patente_acoplado:string|null;fecha_carga:string|null;fecha_estimada_entrega:string|null;destino:string|null;kilos_entregados:number|null};

const fecha=(v:string|null)=>v?new Date(v).toLocaleDateString("es-AR"):"—";
const toneladas=(v:number|null)=>v==null?"—":Number(v).toLocaleString("es-AR",{maximumFractionDigits:2})+" t";

export default function LogisticaPage(){
 const [viajes,setViajes]=useState<Viaje[]>([]),[ops,setOps]=useState<Operacion[]>([]),[entregas,setEntregas]=useState<Entrega[]>([]),[logs,setLogs]=useState<Logistica[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[filtro,setFiltro]=useState("TODOS");
 useEffect(()=>{async function load(){
  try{
   const [v,o,e,l]=await Promise.all([
    supabase.from("viajes").select("id,operacion_id,vehiculo_id,origen,destino,fecha_salida,fecha_llegada,estado").order("fecha_salida",{ascending:false}).limit(100),
    supabase.from("operaciones").select("id,codigo,cantidad_tn,estado").order("fecha_operacion",{ascending:false}).limit(100),
    supabase.from("entregas").select("viaje_id,toneladas_entregadas,fecha_entrega,recibido_por").order("fecha_entrega",{ascending:false}).limit(200),
    supabase.from("operacion_logistica").select("operacion_id,estado,carta_porte_numero,carta_porte_estado,transportista,transportista_cuit,chofer_nombre,patente_camion,patente_acoplado,fecha_carga,fecha_estimada_entrega,destino,kilos_entregados").order("updated_at",{ascending:false}).limit(100)
   ]);
   const err=[v.error,o.error,e.error,l.error].find(Boolean);if(err)throw new Error(err.message);
   setViajes((v.data||[]) as Viaje[]);setOps((o.data||[]) as Operacion[]);setEntregas((e.data||[]) as Entrega[]);setLogs((l.data||[]) as Logistica[]);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar logística.");}finally{setLoading(false)}
 }void load()},[]);
 const opMap=useMemo(()=>new Map(ops.map(o=>[o.id,o])),[ops]);
 const logMap=useMemo(()=>new Map(logs.map(l=>[l.operacion_id,l])),[logs]);
 const counts=useMemo(()=>({total:viajes.length,programados:viajes.filter(v=>["PROGRAMADO","PROGRAMADA"].includes(String(v.estado).toUpperCase())).length,enCurso:viajes.filter(v=>["EN_TRANSITO","EN CURSO","EN_CURSO"].includes(String(v.estado).toUpperCase())).length,entregados:viajes.filter(v=>["ENTREGADO","FINALIZADO","ENTREGADA"].includes(String(v.estado).toUpperCase())).length}),[viajes]);
 const rows=viajes.filter(v=>filtro==="TODOS"||String(v.estado).toUpperCase()===filtro);
 const entregaPorViaje=new Map(entregas.map(e=>[e.viaje_id,e]));
 return <main className="module-page logistics-page">
  <div className="module-hero"><div><span className="eyebrow">LOGÍSTICA Y ENTREGAS</span><h1>Logística</h1><p>Seguimiento de viajes, cargas, cartas de porte, transportistas y entregas de operaciones.</p></div><Link className="module-pill" href="/operaciones">Ver operaciones →</Link></div>
  {error&&<div className="module-alert error">{error}</div>}
  <div className="document-summary">
   <div><strong>{counts.total}</strong><span>Viajes registrados</span></div><div><strong>{counts.programados}</strong><span>Programados</span></div><div><strong>{counts.enCurso}</strong><span>En tránsito</span></div>
  </div>
  <section className="document-section">
   <div className="document-section-head"><div><h2>Seguimiento de viajes</h2><p>Datos registrados en la operación logística. Los estados no se inventan si no existen.</p></div>
    <select value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="TODOS">Todos</option><option value="PROGRAMADO">Programados</option><option value="EN_TRANSITO">En tránsito</option><option value="ENTREGADO">Entregados</option></select>
   </div>
   {loading?<div className="module-empty"><div className="module-empty-icon">⌁</div><h2>Cargando logística...</h2></div>:rows.length===0?<div className="module-empty"><div className="module-empty-icon">⌁</div><h2>No hay viajes para mostrar</h2><p>Los viajes aparecerán cuando existan registros accesibles para tu empresa.</p></div>:
   <div className="logistics-table-wrap"><table className="logistics-table"><thead><tr><th>Operación</th><th>Ruta</th><th>Salida</th><th>Estado</th><th>Transportista</th><th>Carta de porte</th><th>Entrega</th><th></th></tr></thead><tbody>
   {rows.map(v=>{const op=opMap.get(v.operacion_id);const l=logMap.get(v.operacion_id);const ent=entregaPorViaje.get(v.id);return <tr key={v.id}><td><strong>{op?.codigo||v.operacion_id.slice(0,8)}</strong><small>{toneladas(op?.cantidad_tn??null)}</small></td><td>{v.origen||"—"} → {v.destino||l?.destino||"—"}</td><td>{fecha(v.fecha_salida)}</td><td><span className="logistics-status">{v.estado||l?.estado||"SIN ESTADO"}</span></td><td>{l?.transportista||"—"}<small>{l?.patente_camion||"Sin patente"}</small></td><td>{l?.carta_porte_numero||"No registrada"}<small>{l?.carta_porte_estado||"—"}</small></td><td>{ent?toneladas(ent.toneladas_entregadas):l?.kilos_entregados!=null?toneladas(Number(l.kilos_entregados)/1000):"Pendiente"}</td><td><Link href={"/operaciones/"+v.operacion_id}>Ver operación</Link></td></tr>})}
   </tbody></table></div>}
  </section>
 </main>;
}
