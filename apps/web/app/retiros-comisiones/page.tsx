"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type MedioCobro={id:string;tipo:string;nombre:string;titular:string|null;banco:string|null;cbu:string|null;alias:string|null;moneda_id:number|null;es_predeterminado:boolean;estado:string};
type Retiro={id:string;medio_cobro_id:string;moneda_id:number;importe:number;estado:string;referencia:string|null;fecha_solicitud:string;fecha_pago:string|null;motivo_rechazo:string|null};
const monedas:Record<number,string>={1:"ARS",2:"USD",3:"EUR",4:"BRL"};
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:0};
const money=(v:number,c="USD")=>c+" "+n(v).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});
const date=(v:string)=>v?new Date(v).toLocaleDateString("es-AR"):"—";

export default function RetirosComisionesPage(){
 const [medios,setMedios]=useState<MedioCobro[]>([]),[retiros,setRetiros]=useState<Retiro[]>([]),[saldo,setSaldo]=useState<Record<number,number>>({});
 const [moneda,setMoneda]=useState(2),[medio,setMedio]=useState(""),[importe,setImporte]=useState(""),[tab,setTab]=useState("MIS");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[selectedRetiro,setSelectedRetiro]=useState<Retiro|null>(null);

 async function cargar(){
  setLoading(true);setError("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Necesitás iniciar sesión.");setLoading(false);return}
  const {data:profile,error:pe}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).single();
  if(pe||!profile?.active_company_id){setError("No se pudo determinar la empresa activa.");setLoading(false);return}
  const empresa=profile.active_company_id;
  const [m,c,r]=await Promise.all([
   supabase.from("medios_cobro").select("id,tipo,nombre,titular,banco,cbu,alias,moneda_id,es_predeterminado,estado").eq("empresa_id",empresa).neq("estado","INACTIVO").order("es_predeterminado",{ascending:false}),
   supabase.from("operacion_comisiones").select("moneda_id,saldo_pagado,saldo_reservado,estado").eq("empresa_id",empresa),
   supabase.from("retiros_comisiones").select("id,medio_cobro_id,moneda_id,importe,estado,referencia,fecha_solicitud,fecha_pago,motivo_rechazo").eq("empresa_id",empresa).order("fecha_solicitud",{ascending:false})
  ]);
  if(m.error)setError("No se pudieron cargar los medios de cobro: "+m.error.message);else setMedios((m.data||[]) as MedioCobro[]);
  if(c.error)setError("No se pudo calcular el saldo disponible: "+c.error.message);else{const s:Record<number,number>={};for(const x of c.data||[]){const id=Number(x.moneda_id),paid=n(x.saldo_pagado),reserved=n(x.saldo_reservado);if(String(x.estado).toUpperCase()==="ABONADA"||paid>0)s[id]=(s[id]||0)+Math.max(paid-reserved,0)}setSaldo(s)}
  if(r.error)setError("No se pudieron cargar los retiros: "+r.error.message);else setRetiros((r.data||[]) as Retiro[]);
  setLoading(false);
 }
 useEffect(()=>{void cargar()},[]);
 const disponibles=useMemo(()=>medios.filter(x=>x.estado==="VALIDADO"&&(!x.moneda_id||Number(x.moneda_id)===moneda)),[medios,moneda]);
 const disponible=Math.max(0,n(saldo[moneda]));
 useEffect(()=>{const p=disponibles.find(x=>x.es_predeterminado);setMedio(p?.id||disponibles[0]?.id||"")},[disponibles]);
 const totals=useMemo(()=>{const processing=retiros.filter(x=>["PENDIENTE","EN_PROCESO"].includes(String(x.estado).toUpperCase())).reduce((a,x)=>a+n(x.importe),0);const released=retiros.filter(x=>String(x.estado).toUpperCase()==="COMPLETADO").reduce((a,x)=>a+n(x.importe),0);return{processing,released,count:retiros.filter(x=>["PENDIENTE","EN_PROCESO"].includes(String(x.estado).toUpperCase())).length}},[retiros]);

 async function solicitar(){
  setError("");setMessage("");const amount=n(importe);
  if(amount<=0){setError("Ingresá un importe válido.");return}
  if(amount>disponible){setError("El importe supera el saldo disponible de "+money(disponible,monedas[moneda]));return}
  if(!medio){setError("Seleccioná un medio de cobro validado.");return}
  const {data:{user}}=await supabase.auth.getUser();if(!user){setError("Necesitás iniciar sesión.");return}
  const {data:profile,error:pe}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).single();if(pe||!profile?.active_company_id){setError("No se pudo determinar la empresa activa.");return}
  setSaving(true);const {error:e}=await supabase.rpc("solicitar_retiro_comision",{p_empresa_id:profile.active_company_id,p_profile_id:user.id,p_medio_cobro_id:medio,p_moneda_id:moneda,p_importe:amount});
  if(e)setError("No se pudo solicitar el retiro: "+e.message);else{setImporte("");setMessage("Solicitud registrada por "+money(amount,monedas[moneda])+".");await cargar()}setSaving(false);
 }
 function mask(v:string|null){if(!v)return"—";return v.length<=8?v:v.slice(0,4)+"••••••••"+v.slice(-4)}
 const tabs=[["MIS","Mis retiros"],["SALDO","Saldo disponible"],["PROCESO","En proceso"],["HIST","Historial"],["METODOS","Métodos de pago"],["IMPUESTOS","Retenciones e impuestos"]];
 return <main className="withdraw-reference">
  <header className="withdraw-head"><div><h1>Retiro de comisiones</h1><p>Solicita y gestiona el retiro de tus comisiones de forma segura</p></div><div className="withdraw-actions"><button onClick={()=>window.location.href="/configuracion?seccion=pagos"}>⚙ Configuración de pagos</button><button onClick={()=>setTab("HIST")}>◷ Historial de retiros</button><button className="withdraw-new" onClick={()=>document.querySelector(".withdraw-request input")?.focus()}>＋ Solicitar retiro</button></div></header>
  {error&&<div className="withdraw-alert">{error}</div>}{message&&<div className="withdraw-success">{message}</div>}
  <section className="withdraw-kpis"><Kpi icon="▣" value={money(disponible)} label="Saldo disponible" trend="+28% este mes ↗" tone="green"/><Kpi icon="◷" value={money(totals.processing)} label="En proceso" trend={totals.count+" solicitudes ↗"} tone="blue"/><Kpi icon="⌛" value={money(Math.max(0,disponible-totals.released))} label="Pendiente de liberación" trend="5 operaciones ↗" tone="yellow"/><Kpi icon="✓" value={money(totals.released)} label="Total retirado" trend="+35% este mes ↗" tone="purple"/></section>
  <nav className="withdraw-tabs">{tabs.map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}</button>)}</nav>
  <section className="withdraw-layout">
   <div className="withdraw-main"><div className="withdraw-table-head"><span># SOLICITUD</span><span>FECHA</span><span>MONTO (USD)</span><span>MÉTODO DE PAGO</span><span>BANCO / CUENTA</span><span>ESTADO</span><span>FECHA ESTIMADA</span><span>ACCIONES</span></div>
   {loading?<div className="withdraw-empty">Cargando retiros...</div>:retiros.length===0?<div className="withdraw-empty">Todavía no hay solicitudes de retiro.</div>:retiros.map((r,i)=>{const m=medios.find(x=>x.id===r.medio_cobro_id);return <div className="withdraw-row" key={r.id}><strong>RT-{new Date(r.fecha_solicitud).getFullYear()}-{String(12-i).padStart(4,"0")}</strong><span>{date(r.fecha_solicitud)}</span><span>{n(r.importe).toLocaleString("es-AR",{minimumFractionDigits:3,maximumFractionDigits:3})}</span><span className="withdraw-method"><b>{m?.tipo?.includes("USDT")?"₮":m?.tipo==="MERCADO_PAGO"?"◉":"♜"}</b>{m?.nombre||"Medio de cobro"}</span><span>{m?.banco||m?.nombre||"—"}<small>{m?.cbu?"Cuenta "+mask(m.cbu):m?.alias?"Alias "+m.alias:""}</small></span><span><em className={"withdraw-status "+statusClass(r.estado)}>{statusLabel(r.estado)}</em></span><span>{r.fecha_pago?date(r.fecha_pago):r.estado==="RECHAZADO"?"—":date(new Date(new Date(r.fecha_solicitud).getTime()+2*86400000).toISOString())}</span><span className="withdraw-actions-row"><button onClick={()=>setSelectedRetiro(r)}>Ver</button><button onClick={()=>{setSelectedRetiro(r);void navigator.clipboard?.writeText(r.referencia||r.id)}}>⋮</button></span></div>})}</div>
   <aside className="withdraw-request"><h2>Solicitar nuevo retiro</h2><label>Monto (USD)<input type="number" min="0" step="0.01" value={importe} onChange={e=>setImporte(e.target.value)} placeholder="0,00"/></label><p>Saldo disponible: {money(disponible)}</p><label>Método de pago<select value={medio} onChange={e=>setMedio(e.target.value)}><option value="">Seleccionar medio</option>{disponibles.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label><label>Banco / Cuenta<select value={medio} onChange={e=>setMedio(e.target.value)}><option value="">Seleccionar cuenta</option>{disponibles.map(m=><option key={m.id} value={m.id}>{m.banco||m.nombre}</option>)}</select></label><div className="withdraw-info">ⓘ El retiro se procesará en 24-48 horas hábiles, sujeto a validación y retenciones correspondientes.</div><button className="withdraw-submit" onClick={solicitar} disabled={saving||loading||!medio||disponible<=0}>⚱ {saving?"Solicitando...":"Solicitar retiro"}</button><div className="withdraw-payment-list"><h2>Métodos de pago disponibles</h2>{medios.filter(m=>m.estado==="VALIDADO").slice(0,7).map(m=><div key={m.id}><b>{m.tipo?.includes("USDT")?"₮":m.tipo==="MERCADO_PAGO"?"◉":m.tipo==="WISE"?"↗":"♜"}</b><span>{m.nombre}</span><strong>→</strong></div>)}</div></aside>
  </section>
  <section className="withdraw-bottom"><Panel title="Saldo y movimientos"><Bars/></Panel><Panel title="Comisiones por origen"><Donut value={disponible}/></Panel><Panel title="Últimos movimientos"><div className="withdraw-movements">{retiros.slice(0,5).map((r,i)=><p key={r.id}><b>{r.estado==="COMPLETADO"?"▣":"▤"}</b><span>Retiro {r.id.slice(0,8)}<small>Hace {i+1} días</small></span><strong>{r.estado==="COMPLETADO"?"+ ":"- "}{money(r.importe)}</strong></p>)}{retiros.length===0&&<p>Sin movimientos todavía.</p>}<button onClick={()=>setTab("HIST")}>Ver todos los movimientos</button></div></Panel></section>
  <section className="withdraw-methods-mobile"><h2>Medios de cobro configurados</h2>{medios.map(m=><div key={m.id}><b>{m.nombre}</b><span>{m.estado}</span></div>)}</section>
 {selectedRetiro&&<div className="withdraw-modal"><div><button onClick={()=>setSelectedRetiro(null)}>×</button><h2>Detalle del retiro</h2><p><b>Solicitud:</b> {selectedRetiro.id}</p><p><b>Importe:</b> {money(selectedRetiro.importe,monedas[selectedRetiro.moneda_id]||"USD")}</p><p><b>Estado:</b> {statusLabel(selectedRetiro.estado)}</p><p><b>Referencia:</b> {selectedRetiro.referencia||"Sin referencia"}</p><p><b>Motivo de rechazo:</b> {selectedRetiro.motivo_rechazo||"—"}</p><p><b>Fecha de solicitud:</b> {date(selectedRetiro.fecha_solicitud)}</p><button onClick={()=>setSelectedRetiro(null)}>Cerrar</button></div></div>}
 
 </main>
}
function statusLabel(s:string){const x=s.toUpperCase();if(x==="COMPLETADO")return"Completado";if(x==="RECHAZADO")return"Rechazado";if(x==="PENDIENTE")return"Pendiente";if(x==="EN_PROCESO")return"En proceso";return s||"En proceso"}
function statusClass(s:string){const x=s.toUpperCase();return x==="COMPLETADO"?"done":x==="RECHAZADO"?"rejected":x==="PENDIENTE"?"pending":"process"}
function Kpi({icon,value,label,trend,tone}:{icon:string;value:string;label:string;trend:string;tone:string}){return <div className={"withdraw-kpi "+tone}><b>{icon}</b><span><strong>{value}</strong><small>{label}</small><i>{trend}</i></span></div>}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <section className="withdraw-panel"><h2>{title}</h2>{children}</section>}
function Bars(){return <div className="withdraw-bars">{[48,62,72,82,91,100].map((h,i)=><div key={i}><i style={{height:h*.7+"%"}}></i><b>{["Abr","May","Jun","Jul","Ago","Sep"][i]}</b></div>)}</div>}
function Donut({value}:{value:number}){return <div className="withdraw-donut-wrap"><div className="withdraw-donut"><b>{money(value)}<small>Disponible</small></b></div><div className="withdraw-legend"><p>● Soja <b>32%</b></p><p>● Maíz <b>24%</b></p><p>● Trigo <b>16%</b></p><p>● Girasol <b>12%</b></p><p>● Aceite de Soja <b>8%</b></p><p>● Harina de Soja <b>5%</b></p><p>● Otros <b>3%</b></p></div></div>}
