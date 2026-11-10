"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "@/lib/supabase/client";
type Retencion={id:string;operacion_id:string;empresa_pagadora_id:string;importe:number;moneda_id:number;referencia_pago:string;comprobante_url:string|null;estado:string;creado_at:string;observaciones:string|null};
type LogisticaRetencion={id:string;codigo_operacion:string;operacion_id:string;empresa_transportista_id:string;empresa_dadora_id:string;cantidad_camiones:number;total_flete_pactado_ars:number;valor_flete_por_camion_ars:number;comision_logistica_por_camion_ars:number;comision_logistica_ars:number;estado_pago_comision_logistica:string;url_comprobante_logistica:string|null;referencia_pago:string|null;fecha_cierre:string;motivo_revision:string|null};
export default function RetencionesComisionesPage(){
 const [rows,setRows]=useState<Retencion[]>([]),[logisticsRows,setLogisticsRows]=useState<LogisticaRetencion[]>([]),[currency,setCurrency]=useState<Record<number,string>>({}),[companyNames,setCompanyNames]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[rejection,setRejection]=useState<Record<string,string>>({}),[logisticsRejection,setLogisticsRejection]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const {data:admin,error:adminError}=await supabase.rpc("es_administrador_plataforma");
  if(adminError||admin!==true){setError("Acceso exclusivo para administradores de AgroBrokerIA.");setLoading(false);return;}
  const [{data,error:retError},{data:curr,error:currError},{data:logistics,error:logisticsError},{data:companies,error:companiesError}]=await Promise.all([
   supabase.from("operacion_comision_retenciones").select("id,operacion_id,empresa_pagadora_id,importe,moneda_id,referencia_pago,comprobante_url,estado,creado_at,observaciones").order("creado_at",{ascending:false}),
   supabase.from("monedas").select("id,codigo"),
   supabase.from("cierres_logistica").select("id,codigo_operacion,operacion_id,empresa_transportista_id,empresa_dadora_id,cantidad_camiones,total_flete_pactado_ars,valor_flete_por_camion_ars,comision_logistica_por_camion_ars,comision_logistica_ars,estado_pago_comision_logistica,url_comprobante_logistica,referencia_pago,fecha_cierre,motivo_revision").order("fecha_cierre",{ascending:false}),
   supabase.from("empresas").select("id,razon_social").limit(1000)
  ]);
  if(retError)setError(retError.message);else setRows((data||[]) as Retencion[]);
  if(currError)setError(currError.message);else setCurrency(Object.fromEntries((curr||[]).map((x:any)=>[x.id,x.codigo])));
  if(logisticsError)setError((actual)=>actual||logisticsError.message);else setLogisticsRows((logistics||[]) as LogisticaRetencion[]);
  if(companiesError)setError((actual)=>actual||companiesError.message);else setCompanyNames(Object.fromEntries((companies||[]).map((x:any)=>[x.id,x.razon_social])));
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
 async function reviewLogistics(row:LogisticaRetencion,approve:boolean){
  const motivo=(logisticsRejection[row.id]||"").trim();
  if(!approve&&!motivo){setError("Indicá el motivo del rechazo del comprobante logístico.");return;}
  if(!window.confirm(approve?"Confirmás que verificaste en home banking el ingreso del 1% logístico en ARS por camión?":"Rechazar el comprobante de comisión logística?"))return;
  setBusy(row.id);setError("");setMessage("");
  const {error:e}=await supabase.rpc("revisar_comision_logistica",{p_cierre_id:row.id,p_aprobar:approve,p_motivo:approve?null:motivo});
  if(e)setError("No se pudo revisar la comisión logística: "+e.message);
  else{setMessage(approve?"Punta B aprobada: comisión logística 1% en ARS por camión verificada.":"Comprobante logístico rechazado; se puede presentar uno nuevo.");await load();}
  setBusy("");
 }
 async function openLogisticsProof(path:string){
  const {data,error:e}=await supabase.storage.from("logistica-comprobantes").createSignedUrl(path,300);
  if(e){setError("No se pudo abrir el comprobante logístico: "+e.message);return;}
  if(data?.signedUrl)window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 async function openProof(path:string){
  const {data,error:e}=await supabase.storage.from("documentos-operacion").createSignedUrl(path,300);
  if(e){setError("No se pudo abrir el comprobante: "+e.message);return;}
  if(data?.signedUrl)window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 return <main className="module-page"><header className="module-hero"><div><span className="eyebrow">ADMINISTRACIÓN FINANCIERA</span><h1>Retenciones de comisión</h1><p>Verificá las transferencias de la comisión AgroBrokerIA. La liberación se ejecuta únicamente al cierre de la operación.</p></div></header>
 {error&&<div className="module-alert module-alert-error">{error}</div>}{message&&<div className="module-alert">{message}</div>}
 <section className="company-card"><h2>Regla de retención</h2><p><strong>Punta A — Granos:</strong> comisión AgroBrokerIA fija de USD 1 por tonelada. El comprobante se valida manualmente en home banking y la comisión queda retenida hasta el cierre de la operación.</p><p><strong>Punta B — Logística:</strong> comisión AgroBrokerIA del 1% en ARS por cada camión contratado, calculada sobre el flete de cada camión. El transportista carga el comprobante y Administración valida el ingreso bancario por separado.</p><p>Verificá siempre moneda, importe, pagador y referencia en el home banking. Nunca apruebes basándote solo en una captura.</p></section>
 <section className="company-card"><h2>Punta A — Comisión de operación de granos (USD 1/TN)</h2>{loading?<p>Cargando…</p>:rows.length===0?<p>No hay comprobantes enviados.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Operación","Empresa pagadora","Importe","Referencia","Comprobante","Estado","Acción"].map(x=><th key={x} style={{textAlign:"left",padding:10,borderBottom:"1px solid #ddd"}}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.operacion_id}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.empresa_pagadora_id}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{currency[r.moneda_id]||"USD"} {Number(r.importe).toLocaleString("es-AR",{minimumFractionDigits:2})}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.referencia_pago}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.comprobante_url?<button className="module-pill" onClick={()=>void openProof(r.comprobante_url!)}>Abrir comprobante</button>:"Sin archivo"}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.estado}</td><td style={{padding:10,borderBottom:"1px solid #eee",minWidth:230}}>{r.estado==="COMPROBANTE_ENVIADO"?<div style={{display:"grid",gap:7}}><button disabled={busy===r.id} onClick={()=>void verify(r)} className="module-pill">{busy===r.id?"Procesando…":"Aprobar y retener"}</button><input value={rejection[r.id]||""} onChange={e=>setRejection(v=>({...v,[r.id]:e.target.value}))} placeholder="Motivo obligatorio si rechazás" style={{padding:7,border:"1px solid #cbd5e1",borderRadius:6}}/><button disabled={busy===r.id} onClick={()=>void reject(r)} className="module-pill" style={{background:"#fee2e2",color:"#991b1b"}}>Rechazar comprobante</button></div>:"—"}</td></tr>)}</tbody></table></div>}</section>
 <section className="company-card"><h2>Punta B — Comprobantes de comisión logística (1% ARS por camión)</h2><p>El pagador es la empresa transportista. La aprobación habilita la asignación de camiones, patentes y choferes y la prevalidación de CPE, sujeto a los demás controles.</p>{loading?<p>Cargando…</p>:logisticsRows.length===0?<p>No hay cierres de flete registrados.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Cierre / operación","Transportista pagador","Camiones","Flete por camión","Comisión por camión","Comisión total","Comprobante","Estado","Acción"].map(x=><th key={x} style={{textAlign:"left",padding:10,borderBottom:"1px solid #ddd"}}>{x}</th>)}</tr></thead><tbody>{logisticsRows.map(r=><tr key={r.id}><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.codigo_operacion}<div style={{fontSize:11,color:"#64748b"}}>Operación: {r.operacion_id}</div></td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{companyNames[r.empresa_transportista_id]||r.empresa_transportista_id}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.cantidad_camiones}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>ARS {Number(r.valor_flete_por_camion_ars||0).toLocaleString("es-AR",{minimumFractionDigits:2})}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>ARS {Number(r.comision_logistica_por_camion_ars||0).toLocaleString("es-AR",{minimumFractionDigits:2})}</td><td style={{padding:10,borderBottom:"1px solid #eee",fontWeight:800}}>ARS {Number(r.comision_logistica_ars||0).toLocaleString("es-AR",{minimumFractionDigits:2})}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.url_comprobante_logistica?<button className="module-pill" onClick={()=>void openLogisticsProof(r.url_comprobante_logistica!)}>Abrir comprobante</button>:"Sin archivo"}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}>{r.estado_pago_comision_logistica}</td><td style={{padding:10,borderBottom:"1px solid #eee",minWidth:240}}>{r.estado_pago_comision_logistica==="comprobante_enviado"?<div style={{display:"grid",gap:7}}><button disabled={busy===r.id} onClick={()=>void reviewLogistics(r,true)} className="module-pill">{busy===r.id?"Procesando…":"DAR OK LOGÍSTICA"}</button><input value={logisticsRejection[r.id]||""} onChange={e=>setLogisticsRejection(v=>({...v,[r.id]:e.target.value}))} placeholder="Motivo obligatorio si rechazás" style={{padding:7,border:"1px solid #cbd5e1",borderRadius:6}}/><button disabled={busy===r.id} onClick={()=>void reviewLogistics(r,false)} className="module-pill" style={{background:"#fee2e2",color:"#991b1b"}}>RECHAZAR</button></div>:"—"}</td></tr>)}</tbody></table></div>}</section></main>;
}
