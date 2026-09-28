"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Payment={id:string;operacion_id:string;importe:number;moneda_id:number|null;metodo_pago:string|null;estado:string|null;fecha_pago:string|null;comprobante:string|null};
type Bank={id:string;banco:string|null;alias:string|null;moneda:string|null;activo:boolean|null};

function Icon({name,size=22}:{name:string;size?:number}){
 const p:Record<string,React.ReactNode>={
  wallet:<><path d="M4 7h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h11"/><path d="M2 7h15a2 2 0 0 0 0-4H6a4 4 0 0 0-4 4Z"/><path d="M16 14h.01"/></>,
  coins:<><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></>,
  check:<><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  chart:<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  file:<><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  bank:<><path d="M3 10h18M4 10v8M8 10v8M12 10v8M16 10v8M20 10v8M2 20h20L12 3 2 20Z"/></>,
  card:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></>,
  shield:<><path d="M12 3 19 6v5c0 4.5-2.8 7.5-7 10-4.2-2.5-7-5.5-7-10V6l7-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
  upload:<><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></>,
  eye:<><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  arrow:<path d="m9 18 6-6-6-6"/>,
  dots:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  dollar:<><circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.6-.7-1.6-1-3-1-1.8 0-3 .9-3 2.1 0 3.2 6 1.2 6 4.2 0 1.2-1.2 2.1-3 2.1-1.4 0-2.5-.4-3.2-1.2M12 5v14"/></>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]||p.file}</svg>;
}

function money(value:number,currency:string){return `${currency} ${Number(value||0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})`;}
function stateLabel(v:string|null){const x=(v||"").toUpperCase();if(x.includes("CONFIRM")||x.includes("PAGAD")||x.includes("RECIB"))return["Recibido","ok"];if(x.includes("PROCES")||x.includes("PEND"))return["En proceso","process"];if(x.includes("DISPON"))return["Disponible","ok"];return[v||"Pendiente","process"];}

export default function PagosPage(){
 const[rows,setRows]=useState<Payment[]>([]),[banks,setBanks]=useState<Bank[]>([]),[currencies,setCurrencies]=useState<Record<number,string>>({}),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{(async()=>{try{
   const {data:{user}}=await supabase.auth.getUser();
   const [{data:payments,error:pe},{data:monedas,error:me}]=await Promise.all([
     supabase.from("pagos").select("id,operacion_id,importe,moneda_id,metodo_pago,estado,fecha_pago,comprobante").order("creado_en",{ascending:false}).limit(100),
     supabase.from("monedas").select("id,codigo")
   ]);
   if(pe)throw pe;if(me)throw me;setRows((payments||[]) as Payment[]);setCurrencies(Object.fromEntries((monedas||[]).map((x:any)=>[x.id,x.codigo])));
   if(user){const {data:m}=await supabase.from("company_users").select("company_id").eq("profile_id",user.id).eq("activo",true).limit(1);const companyId=(m?.[0] as any)?.company_id;if(companyId){const {data:b}=await supabase.from("empresas_bancos").select("id,banco,alias,moneda,activo").eq("empresa_id",companyId).eq("activo",true).order("creado_en",{ascending:true});setBanks((b||[]) as Bank[]);}}
 }catch(e){setError(e instanceof Error?e.message:"No se pudieron cargar los pagos.");}finally{setLoading(false);}})()},[]);
 const totals=useMemo(()=>{const received=rows.filter(r=>/CONFIRM|PAGAD|RECIB/.test((r.estado||"").toUpperCase())).reduce((s,r)=>s+Number(r.importe||0),0);const process=rows.filter(r=>/PROCES|PEND/.test((r.estado||"").toUpperCase())).reduce((s,r)=>s+Number(r.importe||0),0);return{received,process};},[rows]);
 const currency=rows[0]?.moneda_id?currencies[rows[0].moneda_id]||"USD":"USD";
 const available=Math.max(0,totals.received);
 const fmtDate=(d:string|null)=>d?new Date(d).toLocaleDateString("es-AR"): "—";
 const transactionRows=rows.slice(0,7);
 return <main className="payments-page">
  <header className="payments-hero"><div><h1>Pagos</h1><p>Gestiona los pagos de tus operaciones, comisiones y retiros de forma segura.</p></div></header>
  <nav className="payments-tabs"><a className="active" href="#resumen"><Icon name="file" size={16}/>Resumen</a><a href="#transacciones">▣ Transacciones</a><a href="#cuentas">▣ Cuentas bancarias</a><a href="#metodos">▣ Métodos de pago</a><a href="#retiros">▣ Retiros</a><a href="#facturas">▣ Facturas</a><a href="#configuracion">⚙ Configuración</a></nav>
  {error&&<div className="module-alert module-alert-error">{error}</div>}
  {loading?<div className="payments-loading">Cargando pagos…</div>:<>
   <section id="resumen" className="payment-kpis">
    <div className="payment-kpi green"><span className="payment-kpi-icon"><Icon name="wallet" size={29}/></span><div><small>Saldo disponible</small><strong>{money(available,currency)}</strong><em>Para retiro de comisiones</em></div></div>
    <div className="payment-kpi amber"><span className="payment-kpi-icon"><Icon name="coins" size={29}/></span><div><small>En proceso</small><strong>{money(totals.process,currency)}</strong><em>En operaciones activas</em></div></div>
    <div className="payment-kpi blue"><span className="payment-kpi-icon"><Icon name="check" size={29}/></span><div><small>Total recibido</small><strong>{money(totals.received,currency)}</strong><em>Según pagos registrados</em></div></div>
    <div className="payment-kpi purple"><span className="payment-kpi-icon"><Icon name="chart" size={29}/></span><div><small>Total retirado</small><strong>{money(0,currency)}</strong><em>Según retiros registrados</em></div></div>
    <button className="payment-history-btn">Ver historial</button>
   </section>
   <div className="payments-content-grid">
    <section id="transacciones" className="payments-panel transactions-panel"><div className="payments-panel-title"><h2>Últimas transacciones</h2><button>Ver todas</button></div>
      <div className="payments-table-wrap"><table><thead><tr><th>Fecha</th><th>Operación</th><th>Concepto</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {transactionRows.length?transactionRows.map((p,i)=>{const[s,c]=stateLabel(p.estado);const code=p.operacion_id?String(p.operacion_id).slice(0,8).toUpperCase():`PAGO-${i+1}`;return <tr key={p.id}><td>{fmtDate(p.fecha_pago)}</td><td><span className={"payment-type-icon "+(i%3===1?"orange":i%3===2?"red":"blue")}><Icon name={i%3===1?"dollar":i%3===2?"upload":"file"} size={18}/></span><b>{code}</b></td><td><strong>{p.metodo_pago||"Pago de operación"}</strong><small>Operación vinculada</small></td><td><b>{money(Number(p.importe||0),currencies[p.moneda_id||0]||currency)}</b></td><td><span className={"payment-state "+c}>{s}</span></td><td><button className="payment-action"><Icon name="eye" size={18}/></button></td></tr>}) : <tr><td colSpan={6} className="payments-empty">Todavía no hay transacciones registradas.</td></tr>}
      </tbody></table></div>
    </section>
    <aside id="retiros" className="payments-panel withdrawal-panel"><h2>Retiro de comisiones</h2><p className="withdrawal-balance">Saldo disponible <strong>para retiro</strong></p><div className="withdrawal-amount">{money(available,currency)}</div><label>Monto a retirar ({currency})</label><div className="withdrawal-input"><input placeholder="0,00"/><span>{currency}</span></div><label>Seleccionar cuenta bancaria</label><select defaultValue={banks[0]?.id||""}><option value="">Seleccioná una cuenta</option>{banks.map(b=><option value={b.id} key={b.id}>{b.banco||"Banco"} · {b.alias||"Cuenta"} ({b.moneda||currency})</option>)}</select><button className="withdrawal-submit"><Icon name="upload" size={18}/>Solicitar retiro</button><div className="withdrawal-info"><Icon name="shield" size={22}/><div><strong>Información</strong><p>Los retiros se procesan de forma segura una vez validados.</p></div></div></aside>
   </div>
   <div className="payments-bottom-grid">
    <section id="metodos" className="payments-panel methods-panel"><h2>Métodos de pago aceptados</h2><div className="methods-grid">{[["bank","Transferencia bancaria"],["card","Carta de crédito (LC)"],["dollar","Pago por financiera"],["shield","Escrow (plataforma)"],["coins","Stablecoins (USDT)"]].map(([icon,label],i)=><div key={label}><span className={"method-icon m"+i}><Icon name={icon} size={27}/></span><strong>{label}</strong></div>)}</div></section>
    <section id="cuentas" className="payments-panel banks-panel"><div className="payments-panel-title"><h2>Cuentas bancarias</h2><button>Gestionar</button></div>{banks.length?banks.slice(0,3).map((b,i)=><div className="bank-row" key={b.id}><span className="bank-icon"><Icon name="bank" size={18}/></span><div><strong>{b.banco||"Banco"}</strong><small>{b.alias||"Cuenta bancaria"} · {b.moneda||currency}</small></div>{i===0&&<em>Principal</em>}<button><Icon name="dots" size={18}/></button></div>):<div className="bank-empty">No hay cuentas bancarias activas configuradas.</div>}</section>
    <section className="payments-panel chart-panel"><div className="payments-panel-title"><h2>Evolución de pagos</h2><select defaultValue="12"><option value="12">Últimos 12 meses</option></select></div><div className="payment-chart-legend"><span><i/>Recibidos</span><span><i/>Comisiones</span><span><i/>Retiros</span></div><div className="payment-bars">{Array.from({length:12}).map((_,i)=><div className="payment-month" key={i}><div className="bars"><i style={{height:(18+(i%5)*9)+"%"}}/><i style={{height:(10+(i%4)*7)+"%"}}/><i style={{height:(7+(i%3)*6)+"%"}}/></div><small>{["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][i]}</small></div>)}</div></section>
   </div>
  </>}
 </main>;
}
