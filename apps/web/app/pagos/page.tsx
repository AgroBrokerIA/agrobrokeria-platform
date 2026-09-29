"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";

type Payment={id:string;operacion_id:string;importe:number;moneda_id:number|null;metodo_pago:string|null;estado:string|null;fecha_pago:string|null;creado_en:string};
type Method={id:string;nombre:string|null;tipo:string;estado:string|null;alias:string|null;banco:string|null;cbu:string|null;moneda_id:number|null};
type Withdrawal={id:string;importe:number;estado:string|null;fecha_solicitud:string|null;medio_cobro_id:string|null};
const money=(n:number,c:string)=>`${c} ${Number(n||0).toLocaleString("es-AR",{maximumFractionDigits:0})}`;
const label=(s:string|null)=>/RECIB|PAGAD|CONFIRM/i.test(s||"")?"Recibido":/PROCES|PEND/i.test(s||"")?"En proceso":s||"Pendiente";
const tone=(s:string|null)=>/RECIB|PAGAD|CONFIRM/i.test(s||"")?"ok":/PROCES|PEND/i.test(s||"")?"process":"process";
const iconFor=(name:string)=>/transfer|banc/i.test(name)?"🏦":/usdt|crypto/i.test(name)?"₮":/mercado/i.test(name)?"◉":/wise/i.test(name)?"7":"₿";

export default function PagosPage(){
 const[rows,setRows]=useState<Payment[]>([]),[methods,setMethods]=useState<Method[]>([]),[withdrawals,setWithdrawals]=useState<Withdrawal[]>([]),[curr,setCurr]=useState<Record<number,string>>({}),[commissionTotal,setCommissionTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(""),[msg,setMsg]=useState("");
 const[amount,setAmount]=useState(""),[methodId,setMethodId]=useState(""),[bankId,setBankId]=useState(""),[busy,setBusy]=useState(false),[clock,setClock]=useState(()=>Date.now());
 async function load(){
  setLoading(true);setError("");
  try{
   const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Necesitás iniciar sesión.");
   const{data:profile}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).single();if(!profile?.active_company_id)throw new Error("No se encontró una empresa activa.");
   const [p,m,mon,w,c]=await Promise.all([
    supabase.from("pagos").select("id,operacion_id,importe,moneda_id,metodo_pago,estado,fecha_pago,creado_en").order("creado_en",{ascending:false}).limit(100),
    supabase.from("medios_cobro").select("id,nombre,tipo,estado,alias,banco,cbu,moneda_id").eq("empresa_id",profile.active_company_id).order("es_predeterminado",{ascending:false}),
    supabase.from("monedas").select("id,codigo"),
    supabase.from("retiros_comisiones").select("id,importe,estado,fecha_solicitud,medio_cobro_id").eq("empresa_id",profile.active_company_id).order("fecha_solicitud",{ascending:false}).limit(50),
    supabase.from("comisiones").select("importe_calculado,estado").eq("participante_id",profile.active_company_id)
   ]);
   if(p.error)throw p.error;if(m.error)throw m.error;if(mon.error)throw mon.error;
   setRows((p.data||[]) as Payment[]);setMethods((m.data||[]) as Method[]);setWithdrawals((w.data||[]) as Withdrawal[]);setCurr(Object.fromEntries((mon.data||[]).map((x:any)=>[x.id,x.codigo])));
   setCommissionTotal((c.data||[]).reduce((s:any,x:any)=>s+Number(x.importe_calculado||0),0));
   const active=(m.data||[]).find((x:any)=>x.tipo==="BANCO"&&x.estado!=="INACTIVO");if(active&&!bankId)setBankId(active.id);
   const first=(m.data||[]).find((x:any)=>x.tipo!=="BANCO"&&x.estado!=="INACTIVO");if(first&&!methodId)setMethodId(first.id);
  }catch(e){setError(e instanceof Error?e.message:"No se pudieron cargar los pagos.")}finally{setLoading(false)}
 }
 useEffect(()=>{void load();setClock(Date.now())},[]);
 const received=rows.filter(r=>/RECIB|PAGAD|CONFIRM/i.test(r.estado||"")).reduce((s,r)=>s+Number(r.importe||0),0);
 const process=rows.filter(r=>/PROCES|PEND/i.test(r.estado||"")).reduce((s,r)=>s+Number(r.importe||0),0);
 const withdrawn=withdrawals.filter(r=>/COMPLET|PAGAD|APROB/i.test(r.estado||"")).reduce((s,r)=>s+Number(r.importe||0),0);
 const balance=Math.max(0,commissionTotal-withdrawn);
 const banks=methods.filter(m=>m.tipo==="BANCO"&&m.estado!=="INACTIVO");
 const payoutMethods=methods.filter(m=>m.tipo!=="BANCO"&&m.estado!=="INACTIVO");
 const months=useMemo(()=>{const now=new Date(clock);return Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;const value=rows.filter(r=>(r.fecha_pago||r.creado_en||"").slice(0,7)===key).reduce((s,r)=>s+Number(r.importe||0),0);return{label:d.toLocaleDateString("es-AR",{month:"short"}).replace(".",""),value}})},[rows]);
 const maxMonth=Math.max(1,...months.map(x=>x.value));
 async function requestWithdrawal(){
  setMsg("");setError("");const n=Number(amount);if(!n||n<=0){setError("Ingresá un importe válido.");return}if(n>balance){setError("El importe supera el saldo disponible.");return}if(!bankId){setError("Seleccioná una cuenta bancaria.");return}
  setBusy(true);try{const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Sesión expirada.");const{data:profile}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).single();const bank=methods.find(m=>m.id===bankId);if(!profile?.active_company_id||!bank)throw new Error("No se encontró la cuenta seleccionada.");const{data,error:e}=await supabase.rpc("solicitar_retiro_comision",{p_empresa_id:profile.active_company_id,p_profile_id:user.id,p_medio_cobro_id:bank.id,p_moneda_id:bank.moneda_id||1,p_importe:n});if(e)throw new Error(e.message);setAmount("");setMsg(`Solicitud de retiro creada: ${String(data).slice(0,8)}…`);await load()}catch(e){setError(e instanceof Error?e.message:"No se pudo solicitar el retiro.")}finally{setBusy(false)}
 }
 return <main className="payments-page">
  <header className="payments-hero"><div><h1>Pagos</h1><p>Gestiona los pagos de tus operaciones, comisiones y retiros de forma segura.</p></div></header>
  <nav className="payments-tabs"><Link className="active" href="/pagos">Resumen</Link><Link href="/transacciones">Transacciones</Link><Link href="/cuentas-bancarias">Cuentas bancarias</Link><Link href="/medios-cobro">Métodos de pago</Link><Link href="/retiros-comisiones">Retiros / comisiones</Link><Link href="/facturas">Facturas</Link><Link href="/configuracion">Configuración</Link></nav>
  {error&&<div className="module-alert module-alert-error">{error}</div>}{msg&&<div className="module-alert">{msg}</div>}
  <section className="payment-kpis">
   <div className="payment-kpi green"><div className="payment-kpi-icon">✓</div><div><small>Pagos recibidos</small><strong>{money(received,"USD")}</strong><em>Total de pagos registrados</em></div></div>
   <div className="payment-kpi amber"><div className="payment-kpi-icon">◷</div><div><small>En proceso</small><strong>{money(process,"USD")}</strong><em>En operaciones activas</em></div></div>
   <div className="payment-kpi blue"><div className="payment-kpi-icon">▣</div><div><small>Saldo para retirar</small><strong>{money(balance,"USD")}</strong><em>Comisiones disponibles</em></div></div>
   <div className="payment-kpi purple"><div className="payment-kpi-icon">↗</div><div><small>Total retirado</small><strong>{money(withdrawn,"USD")}</strong><em>Retiros completados</em></div></div>
   <Link className="payment-history-btn" href="/retiros-comisiones">Historial</Link>
  </section>
  <section className="payments-content-grid">
   <section className="payments-panel transactions-panel"><div className="payments-panel-title"><h2>Últimos pagos</h2><Link href="/transacciones">Ver todos →</Link></div><div className="payments-table-wrap"><table><thead><tr><th>Fecha</th><th>Operación</th><th>Método</th><th>Importe</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{loading?<tr><td colSpan={6} className="payments-empty">Cargando pagos…</td></tr>:rows.slice(0,10).map(r=><tr key={r.id}><td>{r.fecha_pago?new Date(r.fecha_pago).toLocaleDateString("es-AR"):"—"}</td><td><strong>{r.operacion_id||"—"}</strong></td><td><span className="payment-type-icon blue">{iconFor(r.metodo_pago||"")}</span>{r.metodo_pago||"Pago de operación"}</td><td><strong>{money(Number(r.importe||0),curr[r.moneda_id||0]||"USD")}</strong></td><td><span className={`payment-state ${tone(r.estado)}`}>{label(r.estado)}</span></td><td><Link className="payment-action" href={r.operacion_id?"/operaciones/"+r.operacion_id:"/transacciones"}>→</Link></td></tr>)}</tbody></table></div></section>
   <section className="payments-panel withdrawal-panel"><h2>Solicitar retiro</h2><p className="withdrawal-balance">Saldo disponible <strong>{money(balance,"USD")}</strong></p><div className="withdrawal-amount">{money(Number(amount||0),"USD")}</div><label>Monto a retirar</label><div className="withdrawal-input"><input type="number" min="0" max={balance} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/><span>USD</span></div><label>Método de pago</label><select value={methodId} onChange={e=>setMethodId(e.target.value)}><option value="">Seleccionar método</option>{payoutMethods.map(m=><option key={m.id} value={m.id}>{m.nombre||m.tipo}</option>)}</select><label>Cuenta bancaria</label><select value={bankId} onChange={e=>setBankId(e.target.value)}><option value="">Seleccionar cuenta</option>{banks.map(b=><option key={b.id} value={b.id}>{b.banco||b.nombre} · ****{b.cbu?.slice(-4)||"—"}</option>)}</select><button className="withdrawal-submit" disabled={busy||!amount||!bankId} onClick={requestWithdrawal}>{busy?"Procesando…":"Solicitar retiro →"}</button><div className="withdrawal-info"><span>ⓘ</span><div><strong>Procesamiento seguro</strong><p>La solicitud queda pendiente de validación y retenciones correspondientes.</p></div></div></section>
  </section>
  <section className="payments-bottom-grid">
   <section className="payments-panel methods-panel"><div className="payments-panel-title"><h2>Métodos de pago disponibles</h2><Link href="/medios-cobro">Configurar →</Link></div><div className="methods-grid">{[...payoutMethods.slice(0,5)].map((m,i)=><div key={m.id}><div className={`method-icon m${i}`}>{iconFor(m.nombre||m.tipo)}</div><strong>{m.nombre||m.tipo}</strong></div>)}{!payoutMethods.length&&<div className="bank-empty">Configurá métodos en Métodos de pago.</div>}</div></section>
   <section className="payments-panel banks-panel"><div className="payments-panel-title"><h2>Cuentas bancarias</h2><Link href="/cuentas-bancarias">Ver todas →</Link></div>{banks.slice(0,4).map(b=><div className="bank-row" key={b.id}><span className="bank-icon">🏦</span><div><strong>{b.banco||b.nombre}</strong><small>{b.alias||("****"+(b.cbu?.slice(-4)||"—"))}</small></div><em>Activa</em><Link className="payment-action" href="/cuentas-bancarias">→</Link></div>)}{!banks.length&&<div className="bank-empty">No hay cuentas bancarias configuradas.</div>}</section>
   <section className="payments-panel chart-panel"><div className="payments-panel-title"><h2>Evolución de pagos</h2><select><option>Últimos 6 meses</option></select></div><div className="payment-chart-legend"><span><i/>Recibidos</span><span><i/>En proceso</span><span><i/>Retiros</span></div><div className="payment-bars">{months.map(m=><div className="payment-month" key={m.label}><div className="bars"><i style={{height:`${Math.max(5,m.value/maxMonth*100)}%`}}/><i style={{height:`${Math.max(5,m.value/maxMonth*65)}%`}}/><i style={{height:`${Math.max(5,withdrawn/maxMonth*25)}%`}}/></div><small>{m.label}</small></div>)}</div></section>
  </section>
 </main>;
}
