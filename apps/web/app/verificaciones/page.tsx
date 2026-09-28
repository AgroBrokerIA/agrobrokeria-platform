"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type Company={id:string;razon_social?:string|null;nombre_comercial?:string|null;cuit?:string|null;pais?:string|null;provincia?:string|null;ciudad?:string|null;tipo_empresa?:string|null;verificada?:boolean|null;};
type Verification={empresa_id:string;estado:string|null;tipo_consulta:string|null;fecha_verificacion:string|null;consultado_at:string|null;};

function Icon({name,size=18}:{name:string;size?:number}) {
 const p:Record<string,React.ReactNode>={
  shield:<><path d="M12 3 19 6v5c0 4.5-2.8 7.5-7 10-4.2-2.5-7-5.5-7-10V6l7-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
  building:<><path d="M4 21h16M6 21V6l6-3 6 3v15M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/></>,
  globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
  pin:<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  users:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
  check:<><circle cx="12" cy="12" r="10"/><path d="m8 12 2.5 2.5L16 9"/></>,
  close:<><circle cx="12" cy="12" r="10"/><path d="M8 8l8 8M16 8l-8 8"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  truck:<><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></>,
  bank:<><path d="M3 10h18M4 10v8M8 10v8M12 10v8M16 10v8M20 10v8M2 20h20L12 3 2 20Z"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  eye:<><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  filter:<><path d="M4 6h16M7 12h10M10 18h4"/></>,
  calendar:<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/></>,
  file:<><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]||p.file}</svg>;
}

const countryFlag=(country:string|null|undefined)=>({Argentina:"🇦🇷","Estados Unidos":"🇺🇸",China:"🇨🇳",Alemania:"🇩🇪",Canadá:"🇨🇦",Brasil:"🇧🇷",Suiza:"🇨🇭"}[country||""]||"🌐");
const companyName=(c:Company)=>c.nombre_comercial||c.razon_social||"Empresa sin nombre";
const verificationState=(c:Company,v?:Verification)=>c.verificada||v?.estado?.toUpperCase().includes("VERIFIC")?"Verificada":v?.estado?.toUpperCase().includes("RECHAZ")?"Rechazado":v?"En proceso":"Sin verificar";

export default function VerificacionesPage(){
 const[companies,setCompanies]=useState<Company[]>([]),[verifications,setVerifications]=useState<Verification[]>([]),[selected,setSelected]=useState<Company|null>(null),[query,setQuery]=useState(""),[country,setCountry]=useState(""),[status,setStatus]=useState("Todos"),[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{setLoading(true);const [{data:c},{data:v}]=await Promise.all([
  supabase.from("companies").select("id,razon_social,nombre_comercial,cuit,pais,provincia,ciudad,tipo_empresa,verificada").order("nombre_comercial",{ascending:true}).limit(340),
  supabase.from("empresas_verificaciones").select("empresa_id,estado,tipo_consulta,fecha_verificacion,consultado_at").order("consultado_at",{ascending:false}).limit(1000)
 ]);const list=(c||[]) as Company[];setCompanies(list);setVerifications((v||[]) as Verification[]);setSelected(list[0]||null);setLoading(false)})()},[]);
 const vByCompany=useMemo(()=>{const m=new Map<string,Verification>();for(const v of verifications)if(!m.has(v.empresa_id))m.set(v.empresa_id,v);return m},[verifications]);
 const filtered=useMemo(()=>companies.filter(c=>{const q=query.toLowerCase();const match=!q||[companyName(c),c.cuit,c.pais,c.tipo_empresa,c.provincia,c.ciudad].filter(Boolean).join(" ").toLowerCase().includes(q);const matchCountry=!country||c.pais===country;const st=verificationState(c,vByCompany.get(c.id));return match&&matchCountry&&(status==="Todos"||st===status)}),[companies,query,country,status,vByCompany]);
 const counts=useMemo(()=>({verified:companies.filter(c=>verificationState(c,vByCompany.get(c.id))==="Verificada").length,process:companies.filter(c=>verificationState(c,vByCompany.get(c.id))==="En proceso").length,obs:companies.filter(c=>verificationState(c,vByCompany.get(c.id))==="Rechazado").length,rejected:companies.filter(c=>verificationState(c,vByCompany.get(c.id))==="Rechazado").length}),[companies,vByCompany]);
 const selectedVerification=selected?vByCompany.get(selected.id):undefined;
 const score=selected?.verificada?100:0;
 const countries=useMemo(()=>Array.from(new Set(companies.map(c=>c.pais).filter(Boolean) as string[])).sort(),[companies]);
 return <main className="verification-third-page">
  <header className="vt-hero"><div><h1>Verificación de terceros</h1><p>Valida la identidad, solvencia y reputación de empresas y contactos externos para operar de forma segura.</p></div><button className="vt-primary"><span>＋</span> Nueva verificación</button></header>
  <nav className="vt-tabs">{[["shield","Empresas","/verificaciones"],["users","Contactos","/empresas"],["users","Intermediarios","/empresas"],["truck","Transportistas","/logistica"],["bank","Financieras","/empresas"],["building","Laboratorios","/empresas"],["calendar","Historial","/historial"]].map(([icon,label,href],i)=><Link className={i===0?"active":""} href={href} key={label}><Icon name={icon} size={16}/>{label}</Link>)}</nav>
  <section className="vt-kpis">
   <article className="vt-kpi green"><div><Icon name="shield" size={25}/></div><section><strong>{counts.verified}</strong><span>Empresas verificadas</span><small>{companies.length?Math.round(counts.verified/companies.length*100):0}% del total</small></section></article>
   <article className="vt-kpi yellow"><div><Icon name="clock" size={25}/></div><section><strong>{counts.process}</strong><span>En proceso</span><small>{companies.length?Math.round(counts.process/companies.length*100):0}% del total</small></section></article>
   <article className="vt-kpi red"><div><Icon name="close" size={25}/></div><section><strong>{counts.obs}</strong><span>Con observaciones</span><small>{companies.length?Math.round(counts.obs/companies.length*100):0}% del total</small></section></article>
   <article className="vt-kpi dark"><div><Icon name="x" size={25}/></div><section><strong>{counts.rejected}</strong><span>Rechazadas</span><small>{companies.length?Math.round(counts.rejected/companies.length*100):0}% del total</small></section></article>
  </section>
  <div className="vt-layout">
   <section className="vt-left">
    <div className="vt-filters"><label><Icon name="search" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por empresa, CUIT, país, actividad..."/></label><select value={country} onChange={e=>setCountry(e.target.value)}><option value="">Todos los países</option>{countries.map(c=><option key={c}>{c}</option>)}</select><select><option>Todos los rubros</option></select><select value={status} onChange={e=>setStatus(e.target.value)}><option>Todos</option><option>Verificada</option><option>En proceso</option><option>Con observaciones</option></select><button><Icon name="filter" size={17}/> Más filtros</button></div>
    <div className="vt-table-card"><table><thead><tr><th></th><th>Empresa</th><th>País</th><th>Rubro</th><th>Estado</th><th>Nivel de confianza</th><th>Última verificación</th><th>Acciones</th></tr></thead><tbody>{filtered.slice(0,10).map((c,i)=>{const v=vByCompany.get(c.id);const st=verificationState(c,v);const pct=st==="Verificada"?100:st==="En proceso"?50:0;return <tr key={c.id} className={selected?.id===c.id?"selected":""} onClick={()=>setSelected(c)}><td><input type="checkbox" readOnly/></td><td><div className="vt-company"><span className={"vt-company-icon ci-"+(i%5)}>{i%5===1?"◎":i%5===2?"✦":"◒"}</span><div><strong>{companyName(c)}</strong><small>{c.cuit||"Sin CUIT"}</small></div></div></td><td><span className="vt-country">{countryFlag(c.pais)} {c.pais||"—"}</span></td><td><span className="vt-sector"><Icon name="globe" size={14}/>{c.tipo_empresa||"Actividad comercial"}</span></td><td><b className={"vt-status "+st.toLowerCase().replaceAll(" ","-")}><span>●</span>{st}</b></td><td><div className="vt-confidence"><i style={{width:pct+"%"}}/><b>{pct}%</b></div></td><td>{v?.fecha_verificacion?new Date(v.fecha_verificacion).toLocaleDateString("es-AR"):"—"}</td><td><button className="vt-eye" onClick={e=>{e.stopPropagation();setSelected(c)}}><Icon name="eye" size={17}/></button><button className="vt-more"><Icon name="more" size={17}/></button></td></tr>})}</tbody></table><div className="vt-pagination"><span>Mostrando 1–{Math.min(10,filtered.length)} de {filtered.length} empresas</span><div><button>‹</button><b>1</b><button>2</button><button>3</button><button>4</button><button>5</button><span>…</span><button>34</button><button>›</button></div><span>Mostrar <select><option>10</option><option>25</option><option>50</option></select> por página</span></div></div>
    <div className="vt-bottom-charts"><section><h3>Distribución por estado</h3><div className="vt-donut"><div>{companies.length}<small>Total</small></div></div><div className="vt-legend"><span><i className="green"/>Verificadas <b>{counts.verified}</b></span><span><i className="yellow"/>En proceso <b>{counts.process}</b></span><span><i className="red"/>Con observaciones <b>{counts.obs}</b></span><span><i className="dark"/>Rechazadas <b>{counts.rejected}</b></span></div></section><section><h3>Verificaciones por rubro</h3>{["Producción de granos","Trading internacional","Acopio","Transporte","Financieras","Otros"].map((x,i)=><div className="vt-bar-row" key={x}><span>{x}</span><div><i style={{width:[35,25,15,10,8,7][i]+"%"}}/></div><b>{[35,25,15,10,8,7][i]}%</b></div>)}</section><section><h3>Verificaciones por país</h3>{countries.slice(0,6).map((c,i)=><div className="vt-country-row" key={c}><span>{countryFlag(c)} {c}</span><b>{companies.filter(x=>x.pais===c).length}</b><em>{companies.length?Math.round(companies.filter(x=>x.pais===c).length/companies.length*100):0}%</em></div>)}</section></div>
   </section>
   <aside className="vt-detail">{selected?<><div className="vt-detail-head"><div className="vt-detail-logo">◒</div><div><h2>{companyName(selected)}</h2><b>{verificationState(selected,selectedVerification)==="Verificada"?"✓ Empresa verificada":verificationState(selected,selectedVerification)}</b><p>Nivel de confianza: <strong>{score?score+"%":"No calculado"}</strong></p></div><button>⋯</button></div><nav><b>Resumen</b><span>Documentación</span><span>Cumplimiento</span><span>Historial</span></nav><section><div className="vt-detail-title"><h3>Información general</h3><button>Editar</button></div>{[["calendar","CUIT",selected.cuit||"—"],["building","Razón social",selected.razon_social||companyName(selected)],["globe","País",countryFlag(selected.pais)+" "+(selected.pais||"—")],["pin","Dirección",[selected.provincia,selected.ciudad].filter(Boolean).join(", ")||"—"],["globe","Sitio web","—"],["building","Rubro",selected.tipo_empresa||"Producción de granos"],["calendar","Año de constitución","—"],["users","Empleados","—"]].map(x=><div className="vt-info-row" key={x[1]}><Icon name={x[0]} size={16}/><span>{x[1]}</span><b>{x[2]}</b></div>)}</section><section><h3>Verificaciones realizadas</h3>{selectedVerification?<div className="vt-check-row"><Icon name="check" size={15}/><span>{selectedVerification.tipo_consulta||"Verificación registrada"}</span><time>{selectedVerification.fecha_verificacion?new Date(selectedVerification.fecha_verificacion).toLocaleDateString("es-AR"):"—"}</time></div>:<div className="vt-empty">No hay verificaciones registradas para esta empresa.</div>}</section><section><div className="vt-detail-title"><h3>Documentos verificados</h3><button>Ver todos</button></div>{selectedVerification?<div className="vt-file-row"><span className="file-color fc-0"><Icon name="file" size={18}/></span><div><b>Registro de verificación</b><small>{selectedVerification.tipo_consulta||"Consulta registrada"}</small></div><time>{selectedVerification.fecha_verificacion?new Date(selectedVerification.fecha_verificacion).toLocaleDateString("es-AR"):"—"}</time><button disabled>↓</button></div>:<div className="vt-empty">No hay documentos de verificación registrados.</div>}</section></>:<div className="vt-empty">Seleccioná una empresa para ver su ficha.</div>}</aside>
  </div>
 </main>;
}
