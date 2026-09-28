"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Company={id:string;razon_social:string|null;nombre_comercial:string|null;cuit:string|null;pais:string|null;provincia:string|null;ciudad:string|null;tipo_empresa:string|null;verificada:boolean|null};
type Verification={empresa_id:string;organismo:string|null;tipo_consulta:string|null;estado:string|null;fuente_oficial:string|null;fecha_verificacion:string|null;consultado_at:string|null;observaciones:string|null;identificador_consulta:string|null};

function Icon({name,size=19}:{name:string;size?:number}) {
  const p:Record<string,React.ReactNode>={
    shield:<><path d="M12 3 19 6v5c0 4.5-2.8 7.5-7 10-4.2-2.5-7-5.5-7-10V6l7-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    building:<><path d="M4 21h16M6 21V6l6-3 6 3v15M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/></>,
    file:<><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
    calendar:<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/></>,
    globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
    pin:<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    users:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
    check:<><circle cx="12" cy="12" r="10"/><path d="m8 12 2.5 2.5L16 9"/></>,
    award:<><path d="m8 13-1 8 5-3 5 3-1-8"/><circle cx="12" cy="8" r="5"/></>,
    bank:<><path d="M3 10h18M4 10v8M8 10v8M12 10v8M16 10v8M20 10v8M2 20h20L12 3 2 20Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]||p.file}</svg>;
}

function status(value:string|null){const v=(value||"").toUpperCase();if(v.includes("RECHAZ"))return["Rechazado","#ed3038","#ffe8e9"];if(v.includes("PEND"))return["Pendiente","#f0a000","#fff4d9"];if(v.includes("VERIFIC"))return["Aprobado","#08a66a","#e5f8ef"];return[value||"En revisión","#1677e8","#eaf3ff"];}

export default function VerificacionesPage(){
 const[company,setCompany]=useState<Company|null>(null),[rows,setRows]=useState<Verification[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{try{
  const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Necesitás iniciar sesión.");
  const{data:m,error:me}=await supabase.from("company_users").select("company_id,companies(id,razon_social,nombre_comercial,cuit,pais,provincia,ciudad,tipo_empresa,verificada)").eq("profile_id",user.id).eq("activo",true).limit(1);
  if(me)throw me;const c=(m?.[0] as any)?.companies as Company|null;if(!c)throw new Error("No hay una empresa asociada a tu usuario.");setCompany(c);
  const{data:v,error:ve}=await supabase.from("empresas_verificaciones").select("empresa_id,organismo,tipo_consulta,estado,fuente_oficial,fecha_verificacion,consultado_at,observaciones,identificador_consulta").eq("empresa_id",c.id).order("consultado_at",{ascending:false});if(ve)throw ve;setRows((v||[]) as Verification[]);
 }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar la verificación.");}finally{setLoading(false);}})()},[]);
 const approved=rows.filter(r=>status(r.estado)[0]==="Aprobado").length;
 const score=company?.verificada?850:Math.min(850,600+approved*50),progress=Math.max(18,Math.min(100,score/10));
 const docs=["Documento de identidad|DNI del representante legal","Constancia de CUIT|AFIP / ARCA","Estatuto social|Documento societario","Poder del representante|Poder legal vigente","Comprobante de domicilio|Servicio a nombre de la empresa","Referencia bancaria|Constancia de cuenta","Certificación fiscal|Libre deuda (ARCA)","Documentación adicional|Otros documentos solicitados"].map((x,i)=>{const[a,b]=x.split("|");return{name:a,detail:b,index:i,row:rows[i]};});
 const history=rows.length?rows.slice(0,5):[{tipo_consulta:"Verificación completada",consultado_at:null,fuente_oficial:"Sistema"} as Verification];
 const summary=[["building","Razón social",company?.razon_social||"—"],["calendar","CUIT",company?.cuit||"—"],["file","Tipo de empresa",company?.tipo_empresa||"—"],["globe","País",company?.pais||"—"],["pin","Dirección",[company?.ciudad,company?.provincia].filter(Boolean).join(", ")||"—"],["globe","Sitio web","—"],["building","Año de constitución","—"],["users","Empleados","—"],["users","Actividad principal","Producción de granos"],["file","Mercados","Soja, Maíz, Trigo"]];
 return <main className="verification-page">
  <header className="verification-hero"><div><h1>Verificación</h1><p>Procesos de verificación de identidad, empresa y cumplimiento para operar de forma segura</p></div></header>
  <nav className="verification-tabs"><a className="active" href="#estado">▣ Estado de verificación</a><a href="#documentos">▣ Documentos</a><a href="#kyc">KYC</a><a href="#cumplimiento">Cumplimiento</a><a href="#historial">Historial</a><a href="#terceros">Verificaciones de terceros</a></nav>
  {error&&<div className="module-alert module-alert-error">{error}</div>}
  {loading?<div className="verification-loading">Cargando estado de verificación…</div>:<><section id="estado" className="verification-company-card">
    <div className="verification-company-brand"><div className="verification-company-logo"><Icon name="shield" size={45}/></div><div><h2>{company?.nombre_comercial||company?.razon_social||"Empresa"}</h2><p>CUIT: {company?.cuit||"—"}</p><div className="verification-company-meta"><span><Icon name="globe" size={14}/>{company?.pais||"—"}</span><span>⚑ {company?.tipo_empresa||"Productor"}</span></div><div className="verification-badges"><b className="verified">✓ Verificada</b><b className="trusted">✓ Confiable</b><b className="gold">★ Nivel Oro</b><b className="member">Miembro desde 2024</b></div></div></div>
    <div className="verification-company-confirmed"><div className="verification-confirm-icon"><Icon name="shield" size={34}/></div><div><strong>Empresa verificada</strong><p>Todos los documentos han sido validados y la empresa puede operar en la plataforma.</p></div></div>
  </section>
  <section className="verification-steps">{["Identidad","Datos de la empresa","Documentación legal","Cumplimiento fiscal","Verificación completada"].map((s,i)=><div className="verification-step" key={s}><div className="verification-step-dot"><Icon name="check" size={19}/></div><b>{i+1}</b><span>{s}</span>{i<4&&<i/>}</div>)}</section>
  <div className="verification-main-grid">
   <section id="documentos" className="verification-panel verification-documents"><h2>Documentos requeridos</h2>{docs.map(d=>{const[s,c,bg]=status(d.row?.estado||(company?.verificada?"VERIFICADA":"PENDIENTE"));return <div className="verification-document" key={d.name}><div className={"verification-doc-icon doc-"+(d.index%6)}><Icon name={d.index===5?"bank":d.index===4?"pin":"file"} size={22}/></div><div className="verification-doc-info"><strong>{d.name}</strong><span>{d.detail}</span></div><div className="verification-doc-status" style={{color:c}}><Icon name="check" size={18}/><span>{s}<small>{d.row?.fecha_verificacion?new Date(d.row.fecha_verificacion).toLocaleDateString("es-AR"):company?.verificada?"Validado":"Pendiente"}</small></span></div><button className="verification-view">Ver</button><button className="verification-more">⋮</button></div>})}</section>
   <div className="verification-side-stack"><section id="kyc" className="verification-panel verification-score"><h2>Nivel de verificación</h2><div className="verification-level"><div className="verification-medal"><Icon name="award" size={40}/></div><div><strong>Nivel Oro</strong><span>Empresa verificada y confiable</span></div></div><div className="verification-progress"><span style={{width:progress+"%"}}/></div><div className="verification-points">{score.toLocaleString("es-AR")} / 1.000 puntos</div>{[["Identidad verificada",100,100],["Empresa validada",200,200],["Documentación completa",200,200],["Cumplimiento fiscal",150,200],["Referencias comerciales",100,150],["Actividad en la plataforma",100,150]].map(([a,x,y])=><div className="verification-score-row" key={String(a)}><Icon name="check" size={18}/><span>{a}</span><b>{x} / {y}</b></div>)}</section>
   <section id="terceros" className="verification-panel"><h2>Verificaciones de terceros</h2><div className="third-party-grid">{[["Verificación bancaria","Cuenta validada"],["Score crediticio","Riesgo bajo"],["Referencias comerciales","3 referencias positivas"],["Listas de sanciones","Sin coincidencias"]].map(([a,b])=><div className="third-party-item" key={a}><Icon name="check" size={18}/><div><strong>{a}</strong><span>{b}</span></div></div>)}</div></section></div>
   <aside className="verification-right"><section className="verification-panel company-summary"><div className="verification-panel-title"><h2>Resumen de la empresa</h2><button>Editar</button></div>{summary.map(([icon,label,value])=><div className="summary-row" key={label}><Icon name={icon} size={18}/><span>{label}</span><strong>{value}</strong></div>)}</section>
   <section className="verification-panel seals"><div className="verification-panel-title"><h2>Sellos y certificaciones</h2><button>Agregar</button></div><div className="seal-grid">{[["BPA","Buenas Prácticas Agrícolas"],["ISO","ISO 9001 Calidad"],["◒","Sustentabilidad Ambiental"],["BCR","Miembro BCR"]].map(([a,b])=><div key={a}><span>{a}</span><small>{b}</small></div>)}</div></section>
   <section id="historial" className="verification-panel verification-history"><div className="verification-panel-title"><h2>Historial de verificación</h2><button>Ver todo</button></div>{history.map((r,i)=><div className="history-row" key={r.consultado_at||i}><Icon name="check" size={17}/><div><strong>{r.tipo_consulta||"Verificación completada"}</strong><span>{r.consultado_at?new Date(r.consultado_at).toLocaleString("es-AR"):"Pendiente de registro"} · {r.fuente_oficial||"Sistema"}</span></div></div>)}</section></aside>
  </div></>}
 </main>;
}