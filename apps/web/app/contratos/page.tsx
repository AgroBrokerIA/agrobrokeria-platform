"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase/client";
import "./reference.css";

type C={id:string;operacion_id:string;numero_contrato:string;tipo_contrato:string|null;estado:string;fecha_firma:string|null;cantidad_tn:number|null;precio_tn:number|null;importe_total:number|null;contenido:string|null;creado_en?:string};
type V={id:string;contrato_id:string;version:number;estado:string;motivo:string|null;documento_hash:string|null;creado_en:string};

const IDIOMAS=[["es","Español"],["en","English"],["pt","Português"],["it","Italiano"],["fr","Français"],["de","Deutsch"]];

type FormState={operacionId:string;tipo:"F1"|"F2";producto:string;cantidad:string;precio:string;moneda:string;condicion:string;puerto:string;entrega:string;pago:string;observaciones:string;vendedor:string;comprador:string};
type Operation={id:string;codigo:string;cantidad_tn:number;precio_tn:number;importe_total:number;estado:string;moneda:string|null};

const initial:FormState={operacionId:"",tipo:"F1",producto:"",cantidad:"",precio:"",moneda:"",condicion:"FAS",puerto:"",entrega:"",pago:"",observaciones:"",vendedor:"",comprador:""};

function esc(v:string){return v.replace(/[<>]/g,"");}
function money(v:string){const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2}):"0,00"}

function buildPdf(f:FormState){
 const pdf=new jsPDF({orientation:"portrait",unit:"pt",format:"legal"});
 const W=pdf.internal.pageSize.getWidth(); const H=pdf.internal.pageSize.getHeight(); const margin=54; let y=54;
 const green=[0,150,95] as const; const dark=[12,25,42] as const;
 const line=(title:string,text:string)=>{ if(y>H-95){pdf.addPage();y=54} pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.setTextColor(...dark);pdf.text(title,margin,y);y+=14;pdf.setFont("helvetica","normal");pdf.setFontSize(10);const lines=pdf.splitTextToSize(text,W-margin*2);pdf.text(lines,margin,y);y+=lines.length*13+11; };
 pdf.setFillColor(...green);pdf.rect(0,0,W,12,"F");
 pdf.setFont("helvetica","bold");pdf.setFontSize(19);pdf.setTextColor(...dark);pdf.text("AgroBroker",margin,55);pdf.setTextColor(0,190,120);pdf.text("IA",margin+90,55);
 pdf.setFont("helvetica","bold");pdf.setTextColor(...dark);pdf.setFontSize(15);pdf.text(f.tipo==="F1"?"CONTRATO DE COMPRAVENTA DE GRANOS – F1 (BLANCO)":"CONTRATO PRIVADO DE COMPRAVENTA DE GRANOS – F2",W/2,95,{align:"center"});
 pdf.setFont("helvetica","normal");pdf.setFontSize(9);pdf.text("Documento generado por AgroBrokerIA",W-margin,55,{align:"right"});
 y=130;
 line("1. OBJETO",`Las partes acuerdan la compraventa de ${esc(f.producto)} conforme a las condiciones comerciales indicadas en este contrato.`);
 line("2. CANTIDAD",`${money(f.cantidad)} toneladas métricas.`);
 line("3. CALIDAD",esc(f.observaciones||"No especificada en los datos registrados de la operación."));
 line("4. PRECIO",f.precio&&f.moneda?`${esc(f.moneda)} ${money(f.precio)} por tonelada métrica.`:"No especificado en los datos registrados de la operación.");
 line("5. CONDICIÓN DE PRECIO",esc(f.condicion));
 line("6. LUGAR DE ENTREGA",f.puerto?esc(f.puerto):"No especificado en los datos registrados de la operación.");
 line("7. PLAZO DE ENTREGA",esc(f.entrega));
 line("8. FORMA DE PAGO",f.pago?esc(f.pago):"No especificada en los datos registrados de la operación.");
 line("9. DOCUMENTACIÓN","No especificada en los datos registrados de la operación.");
 line("10. OBSERVACIONES",esc(f.observaciones||"Sin observaciones registradas."));

 line("12. PARTES",`VENDEDOR: ${esc(f.vendedor||"________________________________")}\nCOMPRADOR: ${esc(f.comprador||"________________________________")}`);
 y=Math.min(y,H-75);pdf.setFontSize(8);pdf.setTextColor(80,95,110);pdf.text("Generado digitalmente por AgroBrokerIA · La validez jurídica depende de la información, firmas y requisitos aplicables a la operación.",margin,H-42);
 return pdf;
}

export default function ContratosPage(){
 const [rows,setRows]=useState<C[]>([]),[versions,setVersions]=useState<V[]>([]),[productos,setProductos]=useState<string[]>([]),[puertos,setPuertos]=useState<string[]>([]),[operaciones,setOperaciones]=useState<Operation[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState(""),[adobeBusy,setAdobeBusy]=useState(false),[adobeStatus,setAdobeStatus]=useState("");
 const [tab,setTab]=useState("tipos"),[idioma,setIdioma]=useState("es"),[busy,setBusy]=useState(false);
 const [form,setForm]=useState<FormState>(initial);
 const [selected,setSelected]=useState<C|null>(null);

 async function load(){
   setLoading(true);setError("");
   const [c,v,p,port,op]=await Promise.all([
     supabase.from("contratos").select("id,operacion_id,numero_contrato,tipo_contrato,estado,fecha_firma,cantidad_tn,precio_tn,importe_total,contenido,creado_en").order("creado_en",{ascending:false}),
     supabase.from("contrato_versiones").select("id,contrato_id,version,estado,motivo,documento_hash,creado_en").order("creado_en",{ascending:false}),
     supabase.from("productos").select("nombre").eq("activo",true).order("nombre"),
     supabase.from("catalogo_puertos").select("nombre").eq("activo",true).order("orden"),
     supabase.from("operaciones").select("id,codigo,cantidad_tn,precio_tn,importe_total,estado,monedas(codigo)").order("fecha_operacion",{ascending:false})
   ]);
   if(c.error)setError(c.error.message); if(v.error)setError(v.error.message);
   setRows((c.data||[]) as C[]);setVersions((v.data||[]) as V[]);
   if(!p.error&&p.data?.length)setProductos(p.data.map((x:any)=>x.nombre));
   if(!port.error&&port.data?.length)setPuertos(port.data.map((x:any)=>x.nombre));
   setOperaciones((op.data||[]).map((x:any)=>({...x,moneda:x.monedas?.codigo||null})) as Operation[]);
   setLoading(false);
 }
 useEffect(()=>{void load(); const status=new URLSearchParams(window.location.search).get("firma"); if(status){setAdobeStatus(status); setMessage(status==="connected"?"Adobe Acrobat Sign conectado correctamente.":status==="denied"?"Autorización de Adobe Sign cancelada.":status==="token_exchange_failed"?"Adobe Sign no pudo completar el intercambio OAuth.":status==="expired_state"?"La autorización de Adobe Sign expiró.":"No se pudo completar la conexión con Adobe Sign.");}},[]);
 async function conectarAdobe(){
   setAdobeBusy(true);setError("");setMessage("");
   try{
     const {data:{session}}=await supabase.auth.getSession();
     if(!session?.access_token) throw new Error("Necesitás iniciar sesión.");
     const res=await fetch("/api/firma/adobe/authorize",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"});
     const data=await res.json().catch(()=>({}));
     if(!res.ok||typeof data.authorization_url!=="string") throw new Error(data.error||"No se pudo iniciar OAuth de Adobe Sign.");
     window.location.href=data.authorization_url;
   }catch(e){setError(e instanceof Error?e.message:"No se pudo conectar Adobe Sign.");setAdobeBusy(false)}
 }

 async function enviarAFirma(contratoId:string){
   setAdobeBusy(true);setError("");setMessage("");
   try{
     const {data:{session}}=await supabase.auth.getSession();
     if(!session?.access_token) throw new Error("Necesitás iniciar sesión.");
     const {data,error}=await supabase.functions.invoke("firma-proveedor",{
       body:{contract_id:contratoId},
       headers:{Authorization:"Bearer "+session.access_token}
     });
     if(error) throw new Error(error.message||"No se pudo enviar el contrato a firma.");
     if(!data?.ok) throw new Error(data?.error||"Adobe Acrobat Sign no pudo crear la solicitud de firma.");
     setMessage("Contrato enviado a Adobe Acrobat Sign. ID de acuerdo: "+String(data.agreement_id||"generado")+" · Estado: "+String(data.status||"OUT_FOR_SIGNATURE"));
     await load();
   }catch(e){
     const msg=e instanceof Error?e.message:"No se pudo enviar el contrato a firma.";
     setError(msg==="NO_VALID_SIGNERS"?"El contrato todavía no tiene firmantes válidos con email cargados.":msg==="ADOBE_SIGN_NOT_CONNECTED"?"Primero conectá Adobe Acrobat Sign.":msg);
   }finally{setAdobeBusy(false)}
 }

 function selectOperation(id:string){
   const op=operaciones.find(x=>x.id===id);
   if(!op){ setForm(x=>({...x,operacionId:""})); return; }
   setForm(x=>({...x,operacionId:id,cantidad:String(op.cantidad_tn ?? ""),precio:String(op.precio_tn ?? ""),moneda:op.moneda||""}));
 }
 async function saveDraft(){
   if(!form.operacionId){setMessage("Seleccioná una operación.");return;}
   setBusy(true);setError("");setMessage("");
   const op=operaciones.find(x=>x.id===form.operacionId);
   if(!op){setError("La operación seleccionada ya no está disponible.");setBusy(false);return;}
   const cantidad=Number(form.cantidad)||0,precio=Number(form.precio)||0;
   const numeroContrato=selected?.numero_contrato||`ABIA-${op.codigo}-BORRADOR`;
   const payload={numero_contrato:numeroContrato,tipo_contrato:form.tipo,cantidad_tn:cantidad,precio_tn:precio,importe_total:cantidad*precio,moneda:form.moneda||null,condicion_entrega:form.condicion,lugar_carga:"",destino:form.puerto,forma_pago:form.pago,plazo_pago:"",flete:"",calidad:form.observaciones,observaciones:form.observaciones,vendedor:form.vendedor,comprador:form.comprador,contenido:contractContent(form)};
   const {error}=await supabase.rpc("guardar_contrato_comercial",{p_operacion_id:form.operacionId,p_datos:payload});
   if(error)setError(error.message);else{setMessage("Borrador guardado en la operación.");await load();}
   setBusy(false);
 }
 function contractContent(f:FormState){
   return JSON.stringify({tipo:f.tipo,producto:f.producto,cantidad_tn:Number(f.cantidad)||0,precio_tn:Number(f.precio)||0,moneda:f.moneda||null,condicion:f.condicion,puerto:f.puerto,entrega:f.entrega,pago:f.pago,observaciones:f.observaciones,vendedor:f.vendedor,comprador:f.comprador});
 }

 const update=(key:keyof FormState,value:string)=>setForm(x=>({...x,[key]:value}));
 const current=selected;

 function download(tipo:"F1"|"F2"){if(!form.operacionId||!form.producto||!form.moneda){setMessage("Seleccioná una operación, producto y moneda antes de generar el PDF.");return;}setForm(x=>({...x,tipo}));setTimeout(()=>buildPdf({...form,tipo}).save(`AgroBrokerIA-Contrato-${tipo}.pdf`),0);setMessage(`PDF ${tipo} generado en formato Legal.`)}
 function preview(tipo:"F1"|"F2"){setForm(x=>({...x,tipo}));setMessage(`Vista previa ${tipo} seleccionada.`)}
 function printPdf(){const pdf=buildPdf(form);const url=pdf.output("bloburl");window.open(url.toString(),"_blank","noopener,noreferrer")}
 function emailPdf(){const subject=encodeURIComponent(`Contrato ${form.tipo} AgroBrokerIA`);window.location.href=`mailto:?subject=${subject}&body=${encodeURIComponent("Adjuntá el PDF generado por AgroBrokerIA.")}`}
 function sharePdf(){if(navigator.share){void navigator.share({title:`Contrato ${form.tipo} AgroBrokerIA`,text:"Contrato generado por AgroBrokerIA"})}else{download(form.tipo)}}
 
 return <main className="contract-builder-reference">
  <header className="contract-builder-head"><div><h1>Contratos</h1><p>Generá, personalizá y descargá documentos PDF a partir de los datos registrados de la operación.</p></div><div className="contract-builder-actions"><button onClick={()=>setTab("plantillas")}>▣ Plantillas</button><button onClick={()=>setTab("firmas")}>⌁ Firmas</button><button className="contract-new" onClick={()=>{setTab("tipos");setSelected(null);setForm(initial);setMessage("Nuevo contrato listo para completar.")}}>＋ Nuevo contrato</button></div></header>
  {error&&<div className="contract-builder-alert error">{error}</div>}{message&&<div className="contract-builder-alert">{message}</div>}

  <nav className="contract-builder-tabs">{[["tipos","Tipos de contratos"],["mis","Mis contratos"],["plantillas","Plantillas"],["clausulas","Cláusulas"],["firmas","Firmas"],["historial","Historial"]].map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}</button>)}</nav>

  {tab==="tipos"?<section className="contract-builder-grid">
    <div className="contract-builder-form">
      <h2>Seleccionar tipo de contrato</h2>
      <div className="contract-type-picks">
        <button className={form.tipo==="F1"?"selected f1":""} onClick={()=>preview("F1")}><b>▤</b><span><strong>F1</strong><small>Contrato Blanco (Formal)</small></span><i>✓</i></button>
        <button className={form.tipo==="F2"?"selected f2":""} onClick={()=>preview("F2")}><b>▤</b><span><strong>F2</strong><small>Contrato Privado (No registrable)</small></span><i>✓</i></button>
      </div>
      <h2>Seleccionar commodity</h2>
      <div className="contract-commodity-picks">{productos.slice(0,4).map((p,i)=><button type="button" key={p} className={form.producto===p?"selected":""} onClick={()=>update("producto",p)}><b>{["🫘","🌽","🌾","🌻"][i]}</b><span>{p}</span></button>)}<button type="button" className="more-commodity" onClick={()=>document.getElementById("commodity-select")?.focus()}><b>•••</b><span>Otros</span></button></div>
      <div className="contract-builder-section-title"><h2>Datos del contrato</h2><span>{form.tipo==="F1"?"F1 · Blanco (Formal)":"F2 · Privado"}</span></div>
      <div className="contract-builder-fields">
       <label>Operación<select value={form.operacionId} onChange={e=>selectOperation(e.target.value)}><option value="">Seleccionar operación</option>{operaciones.map(o=><option key={o.id} value={o.id}>{o.codigo} · {Number(o.cantidad_tn).toLocaleString("es-AR")} TN · {o.estado}</option>)}</select></label>
       <label>Tipo de contrato<select value={form.tipo} onChange={e=>update("tipo",e.target.value as "F1"|"F2")}><option value="F1">F1 - Blanco (Formal)</option><option value="F2">F2 - Privado</option></select></label>
       <label>Commodity<select id="commodity-select" value={form.producto} onChange={e=>update("producto",e.target.value)}>{productos.map(p=><option key={p}>{p}</option>)}</select></label>
       <label>Cantidad (TN)<input value={form.cantidad} onChange={e=>update("cantidad",e.target.value)} inputMode="decimal"/></label>
       <label>Precio / TN<input value={form.precio} onChange={e=>update("precio",e.target.value)} inputMode="decimal"/></label>
       <label>Condición de precio<select value={form.condicion} onChange={e=>update("condicion",e.target.value)}>{["FAS","FOB","CIF","Precio pizarra","FCA"].map(x=><option key={x}>{x}</option>)}</select></label>
       <label>Puerto de entrega<select value={form.puerto} onChange={e=>update("puerto",e.target.value)}><option value="">Seleccionar puerto</option>{puertos.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Fecha de entrega<input value={form.entrega} onChange={e=>update("entrega",e.target.value)}/></label>
       <label>Forma de pago<input value={form.pago} onChange={e=>update("pago",e.target.value)} placeholder="Completar según la operación"/></label>
       <label>Vendedor<input value={form.vendedor} onChange={e=>update("vendedor",e.target.value)} placeholder="Razón social"/></label>
       <label>Comprador<input value={form.comprador} onChange={e=>update("comprador",e.target.value)} placeholder="Razón social"/></label>
      </div>
      <label className="contract-builder-observation">Observaciones (opcional)<textarea value={form.observaciones} onChange={e=>update("observaciones",e.target.value)} /></label>
      <button className="contract-generate" onClick={()=>download(form.tipo)}>Generar contrato PDF&nbsp; →</button>
      <button className="contract-generate" disabled={busy||!form.operacionId} onClick={saveDraft}>{busy?"Guardando…":"Guardar borrador en la operación →"}</button>
      <div className="contract-output-actions"><button onClick={()=>download(form.tipo)}>▣ Descargar PDF</button><button onClick={printPdf}>▣ Imprimir</button><button onClick={emailPdf}>✉ Enviar por email</button><button onClick={sharePdf}>⌁ Compartir</button></div>
    </div>
    <div className="contract-previews">
      <PreviewCard type="F1" form={form} onDownload={download} active={form.tipo==="F1"}/>
      <PreviewCard type="F2" form={form} onDownload={download} active={form.tipo==="F2"}/>
    </div>
  </section>:null}

  {tab==="mis"&&<section className="contract-list-panel"><h2>Mis contratos</h2>{loading?<p>Cargando contratos…</p>:rows.length===0?<p>No hay contratos registrados todavía.</p>:rows.map(c=><button key={c.id} onClick={()=>{setSelected(c);setTab("tipos");setForm(x=>({...x,precio:String(c.precio_tn||x.precio),cantidad:String(c.cantidad_tn||x.cantidad),tipo:String(c.tipo_contrato||"").toUpperCase().includes("F1")?"F1":"F2"}));setMessage("Contrato seleccionado.")}}><strong>{c.numero_contrato}</strong><span>{c.tipo_contrato||"Contrato"} · {c.estado}</span><small>{c.fecha_firma?new Date(c.fecha_firma).toLocaleDateString("es-AR"):"Sin firma"}</small></button>)}</section>}

  {tab==="plantillas"&&<section className="contract-info-panel"><h2>Plantillas</h2><div className="contract-template-grid"><button type="button" onClick={()=>{setForm(x=>({...x,tipo:"F1",condicion:"FAS"}));setMessage("Plantilla F1 cargada.")}}><b>F1 · Blanco</b><span>Modelo formal para operaciones registrables.</span></button><button type="button" onClick={()=>{setForm(x=>({...x,tipo:"F2",condicion:"FOB"}));setMessage("Plantilla F2 cargada.")}}><b>F2 · Privado</b><span>Modelo privado entre comprador y vendedor.</span></button></div></section>}

  {tab==="clausulas"&&<section className="contract-info-panel"><h2>Cláusulas estándar</h2>{["Objeto y alcance","Cantidad y calidad","Precio y condición","Lugar y plazo de entrega","Forma de pago","Documentación","Confidencialidad","Legislación aplicable","Solución de controversias"].map((x,i)=><button className="contract-clause-button" type="button" key={x} onClick={()=>{const line=(i+1)+". "+x;setForm(f=>({...f,observaciones:f.observaciones?(f.observaciones+"\n"+line):line}));setMessage("Cláusula incorporada: "+x+".")}}><b>{i+1}. {x}</b><span>Agregar al contrato</span></button>)}</section>}

  {tab==="firmas"&&<section className="contract-info-panel"><h2>Firmas electrónicas</h2><p>Desde acá seleccionás un contrato, conectás Adobe Acrobat Sign y enviás el documento real a firma. El estado queda registrado en AgroBrokerIA.</p>{adobeStatus==="connected"&&<div className="contract-builder-alert">✓ Adobe Acrobat Sign está conectado.</div>}<button className="contract-route-button" disabled={adobeBusy} onClick={conectarAdobe}>{adobeBusy?"Conectando…":"Conectar Adobe Acrobat Sign →"}</button><div className="contract-sign-list">{loading?<p>Cargando contratos…</p>:rows.length===0?<p>No hay contratos registrados para firmar.</p>:rows.map(c=><article className={"contract-sign-card "+(selected?.id===c.id?"selected":"")} key={c.id}><div><strong>{c.numero_contrato}</strong><span>{c.tipo_contrato||"Contrato"} · {c.estado}</span><small>{c.cantidad_tn?Number(c.cantidad_tn).toLocaleString("es-AR")+" TN":"Cantidad no indicada"} · {c.fecha_firma?"Firmado":"Pendiente de firma"}</small></div><div className="contract-sign-actions"><button type="button" onClick={()=>{setSelected(c);setMessage("Contrato seleccionado para firma: "+c.numero_contrato)}}>Seleccionar</button><button type="button" disabled={adobeBusy||c.estado==="FIRMADO"} onClick={()=>void enviarAFirma(c.id)}>{adobeBusy&&selected?.id===c.id?"Enviando…":"Enviar a firma →"}</button></div></article>)}</div><Link className="contract-route-button" href="/operaciones">Ir a operaciones →</Link></section>}

  {tab==="historial"&&<section className="contract-info-panel"><h2>Historial de versiones</h2>{versions.length===0?<p>No hay versiones registradas.</p>:versions.map(v=><article key={v.id}><b>Versión {v.version}</b><span>{v.estado} · {v.motivo||"Sin motivo"} · {new Date(v.creado_en).toLocaleString("es-AR")}</span></article>)}</section>}
  <div className="contract-language-bar"><span>Idioma del documento</span>{IDIOMAS.map(([code,name])=><button key={code} className={idioma===code?"active":""} onClick={()=>{setIdioma(code);setMessage(`Idioma seleccionado: ${name}.`)}}>{name}</button>)}</div>
 </main>
}

function PreviewCard({type,form,onDownload,active}:{type:"F1"|"F2";form:FormState;onDownload:(type:"F1"|"F2")=>void;active:boolean}){
 return <article className={"contract-preview-card "+(active?"active":"")}>
   <header><div className={type==="F1"?"green":"blue"}>▤</div><div><strong>Contrato {type} - {type==="F1"?"Blanco (Formal)":"Privado"}</strong><small>{type==="F1"?"Contrato registrable para operaciones formales.":"Contrato privado entre partes (no registrable)."}</small></div><button onClick={()=>onDownload(type)}>⇩ Descargar PDF</button></header>
   <div className="contract-paper"><div className="paper-brand"><strong>AgroBroker<em>IA</em></strong><span>Conectando el mundo agro</span></div><div className="paper-meta">N°: {type}-BORRADOR<br/>Fecha: {new Date().toLocaleDateString("es-AR")}</div><h3>{type==="F1"?"CONTRATO DE COMPRAVENTA DE GRANOS – F1 (BLANCO)":"CONTRATO PRIVADO DE COMPRAVENTA DE GRANOS – F2"}</h3><p>Entre <b>{form.vendedor||"EL VENDEDOR"}</b> y <b>{form.comprador||"EL COMPRADOR"}</b>, acuerdan celebrar el presente contrato de compraventa de <b>{form.producto}</b> bajo las siguientes cláusulas:</p>{[["1. OBJETO",form.producto||"No especificado"],["2. CANTIDAD",form.cantidad?money(form.cantidad)+" toneladas métricas.":"No especificada"],["3. CALIDAD",form.observaciones||"No especificada"],["4. PRECIO",form.precio&&form.moneda?form.moneda+" "+money(form.precio)+" por tonelada métrica.":"No especificado"],["5. CONDICIÓN DE PRECIO",form.condicion||"No especificada"],["6. LUGAR DE ENTREGA",form.puerto||"No especificado"],["7. PLAZO DE ENTREGA",form.entrega||"No especificado"],["8. FORMA DE PAGO",form.pago||"No especificada"],["9. DOCUMENTACIÓN","No especificada"],["10. OBSERVACIONES",form.observaciones||"Sin observaciones registradas"]].map(([h,t])=><div className="paper-clause" key={h}><b>{h}</b><span>{t}</span></div>)}<div className="paper-signatures"><div><b>{form.vendedor||"VENDEDOR"}</b><small>Firma</small></div><div><b>{form.comprador||"COMPRADOR"}</b><small>Firma</small></div></div></div>
 </article>
}
