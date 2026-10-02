"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Tx={id:string;date:string;type:string;description:string;ref:string;company:string;currency:string;amount:number;status:string;operationId?:string};
const money=(n:number,c?:string)=>`${c||"Moneda"} ${Math.abs(Number(n||0)).toLocaleString("en-US",{maximumFractionDigits:0})}`;
const d=(v:string|null)=>v?new Date(v).toLocaleDateString("es-AR"):"—";
const dt=(v:string|null)=>v?new Date(v).toLocaleString("es-AR",{dateStyle:"short",timeStyle:"short"}):"—";
const tone=(s:string)=>{const x=s.toLowerCase();if(x.includes("proceso")||x.includes("pend"))return"yellow";if(x.includes("cancel")||x.includes("rechaz"))return"red";if(x.includes("dispon"))return"blue";return"green"};
function Icon({name,size=20}:{name:string;size?:number}){const p:Record<string,React.ReactNode>={
 wallet:<><path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h12"/><path d="M2 8h14a2 2 0 0 0 0-4H6a4 4 0 0 0-4 4Z"/><circle cx="16" cy="14" r="1"/>,</>,
 down:<><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12l5 5 5-5"/></>,
 up:<><path d="m5 19 14-14M9 5h10v10"/></>,
 percent:<><circle cx="12" cy="12" r="9"/><path d="M8 16 16 8M8.5 8.5h.01M15.5 15.5h.01"/></>,
 search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
 calendar:<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/></>,
 download:<><path d="M12 3v12M8 11l4 4 4-4M5 20h14"/></>,
 dots:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
 check:<><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
 close:<><circle cx="12" cy="12" r="9"/><path d="m8 8 8 8M16 8l-8 8"/></>,
 file:<><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6"/></>,
 transfer:<><path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4"/></>
};return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]||p.file}</svg>}
function rowIcon(t:string){if(t==="Cobro")return"down";if(t==="Comisión")return"percent";if(t==="Transferencia")return"transfer";if(t==="Retiro")return"up";return"file"}
function rowClass(t:string){if(t==="Cobro")return"green";if(t==="Comisión")return"orange";if(t==="Transferencia"||t==="Retiro")return"red";return"blue"}

export default function TransaccionesPage(){
 const[rows,setRows]=useState<Tx[]>([]),[selected,setSelected]=useState<Tx|null>(null),[query,setQuery]=useState(""),[type,setType]=useState("Todos"),[status,setStatus]=useState("Todos"),[currency,setCurrency]=useState("Todas"),[loading,setLoading]=useState(true),[txTab,setTxTab]=useState("Todas"),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10);
 useEffect(()=>{(async()=>{setLoading(true);
  const [pay,com,ops]=await Promise.all([
   supabase.from("pagos").select("id,operacion_id,importe,moneda_id,metodo_pago,estado,fecha_pago,creado_en").order("creado_en",{ascending:false}).limit(120),
   supabase.from("comisiones").select("id,operacion_id,importe_calculado,estado,creada_en,moneda_id").order("creada_en",{ascending:false}).limit(80),
   supabase.from("operaciones").select("id,codigo,importe_total,estado,fecha_operacion,creada_en,moneda_id").order("creada_en",{ascending:false}).limit(80)
  ]);
  const ids=Array.from(new Set([...(pay.data||[]),...(com.data||[]),...(ops.data||[])].map((x:any)=>x.moneda_id).filter(Boolean)));
  const {data:mons}=ids.length?await supabase.from("monedas").select("id,codigo").in("id",ids):{data:[] as any[]};
  const mc=Object.fromEntries((mons||[]).map((x:any)=>[x.id,x.codigo]));
  const out:Tx[]=[];
  for(const x of pay.data||[]) out.push({id:"p-"+x.id,date:x.fecha_pago||x.creado_en,type:"Pago",description:x.metodo_pago?("Pago · "+x.metodo_pago):"Pago de operación",ref:x.operacion_id?("OP-"+String(x.operacion_id).slice(0,8).toUpperCase()):"PAGO-"+String(x.id).slice(0,8).toUpperCase(),company:"Cuenta vinculada",currency:mc[x.moneda_id]||"Moneda",amount:Number(x.importe||0),status:/CONFIRM|PAGAD|RECIB/i.test(x.estado||"")?"Recibido":x.estado||"En proceso",operationId:x.operacion_id});
  for(const x of com.data||[]) out.push({id:"c-"+x.id,date:x.creada_en,type:"Comisión",description:"Comisión generada",ref:"COM-"+String(x.id).slice(0,8).toUpperCase(),company:"Cuenta vinculada",currency:mc[x.moneda_id]||"Moneda",amount:Number(x.importe_calculado||0),status:x.estado||"Disponible",operationId:x.operacion_id});
  for(const x of ops.data||[]) out.push({id:"o-"+x.id,date:x.fecha_operacion||x.creada_en,type:"Liquidación",description:"Liquidación de operación",ref:x.codigo||"OP-"+String(x.id).slice(0,8).toUpperCase(),company:"Cuenta vinculada",currency:mc[x.moneda_id]||"",amount:Number(x.importe_total||0),status:x.estado||"Completada",operationId:x.id});
  out.sort((a,b)=>+new Date(b.date)-+new Date(a.date));setRows(out);setSelected(out[0]||null);setLoading(false);
 })()},[]);
 const filtered=useMemo(()=>rows.filter(r=>(!query||[r.type,r.description,r.ref,r.company].join(" ").toLowerCase().includes(query.toLowerCase()))&&(type==="Todos"||r.type===type)&&(status==="Todos"||r.status===status)&&(currency==="Todas"||r.currency===currency)),[rows,query,type,status,currency]);
 const totals=useMemo(()=>{const sum=(predicate:(r:Tx)=>boolean)=>rows.filter(predicate).reduce((m,r)=>{m[r.currency]=(m[r.currency]||0)+Math.abs(r.amount);return m},{} as Record<string,number>);return {in:sum(r=>r.amount>0&&r.type!=="Comisión"),out:sum(r=>r.amount<0),comm:sum(r=>r.type==="Comisión")}},[rows]);
 const formatTotals=(values:Record<string,number>)=>Object.entries(values).length?Object.entries(values).map(([c,v])=>money(v,c)).join(" · "):"Sin movimientos registrados";
 const currencies=Array.from(new Set(rows.map(r=>r.currency)));
 const statuses=Array.from(new Set(rows.map(r=>r.status)));
 const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
 const safePage=Math.min(page,pageCount);
 const pageRows=filtered.slice((safePage-1)*pageSize,safePage*pageSize);
 function exportCsv(){const header=["Fecha","Tipo","Descripción","Referencia","Empresa","Moneda","Monto","Estado"];const lines=filtered.map(r=>[r.date,r.type,r.description,r.ref,r.company,r.currency,String(r.amount),r.status].map(v=>JSON.stringify(String(v))).join(","));const blob=new Blob([header.join(",")+"\n"+lines.join("\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="agrobrokeria-transacciones.csv";a.click();URL.revokeObjectURL(a.href)}
 useEffect(()=>{setPage(1)},[query,type,status,currency,pageSize]);
 return <main className="transactions-page">
  <header className="transactions-hero"><div><h1>Transacciones</h1><p>Gestiona todas las transacciones financieras de tus operaciones, pagos, comisiones y retiros.</p></div><button className="new-transaction" onClick={()=>{window.location.href="/pagos"}}>＋ Nueva transacción</button></header>
  <nav className="transactions-tabs">{[["Todas","Todos los tipos"],["Pagos","Pago"],["Cobros","Cobro"],["Comisiones","Comisión"],["Retiros","Retiro"],["Transferencias","Transferencia"],["Liquidaciones","Liquidación"]].map(([x,v])=><button key={x} className={txTab===x?"active":""} onClick={()=>{setTxTab(x);setType(v)}}>{x}</button>)}</nav>
  <section className="transactions-kpis">
   <article className="tk green"><span><Icon name="wallet" size={25}/></span><div><small>Saldo disponible</small><strong>—</strong><em>Saldo no sincronizado</em></div></article>
   <article className="tk blue"><span><Icon name="down" size={25}/></span><div><small>Total ingresado</small><strong>{formatTotals(totals.in)}</strong><em>Ingresos registrados</em></div></article>
   <article className="tk pink"><span><Icon name="up" size={25}/></span><div><small>Total egresado</small><strong>{formatTotals(totals.out)}</strong><em>Egresos registrados</em></div></article>
   <article className="tk amber"><span><Icon name="percent" size={25}/></span><div><small>Comisiones generadas</small><strong>{formatTotals(totals.comm)}</strong><em>Comisiones registradas</em></div></article>
  </section>
  <div className="transactions-layout">
   <section className="transactions-main">
    <div className="transactions-filters"><label><Icon name="search" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar transacciones..."/></label><select value={type} onChange={e=>setType(e.target.value)}><option>Todos los tipos</option>{["Cobro","Comisión","Pago","Transferencia","Retiro","Liquidación"].map(x=><option key={x}>{x}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option>Todos los estados</option>{statuses.map(x=><option key={x}>{x}</option>)}</select><select value={currency} onChange={e=>setCurrency(e.target.value)}><option>Todas las monedas</option>{currencies.map(x=><option key={x}>{x}</option>)}</select><button className="tx-export" onClick={exportCsv}><Icon name="download" size={15}/> Exportar</button></div>
    <div className="transactions-table-card"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Operación / Referencia</th><th>Empresa</th><th>Moneda</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{loading?<tr><td colSpan={9} className="tx-loading">Cargando transacciones…</td></tr>:pageRows.length?pageRows.map(r=><tr key={r.id} className={selected?.id===r.id?"selected":""} onClick={()=>setSelected(r)}><td>{d(r.date)}<small>{new Date(r.date).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</small></td><td><span className={"tx-type-icon "+rowClass(r.type)}><Icon name={rowIcon(r.type)} size={17}/></span>{r.type}</td><td><b>{r.description}</b><small>{r.operationId?"Operación vinculada":"Sin operación vinculada"}</small></td><td className="tx-ref">{r.ref}</td><td><b>{r.company}</b></td><td>{r.currency}</td><td><b>{r.amount<0?"-":""}{money(r.amount,r.currency)}</b></td><td><span className={"tx-status "+tone(r.status)}>{r.status}</span></td><td><button className="tx-dots" onClick={e=>{e.stopPropagation();setSelected(r)}} title="Ver detalle"><Icon name="dots" size={16}/></button></td></tr>):<tr><td colSpan={9} className="tx-loading">No hay transacciones que coincidan con los filtros.</td></tr>}</tbody></table><div className="tx-pagination"><span>Mostrando 1–{Math.min(10,filtered.length)} de {filtered.length} transacciones</span><div><button disabled={safePage===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>{Array.from({length:Math.min(5,pageCount)},(_,i)=>i+1).map(n=><button key={n} className={safePage===n?"active":""} onClick={()=>setPage(n)}>{n}</button>)}{pageCount>5&&<><span>…</span><button className={safePage===pageCount?"active":""} onClick={()=>setPage(pageCount)}>{pageCount}</button></>}<button disabled={safePage===pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>›</button></div><span>Mostrar <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> por página</span></div></div>
   </section>
   <aside className="transaction-detail"><div className="tx-detail-head"><div className="tx-detail-icon"><Icon name={selected?rowIcon(selected.type):"down"} size={27}/></div><div><h2>Detalle de transacción</h2>{selected&&<><strong>{selected.type} de operación</strong><small>{selected.ref}<br/>{dt(selected.date)}</small></>}</div><button onClick={()=>setSelected(null)} aria-label="Cerrar detalle">×</button></div>{selected?<><div className="tx-detail-total">{money(selected.amount,selected.currency)}</div><div className="tx-detail-tabs"><b>Información</b></div><section className="tx-info"><div><span>Tipo</span><b>{selected.type}</b></div><div><span>Descripción</span><b>{selected.description}</b></div><div><span>Operación</span><b>{selected.operationId?"OP-"+String(selected.operationId).slice(0,8).toUpperCase():selected.ref}</b></div><div><span>Empresa</span><b>{selected.company}</b></div><div><span>Moneda</span><b>{selected.currency}</b></div><div><span>Monto</span><b>{money(selected.amount,selected.currency)}</b></div><div><span>Fecha y hora</span><b>{dt(selected.date)}</b></div><div><span>Estado</span><b><span className={"tx-status "+tone(selected.status)}>{selected.status}</span></b></div></section></>:<div className="tx-empty">Seleccioná una transacción.</div>}</aside>
  </div>
 </main>;
}