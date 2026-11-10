"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "@/lib/supabase/client";
type Prueba={id:string;operacion_id:string;referencia_prueba:string;archivo_path:string;nombre_archivo:string;tamano_bytes:number;estado:string;observaciones:string|null;creado_at:string};
export default function PruebasComisionesPage(){
 const [rows,setRows]=useState<Prueba[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[notes,setNotes]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const {data:admin,error:adminError}=await supabase.rpc("es_administrador_plataforma");
  if(adminError||admin!==true){setError("Acceso exclusivo para administradores.");setLoading(false);return;}
  const {data,error:e}=await supabase.from("operacion_comision_pruebas").select("id,operacion_id,referencia_prueba,archivo_path,nombre_archivo,tamano_bytes,estado,observaciones,creado_at").order("creado_at",{ascending:false});
  if(e)setError(e.message);else setRows((data||[]) as Prueba[]);
  setLoading(false);
 },[]);
 useEffect(()=>{void load()},[load]);
 async function review(row:Prueba,result:"SIMULACION_REVISADA"|"SIMULACION_RECHAZADA"){
  setBusy(row.id);setError("");setMessage("");
  const {error:e}=await supabase.rpc("revisar_simulacion_comision_plataforma",{p_prueba_id:row.id,p_resultado:result,p_observaciones:notes[row.id]||""});
  if(e)setError(e.message);else{setMessage(result==="SIMULACION_REVISADA"?"Prueba aprobada. No se registró un pago real ni se modificó la operación.":"Prueba rechazada. No se registró un pago real ni se modificó la operación.");await load();}
  setBusy("");
 }
 async function openFile(path:string){
  const {data,error:e}=await supabase.storage.from("documentos-operacion").createSignedUrl(path,300);
  if(e){setError(e.message);return;} if(data?.signedUrl)window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 return <main className="module-page"><header className="module-hero"><div><span className="eyebrow">ADMINISTRACIÓN · ENTORNO DE PRUEBAS</span><h1>Revisión de comprobantes simulados</h1><p>Revisá pruebas de carga sin afectar pagos, retenciones, comisiones ni etapas de las operaciones.</p></div></header>
 <div className="module-alert" style={{background:"#fffbeb",color:"#92400e"}}><strong>Importante:</strong> aprobar una simulación solo valida el circuito técnico. Nunca confirma una transferencia ni permite avanzar a contrato.</div>
 {error&&<div className="module-alert module-alert-error">{error}</div>}{message&&<div className="module-alert">{message}</div>}
 <section className="company-card"><h2>Comprobantes de prueba</h2>{loading?<p>Cargando…</p>:rows.length===0?<p>No hay pruebas registradas.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Operación","Referencia de prueba","Archivo","Fecha","Estado","Observaciones","Acciones"].map(x=><th key={x} style={{textAlign:"left",padding:10,borderBottom:"1px solid #ddd"}}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.operacion_id}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.referencia_prueba}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}><button className="module-pill" onClick={()=>void openFile(r.archivo_path)}>{r.nombre_archivo}</button><div style={{fontSize:11,color:"#64748b"}}>{(r.tamano_bytes/1024).toFixed(1)} KB</div></td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{new Date(r.creado_at).toLocaleString("es-AR")}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.estado}</td><td style={{padding:10,borderBottom:"1px solid #eee",minWidth:180}}>{r.estado==="SIMULACION_RECIBIDA"?<input value={notes[r.id]||""} onChange={e=>setNotes(v=>({...v,[r.id]:e.target.value}))} placeholder="Nota opcional" style={{width:"100%",padding:8,border:"1px solid #cbd5e1",borderRadius:6}}/>:(r.observaciones||"—")}</td><td style={{padding:10,borderBottom:"1px solid #eee",whiteSpace:"nowrap"}}>{r.estado==="SIMULACION_RECIBIDA"? <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button disabled={busy===r.id} onClick={()=>void review(r,"SIMULACION_REVISADA")} className="module-pill">{busy===r.id?"…":"Aprobar prueba"}</button><button disabled={busy===r.id} onClick={()=>void review(r,"SIMULACION_RECHAZADA")} className="module-pill" style={{background:"#fee2e2",color:"#991b1b"}}>Rechazar</button></div>:"Revisada"}</td></tr>)}</tbody></table></div>}</section></main>;
}
