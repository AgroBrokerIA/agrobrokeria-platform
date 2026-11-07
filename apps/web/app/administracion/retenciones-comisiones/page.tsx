"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "@/lib/supabase/client";
type Retencion={id:string;operacion_id:string;empresa_pagadora_id:string;importe:number;moneda_id:number;referencia_pago:string;comprobante_url:string|null;estado:string;creado_at:string;observaciones:string|null};
export default function RetencionesComisionesPage(){
 const [rows,setRows]=useState<Retencion[]>([]),[currency,setCurrency]=useState<Record<number,string>>({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[rejection,setRejection]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const {data:admin,error:adminError}=await supabase.rpc("es_administrador_plataforma");
  if(adminError||admin!==true){setError("Acceso exclusivo para administradores de AgroBrokerIA.");setLoading(false);return;}
  const [{data,error:retError},{data:curr,error:currError}]=await Promise.all([
   supabase.from("operacion_comision_retenciones").select("id,operacion_id,empresa_pagadora_id,importe,moneda_id,referencia_pago,comprobante_url,estado,creado_at,observaciones").order("creado_at",{ascending:false}),
   supabase.from("monedas").select("id,codigo")
  ]);
  if(retError)setError(retError.message);else setRows((data||[]) as Retencion[]);
  if(currError)setError(currError.message);else setCurrency(Object.fromEntries((curr||[]).map((x:any)=>[x.id,x.codigo])));
  setLoading(false);
 },[]);
 useEffect(()=>{void load()},[load]);
 async function verify(row:Retencion){
  const bankReference=window.prompt("Ingresá el número de operación bancaria que figura en el home banking. No uses el código de operación de AgroBrokerIA ni la referencia interna del comprobante:");
  if(bankReference===null)return;
  const normalizedReference=bankReference.trim();
  if(!normalizedReference){setError("El número de operación bancaria es obligatorio.");return;}
  if(normalizedReference.length>80){setError("El número de operación bancaria no puede superar 80 caracteres.");return;}
  const ok=window.confirm("Confirmás que verificaste en el home banking el ingreso efectivo, el importe y la referencia? Esta acción registrará la validación bancaria y retendrá la comisión.");
  if(!ok)return;
  setBusy(row.id);setError("");setMessage("");
  const {error:e}=await supabase.rpc("validar_comprobante_comision_bancaria",{p_retencion_id:row.id,p_numero_operacion_bancaria:normalizedReference,p_observaciones:"Ingreso bancario verificado manualmente por administración."});
  if(e){
   const details=e.message||"";
   const friendly=details.includes("MANUAL_BANK_VALIDATION_REQUIRED")?"Falta registrar la validación bancaria.":details.includes("FUNDS_STAGE_REQUIRED")?"La operación todavía no está en la etapa habilitada para retener la comisión.":details.includes("APPROVED_MERCHANDISE_INSPECTION_REQUIRED")?"La mercadería todavía no tiene el visado aprobado.":details.includes("INVALID_RETENTION_STATE")?"El comprobante ya no está pendiente de validación.":details.includes("PLATFORM_ADMIN_REQUIRED")?"Tu sesión no tiene permisos de administración.":details;
   setError("No se pudo aprobar la retención: "+friendly);
  }else{setMessage("Validación bancaria registrada. La comisión quedó RETENIDA y se liberará únicamente al cierre de la operación.");await load();}
  setBusy("");
 }
 async function reject(row:Retencion){
  const motivo=(rejection[row.id]||"").trim();
  if(!motivo){setError("Indicá el motivo del rechazo antes de continuar.");return;}
  if(!window.confirm("Rechazar el comprobante? La comisión no quedará retenida y la operación no avanzará."))return;
  setBusy(row.id);setError("");setMessage("");
  const {error:e}=await supabase.rpc("rechazar_comprobante_comision_plataforma",{p_retencion_id:row.id,p_motivo:motivo});
  if(e)setError(e.message);else{setMessage("Comprobante rechazado. El pagador deberá presentar uno nuevo.");await load();}
  setBusy("");
 }
 async function openProof(path:string){
  const {data,error:e}=await supabase.storage.from("documentos-operacion").createSignedUrl(path,300);
  if(e){setError("No se pudo abrir el comprobante: "+e.message);return;}
  if(data?.signedUrl)window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 return <main className="module-page"><header className="module-hero"><div><span className="eyebrow">ADMINISTRACIÓN FINANCIERA</span><h1>Retenciones de comisión</h1><p>Verificá las transferencias de la comisión AgroBrokerIA. La liberación se ejecuta únicamente al cierre de la operación.</p></div></header>
 {error&&<div className="module-alert module-alert-error">{error}</div>}{message&&<div className="module-alert">{message}</div>}
 <section className="company-card"><h2>Regla de retención</h2><p>El participante envía el comprobante después del visado aprobado. Desde esta pantalla verificás en el home banking que el dinero haya ingresado realmente, que importe y referencia coincidan, y luego aprobás para retener la comisión. Si no ingresó o los datos no coinciden, rechazás indicando el motivo. Nunca apruebes basándote solo en una captura.</p></section>
 <section className="company-card"><h2>Comprobantes recibidos</h2>{loading?<p>Cargando…</p>:rows.length===0?<p>No hay comprobantes enviados.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Operación","Empresa pagadora","Importe","Referencia","Comprobante","Estado","Acción"].map(x=><th key={x} style={{textAlign:"left",padding:10,borderBottom:"1px solid #ddd"}}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.operacion_id}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.empresa_pagadora_id}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{currency[r.moneda_id]||"USD"} {Number(r.importe).toLocaleString("es-AR",{minimumFractionDigits:2})}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.referencia_pago}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.comprobante_url?<button className="module-pill" onClick={()=>void openProof(r.comprobante_url!)}>Abrir comprobante</button>:"Sin archivo"}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.estado}</td><td style={{padding:10,borderBottom:"1px solid #eee",minWidth:230}}>{r.estado==="COMPROBANTE_ENVIADO"?<div style={{display:"grid",gap:7}}><button disabled={busy===r.id} onClick={()=>void verify(r)} className="module-pill">{busy===r.id?"Procesando…":"Aprobar y retener"}</button><input value={rejection[r.id]||""} onChange={e=>setRejection(v=>({...v,[r.id]:e.target.value}))} placeholder="Motivo obligatorio si rechazás" style={{padding:7,border:"1px solid #cbd5e1",borderRadius:6}}/><button disabled={busy===r.id} onClick={()=>void reject(r)} className="module-pill" style={{background:"#fee2e2",color:"#991b1b"}}>Rechazar comprobante</button></div>:"—"}</td></tr>)}</tbody></table></div>}</section></main>;
}
