"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "@/lib/supabase/client";
type Copy={id:string;contrato_id:string;operacion_id:string;rol:string;version_contrato:number;empresa_id:string;storage_path:string;nombre_archivo:string;sha256:string;estado:string;observaciones:string|null;subido_at:string;contratos?:{numero_contrato:string}|null};
export default function RevisarFirmasPage(){
 const [rows,setRows]=useState<Copy[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[notes,setNotes]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const {data:admin,error:ae}=await supabase.rpc("es_administrador_plataforma");
  if(ae||admin!==true){setError("Acceso exclusivo para administradores.");setLoading(false);return;}
  const {data,error:e}=await supabase.from("contrato_copias_firmadas").select("id,contrato_id,operacion_id,rol,version_contrato,empresa_id,storage_path,nombre_archivo,sha256,estado,observaciones,subido_at,contratos(numero_contrato)").order("subido_at",{ascending:false});
  if(e)setError(e.message);else setRows((data||[]) as unknown as Copy[]);
  setLoading(false);
 },[]);
 useEffect(()=>{void load()},[load]);
 async function openFile(path:string){const {data,error:e}=await supabase.storage.from("documentos-operacion").createSignedUrl(path,300);if(e){setError(e.message);return;}if(data?.signedUrl)window.open(data.signedUrl,"_blank","noopener,noreferrer");}
 async function review(r:Copy,result:"APROBADA"|"RECHAZADA"){
  const note=(notes[r.id]||"").trim();if(result==="RECHAZADA"&&!note){setError("Para rechazar, indicá el motivo.");return;}
  if(!window.confirm(result==="APROBADA"?"Confirmás que revisaste el PDF y validás esta copia firmada?":"Confirmás el rechazo de esta copia?"))return;
  setBusy(r.id);setError("");setMessage("");
  const {error:e}=await supabase.rpc("revisar_copia_firmada_contrato",{p_copia_id:r.id,p_resultado:result,p_observaciones:note||""});
  if(e)setError(e.message);else{setMessage(result==="APROBADA"?"Copia validada. La firma de esta parte quedó registrada.":"Copia rechazada. La parte deberá cargar una nueva versión firmada.");await load();}
  setBusy("");
 }
 return <main className="module-page"><header className="module-hero"><div><span className="eyebrow">ADMINISTRACIÓN · CONTRATOS</span><h1>Validación de firmas bilaterales</h1><p>Revisá cada copia firmada por separado. Verificá que corresponda al contrato y versión indicados, y que la firma corresponda a la parte que la presenta.</p></div></header>
 <div className="module-alert" style={{background:"#fffbeb",color:"#92400e"}}><b>Control obligatorio:</b> no habilitar Fondos hasta que todas las partes requeridas tengan su copia firmada aprobada para la misma versión del contrato.</div>
 {error&&<div className="module-alert module-alert-error">{error}</div>}{message&&<div className="module-alert">{message}</div>}
 <section className="company-card"><h2>Copias recibidas</h2>{loading?<p>Cargando…</p>:rows.length===0?<p>No hay copias firmadas cargadas.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Contrato","Operación","Parte","Versión","Archivo","SHA-256","Estado","Observaciones","Revisión"].map(x=><th key={x} style={{textAlign:"left",padding:9,borderBottom:"1px solid #ddd"}}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={{padding:9,borderBottom:"1px solid #eee"}}>{r.contratos?.numero_contrato||r.contrato_id}</td><td style={{padding:9,borderBottom:"1px solid #eee"}}>{r.operacion_id}</td><td style={{padding:9,borderBottom:"1px solid #eee"}}>{r.rol}</td><td style={{padding:9,borderBottom:"1px solid #eee"}}>{r.version_contrato}</td><td style={{padding:9,borderBottom:"1px solid #eee"}}><button className="module-pill" onClick={()=>void openFile(r.storage_path)}>{r.nombre_archivo}</button></td><td style={{padding:9,borderBottom:"1px solid #eee",fontSize:10,maxWidth:140,wordBreak:"break-all"}}>{r.sha256}</td><td style={{padding:9,borderBottom:"1px solid #eee"}}>{r.estado}</td><td style={{padding:9,borderBottom:"1px solid #eee",minWidth:170}}>{r.estado==="PENDIENTE"?<input value={notes[r.id]||""} onChange={e=>setNotes(v=>({...v,[r.id]:e.target.value}))} placeholder="Motivo si rechazás" style={{padding:7,border:"1px solid #cbd5e1",borderRadius:6,width:"100%"}}/>:(r.observaciones||"—")}</td><td style={{padding:9,borderBottom:"1px solid #eee",minWidth:180}}>{r.estado==="PENDIENTE"? <div style={{display:"grid",gap:6}}><button disabled={busy===r.id} className="module-pill" onClick={()=>void review(r,"APROBADA")}>Aprobar firma</button><button disabled={busy===r.id} className="module-pill" style={{background:"#fee2e2",color:"#991b1b"}} onClick={()=>void review(r,"RECHAZADA")}>Rechazar</button></div>:"Revisada"}</td></tr>)}</tbody></table></div>}</section></main>;
}
