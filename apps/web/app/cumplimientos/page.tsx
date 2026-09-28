"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Doc={id:string;nombre:string;categoria:string;estado:string;vence:string;icon:string};
const docs:Doc[]=[
 {id:"1",nombre:"CUIT / Constancia de inscripción",categoria:"Fiscal",estado:"Vigente",vence:"10/09/2027",icon:"▤"},
 {id:"2",nombre:"Estatuto social",categoria:"Legal",estado:"Vigente",vence:"15/08/2028",icon:"▤"},
 {id:"3",nombre:"Poder del representante",categoria:"Legal",estado:"Vigente",vence:"12/09/2027",icon:"▣"},
 {id:"4",nombre:"Comprobante de domicilio",categoria:"Legal",estado:"Vigente",vence:"09/09/2027",icon:"⌂"},
 {id:"5",nombre:"Certificación fiscal (ARCA)",categoria:"Fiscal",estado:"Por vencer",vence:"15/10/2026",icon:"▧"},
 {id:"6",nombre:"Certificado bancario",categoria:"Financiero",estado:"Vigente",vence:"20/08/2027",icon:"▥"},
 {id:"7",nombre:"Seguro de caución",categoria:"Operativo",estado:"Vencido",vence:"01/09/2026",icon:"△"},
 {id:"8",nombre:"Registro como corredor de cereales",categoria:"Regulatorio",estado:"Vigente",vence:"30/06/2027",icon:"▤"}
];
function I({children}:{children:React.ReactNode}){return <span className="compliance-icon">{children}</span>}
export default function CumplimientosPage(){
 const[company,setCompany]=useState<any>(null);
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data}=await supabase.from("company_users").select("company_id").eq("profile_id",user.id).eq("activo",true).limit(1);const id=(data?.[0] as any)?.company_id;if(id){const {data:c}=await supabase.from("companies").select("id,nombre,razon_social,pais,provincia,localidad").eq("id",id).maybeSingle();setCompany(c)}})()},[]);
 const name=company?.nombre||company?.razon_social||"AgroBrokerIA";
 return <main className="compliance-page">
  <header className="compliance-hero"><div><h1>Cumplimientos</h1><p>Gestiona el cumplimiento normativo, fiscal, legal y documental de tu empresa y operaciones.</p></div><button className="compliance-download">⇩ &nbsp; Descargar reporte</button></header>
  <nav className="compliance-tabs"><a className="active">▣ &nbsp; Resumen</a><a>▤ &nbsp; Documentación</a><a>▣ &nbsp; KYC</a><a>▣ &nbsp; Cumplimiento fiscal</a><a>▣ &nbsp; Normativas</a><a>△ &nbsp; Alertas</a><a>▤ &nbsp; Historial</a></nav>
  <section className="compliance-kpis">
   <article className="ckpi green"><I>♢</I><div><small>Estado general</small><strong>Cumplimiento alto</strong><div className="progress"><b style={{width:"92%"}}/></div><em>92%</em></div></article>
   <article className="ckpi blue"><I>▤</I><div><small>Documentos vigentes</small><strong>12 / 14</strong><div className="progress"><b style={{width:"86%"}}/></div><em>86%</em></div></article>
   <article className="ckpi green"><I>⚖</I><div><small>Cumplimiento normativo</small><strong>En regla</strong><div className="progress"><b style={{width:"100%"}}/></div><em>100%</em></div></article>
   <article className="ckpi red"><I>△</I><div><small>Alertas pendientes</small><strong>2</strong><div className="progress"><b style={{width:"14%"}}/></div><em>14%</em></div></article>
  </section>
  <div className="compliance-main">
   <section className="compliance-panel compliance-docs"><div className="cp-title"><h2>Documentación requerida</h2><button className="outline-blue">⇧ &nbsp; Subir documento</button></div>
    <div className="doc-filters"><b>Todos <i>14</i></b><span>Vigentes <i>12</i></span><span>Por vencer <i className="yellow">1</i></span><span>Vencidos <i className="red">1</i></span></div>
    <div className="doc-table"><div className="doc-head"><span>Documento</span><span>Categoría</span><span>Estado</span><span>Vencimiento</span><span>Acciones</span></div>{docs.map((d,i)=><div className="doc-row" key={d.id}><I>{d.icon}</I><div><strong>{d.nombre}</strong></div><span>{d.categoria}</span><b className={"doc-status "+(d.estado==="Vigente"?"ok":d.estado==="Vencido"?"bad":"soon")}>{d.estado}</b><span>{d.vence}</span><div><button>Ver</button><button className="dots">⋮</button></div></div>)}</div>
   </section>
   <aside className="compliance-side">
    <section className="compliance-panel level-panel"><h2>Nivel de cumplimiento</h2><div className="level-content"><div className="donut"><strong>92%</strong></div><div className="level-legend"><span><i/>Documentación <b>86%</b></span><span><i/>Normativo <b>100%</b></span><span><i className="orange"/>Fiscal <b>90%</b></span><span><i className="purple"/>Operativo <b>85%</b></span><span><i className="purple"/>Legal <b>95%</b></span></div></div><div className="green-note">✓ &nbsp; Tu empresa se encuentra en cumplimiento con los requisitos principales para operar.</div></section>
    <section className="compliance-panel due-panel"><div className="cp-title"><h2>Próximos vencimientos</h2><button>Ver todos</button></div><div className="due-row"><I>%</I><div><strong>Certificación fiscal (ARCA)</strong><span>Renovación anual.</span></div><time>15/10/2026</time><b>15 días</b></div><div className="due-row"><I>▤</I><div><strong>Seguro de caución</strong><span>Póliza vigente.</span></div><time>01/09/2026</time><b className="bad-bg">Vencido</b></div><div className="due-row"><I>▥</I><div><strong>Certificado bancario</strong><span>Actualización requerida.</span></div><time>20/09/2027</time><b className="blue-bg">320 días</b></div></section>
   </aside>
  </div>
  <div className="compliance-bottom">
   <section className="compliance-panel categories"><h2>Cumplimiento por categoría</h2>{[["Fiscal","90%","green"],["Legal","95%","blue"],["Operativo","85%","orange"],["KYC","100%","purple"],["Normativo","100%","green"]].map(x=><div className="cat-row" key={x[0]}><span>{x[0]}</span><div><b className={x[2]} style={{width:x[1]}}/></div><strong>{x[1]}</strong></div>)}</section>
   <section className="compliance-panel alerts"><div className="cp-title"><h2>Alertas y tareas pendientes</h2><button>Ver todas</button></div>{[["△","Seguro de caución vencido","Renovar póliza para continuar operando.","01/09/2026","Vencido","bad"],["%","Certificación fiscal por vencer","Vence en 15 días.","15/10/2026","15 días","soon"],["i","Completar verificación KYC de un contacto","Falta documentación adicional.","28/09/2026","Pendiente","soon"],["i","Actualizar referencias comerciales","Se recomienda actualizar información.","15/10/2026","Pendiente","soon"]].map(a=><div className="alert-row" key={a[1]}><I>{a[0]}</I><div><strong>{a[1]}</strong><span>{a[2]}</span></div><time>{a[3]}</time><b className={a[5]}>{a[4]}</b></div>)}</section>
   <section className="compliance-panel history"><div className="cp-title"><h2>Historial de cumplimiento</h2><button>Ver todos</button></div>{["Documentación verificada","Certificación fiscal aprobada","Verificación KYC completada","Seguro de caución cargado","Datos bancarios validados"].map((x,i)=><div className="history-item" key={x}><i>✓</i><strong>{x}</strong><span>{["12/09/2026 14:32","10/09/2026 11:15","08/09/2026 16:20","01/09/2026 09:45","28/08/2026 13:10"][i]}</span></div>)}</section>
  </div>
 </main>
}