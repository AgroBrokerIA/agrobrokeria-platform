"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";

type Stat={label:string;value:string;href:string};
export default function ReportesPage(){
 const [stats,setStats]=useState<Stat[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 useEffect(()=>{(async()=>{try{
  const [{count:ops},{count:closed},{count:cancelled},{count:pubs},{count:demands},{count:contracts},{count:invoices},{count:payments},{count:docs},{count:commissions}]=await Promise.all([
   supabase.from("operaciones").select("id",{count:"exact",head:true}),
   supabase.from("operaciones").select("id",{count:"exact",head:true}).eq("estado","CERRADA"),
   supabase.from("operaciones").select("id",{count:"exact",head:true}).in("estado",["ANULADA","CANCELADA"]),
   supabase.from("publicaciones").select("id",{count:"exact",head:true}).eq("estado","PUBLICADA").eq("tipo","OFERTA"),
   supabase.from("publicaciones").select("id",{count:"exact",head:true}).eq("estado","PUBLICADA").eq("tipo","DEMANDA"),
   supabase.from("contratos").select("id",{count:"exact",head:true}),
   supabase.from("facturas").select("id",{count:"exact",head:true}),
   supabase.from("pagos").select("id",{count:"exact",head:true}),
   supabase.from("documentos_operacion").select("id",{count:"exact",head:true}),
   supabase.from("operacion_comisiones").select("id",{count:"exact",head:true})
  ]);
  setStats([
   {label:"Operaciones",value:String(ops??0),href:"/operaciones"},{label:"Cerradas",value:String(closed??0),href:"/operaciones"},
   {label:"Anuladas / canceladas",value:String(cancelled??0),href:"/operaciones"},{label:"Ofertas activas",value:String(pubs??0),href:"/marketplace"},
   {label:"Demandas activas",value:String(demands??0),href:"/marketplace"},{label:"Contratos",value:String(contracts??0),href:"/contratos"},
   {label:"Facturas",value:String(invoices??0),href:"/facturas"},{label:"Pagos",value:String(payments??0),href:"/pagos"},
   {label:"Documentos",value:String(docs??0),href:"/documentos"},{label:"Comisiones",value:String(commissions??0),href:"/comisiones"}
  ]);
 }catch(e){setError(e instanceof Error?e.message:"No se pudo generar el reporte.")}finally{setLoading(false)}})()},[]);
 return <main className="module-page"><div className="module-hero"><div><span className="eyebrow">CONTROL Y TRAZABILIDAD</span><h1>Reportes</h1><p>Indicadores derivados exclusivamente de los datos disponibles para tu empresa.</p></div><span className="module-pill">Datos reales</span></div>{error&&<div className="module-alert module-alert-error">{error}</div>}{loading?<div className="loading-card">Generando reporte…</div>:<div className="document-grid">{stats.map(s=><Link href={s.href} key={s.label} className="document-card"><div><small>{s.label}</small><strong style={{fontSize:28,display:"block",marginTop:6}}>{s.value}</strong></div><span>→</span></Link>)}</div>}<section className="dashboard-panel" style={{marginTop:20}}><div className="panel-heading"><div><span className="eyebrow">CRITERIO</span><h2>Sin datos ficticios</h2><p>Los módulos muestran cero cuando no existen registros accesibles; no se completan métricas con valores simulados.</p></div></div></section></main>;
}