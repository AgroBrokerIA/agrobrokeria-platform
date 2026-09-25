"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import jsPDF from "jspdf";

type Documento={id:string;tipo_documento:string|null;nombre_archivo:string|null;url_archivo:string|null;version:number|null;obligatorio:boolean|null;aprobado:boolean|null;observaciones:string|null;creado_en:string|null;operacion_id:string};
type Contrato={id:string;operacion_id:string;numero_contrato:string;estado:string;fecha_firma:string|null;archivo_pdf:string|null};
type DocumentoEmpresa={id:string;tipo_documento:string;nombre_archivo:string|null;url_archivo:string|null;fecha_vencimiento:string|null;verificado:boolean|null;observaciones:string|null;creado_en:string|null};
type Operacion={id:string;codigo:string;tipo_operacion:string|null;cantidad_tn:number;precio_tn:number;importe_total:number;fecha_operacion:string};
type Comercial={id:string;operacion_id:string;empresa_emisora:string|null;empresa_receptora?:string|null;fecha_emision:string|null;estado:string|null;archivo_pdf:string|null;creado_en:string|null};

export default function DocumentosPage(){
 const [docs,setDocs]=useState<Documento[]>([]);
 const [contratos,setContratos]=useState<Contrato[]>([]);
 const [empresaDocs,setEmpresaDocs]=useState<DocumentoEmpresa[]>([]);
 const [operaciones,setOperaciones]=useState<Operacion[]>([]);
 const [lois,setLois]=useState<Comercial[]>([]);
 const [scos,setScos]=useState<Comercial[]>([]);
 const [fcos,setFcos]=useState<Comercial[]>([]);
 const [operacionSeleccionada,setOperacionSeleccionada]=useState("");
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[generando,setGenerando]=useState<"LOI"|"SCO"|"FCO"|null>(null),[mensaje,setMensaje]=useState("");

 useEffect(()=>{(async()=>{
   try{
     const {data:{user}}=await supabase.auth.getUser();
     if(!user) throw new Error("Necesitás iniciar sesión.");
     const [{data:d,error:de},{data:c,error:ce},{data:o,error:oe},{data:l,error:le},{data:s,error:se},{data:f,error:fe}]=await Promise.all([
       supabase.from("documentos_operacion").select("id,tipo_documento,nombre_archivo,url_archivo,version,obligatorio,aprobado,observaciones,creado_en,operacion_id").order("creado_en",{ascending:false}),
       supabase.from("contratos").select("id,operacion_id,numero_contrato,estado,fecha_firma,archivo_pdf").order("creado_en",{ascending:false}),
       supabase.from("operaciones").select("id,codigo,tipo_operacion,cantidad_tn,precio_tn,importe_total,fecha_operacion").order("fecha_operacion",{ascending:false}),
       supabase.from("loi").select("id,operacion_id,empresa_emisora,empresa_receptora,fecha_emision,estado,archivo_pdf,creado_en").order("creado_en",{ascending:false}),
       supabase.from("sco").select("id,operacion_id,empresa_emisora,fecha_emision,estado,archivo_pdf,creado_en").order("creado_en",{ascending:false}),
       supabase.from("fco").select("id,operacion_id,empresa_emisora,empresa_receptora,fecha_emision,estado,archivo_pdf,creado_en").order("creado_en",{ascending:false})
     ]);
     if(de) throw new Error(de.message); if(ce) throw new Error(ce.message); if(oe) throw new Error(oe.message); if(le) throw new Error(le.message); if(se) throw new Error(se.message); if(fe) throw new Error(fe.message);
     setDocs((d||[]) as Documento[]); setContratos((c||[]) as Contrato[]); setOperaciones((o||[]) as Operacion[]); setLois((l||[]) as Comercial[]); setScos((s||[]) as Comercial[]); setFcos((f||[]) as Comercial[]);
     const {data:profile,error:pe}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).single();
     if(pe||!profile?.active_company_id) throw new Error("No se encontró una empresa activa.");
     const {data:ed,error:ee}=await supabase.from("empresas_documentos").select("id,tipo_documento,nombre_archivo,url_archivo,fecha_vencimiento,verificado,observaciones,creado_en").eq("empresa_id",profile.active_company_id).order("creado_en",{ascending:false});
     if(ee) throw new Error(ee.message); setEmpresaDocs((ed||[]) as DocumentoEmpresa[]);
   }catch(e){setError(e instanceof Error?e.message:"No se pudieron cargar los documentos.");}
   finally{setLoading(false)}
 })()},[]);

 async function generarComercial(tipo:"LOI"|"SCO"|"FCO"){
   const op=operaciones.find(x=>x.id===operacionSeleccionada);
   if(!op||generando) return;
   setGenerando(tipo); setMensaje(""); setError("");
   try{
     const pdf=new jsPDF();
     const fecha=new Date().toLocaleDateString("es-AR");
     pdf.setFontSize(18); pdf.text(tipo==="LOI"?"LETTER OF INTENT":tipo==="SCO"?"SOFT CORPORATE OFFER":"FIRM CORPORATE OFFER",20,24);
     pdf.setFontSize(9); pdf.text("AGROBROKER IA · DOCUMENTO COMERCIAL",20,31);
     pdf.setFontSize(11); pdf.text("Código de operación: "+op.codigo,20,48);
     pdf.text("Fecha: "+fecha,20,56);
     pdf.text("Tipo de operación: "+(op.tipo_operacion||"No especificado"),20,64);
     pdf.text("Cantidad: "+Number(op.cantidad_tn).toLocaleString("es-AR")+" TN",20,72);
     pdf.text("Precio de referencia: USD "+Number(op.precio_tn).toLocaleString("es-AR")+" / TN",20,80);
     pdf.text("Importe de referencia: USD "+Number(op.importe_total).toLocaleString("es-AR"),20,88);
     pdf.setFontSize(10);
     const body=tipo==="LOI"
       ?"Las partes manifiestan su intención comercial de avanzar en la negociación de la operación identificada, sujeta a verificación de documentación, condiciones comerciales, disponibilidad de mercadería y posterior formalización contractual."
       :tipo==="SCO"
       ?"Se presenta una oferta comercial indicativa sobre la operación identificada, sujeta a disponibilidad, validación de contraparte, condiciones de entrega, calidad, pago y aceptación expresa."
       :"Se presenta una oferta corporativa firme sobre la operación identificada, sujeta a los términos comerciales detallados y a la aceptación expresa de la contraparte dentro del plazo indicado.";
     pdf.text(pdf.splitTextToSize(body,170),20,105);
     pdf.text(pdf.splitTextToSize("Este documento es informativo/no vinculante salvo pacto expreso por escrito. El contrato definitivo y la documentación firmada prevalecen sobre esta pieza comercial.",170),20,132);
     const dataUri=pdf.output("datauristring");
     const {data,error}=await supabase.rpc(tipo==="LOI"?"crear_loi_comercial":tipo==="SCO"?"crear_sco_comercial":"crear_fco_comercial",{p_operacion_id:op.id,p_archivo_pdf:dataUri});
     if(error) throw new Error(error.message);
     if(!data) throw new Error("No se pudo registrar el documento.");
     pdf.save(tipo+"-"+op.codigo+".pdf");
     setMensaje(tipo+" generado y registrado en el expediente.");
     const {data:l}=await supabase.from("loi").select("id,operacion_id,empresa_emisora,empresa_receptora,fecha_emision,estado,archivo_pdf,creado_en").order("creado_en",{ascending:false});
     const {data:s}=await supabase.from("sco").select("id,operacion_id,empresa_emisora,fecha_emision,estado,archivo_pdf,creado_en").order("creado_en",{ascending:false});
     const {data:f}=await supabase.from("fco").select("id,operacion_id,empresa_emisora,empresa_receptora,fecha_emision,estado,archivo_pdf,creado_en").order("creado_en",{ascending:false});
     setLois((l||[]) as Comercial[]); setScos((s||[]) as Comercial[]); setFcos((f||[]) as Comercial[]);
   }catch(e){setError(e instanceof Error?e.message:"No se pudo generar el documento.");}
   finally{setGenerando(null)}
 }

 async function solicitarFirma(contratoId:string){
   if(!firmanteNombre.trim()||!firmanteEmail.trim()){setError("Completá nombre y email del firmante.");return}
   setFirmaLoading(true);setError("");setMensaje("");
   try{
    const {data,error}=await supabase.rpc("crear_solicitud_firma_contrato",{p_contrato_id:contratoId,p_firmante_email:firmanteEmail.trim(),p_firmante_nombre:firmanteNombre.trim(),p_firmante_rol:firmanteRol.trim()});
    if(error) throw new Error(error.message);
    const link=window.location.origin+"/firmar/"+encodeURIComponent(data.token);
    setFirmaContrato(link); setMensaje("Solicitud de firma creada. Copiá el enlace y enviáselo al firmante.");
   }catch(e){setError(e instanceof Error?e.message:"No se pudo crear la solicitud de firma")}finally{setFirmaLoading(false)}
 }
 function nombreOperacion(id:string){return operaciones.find(o=>o.id===id)?.codigo||id.slice(0,8)}

 return <main className="module-page documents-page">
   <div className="module-hero"><div><span className="eyebrow">EXPEDIENTE</span><h1>Documentos</h1><p>Expedientes de empresa, contratos y documentación vinculada a operaciones.</p></div><div className="module-pill">{docs.length+contratos.length+empresaDocs.length+lois.length+scos.length+fcos.length} registros</div></div>
   {error&&<div className="module-alert module-alert-error">{error}</div>}
   {mensaje&&<div className="module-alert">{mensaje}</div>}
   {loading?<div className="loading-card">Cargando expediente...</div>:<>
     <section className="document-summary"><div><strong>{empresaDocs.length}</strong><span>Empresa</span></div><div><strong>{docs.length+lois.length+scos.length}</strong><span>Operaciones</span></div><div><strong>{contratos.length}</strong><span>Contratos</span></div></section>

     <section className="document-section"><div className="document-section-head"><div><span className="eyebrow">FIRMA ELECTRÓNICA</span><h2>Solicitar firma de contrato</h2><p>Generá un enlace único de 72 horas. La plataforma registra consentimiento, hash SHA-256, fecha, IP, navegador y evidencia de firma.</p></div></div>
<div style={{display:"grid",gap:10,maxWidth:700}}>
<select value={operacionSeleccionada} onChange={e=>setOperacionSeleccionada(e.target.value)}><option value="">Seleccioná la operación</option>{contratos.filter(c=>c.estado==="CONFIRMADO").map(c=><option key={c.id} value={c.id}>{c.numero_contrato||"Contrato"} · OP {c.operacion_id.slice(0,8)}</option>)}</select>
<input placeholder="Nombre completo del firmante" value={firmanteNombre} onChange={e=>setFirmanteNombre(e.target.value)}/>
<input type="email" placeholder="Email del firmante" value={firmanteEmail} onChange={e=>setFirmanteEmail(e.target.value)}/>
<select value={firmanteRol} onChange={e=>setFirmanteRol(e.target.value)}><option>PARTE</option><option>VENDEDOR</option><option>COMPRADOR</option><option>INTERMEDIARIO</option></select>
<button type="button" disabled={!operacionSeleccionada||firmaLoading} onClick={()=>solicitarFirma(contratos.find(c=>c.operacion_id===operacionSeleccionada)?.id||"")}>{firmaLoading?"Creando…":"Crear solicitud de firma"}</button>
{firmaContrato&&<div style={{padding:12,background:"#f1f5f9",borderRadius:8,wordBreak:"break-all"}}><b>Enlace de firma:</b><br/>{firmaContrato}<br/><button type="button" onClick={()=>navigator.clipboard?.writeText(firmaContrato)}>Copiar enlace</button></div>}
</div></section>
     <section className="document-section commercial-document-tools"><div className="document-section-head"><div><span className="eyebrow">DOCUMENTACIÓN COMERCIAL</span><h2>LOI / SCO</h2><p>Generá una carta de intención o una oferta comercial estándar a partir de una operación. Cada emisión queda registrada en el expediente.</p></div></div>
       <div className="commercial-document-form"><select value={operacionSeleccionada} onChange={e=>setOperacionSeleccionada(e.target.value)}><option value="">Seleccioná una operación</option>{operaciones.map(o=><option key={o.id} value={o.id}>{o.codigo} · {Number(o.cantidad_tn).toLocaleString("es-AR")} TN · {o.tipo_operacion||"Operación"}</option>)}</select>
       <button type="button" disabled={!operacionSeleccionada||!!generando} onClick={()=>generarComercial("LOI")}>{generando==="LOI"?"Generando…":"Generar LOI"}</button><button type="button" disabled={!operacionSeleccionada||!!generando} onClick={()=>generarComercial("SCO")}>{generando==="SCO"?"Generando…":"Generar SCO"}</button><button type="button" disabled={!operacionSeleccionada||!!generando} onClick={()=>generarComercial("FCO")}>{generando==="FCO"?"Generando…":"Generar FCO"}</button></div>
     </section>

     <section className="document-section"><div className="document-section-head"><div><span className="eyebrow">EMISIONES COMERCIALES</span><h2>Historial LOI / SCO / FCO</h2></div></div>
       {lois.length===0&&scos.length===0&&fcos.length===0?<div className="module-empty compact"><p>Todavía no hay LOI, SCO o FCO emitidos.</p></div>:<div className="document-grid">
        {lois.map(d=><article className="document-card" key={"loi-"+d.id}><div className="document-icon">L</div><div><strong>LOI</strong><p>{nombreOperacion(d.operacion_id)}</p><small>{d.fecha_emision?new Date(d.fecha_emision).toLocaleDateString("es-AR"):"Sin fecha"} · {d.estado||"BORRADOR"}</small></div><span className="document-status ok">Registrado</span>{d.archivo_pdf&&<a href={d.archivo_pdf} target="_blank" rel="noreferrer">PDF</a>}</article>)}
        {scos.map(d=><article className="document-card" key={"sco-"+d.id}><div className="document-icon">S</div><div><strong>SCO</strong><p>{nombreOperacion(d.operacion_id)}</p><small>{d.fecha_emision?new Date(d.fecha_emision).toLocaleDateString("es-AR"):"Sin fecha"} · {d.estado||"BORRADOR"}</small></div><span className="document-status ok">Registrado</span>{d.archivo_pdf&&<a href={d.archivo_pdf} target="_blank" rel="noreferrer">PDF</a>}</article>)}
        {fcos.map(d=><article className="document-card" key={"fco-"+d.id}><div className="document-icon">F</div><div><strong>FCO</strong><p>{nombreOperacion(d.operacion_id)}</p><small>{d.fecha_emision?new Date(d.fecha_emision).toLocaleDateString("es-AR"):"Sin fecha"} · {d.estado||"BORRADOR"}</small></div><span className="document-status ok">Registrado</span>{d.archivo_pdf&&<a href={d.archivo_pdf} target="_blank" rel="noreferrer">PDF</a>}</article>)}
       </div>}
     </section>

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
