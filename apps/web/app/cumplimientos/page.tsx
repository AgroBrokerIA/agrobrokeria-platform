"use client";
import Link from "next/link";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Doc={id:string;nombre:string;categoria:string;estado:string;vence:string|null;icon:string};
type Req={id:string;nombre:string;estado:string;obligatorio:boolean;verificado_at:string|null};
const iconFor=(categoria:string)=>categoria.toLowerCase().includes("fiscal")?"▧":categoria.toLowerCase().includes("legal")?"▣":categoria.toLowerCase().includes("banc")?"▥":"▤";
const dateLabel=(v:string|null)=>v?new Date(v+"T00:00:00").toLocaleDateString("es-AR"):"—";

export default function CumplimientosPage(){
 const[company,setCompany]=useState<any>(null);
 const[docs,setDocs]=useState<Doc[]>([]);
 const[reqs,setReqs]=useState<Req[]>([]);
 const[certs,setCerts]=useState<any[]>([]);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");

 useEffect(()=>{(async()=>{
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user) throw new Error("Necesitás iniciar sesión.");
   const {data:cu,error:cue}=await supabase.from("company_users").select("company_id").eq("profile_id",user.id).eq("activo",true).limit(1);
   if(cue) throw cue;
   const companyId=(cu?.[0] as any)?.company_id;
   if(!companyId) throw new Error("No se encontró una empresa activa.");
   const {data:c}=await supabase.from("companies").select("id,nombre,razon_social").eq("id",companyId).maybeSingle();
   setCompany(c);
   const {data:map}=await supabase.from("company_empresa_map").select("empresa_id").eq("company_id",companyId).maybeSingle();
   const empresaId=(map as any)?.empresa_id;
   if(!empresaId){setLoading(false);return;}
   const [{data:d,error:de},{data:r,error:re},{data:ce,error:cee}]=await Promise.all([
    supabase.from("empresas_documentos").select("id,tipo_documento,nombre_archivo,fecha_vencimiento,verificado,observaciones").eq("empresa_id",empresaId).order("fecha_vencimiento",{ascending:true,nullsFirst:false}),
    supabase.from("empresas_verificacion_requisitos").select("id,requisito_id,estado,verificado_at").eq("empresa_id",empresaId).order("actualizado_at",{ascending:false}),
    supabase.from("empresas_certificaciones").select("id,certificacion,fecha_vencimiento,activo,organismo_emisor").eq("empresa_id",empresaId).order("fecha_vencimiento",{ascending:true,nullsFirst:false})
   ]);
   if(de)throw de;if(re)throw re;if(cee)throw cee;
   const requisitoIds=(r||[]).map((x:any)=>x.requisito_id).filter(Boolean);
   const {data:catalogo}=requisitoIds.length?await supabase.from("verificacion_requisitos_catalogo").select("id,nombre,obligatorio").in("id",requisitoIds):{data:[]};
   const names=Object.fromEntries((catalogo||[]).map((x:any)=>[x.id,x]));
   setDocs((d||[]).map((x:any)=>({id:x.id,nombre:x.nombre_archivo||x.tipo_documento||"Documento",categoria:x.tipo_documento||"Documental",estado:x.verificado?"Verificado":x.fecha_vencimiento&&new Date(x.fecha_vencimiento+"T00:00:00")<new Date()?"Vencido":"Pendiente",vence:x.fecha_vencimiento,icon:iconFor(x.tipo_documento||"")})));
   setReqs((r||[]).map((x:any)=>({id:x.id,nombre:names[x.requisito_id]?.nombre||"Requisito de verificación",estado:x.estado,obligatorio:!!names[x.requisito_id]?.obligatorio,verificado_at:x.verificado_at})));
   setCerts(ce||[]);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar el cumplimiento.")}finally{setLoading(false)}
 })()},[]);

 const validDocs=docs.filter(d=>d.estado==="Verificado").length;
 const expiredDocs=docs.filter(d=>d.estado==="Vencido").length;
 const dueDocs=docs.filter(d=>d.estado==="Pendiente"&&d.vence&&new Date(d.vence+"T00:00:00")>=new Date()).length;
 const verifiedReq=reqs.filter(r=>r.estado==="VERIFICADO").length;
 const requiredReq=reqs.filter(r=>r.obligatorio&&r.estado!=="NO_APLICA");
 const compliancePct=requiredReq.length?Math.round(verifiedReq/requiredReq.length*100):docs.length?Math.round(validDocs/docs.length*100):0;
 const upcoming=useMemo(()=>[...docs.map(d=>({name:d.nombre,date:d.vence,state:d.estado})),...certs.filter(c=>c.activo).map(c=>({name:c.certificacion,date:c.fecha_vencimiento,state:c.fecha_vencimiento&&new Date(c.fecha_vencimiento+"T00:00:00")<new Date()?"Vencido":"Pendiente"}))].filter(x=>x.date).sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,3),[docs,certs]);
 const companyName=company?.nombre||company?.razon_social||"Empresa activa";

 return <main className="compliance-page">
  <header className="compliance-hero"><div><h1>Cumplimientos</h1><p>{companyName} · seguimiento normativo, fiscal, legal y documental basado en registros reales.</p></div><Link className="compliance-download" href="/reportes">⇩ &nbsp; Ir a reportes</Link></header>
  {error&&<div className="module-alert module-alert-error">{error}</div>}
  <nav className="compliance-tabs"><Link className="active" href="/cumplimientos">▣ &nbsp; Resumen</Link><Link href="/documentos">▤ &nbsp; Documentación</Link><Link href="/verificaciones">▣ &nbsp; KYC</Link><Link href="/facturas">▣ &nbsp; Cumplimiento fiscal</Link><Link href="/terminos">▣ &nbsp; Normativas</Link><Link href="/notificaciones">△ &nbsp; Alertas</Link><Link href="/historial">▤ &nbsp; Historial</Link></nav>
  {loading?<div className="module-empty"><div className="module-empty-icon">◷</div><h2>Cargando cumplimiento…</h2></div>:<>
  <section className="compliance-kpis">
   <article className="ckpi green"><I>♢</I><div><small>Estado general</small><strong>{compliancePct}%</strong><div className="progress"><b style={{width:compliancePct+"%"}}/></div><em>Calculado con requisitos registrados</em></div></article>
   <article className="ckpi blue"><I>▤</I><div><small>Documentos verificados</small><strong>{validDocs} / {docs.length}</strong><div className="progress"><b style={{width:(docs.length?validDocs/docs.length*100:0)+"%"}}/></div><em>{dueDocs} pendientes · {expiredDocs} vencidos</em></div></article>
   <article className="ckpi green"><I>⚖</I><div><small>Requisitos verificados</small><strong>{verifiedReq} / {reqs.length}</strong><div className="progress"><b style={{width:(reqs.length?verifiedReq/reqs.length*100:0)+"%"}}/></div><em>Sin asumir verificaciones inexistentes</em></div></article>
   <article className="ckpi red"><I>△</I><div><small>Alertas derivadas de datos</small><strong>{expiredDocs}</strong><div className="progress"><b style={{width:(docs.length?expiredDocs/docs.length*100:0)+"%"}}/></div><em>Documentos vencidos</em></div></article>
  </section>
  <div className="compliance-main">
   <section className="compliance-panel compliance-docs"><div className="cp-title"><h2>Documentación registrada</h2><Link className="outline-blue" href="/documentos">⇧ &nbsp; Gestionar documentos</Link></div>
    <div className="doc-filters"><b>Todos <i>{docs.length}</i></b><span>Verificados <i>{validDocs}</i></span><span>Pendientes <i className="yellow">{dueDocs}</i></span><span>Vencidos <i className="red">{expiredDocs}</i></span></div>
    <div className="doc-table"><div className="doc-head"><span>Documento</span><span>Categoría</span><span>Estado</span><span>Vencimiento</span><span>Acciones</span></div>{docs.length?docs.map(d=><div className="doc-row" key={d.id}><I>{d.icon}</I><div><strong>{d.nombre}</strong></div><span>{d.categoria}</span><b className={"doc-status "+(d.estado==="Verificado"?"ok":d.estado==="Vencido"?"bad":"soon")}>{d.estado}</b><span>{dateLabel(d.vence)}</span><div><Link href="/documentos">Ver</Link><button className="dots">⋮</button></div></div>):<div className="module-empty">No hay documentación registrada para esta empresa.</div>}</div>
   </section>
   <aside className="compliance-side">
    <section className="compliance-panel level-panel"><h2>Nivel de cumplimiento</h2><div className="level-content"><div className="donut"><strong>{compliancePct}%</strong></div><div className="level-legend"><span><i/>Documentación <b>{docs.length?Math.round(validDocs/docs.length*100):0}%</b></span><span><i/>Requisitos <b>{reqs.length?Math.round(verifiedReq/reqs.length*100):0}%</b></span><span><i className="orange"/>Vencidos <b>{expiredDocs}</b></span></div></div><div className="green-note">ⓘ El porcentaje se calcula únicamente con información registrada en la plataforma.</div></section>
    <section className="compliance-panel due-panel"><div className="cp-title"><h2>Próximos vencimientos</h2><Link href="/historial">Ver todos</Link></div>{upcoming.length?upcoming.map(x=><div className="due-row" key={x.name+String(x.date)}><I>◷</I><div><strong>{x.name}</strong><span>Registro de la empresa.</span></div><time>{dateLabel(x.date)}</time><b className={x.state==="Vencido"?"bad-bg":"blue-bg"}>{x.state}</b></div>):<div className="module-empty">No hay vencimientos registrados.</div>}</section>
   </aside>
  </div>
  <div className="compliance-bottom">
   <section className="compliance-panel categories"><h2>Requisitos por estado</h2>{["VERIFICADO","PRESENTADO","PENDIENTE","RECHAZADO","NO_APLICA"].map(s=>{const n=reqs.filter(r=>r.estado===s).length;return <div className="cat-row" key={s}><span>{s}</span><div><b className={s==="VERIFICADO"?"green":s==="RECHAZADO"?"orange":"blue"} style={{width:(reqs.length?n/reqs.length*100:0)+"%"}}/></div><strong>{n}</strong></div>})}</section>
   <section className="compliance-panel alerts"><div className="cp-title"><h2>Alertas y pendientes</h2><button disabled>Ver todas</button></div>{expiredDocs?docs.filter(d=>d.estado==="Vencido").map(d=><div className="alert-row" key={d.id}><I>△</I><div><strong>{d.nombre}</strong><span>El documento figura como vencido.</span></div><time>{dateLabel(d.vence)}</time><b className="bad">Vencido</b></div>):<div className="module-empty">No hay alertas derivadas de documentos vencidos.</div>}</section>
   <section className="compliance-panel history"><div className="cp-title"><h2>Requisitos recientes</h2><button disabled>Ver todos</button></div>{reqs.slice(0,5).map(r=><div className="history-item" key={r.id}><i>✓</i><strong>{r.nombre}</strong><span>{r.estado}{r.verificado_at?" · "+new Date(r.verificado_at).toLocaleString("es-AR"):""}</span></div>)}{!reqs.length&&<div className="module-empty">No hay requisitos de verificación registrados.</div>}</section>
  </div></>}
 </main>
}
function I({children}:{children:React.ReactNode}){return <span className="compliance-icon">{children}</span>}
