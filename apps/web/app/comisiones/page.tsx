"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Comision={id:string;operacion_id:string;empresa_id:string|null;profile_id:string|null;tipo_comision:string;origen_comision:string|null;tipo_ganancia:string;concepto:string;modalidad_calculo:string;cantidad_tn:number;valor_unitario:number;porcentaje:number;valor_base:number;subtotal:number;moneda_id:number;iva_porcentaje:number;iva_importe:number;total:number;estado:string;factura_estado:string;saldo_pendiente:number;saldo_pagado:number;medio_pago:string|null;fecha_pago:string|null;referencia_pago:string|null;observaciones:string|null;creado_at:string};
type Operacion={id:string;codigo:string;modalidad_comercial:string|null};
type Movimiento={id:string;operacion_id:string;tipo_movimiento:string;concepto:string;moneda_id:number;importe:number;signo:number;estado:string;referencia:string|null;fecha_movimiento:string};
const monedas:Record<number,string>={1:"ARS",2:"USD",3:"EUR",4:"BRL"};
const n=(v:number|null|undefined)=>Number(v||0);
const money=(v:number,ccy="USD")=>ccy+" "+n(v).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});
const shortDate=(v:string)=>v?new Date(v).toLocaleDateString("es-AR"):"—";
const gain=(v:string)=>({USD_TN:"1,00",ARS_TN:"ARS/TN",PORCENTAJE:"%",DIFERENCIAL:"Dif.",FIJA:"Fija"} as Record<string,string>)[v]||v||"—";

export default function ComisionesPage(){
 const [rows,setRows]=useState<Comision[]>([]),[ops,setOps]=useState<Operacion[]>([]),[moves,setMoves]=useState<Movimiento[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[tab,setTab]=useState("TODAS"),[estado,setEstado]=useState(""),[pago,setPago]=useState(""),[producto,setProducto]=useState("");
 const [showMoves,setShowMoves]=useState(false),[selected,setSelected]=useState<Comision|null>(null),[amount,setAmount]=useState(""),[method,setMethod]=useState(""),[reference,setReference]=useState(""),[saving,setSaving]=useState(false);

 async function load(){
  setLoading(true);setError("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Necesitás iniciar sesión para consultar las comisiones.");setLoading(false);return}
  const [c,m]=await Promise.all([
   supabase.from("operacion_comisiones").select("*").order("creado_at",{ascending:false}),
   supabase.from("operacion_movimientos_economicos").select("*").order("fecha_movimiento",{ascending:false})
  ]);
  if(c.error){setError("No se pudieron cargar las comisiones: "+c.error.message);setLoading(false);return}
  setRows((c.data||[]) as Comision[]);setMoves((m.data||[]) as Movimiento[]);
  const ids=[...new Set((c.data||[]).map((x:any)=>x.operacion_id).filter(Boolean))];
  if(ids.length){const o=await supabase.from("operaciones").select("id,codigo,modalidad_comercial").in("id",ids);setOps((o.data||[]) as Operacion[])}else setOps([]);
  setLoading(false);
 }
 useEffect(()=>{void load();const ch=supabase.channel("comisiones-reference").on("postgres_changes",{event:"*",schema:"public",table:"operacion_comisiones"},()=>{void load()}).subscribe();return()=>{supabase.removeChannel(ch)}},[]);
 const opMap=useMemo(()=>new Map(ops.map(x=>[x.id,x])),[ops]);
 const filtered=useMemo(()=>rows.filter(x=>{
  const e=String(x.estado||"").toUpperCase();
  if(tab==="PENDIENTES"&&!["PENDIENTE","A_PAGAR"].includes(e))return false;
  if(tab==="PAGADAS"&&e!=="ABONADA")return false;
  if(tab==="INTERMEDIARIO"&&!x.empresa_id&&!x.profile_id)return false;
  if(estado&&e!==estado)return false;
  if(pago&&String(x.medio_pago||"").toUpperCase()!==pago)return false;
  return !producto||String(x.concepto||"").toLowerCase().includes(producto.toLowerCase());
 }),[rows,tab,estado,pago,producto]);
 const totals=useMemo(()=>({total:filtered.reduce((a,x)=>a+n(x.total),0),pending:filtered.reduce((a,x)=>a+n(x.saldo_pendiente),0),paid:filtered.reduce((a,x)=>a+n(x.saldo_pagado),0),intermediaries:new Set(filtered.map(x=>x.empresa_id||x.profile_id).filter(Boolean)).size}),[filtered]);
 const fixed=useMemo(()=>{const x=rows.find(r=>r.origen_comision==="AGROBROKER_IA"||r.tipo_ganancia==="USD_TN");return x?.valor_unitario||1},[rows]);
 async function pay(){
  if(!selected)return;const v=Number(amount);if(!Number.isFinite(v)||v<=0||v>n(selected.saldo_pendiente)||!method){setError("Verificá importe, saldo y medio de pago.");return}
  setSaving(true);setError("");const {error:e}=await supabase.rpc("registrar_pago_comision",{p_comision_id:selected.id,p_importe:v,p_medio_pago:method,p_referencia_pago:reference.trim()||null});setSaving(false);
  if(e){setError(e.message);return}setSelected(null);setAmount("");setMethod("");setReference("");void load();
 }
 const tabs=[["TODAS","Todas las comisiones"],["PENDIENTES","Pendientes de pago"],["PAGADAS","Pagadas"],["INTERMEDIARIO","Por intermediario"],["OPERACION","Por operación"],["PRODUCTO","Por producto"],["HISTORICO","Histórico"]];
 return <main className="commission-reference">
  <header className="commission-ref-head"><div><h1>Comisiones</h1><p>Gestiona las comisiones de tus operaciones, intermediarios y pagos</p></div><div className="commission-ref-actions"><button>⚙ Configuración de comisiones</button><button>▣ Liquidar comisiones</button><button className="commission-ref-new">＋ Nueva comisión</button></div></header>
  {error&&<div className="commission-ref-alert">{error}</div>}
  <section className="commission-ref-kpis">
   <Kpi icon="▤" value={money(totals.total)} label="Comisiones totales" trend="+28% este mes ↗" tone="green"/>
   <Kpi icon="◷" value={money(totals.pending)} label="Pendientes de pago" trend="+12% este mes ↗" tone="blue"/>
   <Kpi icon="✓" value={money(totals.paid)} label="Pagadas este mes" trend="+35% este mes ↗" tone="purple"/>
   <Kpi icon="♟" value={String(totals.intermediaries)} label="Intermediarios activos" trend="+20% este mes ↗" tone="yellow"/>
   <Kpi icon="▥" value={money(fixed)} label="Tu comisión fija" trend="por tonelada (AgroBrokerIA)" tone="red"/>
  </section>
  <nav className="commission-ref-tabs">{tabs.map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}</button>)}</nav>
  <section className="commission-ref-layout">
   <div className="commission-ref-main">
    <div className="commission-ref-table-head"><span># OPERACIÓN</span><span>PRODUCTO</span><span>VOLUMEN</span><span>PRECIO<br/>(USD/t)</span><span>COMISIÓN<br/>(USD/t)</span><span>COMISIÓN TOTAL<br/>(USD)</span><span>INTERMEDIARIO</span><span>ESTADO</span><span>FECHA</span><span>PAGO</span><span>ACCIONES</span></div>
    {loading?<div className="commission-ref-empty">Cargando comisiones...</div>:filtered.length===0?<div className="commission-ref-empty">No hay comisiones que coincidan con los filtros.</div>:filtered.map((x,i)=>{const op=opMap.get(x.operacion_id);const e=String(x.estado||"").toUpperCase();return <div className="commission-ref-row" key={x.id}><strong>{op?.codigo||x.operacion_id.slice(0,8)}</strong><span className="commission-product"><b>{["🌾","🌽","🌾","🌻","🫒","🌾","🥜","🌾"][i%8]}</b><span>{x.concepto||"Comisión"}</span></span><span>{n(x.cantidad_tn).toLocaleString("es-AR")} TN</span><span>{n(x.valor_base||x.valor_unitario).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span><span>{gain(x.tipo_ganancia)}</span><span><strong>{money(x.total,monedas[x.moneda_id]||"USD")}</strong></span><span className="commission-intermediary"><i>{x.origen_comision==="AGROBROKER_IA"?"✓":"◆"}</i>{x.empresa_id?"Intermediario":"AgroBrokerIA"}<small>{x.empresa_id?"Empresa registrada":"Tu comisión"}</small></span><span><em className={"commission-status "+statusClass(e)}>{statusLabel(e)}</em></span><span>{shortDate(x.creado_at)}</span><span><em className={"payment-badge "+(x.saldo_pendiente>0?"due":"paid")}>{x.saldo_pendiente>0?"Por pagar":x.medio_pago||"Transferencia"}</em></span><span className="commission-row-actions">{x.saldo_pendiente>0&&e!=="ANULADA"?<button onClick={()=>{setSelected(x);setAmount(n(x.saldo_pendiente).toFixed(2));setMethod("");setReference("")}}>Ver</button>:<button onClick={()=>setShowMoves(true)}>Ver</button>}<button>⋮</button></span></div>})}
   </div>
   <aside className="commission-ref-filters"><div className="commission-filter-title"><h2>Filtrar comisiones</h2><button onClick={()=>{setEstado("");setPago("");setProducto("")}}>Limpiar filtros</button></div><Filter label="Producto"><select value={producto} onChange={e=>setProducto(e.target.value)}><option value="">Todos los productos</option></select></Filter><Filter label="Estado"><select value={estado} onChange={e=>setEstado(e.target.value)}><option value="">Todos los estados</option><option value="PENDIENTE">Pendiente</option><option value="A_PAGAR">A pagar</option><option value="ABONADA">Pagada</option><option value="ANULADA">Anulada</option></select></Filter><Filter label="Intermediario"><select><option>Todos los intermediarios</option></select></Filter><Filter label="Rango de fecha"><div className="commission-two"><input type="date"/><input type="date"/></div></Filter><Filter label="Rango de volumen (TN)"><div className="commission-two"><input placeholder="Mínimo"/><input placeholder="Máximo"/></div></Filter><Filter label="Rango de comisión (USD/tn)"><div className="commission-two"><input placeholder="Mínimo"/><input placeholder="Máximo"/></div></Filter><Filter label="Método de pago"><select value={pago} onChange={e=>setPago(e.target.value)}><option value="">Todos los métodos</option><option value="TRANSFERENCIA">Transferencia</option><option value="FINANCIERA">Financiera</option><option value="ECHEQ">eCheq</option></select></Filter><button className="commission-apply">⚱ Aplicar filtros</button></aside>
  </section>
  <section className="commission-ref-bottom"><Panel title="Comisiones por mes (USD)"><Bars total={totals.total}/></Panel><Panel title="Comisiones por producto"><Donut value={totals.total}/></Panel><Panel title="Comisiones por intermediario"><Bars total={totals.total} compact/></Panel><Panel title="Estado de pagos"><Donut value={totals.total}/></Panel></section>
  <section className="commission-ref-summary"><h2>Resumen rápido</h2><div><Kpi icon="▤" value={money(totals.total)} label="Comisiones totales" tone="green"/><Kpi icon="◷" value={money(totals.pending)} label="Pendientes de pago" tone="blue"/><Kpi icon="✓" value={money(totals.paid)} label="Pagadas" tone="purple"/><Kpi icon="♟" value={String(totals.intermediaries)} label="Intermediarios activos" tone="yellow"/></div></section>
  {showMoves&&<section className="commission-moves"><div><strong>📒 Movimientos económicos</strong><button onClick={()=>setShowMoves(false)}>Cerrar</button></div>{moves.length?moves.slice(0,20).map(m=><p key={m.id}><span>{shortDate(m.fecha_movimiento)} · {m.concepto}</span><b>{money(n(m.importe)*(m.signo===-1?-1:1),monedas[m.moneda_id]||"USD")}</b></p>):<p>No hay movimientos económicos registrados.</p>}</section>}
  {selected&&<div className="commission-payment"><div><h2>Registrar pago</h2><p>Saldo pendiente: <strong>{money(selected.saldo_pendiente,monedas[selected.moneda_id]||"USD")}</strong></p></div><label>Importe<input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Medio de pago<select value={method} onChange={e=>setMethod(e.target.value)}><option value="">Seleccionar...</option><option value="TRANSFERENCIA">Transferencia</option><option value="ECHEQ">eCheq</option><option value="FINANCIERA">Financiera</option><option value="EFECTIVO">Efectivo</option></select></label><label>Referencia<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Comprobante..."/></label><div><button onClick={()=>setSelected(null)}>Cancelar</button><button onClick={pay} disabled={saving}>{saving?"Guardando...":"Confirmar pago"}</button></div></div>}
 </main>
}
function statusLabel(s:string){if(s==="ABONADA")return "Pagada";if(s==="A_PAGAR"||s==="PENDIENTE")return "Pendiente";if(s==="ANULADA")return "Anulada";return "En proceso"}
function statusClass(s:string){return s==="ABONADA"?"paid":s==="ANULADA"?"cancelled":s==="A_PAGAR"||s==="PENDIENTE"?"pending":"process"}
function Kpi({icon,value,label,trend,tone}:{icon:string;value:string;label:string;trend?:string;tone:string}){return <div className={"commission-kpi "+tone}><b>{icon}</b><span><strong>{value}</strong><small>{label}</small>{trend&&<i>{trend}</i>}</span></div>}
function Filter({label,children}:{label:string;children:React.ReactNode}){return <label className="commission-filter">{label}{children}</label>}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <section className="commission-panel"><h2>{title}</h2>{children}</section>}
function Bars({total,compact=false}:{total:number;compact?:boolean}){const vals=compact?[28,18,14,12,18,10]:[24,42,58,70,86,100];return <div className="commission-bars">{vals.map((v,i)=><div key={i}><span></span><i style={{height:Math.max(15,v*.75)+"%"}}></i><b>{compact?["Campo Azul","Global Grains","Nordic Trade","AgroSur SA","BioFeed","Otros"][i]:["Abr","May","Jun","Jul","Ago","Sep"][i]}</b></div>)}</div>}
function Donut({value}:{value:number}){return <div className="commission-donut-wrap"><div className="commission-donut"><b>{money(value)}<small>Total</small></b></div><div className="commission-legend"><p>● Pagadas <b>40%</b></p><p>● Pendientes <b>32%</b></p><p>● En proceso <b>18%</b></p><p>● Vencidas <b>10%</b></p></div></div>}
