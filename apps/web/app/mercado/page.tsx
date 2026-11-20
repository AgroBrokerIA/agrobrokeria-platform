"use client";

import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase/client";
import Link from "next/link";

type Quote={id:string;source:string;market_date:string;obtained_at:string;price:number|null;currency:string|null;unit:string|null;price_type:string;position:string|null;market:string|null;port:string|null;freshness:string;commodity_id:string|null;product_id:number|null;variation:number|null;previous_value:number|null;payload?:Record<string,any>|null;};
type Pub={id:string;tipo:string;cantidad_tn:number;precio_tn:number;provincia:string|null;localidad:string|null;puerto:string|null;creada_en:string|null;productos?:{nombre:string}|{nombre:string}[]|null};
type ProductMeta={id:number;codigo:string;nombre:string;categoria:string|null};
const names=new Map([["SOJA","Soja"],["MAIZ","Maíz"],["TRIGO","Trigo"],["GIRASOL","Girasol"],["SORGO","Sorgo"],["ACEITE_SOJA","Aceite de Soja"],["HARINA_SOJA","Harina de Soja"]]);
const icon=(code:string)=>code==="SOJA"?"🫘":code==="MAIZ"?"🌽":code==="TRIGO"?"🌾":code==="GIRASOL"?"🌻":"🌾";
const fmt=(q?:Quote|null)=>q?.price==null?"Sin cotización":`${q.currency||"Moneda no informada"} ${Number(q.price).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const pct=(q?:Quote|null)=>q?.price!=null&&q.previous_value!=null&&Number(q.previous_value)!==0?((Number(q.price)-Number(q.previous_value))/Number(q.previous_value))*100:null;
const variationLabel=(q?:Quote|null,empty="—")=>{const value=pct(q);return value==null?empty:`${value>=0?"+":""}${value.toFixed(2)}%`};
const productName=(p:Pub)=>Array.isArray(p.productos)?p.productos[0]?.nombre||"Commodity":p.productos?.nombre||"Commodity";

export default function MercadoPage(){
 const[quotes,setQuotes]=useState<Quote[]>([]),[commodities,setCommodities]=useState<Record<string,string>>({}),[products,setProducts]=useState<Record<string,ProductMeta>>({}),[offers,setOffers]=useState<Pub[]>([]),[demands,setDemands]=useState<Pub[]>([]);
 const[loading,setLoading]=useState(true),[syncing,setSyncing]=useState(false),[error,setError]=useState(""),[syncMsg,setSyncMsg]=useState(""),[marketTab,setMarketTab]=useState("Granos"),[range,setRange]=useState("1D"),[internationalMarket,setInternationalMarket]=useState("CHICAGO"),[tradeCondition,setTradeCondition]=useState("FOB");
 async function load(){
  setLoading(true);setError("");
  const quoteMarkets=["CHICAGO","BAHIA_BLANCA","ROSARIO","CORDOBA","BUENOS_AIRES","ARGENTINA","MATBA_ROFEX","EURONEXT","BRASIL","PARIS"];
  const [quoteResults,cr,pr,prod]=await Promise.all([
   Promise.all(quoteMarkets.map(market=>supabase.from("market_quotes").select("id,source,market_date,obtained_at,price,currency,unit,price_type,position,market,port,freshness,commodity_id,product_id,variation,previous_value,payload").eq("market",market).order("market_date",{ascending:false}).order("obtained_at",{ascending:false}).limit(300))),
   supabase.from("commodities").select("id,codigo"),
   supabase.from("publicaciones").select("id,tipo,cantidad_tn,precio_tn,provincia,localidad,puerto,creada_en,productos(nombre)").eq("estado","PUBLICADA").order("creada_en",{ascending:false}).limit(12),
   supabase.from("productos").select("id,codigo,nombre,categoria").eq("activo",true).order("nombre")
  ]);
  const quoteError=quoteResults.find(result=>result.error)?.error;
  if(quoteError||cr.error||pr.error||prod.error)setError(quoteError?.message||cr.error?.message||pr.error?.message||prod.error?.message||"No se pudo cargar mercado.");
  setQuotes(quoteResults.flatMap(result=>result.data||[]).sort((a,b)=>String(b.market_date).localeCompare(String(a.market_date))||String(b.obtained_at).localeCompare(String(a.obtained_at))) as Quote[]);
  setCommodities(Object.fromEntries((cr.data||[]).map((x:any)=>[x.id,x.codigo])));
  setProducts(Object.fromEntries((prod.data||[]).map((x:any)=>[String(x.id),x as ProductMeta])));
  const pubs=(pr.data||[]) as Pub[];setOffers(pubs.filter(x=>x.tipo!=="DEMANDA").slice(0,5));setDemands(pubs.filter(x=>x.tipo==="DEMANDA").slice(0,5));setLoading(false);
 }
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const tab=params.get("tab");if(tab&&["Granos","Aceites","Harinas","Subproductos","FOB","FAS","Futuros","Mercados internacionales"].includes(tab))setMarketTab(tab);void load()},[]);
 async function sync(){
  setSyncing(true);setSyncMsg("");setError("");
  try{
   const{data:{session}}=await supabase.auth.getSession();
   if(!session?.access_token)throw new Error("Necesitás iniciar sesión.");
   const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
   const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
   if(!base||!anon)throw new Error("Configuración de Supabase incompleta.");
   const response=await fetch(base+"/functions/v1/market-data-sync",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,apikey:anon,"Content-Type":"application/json"},body:"{}"});
   const j=await response.json().catch(()=>({}));
   if(!response.ok||!j?.ok)throw new Error(j?.error||"No se pudo actualizar BCR/CAC.");
   setSyncMsg("Cotizaciones BCR/CAC y mercados internacionales disponibles actualizados. El histórico fue conservado.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Error de actualización.")}finally{setSyncing(false)}
 }
 const payloadLabelFor=(q:Quote)=>String(q.payload?.product||q.payload?.commodity||q.payload?.product_name||"");
 const payloadCodeFor=(q:Quote)=>{
  const raw=payloadLabelFor(q).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  if(raw.includes("ACEITE")&&raw.includes("GIRASOL"))return "ACEITE_GIRASOL";
  if(raw.includes("ACEITE")&&raw.includes("SOJA"))return "ACEITE_SOJA";
  if(raw.includes("HARINA")&&raw.includes("GIRASOL"))return "HARINA_GIRASOL";
  if(raw.includes("HARINA")&&raw.includes("SOJA")&&raw.includes("PELLET"))return "PELLETS_SOJA";
  if(raw.includes("HARINA")&&raw.includes("SOJA"))return "HARINA_SOJA";
  if(raw.includes("PELLET"))return "PELLETS_SOJA";
  if(raw.includes("EXPELLER"))return "EXPELLER_SOJA";
  if(raw.includes("AFRECHILLO"))return "AFRECHILLO_TRIGO";
  if(raw.includes("CASCARILLA"))return "CASCARILLA_SOJA";
  if(raw.includes("MAIZ"))return "MAIZ";
  if(raw.includes("TRIGO"))return "TRIGO";
  if(raw.includes("SOJA"))return "SOJA";
  if(raw.includes("GIRASOL"))return "GIRASOL";
  if(raw.includes("SORGO"))return "SORGO";
  if(raw.includes("CEBADA"))return "CEBADA";
  if(raw.includes("AVENA"))return "AVENA";
  if(raw.includes("MANI"))return "MANI";
  if(raw.includes("ARROZ"))return "ARROZ";
  return "";
 };
 const latest=useMemo(()=>{const m=new Map<string,Quote>();for(const q of quotes){const code=commodities[q.commodity_id||""]||payloadCodeFor(q)||q.commodity_id||"OTRO";if(String(q.market||"").toUpperCase()!=="CHICAGO"&&String(q.market||"").toUpperCase()!=="MATBA_ROFEX"&&!m.has(code))m.set(code,q)}return m},[quotes,commodities]);
 const productMeta=(q:Quote)=>products[String(q.product_id||"")];
 const quoteName=(q:Quote)=>productMeta(q)?.nombre||names.get(commodities[q.commodity_id||""]||payloadCodeFor(q)||"")||payloadLabelFor(q)||commodities[q.commodity_id||""]||"Commodity";
 const quoteSourceLabel=(q?:Quote)=>{
  if(!q)return "Fuente";
  const marketLabel=q.market==="ROSARIO"?"BCR/CAC · Rosario":q.market==="CHICAGO"?"CBOT · Chicago":q.market==="MATBA_ROFEX"?"Índice continuo MtR":q.market||q.port||"Fuente";
  const flags:string[]=[];
  if(q.payload?.secondary_source===true)flags.push("Referencia secundaria BCCBA");
  if(q.payload?.estimated===true)flags.push("Precio estimado");
  return [marketLabel,...flags].join(" · ");
 };
 const quotePrice=(q:Quote)=>{const value=Number(q.price).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:4});if(q.unit?.startsWith("¢"))return `${value} ${q.unit}`;if(q.unit?.startsWith("USD/"))return `USD ${value} / ${q.unit.slice(4)}`;return `${q.currency||"USD"} ${value}${q.unit?` / ${q.unit}`:""}`;};
 const codeFor=(q:Quote)=>productMeta(q)?.codigo||commodities[q.commodity_id||""]||payloadCodeFor(q)||q.commodity_id||"OTRO";
 const nameFor=(q:Quote)=>productMeta(q)?.nombre||names.get(codeFor(q))||payloadLabelFor(q)||codeFor(q);
 const categoryFor=(q:Quote)=>String(productMeta(q)?.categoria||"").toLowerCase();
 const latestByProduct=useMemo(()=>{const m=new Map<string,Quote>();for(const q of quotes){if(q.price==null||["CHICAGO","MATBA_ROFEX"].includes(String(q.market||"").toUpperCase()))continue;const key=String(q.product_id||q.commodity_id||q.id);if(!m.has(key))m.set(key,q);const code=productMeta(q)?.codigo||commodities[q.commodity_id||""];if(code&&!m.has("code:"+code))m.set("code:"+code,q)}return m},[quotes,products,commodities]);
 const cards:Array<{code:string;name:string;q?:Quote}>=Array.from(new Map(Array.from(latestByProduct.values()).filter(q=>q.price!=null).map(q=>[codeFor(q),q])).values()).slice(0,8).map(q=>({code:codeFor(q),name:nameFor(q),q}));
 const tabQuotes=quotes.filter(q=>q.price!=null).filter(q=>{
   const p=String(q.price_type||"").toUpperCase();
   const market=String(q.market||"").toUpperCase();
   const code=String(codeFor(q)||"").toUpperCase();
   const name=String(nameFor(q)||"").toLowerCase();
   const category=categoryFor(q);
   if(marketTab==="Futuros")return p.includes("FUT");
   if(["FOB","FAS","CIF"].includes(marketTab))return p.startsWith(marketTab);
   if(marketTab==="Mercados internacionales")return ["CHICAGO","EURONEXT","BRASIL","PARIS"].includes(market);
   if(["CHICAGO","MATBA_ROFEX"].includes(market))return false;
   if(marketTab==="Aceites")return category.includes("aceite")||code.startsWith("ACEITE_")||name.includes("aceite");
   if(marketTab==="Harinas")return category.includes("harina")||code.startsWith("HARINA_")||name.includes("harina");
   if(marketTab==="Subproductos")return category.includes("subproducto")||["PELLET","EXPELLER","AFRECHILLO","CASCARILLA","SUBPRODUCTO"].some(x=>code.includes(x))||["pellet","expeller","afrechillo","cascarilla","subproducto"].some(x=>name.includes(x));
   return ["cereal","oleaginosa","legumbre","pseudocereal","especialidad","semilla"].some(x=>category.includes(x))||["SOJA","MAIZ","TRIGO","GIRASOL","SORGO","CEBADA","AVENA","MANI","ARROZ"].includes(code)||["soja","maiz","maíz","trigo","girasol","sorgo","cebada","avena","mani","maní","arroz"].some(x=>name.includes(x));
 }).slice(0,100);
 const rangeSize:Record<string,number>={"1D":30,"1S":50,"1M":100,"3M":150,"1A":200,"Todo":300};
 const quoteRowsByCode=new Map<string,Quote>();
 for(const q of tabQuotes){const code=codeFor(q);if(!quoteRowsByCode.has(code))quoteRowsByCode.set(code,q);}
 const tabQuoteRows=Array.from(quoteRowsByCode.entries()).map(([code,q])=>({code,name:nameFor(q),q}));
 const displayRows=tabQuoteRows;
 const soja=quotes.filter(q=>q.price!=null&&String(q.market||"").toUpperCase()==="ROSARIO"&&codeFor(q)==="SOJA").slice(0,rangeSize[range]||30).reverse();
 const international=quotes.filter(q=>q.price!=null&&String(q.market||"").trim().toUpperCase()===internationalMarket).slice(0,8);
 return <main className="market-reference">
  <header className="market-reference-head"><div><h1>Mercado</h1><p>Precios en tiempo real y análisis de los principales granos y commodities agrícolas</p></div><div className="market-head-actions"><span className="market-open"><i/> Mercado abierto</span><span>◷ {new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})} (GMT-3)</span><small>Bolsa de Comercio de Rosario</small><a className="market-source-link" href="https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-1" target="_blank" rel="noreferrer">Fuente oficial ↗</a><button onClick={sync} disabled={syncing}>⟳ &nbsp;{syncing?"Actualizando…":"Actualizar precios"}</button></div></header>
  {error&&<div className="module-alert module-alert-error">{error}</div>}{syncMsg&&<div className="module-alert">{syncMsg}</div>}
  <nav className="market-tabs">{["Granos","Aceites","Harinas","Subproductos","FOB","FAS","Futuros","Mercados internacionales"].map(x=><button key={x} className={marketTab===x?"active":""} onClick={()=>setMarketTab(x)}>{x}</button>)}</nav>
  <section className="market-top-grid"><div className="market-quote-cards">{displayRows.length?displayRows.filter(row=>row.q?.price!=null).map(({code,name,q})=><article className="market-quote-card" key={code}><b>{icon(code)}</b><div><strong>{name}</strong><small>{quoteSourceLabel(q)}</small><em>{fmt(q)}</em><span className={(q?.variation||0)>=0?"positive":"negative"}>{variationLabel(q,"Sin variación")} ↗</span></div></article>):<div className="market-tab-empty"><strong>No hay cotizaciones disponibles</strong><span>En esta vista se muestran únicamente productos con precios publicados.</span></div>}</div><section className="market-side-card"><div className="market-section-title"><strong>{internationalMarket==="MATBA_ROFEX"?"MATba Rofex · Índices continuos":internationalMarket==="EURONEXT"?"Euronext · Mercados europeos":internationalMarket==="BRASIL"?"Brasil · Mercados agrícolas":internationalMarket==="PARIS"?"París · Mercados agrícolas":"Chicago (CBOT) · Mercados internacionales"}</strong><Link href="/mercado">Ver todos →</Link></div><div className="market-pills">{[["Chicago","CHICAGO"],["Euronext","EURONEXT"],["Brasil","BRASIL"],["París","PARIS"]].map(([label,code])=><button type="button" className={internationalMarket===code?"active":""} onClick={()=>setInternationalMarket(code)} key={code}>{label}</button>)}</div><div className="market-mini-head"><span>PRODUCTO / CONTRATO</span><span>ÚLTIMO</span><span>VAR.</span></div>{international.length?international.map(q=><div className="market-mini-row" key={q.id}><span><strong>{quoteName(q)}</strong><small>{q.position||"Cotización"} · {new Date(q.market_date+"T12:00:00").toLocaleDateString("es-AR")}</small></span><b>{quotePrice(q)}</b><em className={(pct(q)||0)>=0?"positive":"negative"}>{variationLabel(q)}</em></div>):<div className="market-empty-small">Las cotizaciones internacionales aparecerán al sincronizar el mercado.</div>}</section></section>

  <section className="market-main-grid"><section className="market-chart-card"><div className="market-section-title"><strong>🫘 &nbsp;Evolución de precios - Soja</strong><div className="chart-ranges">{["1D","1S","1M","3M","1A","Todo"].map(x=><button className={range===x?"active":""} onClick={()=>setRange(x)} key={x}>{x}</button>)}</div></div><div className="market-chart">{soja.length?<svg viewBox="0 0 900 300" preserveAspectRatio="none" aria-label="Evolución de Soja"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#28b879" stopOpacity=".35"/><stop offset="100%" stopColor="#28b879" stopOpacity=".02"/></linearGradient></defs><polyline fill="url(#area)" stroke="none" points={`0,290 ${soja.map((q,i)=>{const max=Math.max(...soja.map(x=>x.price||0)),min=Math.min(...soja.map(x=>x.price||0));const x=20+i*860/Math.max(1,soja.length-1),y=270-((q.price||0)-min)/Math.max(1,max-min)*220;return x+","+y}).join(" ")} 900,290`}/><polyline fill="none" stroke="#16a96d" strokeWidth="3" points={soja.map((q,i)=>{const max=Math.max(...soja.map(x=>x.price||0)),min=Math.min(...soja.map(x=>x.price||0));const x=20+i*860/Math.max(1,soja.length-1),y=270-((q.price||0)-min)/Math.max(1,max-min)*220;return x+","+y}).join(" ")}/></svg>:<div className="market-chart-empty"><strong>Sin datos de evolución de Soja</strong><span>Actualizá BCR/CAC para cargar cotizaciones verificadas.</span></div>}</div><div className="chart-axis"><span>Inicio</span><span>Fin</span></div></section>
   <section className="market-side-card main-quotes"><div className="market-section-title"><strong>Cotizaciones principales</strong></div><div className="market-mini-head"><span>PRODUCTO</span><span>ÚLTIMO</span><span>VARIACIÓN</span></div>{cards.concat(["ACEITE_SOJA","HARINA_SOJA","SORGO"].map(code=>({code,name:names.get(code)||code,q:latest.get(code)})).filter(row=>row.q?.price!=null)).map(({code,q})=><div className="market-mini-row" key={code}><span>{names.get(code)||code}</span><b>{fmt(q)}</b><em className={(q?.variation||0)>=0?"positive":"negative"}>{variationLabel(q)}</em></div>)}</section>
  </section>

  <section className="market-lower-grid"><MarketTable title="Últimas ofertas en el mercado" items={offers} type="offer"/><MarketTable title="Últimas demandas en el mercado" items={demands} type="demand"/><section className="market-side-stack"><section className="market-side-card"><div className="market-section-title"><strong>FOB / FAS</strong><Link href="/mercado">Ver todos →</Link></div><div className="market-pills">{["FOB","FAS"].map(x=><button type="button" className={tradeCondition===x?"active":""} onClick={()=>setTradeCondition(x)} key={x}>{x}</button>)}</div>{quotes.filter(q=>q.price!=null&&(()=>{const p=String(q.price_type||"").toUpperCase();return tradeCondition==="FOB"?p.startsWith("FOB"):tradeCondition==="FAS"?p.startsWith("FAS"):false})()).slice(0,4).length?quotes.filter(q=>q.price!=null&&(()=>{const p=String(q.price_type||"").toUpperCase();return tradeCondition==="FOB"?p.startsWith("FOB"):tradeCondition==="FAS"?p.startsWith("FAS"):false})()).slice(0,4).map(q=><div className="market-mini-row" key={q.id}><span>{names.get(commodities[q.commodity_id||""]||"")||"Commodity"}</span><b>{q.port||"—"}</b><em>{fmt(q)}</em></div>):<div className="market-empty-small">Sin referencias {tradeCondition} sincronizadas.</div>}</section></section></section>

  <section className="market-feature-strip"><div><b>📈</b><span><strong>Cotizaciones sincronizadas</strong><small>BCR/CAC · histórico conservado</small></span></div><div><b>🌐</b><span><strong>Mercados globales</strong><small>Chicago, Euronext, Brasil y más</small></span></div><div><b>▤</b><span><strong>Análisis y tendencias</strong><small>Información para mejores decisiones</small></span></div><div><b>🔔</b><span><strong>Datos de mercado</strong><small>Consultá las cotizaciones sincronizadas</small></span></div></section>
 </main>
}

function MarketTable({title,items,type}:{title:string;items:Pub[];type:"offer"|"demand"}){
 return <section className="market-table-card"><div className="market-section-title"><strong>{title}</strong><Link href={type==="offer"?"/marketplace":"/marketplace?tipo=DEMANDA"}>Ver todas →</Link></div><div className="market-mini-head"><span>PRODUCTO</span><span>VOLUMEN</span><span>{type==="offer"?"ORIGEN":"DESTINO"}</span><span>PRECIO</span><span>PUBLICADO</span><span/></div>{items.map(p=><div className="market-offer-row" key={p.id}><span>🫘 {productName(p)}</span><span>{Number(p.cantidad_tn).toLocaleString("es-AR")} TN</span><span>{p.localidad||p.provincia||"Global"}</span><b>{p.precio_tn? `${Number(p.precio_tn).toLocaleString("es-AR")}/tn`:"—"}</b><span>{p.creada_en?new Date(p.creada_en).toLocaleDateString("es-AR"):"—"}</span><Link href={`/marketplace?publicacion=${p.id}`}>Ver</Link></div>)}{!items.length&&<div className="market-empty-small">No hay publicaciones activas.</div>}</section>
}