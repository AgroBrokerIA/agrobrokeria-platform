"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type Company={id:string;razon_social?:string|null;nombre_comercial?:string|null;cuit?:string|null;pais?:string|null;provincia?:string|null;ciudad?:string|null;tipo_empresa?:string|null;verificada?:boolean|null;reputacion_score?:number|null;operaciones_realizadas?:number|null;};
type RoleColor={tipo_empresa:string;etiqueta:string;color_hex:string};
type Requirement={empresa_id:string;estado:string;observaciones?:string|null;verificado_at?:string|null;verificacion_requisitos_catalogo?:{codigo:string;nombre:string;fuente:string;obligatorio:boolean}|null};
const ROLE_FALLBACK:Record<string,{label:string;color:string}>={ACOPIO:{label:"Acopio",color:"#15803D"},COOPERATIVA:{label:"Cooperativa",color:"#15803D"},BROKER:{label:"Corredor",color:"#2563EB"},CORREDOR:{label:"Corredor",color:"#2563EB"},INTERMEDIARIO:{label:"Intermediario",color:"#EA580C"},PRODUCTOR:{label:"Productor",color:"#CA8A04"},COMPRADOR:{label:"Comprador",color:"#CA8A04"},EXPORTADOR:{label:"Exportador",color:"#7C3AED"},INDUSTRIA:{label:"Industria",color:"#7C3AED"},MOLINO:{label:"Molino",color:"#7C3AED"},LABORATORIO:{label:"Laboratorio",color:"#475569"},LOGISTICA:{label:"Logística",color:"#475569"}};
type Verification={empresa_id:string;estado:string|null;tipo_consulta:string|null;fecha_verificacion:string|null;consultado_at:string|null;organismo?:string|null;observaciones?:string|null;fuente_oficial?:string|null;resultado?:Record<string,unknown>|null;};

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
  more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  x:<><circle cx="12" cy="12" r="10"/><path d="m8 8 8 8M16 8 8 16"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]||p.file}</svg>;
}

const countryFlag=(country:string|null|undefined)=>({Argentina:"🇦🇷","Estados Unidos":"🇺🇸",China:"🇨🇳",Alemania:"🇩🇪",Canadá:"🇨🇦",Brasil:"🇧🇷",Suiza:"🇨🇭"}[country||""]||"🌐");
const companyName=(c:Company)=>c.nombre_comercial||c.razon_social||"Empresa sin nombre";
const verificationState=(c:Company,v?:Verification)=>{const raw=(v?.estado||"").toUpperCase();if(/RECHAZ|RECHAZADA/.test(raw))return "Rechazado";if(/NO_VERIFIC|SIN_RESULTADO|CUIT_INVALIDO/.test(raw))return "Sin verificar";if(/OBSERV|INACTIVO|BAJA/.test(raw))return "Con observaciones";if(c.verificada||/^VERIFICADA?$/.test(raw))return "Verificada";if(/ARCA_VERIFICADA/.test(raw))return "ARCA verificada";if(/PENDIENT|EN_PROCESO/.test(raw)||v)return "En proceso";return "Sin verificar";};

export default function VerificacionesPage(){
 const[companies,setCompanies]=useState<Company[]>([]),[verifications,setVerifications]=useState<Verification[]>([]),[roleColors,setRoleColors]=useState<Record<string,RoleColor>>({}),[requirements,setRequirements]=useState<Requirement[]>([]),[selected,setSelected]=useState<Company|null>(null),[query,setQuery]=useState(""),[country,setCountry]=useState(""),[sector,setSector]=useState(""),[status,setStatus]=useState("Todos"),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[showNew,setShowNew]=useState(false),[newCompany,setNewCompany]=useState(""),[newType,setNewType]=useState("KYC / Identidad"),[actionMsg,setActionMsg]=useState("");
 useEffect(()=>{(async()=>{const [{data:c},{data:v},{data:dist},{data:req}] = await Promise.all([
  supabase.from("empresas").select("id,razon_social,nombre_comercial,cuit,pais,provincia,localidad,tipo_empresa,verificada,reputacion_score,operaciones_realizadas").order("nombre_comercial",{ascending:true}).limit(340),
  supabase.from("empresas_verificaciones").select("empresa_id,estado,tipo_consulta,fecha_verificacion,consultado_at,organismo,observaciones,fuente_oficial,resultado").order("consultado_at",{ascending:false}).limit(1000),
  supabase.from("empresa_distintivos").select("tipo_empresa,etiqueta,color_hex"),
  supabase.from("empresas_verificacion_requisitos").select("empresa_id,estado,observaciones,verificado_at,verificacion_requisitos_catalogo(codigo,nombre,fuente,obligatorio)").limit(1000)
 ]);const list=(c||[]).map((row)=>({...row,ciudad:row.localidad??null})) as Company[];setCompanies(list);setVerifications((v||[]) as Verification[]);setRoleColors(Object.fromEntries((dist||[]).map((x:any)=>[String(x.tipo_empresa||"").toUpperCase(),x as RoleColor])));setRequirements((req||[]) as unknown as Requirement[]);setSelected(list[0]||null)})()},[]);
 const vByCompany=useMemo(()=>{const m=new Map<string,Verification>();for(const v of verifications)if(!m.has(v.empresa_id))m.set(v.empresa_id,v);return m},[verifications]);
 const filtered=useMemo(()=>companies.filter(c=>{const q=query.toLowerCase();const match=!q||[companyName(c),c.cuit,c.pais,c.tipo_empresa,c.provincia,c.ciudad].filter(Boolean).join(" ").toLowerCase().includes(q);const matchCountry=!country||c.pais===country;const matchSector=!sector||c.tipo_empresa===sector;const st=verificationState(c,vByCompany.get(c.id));return match&&matchCountry&&matchSector&&(status==="Todos"||st===status)}),[companies,query,country,status,vByCompany]);
 const counts=useMemo(()=>({verified:companies.filter(c=>verificationState(c,vByCompany.get(c.id))==="Verificada").length,process:companies.filter(c=>verificationState(c,vByCompany.get(c.id))==="En proceso").length,obs:companies.filter(c=>verificationState(c,vByCompany.get(c.id))==="Con observaciones").length,rejected:companies.filter(c=>verificationState(c,vByCompany.get(c.id))==="Rechazado").length}),[companies,vByCompany]);
 const selectedVerification=selected?vByCompany.get(selected.id):undefined;
 const selectedRequirements=selected?requirements.filter(r=>r.empresa_id===selected.id):[];
 const score=Math.max(0,Math.min(100,Number(selected?.reputacion_score||0)));
 const roleFor=(type?:string|null)=>{const key=String(type||"").toUpperCase();const item=roleColors[key];return item?{label:item.etiqueta,color:item.color_hex}:ROLE_FALLBACK[key]||{label:type||"Actividad comercial",color:"#475569"};}; const createVerification=async()=>{
  if(!newCompany){setActionMsg("Seleccioná una empresa.");return}
  const{data:{user}}=await supabase.auth.getUser();
  const isArca=newType==="Datos fiscales";
  const requestType=isArca?"ARCA_CUIT":newType==="Matrícula / registro profesional"?"MATRICULA":newType==="Registro sectorial / RUCA"?"REGISTRO_SECTORIAL":newType==="Habilitación de actividad"?"HABILITACIONES":newType==="Documentación societaria"?"DOCUMENTACION_SOCIETARIA":newType;
  const organismo=isArca?"ARCA":newType==="Matrícula / registro profesional"?"REGISTRO_COMPETENTE":newType==="Registro sectorial / RUCA"?"RUCA":newType==="Habilitación de actividad"?"ORGANISMO_COMPETENTE":newType==="Documentación societaria"?"REGISTRO_PUBLICO":"REVISION_INTERNA";
  const{data:created,error}=await supabase.from("empresas_verificaciones").insert({
    empresa_id:newCompany,
    estado:"PENDIENTE",
    organismo,
    tipo_consulta:requestType,
    ejecutado_por:user?.id||null,
    observaciones:isArca?"Solicitud voluntaria de consulta del padrón público de ARCA.":"Requiere validación de la fuente correspondiente; no se marcará como verificada automáticamente.",
    consultado_at:new Date().toISOString()
  }).select("id").single();
  if(error){setActionMsg(error.message);return}
  let message=isArca?"Solicitud de consulta ARCA registrada.":"Solicitud registrada; este tipo requiere revisión de su registro oficial.";
  if(isArca&&created?.id){
    try{
      const{data:{session}}=await supabase.auth.getSession();
      const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if(!session?.access_token||!base||!anon)throw new Error("No se pudo validar la sesión para consultar ARCA.");
      const response=await fetch(base+"/functions/v1/verificaciones-sync",{
        method:"POST",
        headers:{Authorization:"Bearer "+session.access_token,apikey:anon,"Content-Type":"application/json"},
        body:JSON.stringify({verification_id:created.id})
      });
      const payload=await response.json().catch(()=>({}));
      const result=payload?.resultados?.[0];
      if(response.ok&&payload?.ok){
        if(result?.estado==="ARCA_VERIFICADA")message="ARCA informó que el CUIT está activo. Esto no verifica por sí solo la habilitación de corredor ni la empresa en su conjunto.";
        else if(result?.estado==="ARCA_OBSERVADA")message="La consulta de ARCA devolvió observaciones. Revisá el resultado antes de operar.";
        else if(result?.estado==="CUIT_INVALIDO")message="El CUIT no tiene el formato válido de 11 dígitos. Corregilo para reintentar.";
        else message=result?.detalle||"La solicitud quedó pendiente; la fuente oficial no permitió confirmar el resultado.";
      }else{
        message=response.status===403
          ?"Solicitud registrada, pero la consulta automática requiere que la empresa seleccionada sea la empresa de tu cuenta o que tengas permisos de administración."
          :"Solicitud registrada; la consulta automática quedó pendiente de autorización o de disponibilidad de la fuente oficial.";
      }
    }catch{
      message="Solicitud registrada; no se pudo completar la consulta automática. El estado permanece pendiente y no se considera verificada.";
    }
  }
  setShowNew(false);
  setActionMsg(message);
  const{data:v}=await supabase.from("empresas_verificaciones").select("empresa_id,estado,tipo_consulta,fecha_verificacion,consultado_at").order("consultado_at",{ascending:false}).limit(1000);
  setVerifications((v||[]) as Verification[]);
  const{data:req}=await supabase.from("empresas_verificacion_requisitos").select("empresa_id,estado,observaciones,verificado_at,verificacion_requisitos_catalogo(codigo,nombre,fuente,obligatorio)").limit(1000);
  setRequirements((req||[]) as unknown as Requirement[]);
};
 const downloadVerification=()=>{if(!selected)return;const v=selectedVerification;const body=["AgroBrokerIA - Registro de verificación","Empresa: "+companyName(selected),"CUIT: "+(selected.cuit||"—"),"Estado: "+verificationState(selected,v),"Tipo de consulta: "+(v?.tipo_consulta||"—"),"Organismo: "+(v?.organismo||"—"),"Fuente: "+(v?.fuente_oficial||"—"),"Resultado: "+(v?.observaciones||"—"),"Fecha: "+(v?.fecha_verificacion?new Date(v.fecha_verificacion).toLocaleString("es-AR"):"—")].join("\n");const blob=new Blob([body],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="verificacion-"+companyName(selected).replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".txt";a.click();URL.revokeObjectURL(a.href)};
 const countries=useMemo(()=>Array.from(new Set(companies.map(c=>c.pais).filter(Boolean) as string[])).sort(),[companies]); const sectors=useMemo(()=>Array.from(new Set(companies.map(c=>c.tipo_empresa).filter(Boolean) as string[])).sort(),[companies]); const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize)); const safePage=Math.min(page,pageCount); const pageRows=filtered.slice((safePage-1)*pageSize,safePage*pageSize); useEffect(()=>{setPage(1)},[query,country,sector,status,pageSize]);
 return <main className="verification-third-page">
  <header className="vt-hero"><div><h1>Verificación de terceros</h1><p>Valida la identidad, solvencia y reputación de empresas y contactos externos para operar de forma segura.</p></div><button className="vt-primary" onClick={()=>{setNewCompany(selected?.id||companies[0]?.id||"");setShowNew(true)}}><span>＋</span> Nueva verificación</button></header>
  <nav className="vt-tabs">{[["shield","Empresas","/verificaciones"],["users","Contactos","/empresas"],["users","Intermediarios","/empresas"],["truck","Transportistas","/logistica"],["bank","Financieras","/empresas"],["building","Laboratorios","/empresas"],["calendar","Historial","/historial"]].map(([icon,label,href],i)=><Link className={i===0?"active":""} href={href} key={label}><Icon name={icon} size={16}/>{label}</Link>)}</nav>
  <section className="vt-kpis">
   <article className="vt-kpi green"><div><Icon name="shield" size={25}/></div><section><strong>{counts.verified}</strong><span>Empresas verificadas</span><small>{companies.length?Math.round(counts.verified/companies.length*100):0}% del total</small></section></article>
   <article className="vt-kpi yellow"><div><Icon name="clock" size={25}/></div><section><strong>{counts.process}</strong><span>En proceso</span><small>{companies.length?Math.round(counts.process/companies.length*100):0}% del total</small></section></article>
   <article className="vt-kpi red"><div><Icon name="close" size={25}/></div><section><strong>{counts.obs}</strong><span>Con observaciones</span><small>{companies.length?Math.round(counts.obs/companies.length*100):0}% del total</small></section></article>
   <article className="vt-kpi dark"><div><Icon name="x" size={25}/></div><section><strong>{counts.rejected}</strong><span>Rechazadas</span><small>{companies.length?Math.round(counts.rejected/companies.length*100):0}% del total</small></section></article>
  </section>
  <div className="vt-layout">
   <section className="vt-left">
    <div className="vt-filters"><label><Icon name="search" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por empresa, CUIT, país, actividad..."/></label><select value={country} onChange={e=>setCountry(e.target.value)}><option value="">Todos los países</option>{countries.map(c=><option key={c}>{c}</option>)}</select><select value={sector} onChange={e=>setSector(e.target.value)}><option value="">Todos los rubros</option>{sectors.map(s=><option key={s}>{s}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option>Todos</option><option>Verificada</option><option>ARCA verificada</option><option>En proceso</option><option>Con observaciones</option><option>Rechazado</option><option>Sin verificar</option></select><button onClick={()=>{setCountry("");setSector("");setStatus("Todos");setActionMsg("Filtros restablecidos.")}}><Icon name="filter" size={17}/> Más filtros</button></div>
    <div className="vt-table-card"><table><thead><tr><th></th><th>Empresa</th><th>País</th><th>Rubro</th><th>Estado</th><th>Nivel de confianza</th><th>Última verificación</th><th>Acciones</th></tr></thead><tbody>{pageRows.map((c,i)=>{const v=vByCompany.get(c.id);const st=verificationState(c,v);const pct=Math.max(0,Math.min(100,Number(c.reputacion_score||0)));const role=roleFor(c.tipo_empresa);return <tr key={c.id} className={selected?.id===c.id?"selected":""} onClick={()=>setSelected(c)}><td><input type="checkbox" readOnly/></td><td><div className="vt-company"><span className={"vt-company-icon ci-"+(i%5)}>{i%5===1?"◎":i%5===2?"✦":"◒"}</span><div><strong>{companyName(c)}</strong><small>{c.cuit||"Sin CUIT"}</small></div></div></td><td><span className="vt-country">{countryFlag(c.pais)} {c.pais||"—"}</span></td><td><span className="vt-sector" style={{color:role.color,backgroundColor:role.color+"14",borderColor:role.color+"44"}}><Icon name="globe" size={14}/>{role.label}</span></td><td><b className={"vt-status "+st.toLowerCase().replaceAll(" ","-")}><span>●</span>{st}</b></td><td><div className="vt-confidence"><i style={{width:pct+"%"}}/><b>{pct}%</b></div></td><td>{v?.fecha_verificacion?new Date(v.fecha_verificacion).toLocaleDateString("es-AR"):"—"}</td><td><button className="vt-eye" onClick={e=>{e.stopPropagation();setSelected(c)}}><Icon name="eye" size={17}/></button><button className="vt-more" onClick={e=>{e.stopPropagation();setSelected(c)}} title="Ver detalle"><Icon name="more" size={17}/></button></td></tr>})}</tbody></table><div className="vt-pagination"><span>Mostrando 1–{Math.min(10,filtered.length)} de {filtered.length} empresas</span><div><button disabled={safePage===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>{Array.from({length:Math.min(5,pageCount)},(_,i)=>i+1).map(n=><button key={n} className={safePage===n?"active":""} onClick={()=>setPage(n)}>{n}</button>)}{pageCount>5&&<><span>…</span><button onClick={()=>setPage(pageCount)}>{pageCount}</button></>}<button disabled={safePage===pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>›</button></div><span>Mostrar <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> por página</span></div></div>
    <div className="vt-bottom-charts"><section><h3>Distribución por estado</h3><div className="vt-donut"><div>{companies.length}<small>Total</small></div></div><div className="vt-legend"><span><i className="green"/>Verificadas <b>{counts.verified}</b></span><span><i className="yellow"/>En proceso <b>{counts.process}</b></span><span><i className="red"/>Con observaciones <b>{counts.obs}</b></span><span><i className="dark"/>Rechazadas <b>{counts.rejected}</b></span></div></section><section><h3>Verificaciones por rubro</h3>{sectors.map((x)=>{const n=companies.filter(c=>c.tipo_empresa===x).length;const pct=companies.length?Math.round(n/companies.length*100):0;return <div className="vt-bar-row" key={x}><span>{x}</span><div><i style={{width:pct+"%"}}/></div><b>{pct}%</b></div>})}</section><section><h3>Verificaciones por país</h3>{countries.slice(0,6).map((c,i)=><div className="vt-country-row" key={c}><span>{countryFlag(c)} {c}</span><b>{companies.filter(x=>x.pais===c).length}</b><em>{companies.length?Math.round(companies.filter(x=>x.pais===c).length/companies.length*100):0}%</em></div>)}</section></div>
   </section>
   <aside className="vt-detail">{actionMsg&&<div className="module-alert">{actionMsg}</div>}{selected?<><div className="vt-detail-head"><div className="vt-detail-logo">◒</div><div><h2>{companyName(selected)}</h2><b>{verificationState(selected,selectedVerification)==="Verificada"?"✓ Empresa verificada":verificationState(selected,selectedVerification)}</b><p>Nivel de confianza: <strong>{score?score+"%":"No calculado"}</strong></p></div><button onClick={()=>{window.location.href="/documentos"}} title="Gestionar documentación">⋯</button></div><nav><Link href="/verificaciones"><b>Resumen</b></Link><Link href="/documentos">Documentación</Link><Link href="/cumplimientos">Cumplimiento</Link><Link href="/historial">Historial</Link></nav><section><div className="vt-detail-title"><h3>Información general</h3><Link href="/configuracion">Editar</Link></div>{[["calendar","CUIT",selected.cuit||"—"],["building","Razón social",selected.razon_social||companyName(selected)],["globe","País",countryFlag(selected.pais)+" "+(selected.pais||"—")],["pin","Dirección",[selected.provincia,selected.ciudad].filter(Boolean).join(", ")||"—"],["globe","Sitio web","—"],["building","Rubro",selected.tipo_empresa||"Producción de granos"],["calendar","Año de constitución","—"],["users","Empleados","—"]].map(x=><div className="vt-info-row" key={x[1]}><Icon name={x[0]} size={16}/><span>{x[1]}</span><b>{x[2]}</b></div>)}</section><section><h3>Verificaciones realizadas</h3>{selectedVerification?<div className="vt-check-row"><Icon name="check" size={15}/><span>{selectedVerification.tipo_consulta||"Verificación registrada"}<small>{selectedVerification.organismo||"Revisión de AgroBrokerIA"}{selectedVerification.observaciones?" · "+selectedVerification.observaciones:""}</small></span><time>{selectedVerification.fecha_verificacion?new Date(selectedVerification.fecha_verificacion).toLocaleDateString("es-AR"):"—"}</time></div>:<div className="vt-empty">No hay verificaciones registradas para esta empresa.</div>}</section><section><div className="vt-detail-title"><h3>Requisitos según actividad</h3><span className="vt-muted">{selectedRequirements.filter(r=>r.verificacion_requisitos_catalogo?.obligatorio&&r.estado==="VERIFICADO").length} de {selectedRequirements.filter(r=>r.verificacion_requisitos_catalogo?.obligatorio).length} requisitos obligatorios cumplidos</span></div>{selectedRequirements.length?selectedRequirements.map(r=>{const meta=r.verificacion_requisitos_catalogo;const label=r.estado==="VERIFICADO"?"Verificado":r.estado==="PRESENTADO"?"Presentado":r.estado==="RECHAZADO"?"Rechazado":r.estado==="NO_APLICA"?"No aplica":"Pendiente";return <div className="vt-check-row" key={r.empresa_id+"-"+meta?.codigo}><Icon name={r.estado==="VERIFICADO"?"check":r.estado==="RECHAZADO"?"close":"clock"} size={15}/><span>{meta?.nombre||meta?.codigo||"Requisito"}<small>Fuente: {meta?.fuente||"Revisión manual"}{meta?.obligatorio?" · Obligatorio":" · Según actividad"}{r.observaciones?" · "+r.observaciones:""}</small></span><b className={"vt-status "+label.toLowerCase().replaceAll(" ","-")}>{label}</b></div>}) : <div className="vt-empty">No hay requisitos asignados para esta empresa. Revisá el tipo de participante y el catálogo de requisitos.</div>}</section>
 <section><div className="vt-detail-title"><h3>Documentos verificados</h3><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><Link href="/verificaciones/documentacion">Subir documentación ARCA</Link><Link href="/documentos">Ver todos</Link></div></div>{selectedVerification?<div className="vt-file-row"><span className="file-color fc-0"><Icon name="file" size={18}/></span><div><b>Registro de verificación</b><small>{selectedVerification.tipo_consulta||"Consulta registrada"}</small></div><time>{selectedVerification.fecha_verificacion?new Date(selectedVerification.fecha_verificacion).toLocaleDateString("es-AR"):"—"}</time><button onClick={downloadVerification}>↓</button></div>:<div className="vt-empty">No hay documentos de verificación registrados.</div>}</section></>:<div className="vt-empty">Seleccioná una empresa para ver su ficha.</div>}</aside>
  </div>{showNew&&<div className="vt-modal"><div><button onClick={()=>setShowNew(false)}>×</button><h2>Nueva verificación</h2><label>Empresa<select value={newCompany} onChange={e=>setNewCompany(e.target.value)}>{companies.map(c=><option key={c.id} value={c.id}>{companyName(c)}</option>)}</select></label><label>Tipo de consulta<select value={newType} onChange={e=>setNewType(e.target.value)}><option>KYC / Identidad</option><option>Datos fiscales</option><option>Matrícula / registro profesional</option><option>Registro sectorial / RUCA</option><option>Habilitación de actividad</option><option>Documentación societaria</option><option>Situación societaria</option><option>Referencias comerciales</option><option>Listas de sanciones</option></select></label><button className="vt-primary" onClick={createVerification}>Crear verificación</button></div></div>}
 </main>;
}
