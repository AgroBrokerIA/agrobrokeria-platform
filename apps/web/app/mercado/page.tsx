"use client";

import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase/client";
import Link from "next/link";

type Quote={id:string;source:string;market_date:string;obtained_at:string;price:number|null;currency:string|null;unit:string|null;price_type:string;position:string|null;market:string|null;port:string|null;freshness:string;commodity_id:string|null;product_id:number|null;variation:number|null;previous_value:number|null;};
type Pub={id:string;tipo:string;cantidad_tn:number;precio_tn:number;provincia:string|null;localidad:string|null;puerto:string|null;creada_en:string|null;productos?:{nombre:string}|{nombre:string}[]|null};
type ProductMeta={id:number;codigo:string;nombre:string;categoria:string|null};
const names=new Map([["SOJA","Soja"],["MAIZ","Maíz"],["TRIGO","Trigo"],["GIRASOL","Girasol"],["SORGO","Sorgo"],["ACEITE_SOJA","Aceite de Soja"],["HARINA_SOJA","Harina de Soja"]]);
const icon=(code:string)=>code==="SOJA"?"🫘":code==="MAIZ"?"🌽":code==="TRIGO"?"🌾":code==="GIRASOL"?"🌻":"🌾";
const fmt=(q?:Quote|null)=>q?.price==null?"Sin cotización":`${q.currency||"Moneda no informada"} ${Number(q.price).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const productName=(p:Pub)=>Array.isArray(p.productos)?p.productos[0]?.nombre||"Commodity":p.productos?.nombre||"Commodity";

export default function MercadoPage(){
 const[quotes,setQuotes]=useState<Quote[]>([]),[commodities,setCommodities]=useState<Record<string,string>>({}),[products,setProducts]=useState<Record<string,ProductMeta>>({}),[offers,setOffers]=useState<Pub[]>([]),[demands,setDemands]=useState<Pub[]>([]);
 const[loading,setLoading]=useState(true),[syncing,setSyncing]=useState(false),[error,setError]=useState(""),[syncMsg,setSyncMsg]=useState(""),[marketTab,setMarketTab]=useState("Granos"),[range,setRange]=useState("1D"),[internationalMarket,setInternationalMarket]=useState("CHICAGO"),[tradeCondition,setTradeCondition]=useState("FOB");
 async function load(){
  setLoading(true);setError("");
  const [qr,cr,pr,prod]=await Promise.all([
   supabase.from("market_quotes").select("id,source,market_date,obtained_at,price,currency,unit,price_type,position,market,port,freshness,commodity_id,product_id,variation,previous_value").order("market_date",{ascending:false}).order("obtained_at",{ascending:false}).limit(300),
   supabase.from("commodities").select("id,codigo"),
   supabase.from("publicaciones").select("id,tipo,cantidad_tn,precio_tn,provincia,localidad,puerto,creada_en,productos(nombre)").eq("estado","PUBLICADA").order("creada_en",{ascending:false}).limit(12),
   supabase.from("productos").select("id,codigo,nombre,categoria").eq("activo",true).order("nombre")
  ]);
  if(qr.error||cr.error||pr.error||prod.error)setError(qr.error?.message||cr.error?.message||pr.error?.message||prod.error?.message||"No se pudo cargar mercado.");
  setQuotes((qr.data||[]) as Quote[]);
  setCommodities(Object.fromEntries((cr.data||[]).map((x:any)=>[x.id,x.codigo])));
  setProducts(Object.fromEntries((prod.data||[]).map((x:any)=>[String(x.id),x as ProductMeta])));
  const pubs=(pr.data||[]) as Pub[];setOffers(pubs.filter(x=>x.tipo!=="DEMANDA").slice(0,5));setDemands(pubs.filter(x=>x.tipo==="DEMANDA").slice(0,5));setLoading(false);
 }
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const tab=params.get("tab");if(tab&&["Granos","Aceites","Harinas","Subproductos","Futuros","FOB","FAS","CIF","Mercados internacionales"].includes(tab))setMarketTab(tab);void load()},[]);
 async function sync(){
  setSyncing(true);setSyncMsg("");setError("");
  try{const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Necesitás iniciar sesión.");
   const{data:j,error:invokeError}=await supabase.functions.invoke("market-data-sync");
   if(invokeError)throw new Error(invokeError.message||"No se pudo actualizar BCR/CAC.");
   if(!j?.ok)throw new Error(j?.error||"No se pudo actualizar BCR/CAC.");
   setSyncMsg("Precios BCR/CAC actualizados. El histórico fue conservado.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Error de actualización.")}finally{setSyncing(false)}
 }
 const latest=useMemo(()=>{const m=new Map<string,Quote>();for(const q of quotes){const code=commodities[q.commodity_id||""]||q.commodity_id||"OTRO";if(!m.has(code))m.set(code,q)}return m},[quotes,commodities]);
 const productMeta=(q:Quote)=>products[String(q.product_id||"")];
 const codeFor=(q:Quote)=>productMeta(q)?.codigo||commodities[q.commodity_id||""]||q.commodity_id||"OTRO";
 const nameFor=(q:Quote)=>productMeta(q)?.nombre||names.get(codeFor(q))||codeFor(q);
 const categoryFor=(q:Quote)=>String(productMeta(q)?.categoria||"").toLowerCase();
 const latestByProduct=useMemo(()=>{const m=new Map<string,Quote>();for(const q of quotes){const key=String(q.product_id||q.commodity_id||q.id);if(!m.has(key))m.set(key,q)}return m},[quotes,products,commodities]);
 const catalogProducts=useMemo(()=>Object.values(products),[products]);
 const catalogForTab=useMemo(()=>{
   if(marketTab==="Aceites")return catalogProducts.filter(p=>String(p.nombre||"").toLowerCase().includes("aceite")||String(p.categoria||"").toLowerCase().includes("aceite"));
   if(marketTab==="Harinas")return catalogProducts.filter(p=>String(p.categoria||"").toLowerCase().includes("harina"));
   if(marketTab==="Subproductos")return catalogProducts.filter(p=>String(p.categoria||"").toLowerCase().includes("subproducto"));
   if(marketTab==="Granos")return catalogProducts.filter(p=>["cereal","oleaginosa","legumbre","pseudocereal","especialidad","semilla"].some(x=>String(p.categoria||"").toLowerCase().includes(x)));
   return [];
 },[catalogProducts,marketTab]);
 const cards:Array<{code:string;name:string;q?:Quote}>=Array.from(latestByProduct.values()).slice(0,8).map(q=>({code:codeFor(q),name:nameFor(q),q}));
 const tabQuotes=quotes.filter(q=>{
   const p=String(q.price_type||"").toUpperCase();
   if(marketTab==="Futuros")return p.includes("FUT");
   if(["FOB","FAS","CIF"].includes(marketTab))return p.startsWith(marketTab);
   if(marketTab==="Mercados internacionales")return ["CHICAGO","EURONEXT","BRASIL","PARIS"].includes(String(q.market||"").toUpperCase());
   if(marketTab==="Aceites")return categoryFor(q).includes("aceite");
   if(marketTab==="Harinas")return categoryFor(q).includes("harina");
   if(marketTab==="Subproductos")return categoryFor(q).includes("subproducto");
   return ["cereal","oleaginosa","legumbre","pseudocereal","especialidad","semilla"].some(x=>categoryFor(q).includes(x));
 }).slice(0,30);
 const rangeSize:Record<string,number>={"1D":30,"1S":50,"1M":100,"3M":150,"1A":200,"Todo":300};
 const tabQuoteRows=tabQuotes.map(q=>({code:codeFor(q),name:nameFor(q),q}));
 const catalogRows=catalogForTab.map(p=>({code:p.codigo,name:p.nombre,q:latestByProduct.get(String(p.id))}));
 const displayRows=["Granos","Aceites","Harinas","Subproductos"].includes(marketTab)?catalogRows:tabQuoteRows;
 const soja=quotes.filter(q=>(commodities[q.commodity_id||""]||"").toUpperCase()==="SOJA").slice(0,rangeSize[range]||30).reverse();
 const international=quotes.filter(q=>(q.market||"").toUpperCase()===internationalMarket).slice(0,6);
 const futures=quotes.filter(q=>String(q.price_type).toUpperCase().includes("FUT")).slice(0,8);
 return <main className="market-reference">
  <header className="market-reference-head"><div><h1>Mercado</h1><p>Precios en tiempo real y análisis de los principales granos y commodities agrícolas</p></div><div className="market-head-actions"><span className="market-open"><i/> Mercado abierto</span><span>◷ {new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})} (GMT-3)</span><small>Bolsa de Comercio de Rosario</small><a className="market-source-link" href="https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-1" target="_blank" rel="noreferrer">Fuente oficial ↗</a><button onClick={sync} disabled={syncing}>⟳ &nbsp;{syncing?"Actualizando…":"Actualizar precios"}</button></div></header>
  {error&&<div className="module-alert module-alert-error">{error}</div>}{syncMsg&&<div className="module-alert">{syncMsg}</div>}
  <nav className="market-tabs">{["Granos","Aceites","Harinas","Subproductos","Futuros","FOB","FAS","CIF","Mercados internacionales"].map(x=><button key={x} className={marketTab===x?"active":""} onClick={()=>setMarketTab(x)}>{x}</button>)}</nav>
  <section className="market-top-grid"><div className="market-quote-cards">{displayRows.map(({code,name,q})=><article className="market-quote-card" key={code}><b>{icon(code)}</b><div><strong>{name}</strong><small>{code==="GIRASOL"?"Rosario":"MATba · Rosario"}</small><em>{fmt(q)}</em><span className={(q?.variation||0)>=0?"positive":"negative"}>{q?.variation==null?"Sin variación":`${q.variation>=0?"+":""}${Number(q.variation).toFixed(2)}%`} ↗</span></div><div className="market-spark"/></article>)}</div><section className="market-side-card"><div className="market-section-title"><strong>Mercados internacionales</strong><Link href="/mercado">Ver todos →</Link></div><div className="market-pills">{[["Chicago","CHICAGO"],["Euronext","EURONEXT"],["Brasil","BRASIL"],["París","PARIS"]].map(([label,code])=><button type="button" className={internationalMarket===code?"active":""} onClick={()=>setInternationalMarket(code)} key={code}>{label}</button>)}</div><div className="market-mini-head"><span>PRODUCTO</span><span>ÚLTIMO</span><span>VAR.</span></div>{international.length?international.map(q=><div className="market-mini-row" key={q.id}><span>{names.get(commodities[q.commodity_id||""]||"")||commodities[q.commodity_id||""]||"Commodity"}</span><b>{fmt(q)}</b><em>{q.variation==null?"—":`${q.variation>=0?"+":""}${q.variation.toFixed(2)}%`}</em></div>):<div className="market-empty-small">Sin referencias internacionales sincronizadas.</div>}</section></section>

  <section className="market-main-grid"><section className="market-chart-card"><div className="market-section-title"><strong>🫘 &nbsp;Evolución de precios - Soja</strong><div className="chart-ranges">{["1D","1S","1M","3M","1A","Todo"].map(x=><button className={range===x?"active":""} onClick={()=>setRange(x)} key={x}>{x}</button>)}</div></div><div className="market-chart">{soja.length?<svg viewBox="0 0 900 300" preserveAspectRatio="none" aria-label="Evolución de Soja"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#28b879" stopOpacity=".35"/><stop offset="100%" stopColor="#28b879" stopOpacity=".02"/></linearGradient></defs><polyline fill="url(#area)" stroke="none" points={`0,290 ${soja.map((q,i)=>{const max=Math.max(...soja.map(x=>x.price||0)),min=Math.min(...soja.map(x=>x.price||0));const x=20+i*860/Math.max(1,soja.length-1),y=270-((q.price||0)-min)/Math.max(1,max-min)*220;return x+","+y}).join(" ")} 900,290`}/><polyline fill="none" stroke="#16a96d" strokeWidth="3" points={soja.map((q,i)=>{const max=Math.max(...soja.map(x=>x.price||0)),min=Math.min(...soja.map(x=>x.price||0));const x=20+i*860/Math.max(1,soja.length-1),y=270-((q.price||0)-min)/Math.max(1,max-min)*220;return x+","+y}).join(" ")}/></svg>:<div className="market-chart-empty"><strong>Sin datos de evolución de Soja</strong><span>Actualizá BCR/CAC para cargar cotizaciones verificadas.</span></div>}</div><div className="chart-axis"><span>Inicio</span><span>Fin</span></div></section>
   <section className="market-side-card main-quotes"><div className="market-section-title"><strong>Cotizaciones principales</strong></div><div className="market-mini-head"><span>PRODUCTO</span><span>ÚLTIMO</span><span>VARIACIÓN</span></div>{cards.concat(["ACEITE_SOJA","HARINA_SOJA","SORGO"].map(code=>({code,name:names.get(code)||code,q:latest.get(code)}))).map(({code,q})=><div className="market-mini-row" key={code}><span>{names.get(code)||code}</span><b>{fmt(q)}</b><em className={(q?.variation||0)>=0?"positive":"negative"}>{q?.variation==null?"—":`${q.variation>=0?"+":""}${q.variation.toFixed(2)}%`}</em></div>)}</section>
  </section>

  <section className="market-lower-grid"><MarketTable title="Últimas ofertas en el mercado" items={offers} type="offer"/><MarketTable title="Últimas demandas en el mercado" items={demands} type="demand"/><section className="market-side-stack"><section className="market-side-card"><div className="market-section-title"><strong>Futuros - MATba</strong><Link href="/mercado">Ver todos →</Link></div>{futures.length?<div className="market-futures"><div>MES <b>SOJA</b><b>MAÍZ</b><b>TRIGO</b></div>{futures.slice(0,5).map(q=><div key={q.id}><span>{q.position||q.market_date}</span><b>{fmt(q)}</b><b>{fmt(q)}</b><b>{fmt(q)}</b></div>)}</div>:<div className="market-empty-small">Sin futuros sincronizados.</div>}</section><section className="market-side-card"><div className="market-section-title"><strong>FOB / FAS / CIF</strong><Link href="/mercado">Ver todos →</Link></div><div className="market-pills">{["FOB","FAS","CIF"].map(x=><button type="button" className={tradeCondition===x?"active":""} onClick={()=>setTradeCondition(x)} key={x}>{x}</button>)}</div>{quotes.filter(q=>{const p=String(q.price_type||"").toUpperCase();return tradeCondition==="FOB"?p.startsWith("FOB"):tradeCondition==="FAS"?p.startsWith("FAS"):p.startsWith("CIF")}).slice(0,4).length?quotes.filter(q=>{const p=String(q.price_type||"").toUpperCase();return tradeCondition==="FOB"?p.startsWith("FOB"):tradeCondition==="FAS"?p.startsWith("FAS"):p.startsWith("CIF")}).slice(0,4).map(q=><div className="market-mini-row" key={q.id}><span>{names.get(commodities[q.commodity_id||""]||"")||"Commodity"}</span><b>{q.port||"—"}</b><em>{fmt(q)}</em></div>):<div className="market-empty-small">Sin referencias {tradeCondition} sincronizadas.</div>}</section></section></section>

  <section className="market-feature-strip"><div><b>📈</b><span><strong>Cotizaciones sincronizadas</strong><small>BCR/CAC · histórico conservado</small></span></div><div><b>🌐</b><span><strong>Mercados globales</strong><small>Chicago, Euronext, Brasil y más</small></span></div><div><b>▤</b><span><strong>Análisis y tendencias</strong><small>Información para mejores decisiones</small></span></div><div><b>🔔</b><span><strong>Datos de mercado</strong><small>Consultá las cotizaciones sincronizadas</small></span></div></section>
 </main>
}

function MarketTable({title,items,type}:{title:string;items:Pub[];type:"offer"|"demand"}){
 return <section className="market-table-card"><div className="market-section-title"><strong>{title}</strong><Link href={type==="offer"?"/marketplace":"/marketplace?tipo=DEMANDA"}>Ver todas →</Link></div><div className="market-mini-head"><span>PRODUCTO</span><span>VOLUMEN</span><span>{type==="offer"?"ORIGEN":"DESTINO"}</span><span>PRECIO</span><span>PUBLICADO</span><span/></div>{items.map(p=><div className="market-offer-row" key={p.id}><span>🫘 {productName(p)}</span><span>{Number(p.cantidad_tn).toLocaleString("es-AR")} TN</span><span>{p.localidad||p.provincia||"Global"}</span><b>{p.precio_tn? `${Number(p.precio_tn).toLocaleString("es-AR")}/tn`:"—"}</b><span>{p.creada_en?new Date(p.creada_en).toLocaleDateString("es-AR"):"—"}</span><Link href={`/marketplace?publicacion=${p.id}`}>Ver</Link></div>)}{!items.length&&<div className="market-empty-small">No hay publicaciones activas.</div>}</section>
}