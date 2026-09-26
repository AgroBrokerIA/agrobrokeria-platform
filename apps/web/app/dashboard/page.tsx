"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Pub={id:string;tipo:string;cantidad_tn:number;precio_tn:number;moneda_id:number|null;creada_en:string|null;provincia:string|null;localidad:string|null;puerto:string|null;productos?:{nombre:string}|{nombre:string}[]|null};
type Op={id:string;codigo:string;estado:string;cantidad_tn:number;tipo_operacion:string|null};
type Opp={id:string;publicacion_id:string;indice_compatibilidad:number;estado:string;creada_en:string;publicacion?:Pub};
type Quote={id:string;price:number|null;variation:number|null;market_date:string;commodity_id:string|null;currency:string|null;unit:string|null};
type Activity={id:string;titulo:string|null;mensaje:string|null;creada_en:string|null;leida:boolean};

const iconFor=(name:string)=>name.toLowerCase().includes("soja")?"🌱":name.toLowerCase().includes("maíz")||name.toLowerCase().includes("maiz")?"🌽":name.toLowerCase().includes("trigo")?"🌾":name.toLowerCase().includes("girasol")?"🌻":"◉";
const productName=(p:Pub)=>Array.isArray(p.productos)?p.productos[0]?.nombre||"Commodity":p.productos?.nombre||"Commodity";
const money=(value:number|null,currency:string)=>value==null?"S/C":`${currency} ${Number(value).toLocaleString("es-AR")}`;

function Sparkline({values}:{values:number[]}) {
 if(values.length<2)return <div className="dashboard-spark-empty">Sin histórico</div>;
 const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
 const points=values.map((v,i)=>`${(i/(values.length-1))*100},${36-((v-min)/range)*30}`).join(" ");
 return <svg className="dashboard-spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-label="Evolución"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.4" vectorEffect="non-scaling-stroke"/></svg>;
}

export default function Dashboard(){
 const [profile,setProfile]=useState<{nombre:string|null;empresa:string|null;active_company_id:string|null}>({nombre:null,empresa:null,active_company_id:null});
 const [email,setEmail]=useState(""); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 const [offers,setOffers]=useState<Pub[]>([]),[demands,setDemands]=useState<Pub[]>([]),[ops,setOps]=useState<Op[]>([]),[opps,setOpps]=useState<Opp[]>([]),[activities,setActivities]=useState<Activity[]>([]);
 const [quotes,setQuotes]=useState<Quote[]>([]); const [commodities,setCommodities]=useState<Record<string,string>>({});
 const [counts,setCounts]=useState({offers:0,demands:0,opportunities:0,operations:0,contracts:0,invoices:0});

 useEffect(()=>{async function load(){
  try{
   const {data:{user}}=await supabase.auth.getUser(); if(!user){window.location.href="/login";return}
   setEmail(user.email||"");
   const {data:p}=await supabase.from("profiles").select("nombre,empresa,active_company_id").eq("id",user.id).maybeSingle();
   setProfile(p||{nombre:null,empresa:null,active_company_id:null});
   const companyId=p?.active_company_id;
   const [pubs,operations,opportunities,market,comms,invoices,notifs]=await Promise.all([
    supabase.from("publicaciones").select("id,tipo,cantidad_tn,precio_tn,moneda_id,creada_en,provincia,localidad,puerto,productos(nombre)").eq("estado","PUBLICADA").order("creada_en",{ascending:false}).limit(12),
    supabase.from("operaciones").select("id,codigo,estado,cantidad_tn,tipo_operacion").neq("estado","ANULADA").order("fecha_operacion",{ascending:false}).limit(8),
    companyId?supabase.from("oportunidades").select("id,publicacion_id,indice_compatibilidad,estado,creada_en").eq("empresa_id",companyId).order("indice_compatibilidad",{ascending:false}).limit(5):Promise.resolve({data:[],error:null}),
    supabase.from("market_quotes").select("id,price,variation,market_date,commodity_id,currency,unit").order("market_date",{ascending:false}).order("obtained_at",{ascending:false}).limit(40),
    supabase.from("contratos").select("id,estado",{count:"exact",head:true}).neq("estado","FIRMADO"),
    supabase.from("facturas").select("id,estado",{count:"exact",head:true}).not("estado","in","(AUTORIZADA,CANCELADA)"),
    supabase.from("notificaciones").select("id,titulo,mensaje,creada_en,leida").or(`profile_id.eq.${user.id},cuenta_id.eq.${user.id}`).order("creada_en",{ascending:false}).limit(6)
   ]);
   if(pubs.error||operations.error||opportunities.error||market.error)throw new Error((pubs.error||operations.error||opportunities.error||market.error)?.message||"No se pudo cargar el tablero.");
   const all=(pubs.data||[]) as Pub[]; setOffers(all.filter(x=>x.tipo!=="DEMANDA").slice(0,5)); setDemands(all.filter(x=>x.tipo==="DEMANDA").slice(0,5));
   setOps((operations.data||[]) as Op[]);
   const oppBase=(opportunities.data||[]) as any[]; const ids=oppBase.map(x=>x.publicacion_id).filter(Boolean);
   const pubMap=new Map(all.map(x=>[x.id,x])); const missing=ids.filter(id=>!pubMap.has(id));
   if(missing.length){const {data:extra}=await supabase.from("publicaciones").select("id,tipo,cantidad_tn,precio_tn,moneda_id,creada_en,provincia,localidad,puerto,productos(nombre)").in("id",missing);for(const x of (extra||[]) as Pub[])pubMap.set(x.id,x)}
   setOpps(oppBase.map(x=>({...x,publicacion:pubMap.get(x.publicacion_id)})));
   setQuotes((market.data||[]) as Quote[]);
   const {data:cr}=await supabase.from("commodities").select("id,codigo"); setCommodities(Object.fromEntries((cr||[]).map((x:any)=>[x.id,x.codigo])));
   const [{count:oc},{count:dc},{count:pc},{count:opCount}]=await Promise.all([
    supabase.from("publicaciones").select("id",{count:"exact",head:true}).eq("estado","PUBLICADA").neq("tipo","DEMANDA"),
    supabase.from("publicaciones").select("id",{count:"exact",head:true}).eq("estado","PUBLICADA").eq("tipo","DEMANDA"),
    companyId?supabase.from("oportunidades").select("id",{count:"exact",head:true}).eq("empresa_id",companyId):Promise.resolve({count:0,error:null}),
    supabase.from("operaciones").select("id",{count:"exact",head:true}).not("estado","in","(CERRADA,ANULADA)")
   ]);
   setCounts({offers:oc||0,demands:dc||0,opportunities:pc||0,operations:opCount||0,contracts:comms.count||0,invoices:invoices.count||0});
   setActivities((notifs.data||[]) as Activity[]);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar el tablero.")}finally{setLoading(false)}
 } void load()},[]);

 const grouped=useMemo(()=>{const m=new Map<string,Quote[]>();for(const q of quotes){const code=commodities[q.commodity_id||""]||"OTRO";if(!m.has(code))m.set(code,[]);m.get(code)!.push(q)}return m},[quotes]);
 const soy=[...(grouped.get("SOJA")||[])].reverse();
 const topQuote=soy[soy.length-1];
 const soyValues=soy.map(q=>Number(q.price)).filter(Number.isFinite);
 const marketCards=["SOJA","MAIZ","TRIGO","GIRASOL","SORGO"].map(code=>{const q=(grouped.get(code)||[])[0];return {code,q}});
 if(loading)return <main className="dashboard-page"><div className="loading-card">Cargando centro de operaciones…</div></main>;

 return <main className="dashboard-page dashboard-reference">
  <section className="dashboard-banner">
   <div className="dashboard-banner-copy"><span>PLATAFORMA INTEGRAL DE NEGOCIOS AGROINDUSTRIALES</span><h1>Bienvenido a<br/><strong>AgroBroker<span>IA</span></strong></h1><p>Conectamos productores, compradores e intermediarios en todo el mundo.</p></div>
   <div className="dashboard-banner-stats">
    {[[counts.offers,"Ofertas activas","▧"],[counts.demands,"Demandas activas","⌂"],[counts.opportunities,"Oportunidades IA","✦"],[counts.operations,"Operaciones en curso","◌"],[counts.contracts,"Contratos pendientes","▣"],[counts.invoices,"Facturas pendientes","▤"]].map(([n,label,icon])=><div key={label}><b>{icon}</b><strong>{n}</strong><small>{label}</small></div>)}
   </div>
  </section>

  {error&&<div className="module-alert error">{error}</div>}
  <div className="dashboard-main-grid">
   <section className="dashboard-panel dashboard-board">
    <div className="dashboard-section-head"><h2>◉ Pizarra Rosario - Cotizaciones del día</h2><span className="live-dot">● En vivo</span><small>{quotes[0]?.market_date||"Sin sincronización"}</small><Link href="/mercado">Ver detalle →</Link></div>
    <div className="dashboard-tabs"><b>Granos</b><span>Oleaginosas</span><span>Derivados</span><span>Futuros</span><span>Dólar e índices</span></div>
    <div className="dashboard-market-table"><div className="dashboard-table-head"><span>Producto</span><span>Mes</span><span>Último</span><span>Var. Día</span><span>Var. %</span><span>USD/TN</span></div>
     {marketCards.map(({code,q})=><div className="dashboard-table-row" key={code}><strong>{code==="SOJA"?"Soja":code==="MAIZ"?"Maíz":code[0]+code.slice(1).toLowerCase()}</strong><span>{q?.market_date||"—"}</span><span>{q?.price==null?"Sin cotización":money(q.price,q.currency||"USD")}</span><span className={Number(q?.variation||0)>=0?"up":"down"}>{q?.variation==null?"—":`${q.variation>=0?"+":""}${Number(q.variation).toLocaleString("es-AR",{maximumFractionDigits:2})}`}</span><span className={Number(q?.variation||0)>=0?"up":"down"}>{q?.variation==null?"—":`${q.variation>=0?"+":""}${Number(q.variation).toLocaleString("es-AR",{maximumFractionDigits:2})}%`}</span><strong>{q?.price==null?"—":money(q.price,q.currency||"USD")}</strong></div>)}
    </div>
    <div className="dashboard-market-cards">{marketCards.map(({code,q})=><div key={code}><b>{iconFor(code)}</b><span>{code}</span><strong>{q?.price==null?"S/C":money(q.price,q.currency||"USD")}</strong><small>{q?.variation==null?"":`${q.variation>=0?"+":""}${Number(q.variation).toFixed(2)}%`}</small></div>)}</div>
   </section>
   <aside className="dashboard-side-stack">
    <section className="dashboard-panel"><div className="dashboard-section-head"><h2>Mercado</h2><Link href="/mercado">Ver más →</Link></div>{marketCards.slice(0,4).map(({code,q})=><div className="dashboard-global-row" key={code}><span>{iconFor(code)} {code}</span><strong>{q?.price==null?"S/C":money(q.price,q.currency||"USD")}</strong><small>{q?.variation==null?"":`${q.variation>=0?"+":""}${Number(q.variation).toFixed(2)}%`}</small></div>)}</section>
    <section className="dashboard-panel dashboard-risk"><div><span>◉</span><small>Riesgo / referencias externas</small><strong>{topQuote?.price==null?"Sin dato":money(topQuote.price,topQuote.currency||"USD")}</strong></div><div><small>Fecha</small><strong>{topQuote?.market_date||"—"}</strong></div></section>
   </aside>
  </div>

  <div className="dashboard-market-cards dashboard-price-strip">{marketCards.map(({code,q})=><div key={"strip-"+code}><b>{iconFor(code)}</b><span>{code}</span><strong>{q?.price==null?"S/C":money(q.price,q.currency||"USD")}</strong><small>{q?.variation==null?"":`${q.variation>=0?"+":""}${Number(q.variation).toFixed(2)}%`}</small><Sparkline values={(grouped.get(code)||[]).slice(0,12).reverse().map(x=>Number(x.price)).filter(Number.isFinite)}/></div>)}</div>

  <div className="dashboard-three-grid">
   <section className="dashboard-panel dashboard-list-panel"><div className="dashboard-section-head"><h2>◉ Ofertas recientes</h2><Link href="/marketplace">Ver todas →</Link></div><div className="dashboard-mini-table">{offers.map(p=><div key={p.id}><span>{iconFor(productName(p))} {productName(p)}</span><b>{Number(p.cantidad_tn).toLocaleString("es-AR")} t</b><strong>{money(p.precio_tn,"USD")}</strong><small>{[p.localidad,p.provincia].filter(Boolean).join(", ")||"—"}</small><small>{p.creada_en?new Date(p.creada_en).toLocaleDateString("es-AR"):"—"}</small><Link href={"/marketplace?publicacion="+p.id}>Ver</Link></div>)}{!offers.length&&<div className="dashboard-empty-line">No hay ofertas activas.</div>}</div></section>
   <section className="dashboard-panel dashboard-list-panel"><div className="dashboard-section-head"><h2>◉ Demandas recientes</h2><Link href="/marketplace?tipo=DEMANDA">Ver todas →</Link></div><div className="dashboard-mini-table">{demands.map(p=><div key={p.id}><span>{iconFor(productName(p))} {productName(p)}</span><b>{Number(p.cantidad_tn).toLocaleString("es-AR")} t</b><strong>{money(p.precio_tn,"USD")}</strong><small>{[p.localidad,p.provincia].filter(Boolean).join(", ")||"—"}</small><small>{p.puerto||"—"}</small><Link href={"/marketplace?publicacion="+p.id}>Ver</Link></div>)}{!demands.length&&<div className="dashboard-empty-line">No hay demandas activas.</div>}</div></section>
   <section className="dashboard-panel dashboard-list-panel"><div className="dashboard-section-head"><h2>◉ Actividad reciente</h2><Link href="/notificaciones">Ver todas →</Link></div><div className="dashboard-activity">{activities.map(a=><div key={a.id}><b>{a.leida?"◌":"●"}</b><span><strong>{a.titulo||"Actividad comercial"}</strong><small>{a.mensaje||"Actualización disponible"}</small></span><time>{a.creada_en?new Date(a.creada_en).toLocaleDateString("es-AR"):"—"}</time></div>)}{!activities.length&&<div className="dashboard-empty-line">No hay actividad reciente.</div>}</div></section>
  </div>

  <div className="dashboard-bottom-grid">
   <section className="dashboard-panel"><div className="dashboard-section-head"><h2>▣ Mis operaciones</h2><Link href="/operaciones">Ver todas →</Link></div><div className="dashboard-mini-table dashboard-ops">{ops.slice(0,5).map(o=><div key={o.id}><span>{o.codigo}</span><b>{o.tipo_operacion||"Operación"}</b><strong>{Number(o.cantidad_tn).toLocaleString("es-AR")} t</strong><small>{o.estado}</small><Link href={"/operaciones/"+o.id}>Ver →</Link></div>)}</div></section>
   <section className="dashboard-panel"><div className="dashboard-section-head"><h2>✦ Oportunidades IA</h2><span className="dashboard-new-badge">{opps.length} nuevas</span><Link href="/oportunidades">Ver todas →</Link></div><div className="dashboard-opportunity-list">{opps.slice(0,3).map(o=><div key={o.id}><strong>{Number(o.indice_compatibilidad)}%</strong><span><b>{o.publicacion?productName(o.publicacion):"Publicación compatible"} · {o.publicacion?.cantidad_tn||"—"} t</b><small>{o.publicacion?.localidad||o.publicacion?.provincia||"Ubicación no informada"}</small></span><Link href={"/marketplace?publicacion="+o.publicacion_id}>Ver</Link></div>)}{!opps.length&&<div className="dashboard-empty-line">No hay oportunidades nuevas.</div>}</div></section>
  </div>
 </main>;
}