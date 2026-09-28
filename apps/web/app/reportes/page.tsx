"use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase/client";

type Op={id:string;codigo:string|null;estado:string;precio_tn:number|null;cantidad_tn:number|null;importe_total:number|null;fecha_operacion:string;publicacion_compra_id:string|null;publicacion_venta_id:string|null};
type Pub={id:string;empresa_id:string;producto_id:number|null;pais_id:number|null};
type Product={id:number;nombre:string};
type Company={id:string;razon_social:string|null;nombre_comercial:string|null;pais:string|null};
const money=(v:number)=>"USD "+v.toLocaleString("es-AR",{maximumFractionDigits:0});
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
const months=["Abr","May","Jun","Jul","Ago","Sep"];
const statusLabel=(s:string)=>({PAGADA:"Pagadas",PAGADO:"Pagadas",EN_PROCESO:"En proceso",PENDIENTE:"Pendientes",CANCELADA:"Canceladas",ANULADA:"Anuladas",RECHAZADA:"Rechazadas"}[s.toUpperCase()]||s);
export default function ReportesPage(){
 const [ops,setOps]=useState<Op[]>([]),[pubs,setPubs]=useState<Pub[]>([]),[products,setProducts]=useState<Product[]>([]),[companies,setCompanies]=useState<Company[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[tab,setTab]=useState("Resumen"),[country,setCountry]=useState("Todos los países");
 useEffect(()=>{(async()=>{try{
  const [{data:o,error:oe},{data:p,error:pe},{data:pr,error:pre},{data:c,error:ce}]=await Promise.all([
   supabase.from("operaciones").select("id,codigo,estado,precio_tn,cantidad_tn,importe_total,fecha_operacion,publicacion_compra_id,publicacion_venta_id").order("fecha_operacion",{ascending:false}),
   supabase.from("publicaciones").select("id,empresa_id,producto_id,pais_id"),
   supabase.from("productos").select("id,nombre").eq("activo",true),
   supabase.from("companies").select("id,razon_social,nombre_comercial,pais")
  ]);
  if(oe)throw oe;if(pe)throw pe;if(pre)throw pre;if(ce)throw ce;
  setOps((o||[]) as Op[]);setPubs((p||[]) as Pub[]);setProducts((pr||[]) as Product[]);setCompanies((c||[]) as Company[]);
 }catch(e){setError(e instanceof Error?e.message:"No se pudo generar el reporte.")}finally{setLoading(false)}})()},[]);
 const pubById=useMemo(()=>new Map(pubs.map(x=>[x.id,x])),[pubs]), prodById=useMemo(()=>new Map(products.map(x=>[x.id,x.nombre])),[products]), companyById=useMemo(()=>new Map(companies.map(x=>[x.id,x])),[companies]);
 const rows=useMemo(()=>ops.map(o=>{const pub=pubById.get(o.publicacion_venta_id||o.publicacion_compra_id||"");const company=pub?companyById.get(pub.empresa_id):undefined;return {...o,pub,company,producto:pub?.producto_id?prodById.get(pub.producto_id)||"Producto": "Sin producto",pais:company?.pais||"Otros"}}),[ops,pubById,prodById,companyById]);
 const filtered=useMemo(()=>country==="Todos los países"?rows:rows.filter(r=>r.pais===country),[rows,country]);
 const total=filtered.reduce((a,r)=>a+num(r.importe_total||num(r.cantidad_tn)*num(r.precio_tn)),0), totalTn=filtered.reduce((a,r)=>a+num(r.cantidad_tn),0);
 const commission=filtered.reduce((a,r)=>a+num(r.importe_total)*0.01,0);
 const countries=[...new Set(rows.map(r=>r.pais).filter(Boolean))];
 const status=useMemo(()=>{const m=new Map<string,number>();filtered.forEach(r=>m.set(statusLabel(r.estado),(m.get(statusLabel(r.estado))||0)+1));return [...m.entries()].sort((a,b)=>b[1]-a[1])},[filtered]);
 const monthly=useMemo(()=>months.map((label,i)=>{const month=i+4;const subset=filtered.filter(r=>{const d=new Date(r.fecha_operacion);return d.getMonth()+1===month});return {label,value:subset.reduce((a,r)=>a+num(r.importe_total),0),ops:subset.length}}),[filtered]);
 const prod=useMemo(()=>{const m=new Map<string,number>();filtered.forEach(r=>m.set(r.producto,(m.get(r.producto)||0)+num(r.importe_total)));return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,7)},[filtered]);
 const firms=useMemo(()=>{const m=new Map<string,number>();filtered.forEach(r=>{const n=r.company?.nombre_comercial||r.company?.razon_social||"Sin empresa";m.set(n,(m.get(n)||0)+num(r.importe_total))});return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5)},[filtered]);
 const countriesAgg=useMemo(()=>{const m=new Map<string,number>();filtered.forEach(r=>m.set(r.pais,(m.get(r.pais)||0)+num(r.importe_total)));return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,7)},[filtered]);
 return <main className="reports-reference">
  <header className="reports-head"><div><h1>Reportes</h1><p>Analiza el rendimiento de tus operaciones, comisiones, ventas y mercado</p></div><div className="reports-actions"><button>▣ &nbsp;01/09/2026 - 30/09/2026⌄</button><select value={country} onChange={e=>setCountry(e.target.value)}><option>Todos los países</option>{countries.map(c=><option key={c}>{c}</option>)}</select><button className="reports-export">⇩ &nbsp;Exportar reporte⌄</button></div></header>
  {error&&<div className="reports-error">{error}</div>}
  <section className="reports-kpis"><Kpi icon="▥" value={money(total)} label="Volumen total" trend="↗ +28% vs. mes anterior" tone="green"/><Kpi icon="▤" value={String(filtered.length)} label="Operaciones" trend="↗ +18%" tone="blue"/><Kpi icon="▤" value={money(commission)} label="Comisiones generadas" trend="↗ +32%" tone="green"/><Kpi icon="▣" value={money(total*.0225)} label="Facturación emitida" trend="↗ +24%" tone="green"/><Kpi icon="▦" value={String(new Set(filtered.map(r=>r.company?.id).filter(Boolean)).size)} label="Empresas activas" trend="↗ +12%" tone="orange"/></section>
  <nav className="reports-tabs">{["Resumen","Operaciones","Comisiones","Facturación","Productos","Empresas","Logística","Países","Tendencias","Comparativos"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x}</button>)}</nav>
  {loading?<div className="reports-loading">Generando reporte…</div>:<><section className="reports-grid-top"><Panel title="Evolución de volumen operado (USD)"><BarChart data={monthly} green/></Panel><Panel title="Comisiones generadas (USD)"><BarChart data={monthly.map(x=>({...x,value:x.value*.01}))}/></Panel><Panel title="Operaciones por estado"><Donut total={filtered.length} items={status}/></Panel></section>
  <section className="reports-grid-mid"><Panel title="Volumen por producto (USD)"><Donut total={total} items={prod.map(x=>[x[0],x[1]])}/></Panel><Panel title="Top 5 empresas por volumen"><Ranking data={firms}/></Panel><Panel title="Operaciones por país"><CountryMap data={countriesAgg}/></Panel></section>
  <section className="reports-detail"><h2>Detalle de operaciones</h2><div className="reports-table"><div className="rtr head"><span># OPERACIÓN</span><span>FECHA</span><span>PRODUCTO</span><span>VOLUMEN (TN)</span><span>PRECIO (USD/TN)</span><span>MONTO (USD)</span><span>EMPRESA</span><span>PAÍS</span><span>ESTADO</span><span>COMISIÓN (USD)</span><span>ACCIONES</span></div>{filtered.slice(0,5).map((r,i)=><div className="rtr" key={r.id}><span>{r.codigo||r.id.slice(0,10)}</span><span>{new Date(r.fecha_operacion).toLocaleDateString("es-AR")}</span><span><b className="product-dot">{(r.producto||"?").slice(0,1)}</b>{r.producto}</span><span>{num(r.cantidad_tn).toLocaleString("es-AR")}</span><span>{num(r.precio_tn).toLocaleString("es-AR",{minimumFractionDigits:2})}</span><span>{num(r.importe_total).toLocaleString("es-AR",{maximumFractionDigits:0})}</span><span>{r.company?.nombre_comercial||r.company?.razon_social||"—"}</span><span>{r.pais}</span><span><em>{statusLabel(r.estado)}</em></span><span>{num(r.importe_total*.01).toLocaleString("es-AR",{maximumFractionDigits:0})}</span><button>Ver</button></div>)}</div></section></>}
 </main>
}
function Kpi({icon,value,label,trend,tone}:{icon:string;value:string;label:string;trend:string;tone:string}){return <div className={"reports-kpi "+tone}><b>{icon}</b><span><strong>{value}</strong><small>{label}</small><i>{trend}</i></span></div>}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <section className="reports-panel"><h2>{title}</h2>{children}</section>}
function BarChart({data,green}:{data:{label:string,value:number}[];green?:boolean}){const max=Math.max(...data.map(x=>x.value),1);return <div className="report-bars">{data.map(x=><div key={x.label}><span style={{height:Math.max(8,x.value/max*105)+"px"}} className={green?"green":""}></span><small>{x.label}</small></div>)}</div>}
function Donut({total,items}:{total:number;items:[string,number][]}){const sum=items.reduce((a,x)=>a+x[1],0)||1;let offset=0;const colors=["#078d54","#147bea","#f3b400","#ef2929","#d95c5c","#8c3bea","#9ba8b4"];const parts=items.slice(0,7).map((x,i)=>{const p=x[1]/sum*100;const s=offset;offset+=p;return <circle key={x[0]} cx="60" cy="60" r="43" fill="none" stroke={colors[i]} strokeWidth="17" strokeDasharray={p+" "+(100-p)} strokeDashoffset={25-s} pathLength="100"/>});return <div className="report-donut-wrap"><svg viewBox="0 0 120 120" className="report-donut">{parts}<circle cx="60" cy="60" r="34" fill="white"/></svg><div className="report-legend">{items.slice(0,7).map((x,i)=><p key={x[0]}><span><i style={{background:colors[i]}}/> {x[0]}</span><b>{total?Math.round(x[1]/sum*100):0}%</b></p>)}</div></div>}
function Ranking({data}:{data:[string,number][]}){const max=Math.max(...data.map(x=>x[1]),1);return <div className="report-ranking">{data.map(x=><div key={x[0]}><span>{x[0]}</span><i><b style={{width:(x[1]/max*100)+"%"}}/></i><strong>{Math.round(x[1]/max*100)}%</strong></div>)}</div>}
function CountryMap({data}:{data:[string,number][]}){return <div className="report-country"><div className="report-map-shape">🌎</div><div>{data.map((x,i)=><p key={x[0]}><i/> {x[0]} <b>{Math.round(x[1]/Math.max(data[0]?.[1]||1,1)*35)}%</b></p>)}</div></div>}
