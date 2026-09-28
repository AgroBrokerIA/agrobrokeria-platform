"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Pub={id:string;tipo:string;cantidad_tn:number;precio_tn:number;moneda_id:number|null;creada_en:string|null;provincia:string|null;localidad:string|null;puerto:string|null;productos?:{nombre:string}|{nombre:string}[]|null};
type Quote={id:string;price:number|null;previous_value:number|null;variation:number|null;market_date:string;commodity_id:string|null;currency:string|null;unit:string|null};
type Activity={id:string;titulo:string|null;mensaje:string|null;creada_en:string|null;leida:boolean};
const iconFor=(name:string)=>name.toLowerCase().includes("soja")?"🌱":name.toLowerCase().includes("maíz")||name.toLowerCase().includes("maiz")?"🌽":name.toLowerCase().includes("trigo")?"🌾":name.toLowerCase().includes("girasol")?"🌻":"🌾";
const productName=(p:Pub)=>Array.isArray(p.productos)?p.productos[0]?.nombre||"Commodity":p.productos?.nombre||"Commodity";
const money=(value:number|null,currency:string)=>value==null?"Sin cotización":`${currency||"USD"} ${Number(value).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function Dashboard(){
 const router=useRouter();
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [offers,setOffers]=useState<Pub[]>([]),[demands,setDemands]=useState<Pub[]>([]),[activities,setActivities]=useState<Activity[]>([]),[quotes,setQuotes]=useState<Quote[]>([]);
 const [commodities,setCommodities]=useState<Record<string,string>>({}),[monedas,setMonedas]=useState<Record<number,string>>({});
 useEffect(()=>{async function load(){
  try{
   const {data:{user}}=await supabase.auth.getUser(); if(!user){router.replace("/login");return}
   const [pubs,market,notifs]=await Promise.all([
    supabase.from("publicaciones").select("id,tipo,cantidad_tn,precio_tn,moneda_id,creada_en,provincia,localidad,puerto,productos(nombre)").eq("estado","PUBLICADA").order("creada_en",{ascending:false}).limit(20),
    supabase.from("market_quotes").select("id,price,previous_value,variation,market_date,commodity_id,currency,unit").order("market_date",{ascending:false}).order("obtained_at",{ascending:false}).limit(60),
    supabase.from("notificaciones").select("id,titulo,mensaje,creada_en,leida").or(`profile_id.eq.${user.id},cuenta_id.eq.${user.id}`).order("creada_en",{ascending:false}).limit(6)
   ]);
   if(pubs.error||market.error) throw new Error((pubs.error||market.error)?.message||"No se pudo cargar el inicio.");
   const all=(pubs.data||[]) as Pub[];
   setOffers(all.filter(x=>x.tipo!=="DEMANDA").slice(0,5)); setDemands(all.filter(x=>x.tipo==="DEMANDA").slice(0,5));
   setQuotes((market.data||[]) as Quote[]); setActivities((notifs.data||[]) as Activity[]);
   const [{data:cr},{data:currencyRows}]=await Promise.all([supabase.from("commodities").select("id,codigo"),supabase.from("monedas").select("id,codigo")]);
   setCommodities(Object.fromEntries((cr||[]).map((x:any)=>[x.id,x.codigo]))); setMonedas(Object.fromEntries((currencyRows||[]).map((x:any)=>[x.id,x.codigo])));
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar el inicio.")}finally{setLoading(false)}
 } void load()},[router]);

 const grouped=useMemo(()=>{const m=new Map<string,Quote[]>();for(const q of quotes){const code=commodities[q.commodity_id||""]||"OTRO";if(!m.has(code))m.set(code,[]);m.get(code)!.push(q)}return m},[quotes,commodities]);
 const marketCards=["SOJA","MAIZ","TRIGO","GIRASOL"].map(code=>({code,q:(grouped.get(code)||[])[0]}));
 const priceRows=marketCards.map(({code,q})=>({code,label:code==="SOJA"?"Soja":code==="MAIZ"?"Maíz":code==="TRIGO"?"Trigo":"Girasol",q}));
 const change=(q?:Quote)=>q?.variation==null?"":`${q.variation>=0?"+":""}${Number(q.variation).toFixed(2)}%`;

 if(loading)return <main className="dashboard-reference"><div className="dashboard-loading">Cargando AgroBrokerIA…</div></main>;

 return <main className="dashboard-reference">
  <section className="dashboard-reference-hero">
   <div className="dashboard-hero-overlay"/>
   <div className="dashboard-reference-hero-copy">
    <h1>Conectamos<br/>productores, acopios y compradores<br/><span>en todo el mundo</span></h1>
    <p>Negociación segura, transparente y eficiente de granos y commodities.</p>
    <div className="dashboard-trust-pills"><span>🛡 <b>Empresas</b><small>verificadas</small></span><span>🤝 <b>Negociaciones</b><small>seguras</small></span><span>📈 <b>Oportunidades</b><small>con IA</small></span></div>
   </div>
   <div className="dashboard-global-card"><div className="dashboard-world-map">🌐</div><strong>Mercados globales</strong><small>Oportunidades en tiempo real</small><Link href="/mercado">Explorar mercado →</Link></div>
  </section>

  {error&&<div className="module-alert error">{error}</div>}

  <section className="dashboard-price-row">
   {priceRows.map(({code,label,q})=><div className="dashboard-price-card" key={code}><b>{iconFor(label)}</b><div><strong>{label}</strong><small>{code==="GIRASOL"?"Rosario":"MATba · Rosario"}</small><em>{money(q?.price||null,q?.currency||"USD")}</em><span className={Number(q?.variation||0)>=0?"up":"down"}>{q?.variation==null?"Sin variación":change(q)} ↗</span></div><div className="dashboard-mini-chart"><span/></div></div>)}
   <Link href="/mercado" className="dashboard-board-link"><b>📊</b><strong>Ver pizarra completa →</strong><small>Precios en tiempo real<br/>Bolsa de Comercio de Rosario</small></Link>
  </section>

  <section className="dashboard-actions-row">
   <Link href="/nueva-publicacion?tipo=OFERTA" className="dashboard-action green">▤ <span>Publicar oferta</span></Link>
   <Link href="/nueva-publicacion?tipo=DEMANDA" className="dashboard-action blue">▤ <span>Publicar demanda</span></Link>
   <Link href="/oportunidades" className="dashboard-action purple">⌕ <span>Buscar oportunidades</span></Link>
   <Link href="/mercado" className="dashboard-action gold">📈 <span>Ver mercado</span></Link>
   <Link href="/operaciones" className="dashboard-action orange">▣ <span>Mis operaciones</span></Link>
   <Link href="/contratos" className="dashboard-action slate">▧ <span>Crear contrato</span></Link>
  </section>

  <section className="dashboard-content-grid">
   <DashboardList title="Ofertas destacadas" items={offers} type="offer" monedas={monedas}/>
   <DashboardList title="Demandas destacadas" items={demands} type="demand" monedas={monedas}/>
   <section className="dashboard-panel dashboard-activity-panel"><div className="dashboard-card-head"><h2>Actividad reciente</h2><Link href="/notificaciones">Ver todas →</Link></div><div className="dashboard-activity-list">{activities.map((a,i)=><div key={a.id}><b className={i%2===0?"green":"blue"}>{a.leida?"✓":"▤"}</b><span><strong>{a.titulo||"Actividad comercial"}</strong><small>{a.mensaje||"Actualización disponible"}</small></span><time>{a.creada_en?new Date(a.creada_en).toLocaleDateString("es-AR"):"—"}</time></div>)}{!activities.length&&<div className="dashboard-empty-line">No hay actividad reciente.</div>}</div></section>
  </section>

  <section className="dashboard-feature-strip">
   <div><b>🌐</b><span><strong>Comercio internacional</strong><small>Conectamos mercados globales</small></span></div>
   <div><b>🛡</b><span><strong>Seguridad y confianza</strong><small>Empresas verificadas y KYC</small></span></div>
   <div><b>文</b><span><strong>Multi-idioma</strong><small>Traducción automática</small></span></div>
   <div><b>▤</b><span><strong>Contratos digitales</strong><small>Modelos LOI, SCO y contratos</small></span></div>
   <div><b>🚚</b><span><strong>Logística integrada</strong><small>Seguimiento de embarques</small></span></div>
  </section>
 </main>;
}

function DashboardList({title,items,type,monedas}:{title:string;items:Pub[];type:"offer"|"demand";monedas:Record<number,string>}){
 return <section className="dashboard-panel dashboard-list-panel"><div className="dashboard-card-head"><h2>{title}</h2><Link href={type==="offer"?"/marketplace":"/marketplace?tipo=DEMANDA"}>Ver todas →</Link></div><div className="dashboard-list-items">{items.map(p=>{const name=productName(p);return <div className="dashboard-list-item" key={p.id}><b className="commodity-thumb">{iconFor(name)}</b><span className={type==="offer"?"tag-offer":"tag-demand"}>{type==="offer"?"OFERTA":"DEMANDA"}</span><span className="item-main"><strong>{name}</strong><small>{Number(p.cantidad_tn).toLocaleString("es-AR")} TN</small><em>{[p.puerto,p.localidad,p.provincia].filter(Boolean).join(", ")||"Ubicación no informada"}</em></span><span className="item-place">{p.provincia?.includes("Santa")?"🇦🇷":"🌎"} {p.provincia||"Global"}</span><span className="item-price">{money(p.precio_tn,p.moneda_id?(monedas[p.moneda_id]||""):"USD")}/tn</span><Link href={`/marketplace?publicacion=${p.id}`}>Ver detalle</Link></div>})}{!items.length&&<div className="dashboard-empty-line">No hay publicaciones activas.</div>}</div></section>
}