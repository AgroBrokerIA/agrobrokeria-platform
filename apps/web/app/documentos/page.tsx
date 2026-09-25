"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Documento={id:string;tipo_documento:string|null;nombre_archivo:string|null;url_archivo:string|null;version:number|null;obligatorio:boolean|null;aprobado:boolean|null;observaciones:string|null;creado_en:string|null;operacion_id:string};
type Contrato={id:string;operacion_id:string;numero_contrato:string;estado:string;fecha_firma:string|null;archivo_pdf:string|null};
type DocumentoEmpresa={id:string;tipo_documento:string;nombre_archivo:string|null;url_archivo:string|null;fecha_vencimiento:string|null;verificado:boolean|null;observaciones:string|null;creado_en:string|null};

export default function DocumentosPage(){
 const [docs,setDocs]=useState<Documento[]>([]),[contratos,setContratos]=useState<Contrato[]>([]),[empresaDocs,setEmpresaDocs]=useState<DocumentoEmpresa[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{(async()=>{try{
   const {data:{user}}=await supabase.auth.getUser(); if(!user) throw new Error("Necesitás iniciar sesión.");
   const [{data:d,error:de},{data:c,error:ce}]=await Promise.all([
     supabase.from("documentos_operacion").select("id,tipo_documento,nombre_archivo,url_archivo,version,obligatorio,aprobado,observaciones,creado_en,operacion_id").order("creado_en",{ascending:false}),
     supabase.from("contratos").select("id,operacion_id,numero_contrato,estado,fecha_firma,archivo_pdf").order("creado_en",{ascending:false})
   ]);
   if(de) throw new Error(de.message); if(ce) throw new Error(ce.message);
   setDocs((d||[]) as Documento[]); setContratos((c||[]) as Contrato[]);
   const {data:profile,error:pe}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).single();
   if(pe||!profile?.active_company_id) throw new Error("No se encontró una empresa activa.");
   const {data:ed,error:ee}=await supabase.from("empresas_documentos").select("id,tipo_documento,nombre_archivo,url_archivo,fecha_vencimiento,verificado,observaciones,creado_en").eq("empresa_id",profile.active_company_id).order("creado_en",{ascending:false});
   if(ee) throw new Error(ee.message); setEmpresaDocs((ed||[]) as DocumentoEmpresa[]);
 }catch(e){setError(e instanceof Error?e.message:"No se pudieron cargar los documentos.");}finally{setLoading(false)}})()},[]);
 return <main className="module-page documents-page">
   <div className="module-hero"><div><span className="eyebrow">EXPEDIENTE</span><h1>Documentos</h1><p>Expedientes de empresa, contratos y documentación vinculada a operaciones.</p></div><div className="module-pill">{docs.length+contratos.length+empresaDocs.length} registros</div></div>
   {error&&<div className="module-alert module-alert-error">{error}</div>}
   {loading?<div className="loading-card">Cargando expediente...</div>:<>
     <section className="document-summary"><div><strong>{empresaDocs.length}</strong><span>Empresa</span></div><div><strong>{docs.length}</strong><span>Operaciones</span></div><div><strong>{contratos.length}</strong><span>Contratos</span></div></section>
     <section className="document-section"><div className="document-section-head"><div><span className="eyebrow">EMPRESA</span><h2>Documentación societaria y fiscal</h2></div></div>
       {empresaDocs.length===0?<div className="module-empty compact"><p>No hay documentación de empresa cargada.</p></div>:<div className="document-grid">{empresaDocs.map(d=><article className="document-card" key={d.id}><div className="document-icon">▤</div><div><strong>{d.tipo_documento}</strong><p>{d.nombre_archivo||"Documento sin nombre"}</p><small>{d.fecha_vencimiento?"Vence "+new Date(d.fecha_vencimiento).toLocaleDateString("es-AR"):"Sin vencimiento"}</small></div><span className={d.verificado?"document-status ok":"document-status"}>{d.verificado?"Verificado":"Pendiente"}</span>{d.url_archivo&&<a href={d.url_archivo} target="_blank" rel="noreferrer">Abrir</a>}</article>)}</div>}
     </section>
     <section className="document-section"><div className="document-section-head"><div><span className="eyebrow">OPERACIONES</span><h2>Documentos y contratos</h2></div></div>
       {contratos.length===0&&docs.length===0?<div className="module-empty compact"><p>No hay documentos operativos todavía.</p></div>:<div className="document-grid">
        {contratos.map(c=><article className="document-card" key={c.id}><div className="document-icon">C</div><div><strong>Contrato {c.numero_contrato}</strong><p>Operación · {c.operacion_id.slice(0,8)}</p><small>{c.estado}{c.fecha_firma?" · firmado "+new Date(c.fecha_firma).toLocaleDateString("es-AR"):""}</small></div><span className={c.estado==="CONFIRMADO"?"document-status ok":"document-status"}>{c.estado}</span>{c.archivo_pdf&&<a href={c.archivo_pdf} target="_blank" rel="noreferrer">PDF</a>}</article>)}
        {docs.map(d=><article className="document-card" key={d.id}><div className="document-icon">D</div><div><strong>{d.tipo_documento||"Documento"}</strong><p>{d.nombre_archivo||"Sin nombre"} · OP {d.operacion_id.slice(0,8)}</p><small>Versión {d.version||1} · {d.aprobado?"Aprobado":d.obligatorio?"Obligatorio":"Pendiente"}</small></div><span className={d.aprobado?"document-status ok":"document-status"}>{d.aprobado?"Aprobado":d.obligatorio?"Obligatorio":"Pendiente"}</span>{d.url_archivo&&<a href={d.url_archivo} target="_blank" rel="noreferrer">Abrir</a>}</article>)}
       </div>}
     </section>
   </>}
   <div className="document-footer"><Link href="/operaciones">Ir a operaciones →</Link><Link href="/empresas">Ver empresas →</Link></div>
 </main>;
}
