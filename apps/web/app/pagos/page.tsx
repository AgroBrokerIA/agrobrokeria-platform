"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";

type Payment={id:string;operacion_id:string;importe:number;moneda_id:number|null;metodo_pago:string|null;estado:string|null;fecha_pago:string|null;creado_en:string};
type Method={id:string;nombre:string|null;tipo:string;estado:string|null;alias:string|null;banco:string|null;cbu:string|null;moneda_id:number|null};
type Withdrawal={id:string;importe:number;estado:string|null;fecha_solicitud:string|null;medio_cobro_id:string|null;moneda_id:number|null};
type PaymentOperation={id:string;codigo:string;importe_total:number;moneda_id:number;ownRole:string;otherEmpresaId:string;otherName:string};
const money=(n:number,c:string)=>`${c} ${Number(n||0).toLocaleString("es-AR",{maximumFractionDigits:0})}`;
const label=(s:string|null)=>/RECIB|PAGAD|CONFIRM/i.test(s||"")?"Recibido":/PROCES|PEND/i.test(s||"")?"En proceso":s||"Pendiente";
const tone=(s:string|null)=>/RECIB|PAGAD|CONFIRM/i.test(s||"")?"ok":/PROCES|PEND/i.test(s||"")?"process":"process";


export default function PagosPage(){
 const[isAdmin,setIsAdmin]=useState(false),[rows,setRows]=useState<Payment[]>([]),[methods,setMethods]=useState<Method[]>([]),[withdrawals,setWithdrawals]=useState<Withdrawal[]>([]),[curr,setCurr]=useState<Record<number,string>>({}),[commissionAvailable,setCommissionAvailable]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(""),[msg,setMsg]=useState("");
 const[amount,setAmount]=useState(""),[bankId,setBankId]=useState(""),[busy,setBusy]=useState(false);
 const[ownEmpresaId,setOwnEmpresaId]=useState(""),[paymentOps,setPaymentOps]=useState<PaymentOperation[]>([]),[selectedPaymentOp,setSelectedPaymentOp]=useState(""),[paymentAmount,setPaymentAmount]=useState(""),[paymentReference,setPaymentReference]=useState(""),[paymentBusy,setPaymentBusy]=useState(false);
 async function load(){
  setLoading(true);setError("");
  try{
   const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Necesitás iniciar sesión.");const{data:adminFlag}=await supabase.rpc("es_administrador_plataforma");const admin=adminFlag===true;setIsAdmin(admin);
   const{data:profile}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).single();if(!profile?.active_company_id)throw new Error("No se encontró una empresa activa.");
   const {data:companyMap}=await supabase.from("company_empresa_map").select("empresa_id").eq("company_id",profile.active_company_id).order("verified",{ascending:false}).limit(1).maybeSingle();
   const ownEntityId=companyMap?.empresa_id||profile.active_company_id;setOwnEmpresaId(ownEntityId);
   const {data:ownParticipation}=await supabase.from("operacion_participantes").select("operacion_id,rol").eq("empresa_id",ownEntityId);
   const ownOps=(ownParticipation||[]).filter((x:any)=>["COMPRADOR","VENDEDOR"].includes(String(x.rol||"").toUpperCase()));
   if(ownOps.length){
    const ids=ownOps.map((x:any)=>x.operacion_id);
    const [{data:operationRows},{data:allParticipants}]=await Promise.all([
     supabase.from("operaciones").select("id,codigo,importe_total,moneda_id,estado").in("id",ids),
     supabase.from("operacion_participantes").select("operacion_id,empresa_id,rol,empresas(id,razon_social,nombre_comercial)").in("operacion_id",ids)
    ]);
    const ownRoleMap=new Map(ownOps.map((x:any)=>[x.operacion_id,String(x.rol||"").toUpperCase()]));
    const list=(operationRows||[]).flatMap((op:any)=>{
     const role=ownRoleMap.get(op.id);if(!role)return [];
     const other=(allParticipants||[]).find((x:any)=>x.operacion_id===op.id&&x.empresa_id!==ownEntityId&&String(x.rol||"").toUpperCase()===(role==="COMPRADOR"?"VENDEDOR":"COMPRADOR"));
     if(!other)return [];
     const entity=Array.isArray(other.empresas)?other.empresas[0]:other.empresas;
     return [{id:op.id,codigo:op.codigo||op.id.slice(0,8),importe_total:Number(op.importe_total||0),moneda_id:Number(op.moneda_id||0),ownRole:role,otherEmpresaId:other.empresa_id,otherName:entity?.nombre_comercial||entity?.razon_social||"Contraparte"}];
    });
    setPaymentOps(list);if(list.length&&!selectedPaymentOp)setSelectedPaymentOp(list[0].id);
   }else{setPaymentOps([]);setSelectedPaymentOp("");}
   const [p,m,mon,w,c]=await Promise.all([
    supabase.from("pagos").select("id,operacion_id,importe,moneda_id,metodo_pago,estado,fecha_pago,creado_en").order("creado_en",{ascending:false}).limit(100),
    admin?supabase.from("medios_cobro").select("id,nombre,tipo,estado,alias,banco,cbu,moneda_id").eq("empresa_id",profile.active_company_id).eq("tipo","BANCO").order("es_predeterminado",{ascending:false}):Promise.resolve({data:[],error:null}),
    supabase.from("monedas").select("id,codigo"),
    admin?supabase.from("retiros_comisiones").select("id,importe,estado,fecha_solicitud,medio_cobro_id,moneda_id").eq("empresa_id",profile.active_company_id).order("fecha_solicitud",{ascending:false}).limit(50):Promise.resolve({data:[],error:null}),
    admin?supabase.from("operacion_comisiones").select("saldo_pagado,saldo_reservado,estado,moneda_id").eq("empresa_id",profile.active_company_id):Promise.resolve({data:[],error:null})
   ]);
   if(p.error)throw p.error;if(m.error)throw m.error;if(mon.error)throw mon.error;
   setRows((p.data||[]) as Payment[]);setMethods((m.data||[]) as Method[]);setWithdrawals((w.data||[]) as Withdrawal[]);setCurr(Object.fromEntries((mon.data||[]).map((x:any)=>[x.id,x.codigo])));
   setCommissionAvailable((c.data||[]).filter((x:any)=>x.estado==="ABONADA").reduce((s:any,x:any)=>s+Math.max(Number(x.saldo_pagado||0)-Number(x.saldo_reservado||0),0),0));
   const active=(m.data||[]).find((x:any)=>x.tipo==="BANCO"&&x.estado!=="INACTIVO");if(active&&!bankId)setBankId(active.id);

  }catch(e){setError(e instanceof Error?e.message:"No se pudieron cargar los pagos.")}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);
 const aggregate=(items:Payment[])=>{const totals=new Map<number,number>();for(const r of items)totals.set(r.moneda_id||0,(totals.get(r.moneda_id||0)||0)+Number(r.importe||0));if(!totals.size)return "0";if(totals.size===1){const [id,value]=[...totals.entries()][0];return money(value,curr[id]||"Moneda");}return "Varias monedas"};
 const received=aggregate(rows.filter(r=>/RECIB|PAGAD|CONFIRM/i.test(r.estado||"")));
 const process=aggregate(rows.filter(r=>/PROCES|PEND/i.test(r.estado||"")));
 const withdrawnMap=withdrawals.filter(r=>/COMPLET|PAGAD|APROB/i.test(r.estado||"")).reduce((m,r)=>{const id=r.moneda_id||0;m.set(id,(m.get(id)||0)+Number(r.importe||0));return m},new Map<number,number>()); const withdrawn=withdrawnMap.size===1?[...withdrawnMap.values()][0]:0; const commissionCurrencyIds=[...new Set((withdrawals.map(r=>r.moneda_id).filter(Boolean) as number[]).concat(rows.map(r=>r.moneda_id).filter(Boolean) as number[]))]; const displayCurrency=commissionCurrencyIds.length===1?(curr[commissionCurrencyIds[0]]||"Moneda"):"";
 const balance=Math.max(0,commissionAvailable);
 const banks=methods.filter(m=>m.tipo==="BANCO"&&m.estado!=="INACTIVO");

 const months=useMemo(()=>{const now=new Date();return Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;const monthRows=rows.filter(r=>(r.fecha_pago||r.creado_en||"").slice(0,7)===key);const totals=new Map<number,number>();for(const r of monthRows)totals.set(r.moneda_id||0,(totals.get(r.moneda_id||0)||0)+Number(r.importe||0));const amount=totals.size===1?Number([...totals.values()][0]||0):0;return{label:d.toLocaleDateString("es-AR",{month:"short"}).replace(".",""),value:aggregate(monthRows),amount}})},[rows,curr]);
 const monthAmounts=months.map(m=>m.amount);
 const maxMonth=Math.max(1,...monthAmounts);
 async function registerOperationPayment(){
  setError("");setMsg("");
  const op=paymentOps.find(x=>x.id===selectedPaymentOp);const n=Number(paymentAmount.replace(",","."));
  if(!op||!ownEmpresaId){setError("Seleccioná una operación comercial en la que participes como comprador o vendedor.");return;}if(!op.moneda_id){setError("La operación no tiene una moneda contractual configurada. No se puede registrar el pago hasta corregir ese dato.");return;}
  if(!Number.isFinite(n)||n<=0){setError("Ingresá un importe de pago mayor a cero.");return;}
  if(!paymentReference.trim()){setError("Ingresá la referencia bancaria o identificador del comprobante.");return;}
  setPaymentBusy(true);
  try{
   const payer=op.ownRole==="COMPRADOR"?ownEmpresaId:op.otherEmpresaId;
   const receiver=op.ownRole==="VENDEDOR"?ownEmpresaId:op.otherEmpresaId;
   const {data,error:rpcError}=await supabase.rpc("registrar_pago_operacion",{
    p_operacion_id:op.id,p_empresa_pagadora:payer,p_empresa_cobradora:receiver,p_importe:n,p_moneda_id:op.moneda_id,p_metodo_pago:"TRANSFERENCIA",p_referencia:paymentReference.trim(),p_comprobante:paymentReference.trim()
   });
   if(rpcError)throw new Error(rpcError.message);
   setPaymentAmount("");setPaymentReference("");setMsg("Pago registrado en Pagos con estado pendiente de conciliación. Referencia: "+String(data).slice(0,8).toUpperCase());
   await load();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo registrar el pago.");}
  finally{setPaymentBusy(false);}
 }
 async function requestWithdrawal(){
  setMsg("");setError("");const n=Number(amount);if(!n||n<=0){setError("Ingresá un importe válido.");return}if(n>balance){setError("El importe supera el saldo disponible.");return}if(!bankId){setError("Seleccioná una cuenta bancaria.");return}
  setBusy(true);try{const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Sesión expirada.");const{data:profile}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).single();const bank=methods.find(m=>m.id===bankId);if(!profile?.active_company_id||!bank)throw new Error("No se encontró la cuenta seleccionada.");if(!bank.moneda_id)throw new Error("La cuenta bancaria no tiene una moneda configurada.");const{data,error:e}=await supabase.rpc("solicitar_retiro_comision",{p_empresa_id:profile.active_company_id,p_profile_id:user.id,p_medio_cobro_id:bank.id,p_moneda_id:bank.moneda_id,p_importe:n});if(e)throw new Error(e.message);setAmount("");setMsg(`Solicitud de retiro creada: ${String(data).slice(0,8)}…`);await load()}catch(e){setError(e instanceof Error?e.message:"No se pudo solicitar el retiro.")}finally{setBusy(false)}
 }
 return <main className="payments-page">
  <header className="payments-hero"><div><h1>Pagos</h1><p>Gestioná y consultá los pagos registrados de tus operaciones.</p></div></header>
  <nav className="payments-tabs"><Link className="active" href="/pagos">Resumen</Link><Link href="/transacciones">Transacciones</Link>{isAdmin?<Link href="/facturas">Facturación</Link>:<Link href="/cumplimientos#fiscal">Cumplimiento fiscal</Link>}{isAdmin&&<><Link href="/medios-cobro">Medios de cobro</Link><Link href="/cuentas-bancarias">Cuentas bancarias</Link><Link href="/retiros-comisiones">Retiros</Link></>}</nav>
  {error&&<div className="module-alert module-alert-error">{error}</div>}{msg&&<div className="module-alert">{msg}</div>}
  <section className="payment-kpis">
   <div className="payment-kpi green"><div className="payment-kpi-icon">✓</div><div><small>Pagos recibidos</small><strong>{received}</strong><em>Total de pagos registrados</em></div></div>
   <div className="payment-kpi amber"><div className="payment-kpi-icon">◷</div><div><small>En proceso</small><strong>{process}</strong><em>En operaciones activas</em></div></div>
   {isAdmin&&<div className="payment-kpi blue"><div className="payment-kpi-icon">▣</div><div><small>Saldo para retirar</small><strong>{commissionCurrencyIds.length===1?money(balance,displayCurrency):commissionCurrencyIds.length>1?"Varias monedas":"Sin moneda"}</strong><em>Comisiones disponibles</em></div></div>}
   {isAdmin&&<div className="payment-kpi purple"><div className="payment-kpi-icon">↗</div><div><small>Total retirado</small><strong>{commissionCurrencyIds.length===1?money(withdrawn,displayCurrency):commissionCurrencyIds.length>1?"Varias monedas":"Sin moneda"}</strong><em>Retiros completados</em></div></div>}
   {isAdmin&&<Link className="payment-history-btn" href="/retiros-comisiones">Historial</Link>}
  </section>
  <section className="payments-panel payment-register-panel" style={{marginBottom:18,padding:20}}>
   <h2>Registrar pago de una operación</h2>
   <p>El comprador o vendedor puede informar una transferencia. El registro queda en Pagos con estado pendiente hasta su conciliación; no se confirma automáticamente el cobro.</p>
   {paymentOps.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,alignItems:"end"}}>
    <label>Operación y contraparte<select value={selectedPaymentOp} onChange={e=>setSelectedPaymentOp(e.target.value)} style={{display:"block",width:"100%",padding:10,border:"1px solid #cbd5e1",borderRadius:8}}>{paymentOps.map(op=><option key={op.id} value={op.id}>{op.codigo} · {op.ownRole==="COMPRADOR"?"Comprador":"Vendedor"} · {op.otherName} · {curr[op.moneda_id]||"Moneda"}</option>)}</select></label>
    <label>Importe transferido<input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} placeholder="Importe" style={{display:"block",width:"100%",padding:10,border:"1px solid #cbd5e1",borderRadius:8}}/></label>
    <label>Referencia bancaria / comprobante<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="N.º de transferencia" style={{display:"block",width:"100%",padding:10,border:"1px solid #cbd5e1",borderRadius:8}}/></label>
    <button type="button" disabled={paymentBusy||!paymentAmount||!paymentReference.trim()} onClick={()=>void registerOperationPayment()} style={{padding:11,border:0,borderRadius:8,background:paymentBusy?"#94a3b8":"#087a50",color:"#fff",fontWeight:700}}>{paymentBusy?"Registrando…":"Registrar pago"}</button>
   </div>:<p>No hay operaciones disponibles para registrar pagos desde esta empresa. Solo se muestran operaciones en las que participás como comprador o vendedor.</p>}
  </section>
  <section className="payments-content-grid">
   <section className="payments-panel transactions-panel"><div className="payments-panel-title"><h2>Últimos pagos</h2><Link href="/transacciones">Ver todos →</Link></div><div className="payments-table-wrap"><table><thead><tr><th>Fecha</th><th>Operación</th><th>Método</th><th>Importe</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{loading?<tr><td colSpan={6} className="payments-empty">Cargando pagos…</td></tr>:rows.slice(0,10).map(r=><tr key={r.id}><td>{(r.fecha_pago||r.creado_en)?new Date(r.fecha_pago||r.creado_en).toLocaleDateString("es-AR"):"—"}</td><td><strong>{r.operacion_id||"—"}</strong></td><td><span className="payment-type-icon blue">{"🏦"}</span>{r.metodo_pago||"Pago de operación"}</td><td><strong>{money(Number(r.importe||0),curr[r.moneda_id||0]||"Moneda")}</strong></td><td><span className={`payment-state ${tone(r.estado)}`}>{label(r.estado)}</span></td><td><Link className="payment-action" href={r.operacion_id?"/operaciones/"+r.operacion_id:"/transacciones"}>→</Link></td></tr>)}</tbody></table></div></section>
   {isAdmin&&<section className="payments-panel withdrawal-panel"><h2>Solicitar retiro</h2><p className="withdrawal-balance">Saldo disponible <strong>{commissionCurrencyIds.length===1?money(balance,displayCurrency):"Varias monedas"}</strong></p><div className="withdrawal-amount">{commissionCurrencyIds.length===1?money(Number(amount||0),displayCurrency):"—"}</div><label>Monto a retirar</label><div className="withdrawal-input"><input type="number" min="0" max={balance} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/><span>{displayCurrency||"Seleccioná una moneda"}</span></div><p className="withdrawal-method-note">El retiro se procesa mediante la cuenta bancaria seleccionada y su medio de cobro validado.</p><label>Cuenta bancaria</label><select value={bankId} onChange={e=>setBankId(e.target.value)}><option value="">Seleccionar cuenta</option>{banks.map(b=><option key={b.id} value={b.id}>{b.banco||b.nombre} · ****{b.cbu?.slice(-4)||"—"}</option>)}</select><button className="withdrawal-submit" disabled={busy||!amount||!bankId||commissionCurrencyIds.length!==1} onClick={requestWithdrawal}>{busy?"Procesando…":"Solicitar retiro →"}</button><div className="withdrawal-info"><span>ⓘ</span><div><strong>Procesamiento seguro</strong><p>La solicitud queda pendiente de validación y retenciones correspondientes.</p></div></div></section>}
  </section>
  {isAdmin&&<section className="payments-bottom-grid">
   <section className="payments-panel methods-panel"><div className="payments-panel-title"><h2>Medio de pago habilitado</h2><Link href="/medios-cobro">Configurar →</Link></div><div className="methods-grid"><div><div className="method-icon m0">🏦</div><strong>Transferencia bancaria</strong><small>Conciliación administrativa obligatoria</small></div></div><p className="bank-empty">No se habilitan pasarelas externas, eCheq ni medios financieros.</p></section>
   <section className="payments-panel banks-panel"><div className="payments-panel-title"><h2>Cuentas bancarias</h2><Link href="/cuentas-bancarias">Ver todas →</Link></div>{banks.slice(0,4).map(b=><div className="bank-row" key={b.id}><span className="bank-icon">🏦</span><div><strong>{b.banco||b.nombre}</strong><small>{b.alias||("****"+(b.cbu?.slice(-4)||"—"))}</small></div><em>Activa</em><Link className="payment-action" href="/cuentas-bancarias">→</Link></div>)}{!banks.length&&<div className="bank-empty">No hay cuentas bancarias configuradas.</div>}</section>
   <section className="payments-panel chart-panel"><div className="payments-panel-title"><h2>Evolución de pagos</h2><span>Datos reales</span></div><div className="payment-chart-legend"><span><i/>Pagos registrados</span></div><div className="payment-bars">{months.map((m,i)=><div className="payment-month" key={m.label}><div className="bars"><i style={{height:`${Math.max(5,monthAmounts[i]/maxMonth*100)}%`}}/></div><small>{m.label}</small><strong>{m.value}</strong></div>)}</div></section>
  </section>}
 </main>;
}
