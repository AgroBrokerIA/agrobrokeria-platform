"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Comision={id:string;operacion_id:string;empresa_id:string|null;profile_id:string|null;tipo_comision:string;origen_comision:string|null;tipo_ganancia:string;concepto:string;modalidad_calculo:string;cantidad_tn:number;valor_unitario:number;porcentaje:number;valor_base:number;subtotal:number;moneda_id:number;iva_porcentaje:number;iva_importe:number;total:number;estado:string;factura_estado:string;saldo_pendiente:number;saldo_pagado:number;medio_pago:string|null;fecha_pago:string|null;referencia_pago:string|null;observaciones:string|null;creado_at:string};
type Operacion={id:string;codigo:string;modalidad_comercial:string|null};
type Movimiento={id:string;operacion_id:string;tipo_movimiento:string;concepto:string;moneda_id:number;importe:number;signo:number;estado:string;referencia:string|null;fecha_movimiento:string};

const n=(v:number|null|undefined)=>Number(v||0);
const money=(v:number,ccy="")=>(ccy?ccy+" ":"")+n(v).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});
const shortDate=(v:string)=>v?new Date(v).toLocaleDateString("es-AR"):"—";
const gain=(v:string)=>({USD_TN:"USD/TN",ARS_TN:"ARS/TN",PORCENTAJE:"%",DIFERENCIAL:"Dif.",FIJA:"Fija"} as Record<string,string>)[v]||v||"—";

export default function ComisionesPage(){
 const [rows,setRows]=useState<Comision[]>([]),[ops,setOps]=useState<Operacion[]>([]),[moves,setMoves]=useState<Movimiento[]>([]),[monedas,setMonedas]=useState<Record<number,string>>({});
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[tab,setTab]=useState("TODAS"),[estado,setEstado]=useState(""),[pago,setPago]=useState(""),[producto,setProducto]=useState(""),[intermediario,setIntermediario]=useState("");
 const [empresaNames,setEmpresaNames]=useState<Record<string,string>>({});
 const [fromDate,setFromDate]=useState(""),[toDate,setToDate]=useState(""),[minVol,setMinVol]=useState(""),[maxVol,setMaxVol]=useState(""),[minRate,setMinRate]=useState(""),[maxRate,setMaxRate]=useState("");
 const [showMoves,setShowMoves]=useState(false),[selected,setSelected]=useState<Comision|null>(null),[amount,setAmount]=useState(""),[method,setMethod]=useState(""),[reference,setReference]=useState(""),[saving,setSaving]=useState(false);

 async function load(){
  setLoading(true);setError("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Necesitás iniciar sesión para consultar las comisiones.");setLoading(false);return}
  const [c,m,mc]=await Promise.all([
   supabase.from("operacion_comisiones").select("*").order("creado_at",{ascending:false}),
   supabase.from("operacion_movimientos_economicos").select("*").order("fecha_movimiento",{ascending:false}),
   supabase.from("monedas").select("id,codigo")
  ]);
  if(c.error){setError("No se pudieron cargar las comisiones: "+c.error.message);setLoading(false);return}
  setRows((c.data||[]) as Comision[]);setMoves((m.data||[]) as Movimiento[]);setMonedas(Object.fromEntries((mc.data||[]).map((x:any)=>[x.id,x.codigo])));
  const empresaIds=[...new Set((c.data||[]).map((x:any)=>x.empresa_id).filter(Boolean))];
  if(empresaIds.length){const er=await supabase.from("empresas").select("id,razon_social,nombre_comercial").in("id",empresaIds);if(!er.error)setEmpresaNames(Object.fromEntries((er.data||[]).map((x:any)=>[String(x.id),x.nombre_comercial||x.razon_social||"Empresa registrada"])))}else setEmpresaNames({});
  const ids=[...new Set((c.data||[]).map((x:any)=>x.operacion_id).filter(Boolean))];
  if(ids.length){const o=await supabase.from("operaciones").select("id,codigo,modalidad_comercial").in("id",ids);setOps((o.data||[]) as Operacion[])}else setOps([]);
  setLoading(false);
 }
 useEffect(()=>{void load();const ch=supabase.channel("comisiones-reference").on("postgres_changes",{event:"*",schema:"public",table:"operacion_comisiones"},()=>{void load()}).subscribe();return()=>{supabase.removeChannel(ch)}},[]);
 const opMap=useMemo(()=>new Map(ops.map(x=>[x.id,x])),[ops]);
 const products=useMemo(()=>[...new Set(rows.map(x=>String(x.concepto||"").trim()).filter(Boolean))],[rows]);
 const intermediaries=useMemo(()=>[...new Set(rows.filter(x=>x.empresa_id||x.profile_id).map(x=>x.empresa_id||x.profile_id).filter(Boolean))] as string[],[rows]);
 const filtered=useMemo(()=>{
  const list=rows.filter(x=>{
   const e=String(x.estado||"").toUpperCase(), d=x.creado_at?new Date(x.creado_at):null, rate=n(x.valor_unitario), vol=n(x.cantidad_tn);
   if(tab==="PENDIENTES"&&!["PENDIENTE","A_PAGAR"].includes(e))return false;
   if(tab==="PAGADAS"&&e!=="ABONADA")return false;
   if(tab==="INTERMEDIARIO"&&!x.empresa_id&&!x.profile_id)return false;
   if(estado&&e!==estado)return false;
   if(pago&&String(x.medio_pago||"").toUpperCase()!==pago)return false;
   if(producto&&String(x.concepto||"")!==producto)return false;
   if(intermediario&&(x.empresa_id||x.profile_id)!==intermediario)return false;
   if(fromDate&&(!d||d<new Date(fromDate+"T00:00:00")))return false;
   if(toDate&&(!d||d>new Date(toDate+"T23:59:59")))return false;
   if(minVol&&vol<Number(minVol))return false;if(maxVol&&vol>Number(maxVol))return false;
   if(minRate&&rate<Number(minRate))return false;if(maxRate&&rate>Number(maxRate))return false;
   return true;
  });
  if(tab==="OPERACION")return [...list].sort((a,b)=>(opMap.get(a.operacion_id)?.codigo||"").localeCompare(opMap.get(b.operacion_id)?.codigo||""));
  if(tab==="HISTORICO")return [...list].sort((a,b)=>new Date(a.creado_at).getTime()-new Date(b.creado_at).getTime());
  if(tab==="PRODUCTO")return [...list].sort((a,b)=>String(a.concepto||"").localeCompare(String(b.concepto||"")));
  return list;
 },[rows,tab,estado,pago,producto,intermediario,fromDate,toDate,minVol,maxVol,minRate,maxRate,opMap]);
 const totals=useMemo(()=>({total:filtered.reduce((a,x)=>a+n(x.total),0),pending:filtered.reduce((a,x)=>a+n(x.saldo_pendiente),0),paid:filtered.reduce((a,x)=>a+n(x.saldo_pagado),0),intermediaries:new Set(filtered.map(x=>x.empresa_id||x.profile_id).filter(Boolean)).size}),[filtered]);
 const fixed=useMemo(()=>rows.find(r=>r.origen_comision==="AGROBROKER_IA")?.valor_unitario??0,[rows]);
 const statusCounts=useMemo(()=>({paid:filtered.filter(x=>String(x.estado).toUpperCase()==="ABONADA").length,pending:filtered.filter(x=>["PENDIENTE","A_PAGAR"].includes(String(x.estado).toUpperCase())).length,process:filtered.filter(x=>!["ABONADA","PENDIENTE","A_PAGAR","ANULADA"].includes(String(x.estado).toUpperCase())).length,cancelled:filtered.filter(x=>String(x.estado).toUpperCase()==="ANULADA").length}),[filtered]);
 const productSummary=useMemo(()=>Object.entries(filtered.reduce<Record<string,number>>((a,x)=>{const k=x.concepto||"Sin producto";a[k]=(a[k]||0)+n(x.total);return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,6),[filtered]);
 async function pay(){
  if(!selected)return;const v=Number(amount);if(!Number.isFinite(v)||v<=0||v>n(selected.saldo_pendiente)||!method){setError("Verificá importe, saldo y medio de pago.");return}
  setSaving(true);setError("");const {error:e}=await supabase.rpc("registrar_pago_comision",{p_comision_id:selected.id,p_importe:v,p_medio_pago:method,p_referencia_pago:reference.trim()||null});setSaving(false);
  if(e){setError(e.message);return}setSelected(null);setAmount("");setMethod("");setReference("");void load();
 }
 function clearFilters(){setEstado("");setPago("");setProducto("");setIntermediario("");setFromDate("");setToDate("");setMinVol("");setMaxVol("");setMinRate("");setMaxRate("")}
 const tabs=[["TODAS","Todas las comisiones"],["PENDIENTES","Pendientes de pago"],["PAGADAS","Pagadas"],["INTERMEDIARIO","Por intermediario"],["OPERACION","Por operación"],["PRODUCTO","Por producto"],["HISTORICO","Histórico"]];
 return <main className="commission-reference">
  <header className="commission-ref-head"><div><h1>Comisiones</h1><p>Gestiona las comisiones de tus operaciones, intermediarios y pagos</p></div><div className="commission-ref-actions"><Link href="/configuracion" className="commission-action-link">⚙ Configuración de comisiones</Link><button onClick={()=>{setTab("PENDIENTES");document.getElementById("commission-table")?.scrollIntoView({behavior:"smooth"})}}>▣ Liquidar comisiones</button><Link href="/operaciones" className="commission-ref-new">↗ Ver operaciones</Link></div></header>
  {error&&<div className="commission-ref-alert">{error}</div>}
  <section className="commission-ref-kpis">
   <Kpi icon="▤" value={money(totals.total)} label="Comisiones totales" trend="Datos registrados" tone="green"/>
   <Kpi icon="◷" value={money(totals.pending)} label="Pendientes de pago" trend={`${filtered.filter(x=>n(x.saldo_pendiente)>0).length} registros`} tone="blue"/>
   <Kpi icon="✓" value={money(totals.paid)} label="Pagadas" trend={`${statusCounts.paid} registros abonados`} tone="purple"/>
   <Kpi icon="♟" value={String(totals.intermediaries)} label="Intermediarios con comisión" trend="Según registros" tone="yellow"/>
   <Kpi icon="▥" value={fixed?money(fixed,monedas[rows.find(r=>r.origen_comision==="AGROBROKER_IA")?.moneda_id||0]||""):"No registrada"} label="Comisión AgroBrokerIA" trend={fixed?"Valor registrado por TN":"Sin comisión automática registrada"} tone="red"/>
  </section>
  <nav className="commission-ref-tabs">{tabs.map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}</button>)}</nav>
  <section className="commission-ref-layout">
   <div className="commission-ref-main" id="commission-table">
    <div className="commission-ref-table-head"><span># OPERACIÓN</span><span>PRODUCTO</span><span>VOLUMEN</span><span>PRECIO<br/>(por t)</span><span>COMISIÓN<br/>(por t)</span><span>COMISIÓN TOTAL</span><span>INTERMEDIARIO</span><span>ESTADO</span><span>FECHA</span><span>PAGO</span><span>ACCIONES</span></div>
    {loading?<div className="commission-ref-empty">Cargando comisiones...</div>:filtered.length===0?<div className="commission-ref-empty">No hay comisiones que coincidan con los filtros.</div>:filtered.map((x,i)=>{const op=opMap.get(x.operacion_id);const e=String(x.estado||"").toUpperCase();return <div className="commission-ref-row" key={x.id}><strong>{op?.codigo||x.operacion_id.slice(0,8)}</strong><span className="commission-product"><b>•</b><span>{x.concepto||"Comisión registrada"}</span></span><span>{n(x.cantidad_tn).toLocaleString("es-AR")} TN</span><span>{n(x.valor_base||x.valor_unitario).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span><span>{gain(x.tipo_ganancia)}</span><span><strong>{money(x.total,monedas[x.moneda_id]||"")}</strong></span><span className="commission-intermediary"><i>{x.origen_comision==="AGROBROKER_IA"?"✓":"◆"}</i>{x.empresa_id?(empresaNames[x.empresa_id]||"Empresa registrada"):"AgroBrokerIA"}<small>{x.empresa_id?"Empresa intermediaria":"Comisión de plataforma"}</small></span><span><em className={"commission-status "+statusClass(e)}>{statusLabel(e)}</em></span><span>{shortDate(x.creado_at)}</span><span><em className={"payment-badge "+(x.saldo_pendiente>0?"due":"paid")}>{x.saldo_pendiente>0?"Por pagar":x.medio_pago||"Registrado"}</em></span><span className="commission-row-actions">{x.saldo_pendiente>0&&e!=="ANULADA"?<button onClick={()=>{setSelected(x);setAmount(n(x.saldo_pendiente).toFixed(2));setMethod("");setReference("")}}>Pagar</button>:<button onClick={()=>setShowMoves(true)}>Ver</button>}<button onClick={()=>setShowMoves(true)} aria-label="Ver movimientos">⋮</button></span></div>})}
   </div>
   <aside className="commission-ref-filters"><div className="commission-filter-title"><h2>Filtrar comisiones</h2><button onClick={clearFilters}>Limpiar filtros</button></div><Filter label="Producto"><select value={producto} onChange={e=>setProducto(e.target.value)}><option value="">Todos los productos</option>{products.map(p=><option key={p} value={p}>{p}</option>)}</select></Filter><Filter label="Estado"><select value={estado} onChange={e=>setEstado(e.target.value)}><option value="">Todos los estados</option><option value="PENDIENTE">Pendiente</option><option value="A_PAGAR">A pagar</option><option value="ABONADA">Pagada</option><option value="ANULADA">Anulada</option></select></Filter><Filter label="Intermediario"><select value={intermediario} onChange={e=>setIntermediario(e.target.value)}><option value="">Todos los intermediarios</option>{intermediaries.map(id=><option key={id} value={id}>{empresaNames[id]||id.slice(0,8)}</option>)}</select></Filter><Filter label="Rango de fecha"><div className="commission-two"><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></div></Filter><Filter label="Rango de volumen (TN)"><div className="commission-two"><input value={minVol} onChange={e=>setMinVol(e.target.value)} inputMode="decimal" placeholder="Mínimo"/><input value={maxVol} onChange={e=>setMaxVol(e.target.value)} inputMode="decimal" placeholder="Máximo"/></div></Filter><Filter label="Rango de comisión / TN"><div className="commission-two"><input value={minRate} onChange={e=>setMinRate(e.target.value)} inputMode="decimal" placeholder="Mínimo"/><input value={maxRate} onChange={e=>setMaxRate(e.target.value)} inputMode="decimal" placeholder="Máximo"/></div></Filter><Filter label="Método de pago"><select value={pago} onChange={e=>setPago(e.target.value)}><option value="">Todos los métodos</option><option value="TRANSFERENCIA">Transferencia</option><option value="FINANCIERA">Financiera</option><option value="ECHEQ">eCheq</option><option value="EFECTIVO">Efectivo</option></select></Filter><button className="commission-apply" onClick={()=>document.getElementById("commission-table")?.scrollIntoView({behavior:"smooth"})}>⚱ Aplicar filtros</button></aside>
  </section>
  <section className="commission-ref-bottom"><Panel title="Estado de pagos"><Bars total={filtered.length} values={[statusCounts.paid,statusCounts.pending,statusCounts.process,statusCounts.cancelled]} labels={["Pagadas","Pendientes","En proceso","Anuladas"]}/></Panel><Panel title="Comisiones por producto"><Bars total={totals.total} values={productSummary.map(([,v])=>v)} labels={productSummary.map(([k])=>k)}/></Panel><Panel title="Movimientos económicos"><button className="commission-panel-link" onClick={()=>setShowMoves(true)}>Ver movimientos registrados ({moves.length})</button></Panel><Panel title="Histórico"><div className="commission-history-note">{filtered.length} registros en la vista actual. <button onClick={()=>setTab("HISTORICO")}>Abrir histórico</button></div></Panel></section>
  <section className="commission-ref-summary"><h2>Resumen rápido</h2><div><Kpi icon="▤" value={money(totals.total)} label="Comisiones totales" tone="green"/><Kpi icon="◷" value={money(totals.pending)} label="Pendientes de pago" tone="blue"/><Kpi icon="✓" value={money(totals.paid)} label="Pagadas" tone="purple"/><Kpi icon="♟" value={String(totals.intermediaries)} label="Intermediarios" tone="yellow"/></div></section>
  {showMoves&&<section className="commission-moves"><div><strong>📒 Movimientos económicos</strong><button onClick={()=>setShowMoves(false)}>Cerrar</button></div>{moves.length?moves.slice(0,20).map(m=><p key={m.id}><span>{shortDate(m.fecha_movimiento)} · {m.concepto}</span><b>{money(n(m.importe)*(m.signo===-1?-1:1),monedas[m.moneda_id]||"")}</b></p>):<p>No hay movimientos económicos registrados.</p>}</section>}
  {selected&&<div className="commission-payment"><div><h2>Registrar pago</h2><p>Saldo pendiente: <strong>{money(selected.saldo_pendiente,monedas[selected.moneda_id]||"")}</strong></p></div><label>Importe<input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Medio de pago<select value={method} onChange={e=>setMethod(e.target.value)}><option value="">Seleccionar...</option><option value="TRANSFERENCIA">Transferencia</option><option value="ECHEQ">eCheq</option><option value="FINANCIERA">Financiera</option><option value="EFECTIVO">Efectivo</option></select></label><label>Referencia<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Comprobante..."/></label><div><button onClick={()=>setSelected(null)}>Cancelar</button><button onClick={pay} disabled={saving}>{saving?"Guardando...":"Confirmar pago"}</button></div></div>}
 </main>
}
function statusLabel(s:string){if(s==="ABONADA")return "Pagada";if(s==="A_PAGAR"||s==="PENDIENTE")return "Pendiente";if(s==="ANULADA")return "Anulada";return "En proceso"}
function statusClass(s:string){return s==="ABONADA"?"paid":s==="ANULADA"?"cancelled":s==="A_PAGAR"||s==="PENDIENTE"?"pending":"process"}
function Kpi({icon,value,label,trend,tone}:{icon:string;value:string;label:string;trend?:string;tone:string}){return <div className={"commission-kpi "+tone}><b>{icon}</b><span><strong>{value}</strong><small>{label}</small>{trend&&<i>{trend}</i>}</span></div>}
function Filter({label,children}:{label:string;children:React.ReactNode}){return <label className="commission-filter">{label}{children}</label>}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <section className="commission-panel"><h2>{title}</h2>{children}</section>}
function Bars({total,values,labels}:{total:number;values:number[];labels:string[]}){const max=Math.max(...values,1);return <div className="commission-bars">{values.slice(0,6).map((v,i)=><div key={i}><span></span><i style={{height:Math.max(15,(v/max)*75)+"%"}}></i><b>{labels[i]||"—"}</b><small>{typeof v==="number"&&v>=0?(total===filteredCount(values)?v.toLocaleString("es-AR"):money(v)):"—"}</small></div>)}</div>}
function filteredCount(values:number[]){return values.reduce((a,b)=>a+b,0)}
function Donut(){return null}
