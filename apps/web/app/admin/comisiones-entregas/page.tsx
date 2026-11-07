"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase/client";
type Share={id:string;viaje_id:string;importe_liberado:number;estado:string;liberada_at:string|null;viajes?:{patente_camion:string|null;carta_porte_numero:string|null;estado:string|null;destino:string|null;viaje_cartas_porte?:{estado_verificacion:string;numero_carta_porte:string}[]|null}|null};
type Retention={id:string;operacion_id:string;importe:number;moneda_id:number;referencia_pago:string;referencia_bancaria_validada:string|null;comprobante_url:string|null;estado:string;observaciones:string|null;creado_at:string;fecha_validacion_manual:string|null;operaciones?:{codigo:string;cantidad_tn:number}|null;operacion_comision_viajes?:Share[]};
export default function ComisionesEntregasAdmin(){
 const[admin,setAdmin]=useState(false),[rows,setRows]=useState<Retention[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState("");
 const[refs,setRefs]=useState<Record<string,string>>({}),[notes,setNotes]=useState<Record<string,string>>({}),[busy,setBusy]=useState<string|null>(null);
 async function load(){setLoading(true);setError("");const{data:ok,error:adminError}=await supabase.rpc("es_administrador_plataforma");if(adminError||ok!==true){setAdmin(false);setLoading(false);return;}setAdmin(true);
 const{data,error}=await supabase.from("operacion_comision_retenciones").select("id,operacion_id,importe,moneda_id,referencia_pago,referencia_bancaria_validada,comprobante_url,estado,observaciones,creado_at,fecha_validacion_manual,operaciones(codigo,cantidad_tn)").order("creado_at",{ascending:false});
 if(error){setError(error.message);setRows([]);setLoading(false);return;}
 const base=(data||[]) as unknown as Retention[];
 const operationIds=[...new Set(base.map(x=>x.operacion_id).filter(Boolean))];
 if(operationIds.length){
   const{data:allocations,error:allocationError}=await supabase.from("operacion_comision_viajes").select("id,operacion_id,viaje_id,importe_liberado,estado,liberada_at,viajes(patente_camion,carta_porte_numero,estado,destino)").in("operacion_id",operationIds);
   if(allocationError){setError(allocationError.message);setRows(base);setLoading(false);return;}
   const voyageIds=[...new Set((allocations||[]).map((x:any)=>x.viaje_id).filter(Boolean))];
   let cpes:any[]=[];
   if(voyageIds.length){const{data:cpesData}=await supabase.from("viaje_cartas_porte").select("viaje_id,estado_verificacion,numero_carta_porte").in("viaje_id",voyageIds);cpes=cpesData||[];}
   const hydrated=base.map(row=>({...row,operacion_comision_viajes:(allocations||[]).filter((a:any)=>a.operacion_id===row.operacion_id).map((a:any)=>({...a,viajes:a.viajes?{...a.viajes,viaje_cartas_porte:cpes.filter((cp:any)=>cp.viaje_id===a.viaje_id)}:null}))}));
   setRows(hydrated as unknown as Retention[]);
 }else setRows(base);
 setLoading(false);}
 useEffect(()=>{void load()},[]);
 async function openReceipt(path:string){const{data,error}=await supabase.storage.from("documentos-operacion").createSignedUrl(path,300);if(error||!data?.signedUrl){setError(error?.message||"No se pudo abrir el comprobante.");return;}window.open(data.signedUrl,"_blank","noopener,noreferrer");}
 async function approve(id:string){setBusy(id);setError("");setMessage("");const{error}=await supabase.rpc("validar_comprobante_comision_bancaria",{p_retencion_id:id,p_numero_operacion_bancaria:refs[id]||"",p_observaciones:notes[id]||null});if(error)setError(error.message);else{setMessage("Ingreso bancario validado y comisión distribuida por viaje. Cada tramo se libera al confirmar los hitos documentales.");await load();}setBusy(null);}
 async function reject(id:string){const reason=notes[id]?.trim();if(!reason){setError("Ingresá el motivo de rechazo.");return;}setBusy(id);setError("");const{error}=await supabase.rpc("rechazar_comprobante_comision_plataforma",{p_retencion_id:id,p_motivo:reason});if(error)setError(error.message);else{setMessage("Comprobante rechazado; el operador puede volver a cargarlo.");await load();}setBusy(null);}
 const money=(v:number)=>Number(v||0).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});
 const shares=rows.flatMap(r=>r.operacion_comision_viajes||[]);
 const held=shares.filter(x=>x.estado==="RETENIDA").reduce((s,x)=>s+Number(x.importe_liberado),0);
 const released=shares.filter(x=>x.estado==="LIBERADA").reduce((s,x)=>s+Number(x.importe_liberado),0);
 const pending=rows.filter(r=>r.estado==="COMPROBANTE_ENVIADO");
 const retainedParent=rows.filter(r=>r.estado==="RETENIDA").reduce((s,r)=>s+Number(r.importe),0);
 const unallocated=Math.max(0,retainedParent-held-released);
 return <main style={{maxWidth:1180,margin:"0 auto",padding:24,color:"var(--foreground,#172033)"}}>
 <p style={{fontSize:13,color:"#64748b"}}>ADMINISTRACIÓN · CONCILIACIÓN</p><h1 style={{fontSize:28,fontWeight:800}}>Comisiones por entrega individual</h1><p style={{color:"#64748b"}}>Validación manual de transferencias y seguimiento contable por camión. La liberación no mueve dinero desde una cuenta bancaria; refleja el cumplimiento de hitos de cada viaje.</p>
 {!loading&&!admin?<p>Acceso exclusivo de administración.</p>:null}
 {error&&<p role="alert" style={{background:"#fee2e2",color:"#991b1b",padding:12,borderRadius:9}}>{error}</p>}{message&&<p role="status" style={{background:"#dcfce7",color:"#166534",padding:12,borderRadius:9}}>{message}</p>}
 {admin&&<><section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,margin:"18px 0"}}>
 <article style={kpi}><small>Comprobantes pendientes</small><div style={big}>{pending.length}</div><small>Requieren conciliación bancaria</small></article>
 <article style={kpi}><small>Saldo retenido contablemente</small><div style={big}>USD {money(held)}</div><small>Viajes aún no liberados</small></article>
 <article style={kpi}><small>Saldo liberado contablemente</small><div style={big}>USD {money(released)}</div><small>Entregas individuales conformadas</small></article>
 <article style={kpi}><small>Total asignado a viajes</small><div style={big}>USD {money(held+released)}</div><small>Tramos registrados</small></article><article style={kpi}><small>Pendiente de asignar</small><div style={big}>USD {money(unallocated)}</div><small>Comisión cobrada sin viajes con toneladas informadas</small></article></section>
 <h2 style={{fontSize:20,fontWeight:750,margin:"24px 0 10px"}}>Mesa de entrada de comprobantes</h2>
 {loading?<p>Cargando…</p>:rows.length===0?<p>No hay comprobantes registrados.</p>:rows.map(r=><article key={r.id} style={panel}>
 <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong>{r.operaciones?.codigo||r.operacion_id}</strong><p style={{margin:"5px 0",color:"#64748b"}}>{Number(r.operaciones?.cantidad_tn||0).toLocaleString("es-AR")} TN · Comisión total USD {money(r.importe)} · Referencia: {r.referencia_pago}</p><small>Estado: <b>{r.estado}</b> · {new Date(r.creado_at).toLocaleString("es-AR")}</small></div>{r.comprobante_url&&<button onClick={()=>void openReceipt(r.comprobante_url!)} style={outline}>Ver comprobante privado</button>}</div>
 {r.estado==="COMPROBANTE_ENVIADO"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:14}}>
 <label>N.º operación bancaria validada<input value={refs[r.id]||""} onChange={e=>setRefs(v=>({...v,[r.id]:e.target.value}))} style={field} placeholder="Referencia de homebanking"/></label>
 <label>Observaciones / motivo<input value={notes[r.id]||""} onChange={e=>setNotes(v=>({...v,[r.id]:e.target.value}))} style={field} placeholder="Detalle de conciliación o rechazo"/></label>
 <div style={{display:"flex",alignItems:"end",gap:8,flexWrap:"wrap"}}><button disabled={busy===r.id||!refs[r.id]?.trim()} onClick={()=>void approve(r.id)} style={success}>{busy===r.id?"Procesando…":"Aprobar y asignar por camión"}</button><button disabled={busy===r.id||!notes[r.id]?.trim()} onClick={()=>void reject(r.id)} style={danger}>Rechazar comprobante</button></div></div>}
 {r.referencia_bancaria_validada&&<p style={{fontSize:13,color:"#166534"}}>Validación bancaria: {r.referencia_bancaria_validada} · {r.fecha_validacion_manual?new Date(r.fecha_validacion_manual).toLocaleString("es-AR"):""}</p>}
 <div style={{marginTop:14,borderTop:"1px solid #e2e8f0",paddingTop:12}}><strong>Distribución por viaje</strong>{!r.operacion_comision_viajes?.length?<p style={{color:"#92400e",fontSize:13}}>Sin distribución: revisar que cada viaje tenga toneladas declaradas o kilos cargados.</p>:r.operacion_comision_viajes.map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",padding:"8px 0",borderBottom:"1px solid #f1f5f9"}}><span><b>{t.viajes?.patente_camion||"Patente pendiente"}</b> · CPE {t.viajes?.carta_porte_numero||"sin emitir"} · Viaje: {t.viajes?.estado||"sin estado"} · CPE: {t.viajes?.viaje_cartas_porte?.[0]?.estado_verificacion||"sin validar"}</span><span><b>USD {money(t.importe_liberado)}</b> · {t.estado==="LIBERADA"?"Liberada":t.estado==="RETENIDA"?"Retenida":"Bloqueada"} {t.liberada_at?"· "+new Date(t.liberada_at).toLocaleString("es-AR"):""}</span></div>)}</div></article>)}</>}
 </main>;
}
const field:React.CSSProperties={display:"block",width:"100%",padding:"10px 12px",border:"1px solid #cbd5e1",borderRadius:8,background:"transparent",marginTop:5,color:"inherit"};
const outline:React.CSSProperties={padding:"9px 12px",border:"1px solid #94a3b8",borderRadius:8,background:"transparent",color:"inherit",cursor:"pointer"};
const success:React.CSSProperties={padding:"10px 13px",border:0,borderRadius:8,background:"#166534",color:"white",fontWeight:700,cursor:"pointer"};
const danger:React.CSSProperties={padding:"10px 13px",border:0,borderRadius:8,background:"#991b1b",color:"white",fontWeight:700,cursor:"pointer"};
const kpi:React.CSSProperties={border:"1px solid #dbe3ec",borderRadius:13,padding:16,display:"grid",gap:7};
const big:React.CSSProperties={fontSize:25,fontWeight:800};
const panel:React.CSSProperties={border:"1px solid #dbe3ec",borderRadius:14,padding:16,marginBottom:14};
