"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";

type Factura={id:string;operacion_id:string;contrato_id:string|null;empresa_id:string;empresa_receptor_id:string|null;numero_factura:string|null;tipo_factura:string|null;tipo_comprobante_codigo:number|null;punto_venta:number|null;numero_comprobante:number|null;fecha_emision:string|null;cuit_emisor:string|null;cuit_receptor:string|null;razon_social_emisor:string|null;razon_social_receptor:string|null;importe_neto:number|null;importe_iva:number|null;importe_total:number|null;moneda_id:number|null;cae:string|null;caea:string|null;cae_vencimiento:string|null;estado:string;arca_mensaje:string|null;creada_en:string|null};
type Op={id:string;codigo:string;estado:string;cantidad_tn:number;importe_total:number};
type Company={id:string;razon_social:string;cuit:string;rol:string};

export default function FacturasPage(){
 const [rows,setRows]=useState<Factura[]>([]),[ops,setOps]=useState<Op[]>([]),[companies,setCompanies]=useState<Company[]>([]);
 const [opId,setOpId]=useState(""),[receiver,setReceiver]=useState(""),[tipo,setTipo]=useState(11),[pv,setPv]=useState(""),[net,setNet]=useState(""),[iva,setIva]=useState("0"),[cond,setCond]=useState("");
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[msg,setMsg]=useState(""),[err,setErr]=useState("");
 async function load(){
  setLoading(true);setErr("");
  const [{data:f,error:fe},{data:o,error:oe}]=await Promise.all([
   supabase.from("facturas").select("id,operacion_id,contrato_id,empresa_id,empresa_receptor_id,numero_factura,tipo_factura,tipo_comprobante_codigo,punto_venta,numero_comprobante,fecha_emision,cuit_emisor,cuit_receptor,razon_social_emisor,razon_social_receptor,importe_neto,importe_iva,importe_total,moneda_id,cae,caea,cae_vencimiento,estado,arca_mensaje,creada_en").order("creada_en",{ascending:false}),
   supabase.from("operaciones").select("id,codigo,estado,cantidad_tn,importe_total").eq("estado","CERRADA").order("fecha_operacion",{ascending:false})
  ]);
  if(fe) setErr(fe.message);if(oe) setErr(oe.message);setRows((f||[]) as Factura[]);setOps((o||[]) as Op[]);setLoading(false);
 }
 useEffect(()=>{load()},[]);
 async function loadReceivers(id:string){
  setOpId(id);setReceiver("");if(!id){setCompanies([]);return}
  const {data}=await supabase.from("operacion_participantes").select("empresa_id,rol,empresas(id,razon_social,cuit)").eq("operacion_id",id);
  setCompanies(((data||[]).map((x:any)=>({id:x.empresas?.id,razon_social:x.empresas?.razon_social,cuit:x.empresas?.cuit,rol:x.rol})).filter((x:any)=>x.id)) as Company[]);
 }
 async function request(){
  setBusy(true);setErr("");setMsg("");
  try{
   const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Sesión expirada.");
   if(!opId||!receiver||!pv||!net)throw new Error("Completá operación, receptor, punto de venta e importe neto.");
   const {data:id,error}=await supabase.rpc("crear_solicitud_factura",{p_operacion_id:opId,p_empresa_receptor_id:receiver,p_tipo_comprobante_codigo:tipo,p_punto_venta:Number(pv),p_importe_neto:Number(net),p_importe_iva:Number(iva||0),p_condicion_iva_receptor:cond?Number(cond):null});
   if(error)throw new Error(error.message);
   const r=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+"/functions/v1/arca-facturacion",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify({invoice_id:id})});
   const j=await r.json();if(!r.ok)throw new Error(j.error||"Error de integración ARCA.");
   setMsg(j.ok?"Comprobante autorizado por ARCA.":"ARCA respondió con rechazo/observación. Revisá el motivo.");await load();
  }catch(e){setErr(e instanceof Error?e.message:"No se pudo procesar la factura.")}finally{setBusy(false)}
 }
 return <main className="module-page">
  <div className="module-hero"><div><span className="eyebrow">FISCAL</span><h1>Facturas</h1><p>Comprobantes vinculados a operaciones. Los CAE y números fiscales se obtienen exclusivamente de ARCA.</p></div><div className="module-pill">{rows.length} comprobantes</div></div>
  {err&&<div className="module-alert module-alert-error">{err}</div>}{msg&&<div className="module-alert">{msg}</div>}
  <section className="document-section"><div className="document-section-head"><div><span className="eyebrow">EMISIÓN</span><h2>Solicitar comprobante oficial</h2><p>La numeración y autorización son determinadas por ARCA. AgroBrokerIA no inventa CAE ni números.</p></div></div>
   <div style={{display:"grid",gap:10,maxWidth:850}}>
    <select value={opId} onChange={e=>loadReceivers(e.target.value)}><option value="">Operación cerrada</option>{ops.map(o=><option key={o.id} value={o.id}>{o.codigo} · {Number(o.cantidad_tn).toLocaleString("es-AR")} TN</option>)}</select>
    <select value={receiver} onChange={e=>setReceiver(e.target.value)}><option value="">Empresa receptora</option>{companies.map(c=><option key={c.id} value={c.id}>{c.razon_social} · CUIT {c.cuit} · {c.rol}</option>)}</select>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><select value={tipo} onChange={e=>setTipo(Number(e.target.value))}><option value={1}>Factura A</option><option value={6}>Factura B</option><option value={11}>Factura C</option><option value={51}>Factura M</option></select><input placeholder="Punto de venta ARCA" inputMode="numeric" value={pv} onChange={e=>setPv(e.target.value)}/></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><input placeholder="Importe neto" inputMode="decimal" value={net} onChange={e=>setNet(e.target.value)}/><input placeholder="IVA" inputMode="decimal" value={iva} onChange={e=>setIva(e.target.value)}/></div>
    <input placeholder="Condición IVA receptor (código ARCA, si corresponde)" inputMode="numeric" value={cond} onChange={e=>setCond(e.target.value)}/>
    <button disabled={busy||!opId||!receiver} onClick={request}>{busy?"Procesando con ARCA…":"Enviar a ARCA"}</button>
   </div>
  </section>
  <section className="document-section"><div className="document-section-head"><div><span className="eyebrow">HISTORIAL</span><h2>Comprobantes</h2></div></div>
   {loading?<div className="loading-card">Cargando…</div>:rows.length===0?<div className="module-empty compact"><p>No hay comprobantes registrados.</p></div>:<div className="document-grid">{rows.map(f=><article className="document-card" key={f.id}><div className="document-icon">F</div><div><strong>{f.tipo_factura||"Comprobante"} {f.punto_venta&&f.numero_comprobante?String(f.punto_venta).padStart(5,"0")+"-"+String(f.numero_comprobante).padStart(8,"0"):"Pendiente"}</strong><p>{f.razon_social_receptor||"Receptor pendiente"}</p><small>{f.fecha_emision||"Sin fecha"} · {f.estado} · {f.cae?"CAE "+f.cae:"Sin CAE"}</small>{f.arca_mensaje&&<small>{f.arca_mensaje}</small>}</div><span className={"document-status "+(f.estado==="AUTORIZADA"?"ok":"")}>{f.estado}</span><Link href={"/operaciones/"+f.operacion_id}>Operación</Link></article>)}</div>}
  </section>
 </main>
}