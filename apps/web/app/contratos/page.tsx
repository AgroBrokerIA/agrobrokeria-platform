"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase/client";
import "./reference.css";

type C={id:string;operacion_id:string;numero_contrato:string;tipo_contrato:string|null;estado:string;fecha_firma:string|null;cantidad_tn:number|null;precio_tn:number|null;importe_total:number|null;contenido:string|null;creado_en?:string};
type V={id:string;contrato_id:string;version:number;estado:string;motivo:string|null;documento_hash:string|null;creado_en:string};

const PRODUCTOS_BASE=["Soja","Maíz","Trigo","Girasol","Cebada","Sorgo","Aceite de soja crudo","Harina / Pellets de soja de alta proteína (Forraje)"];
const MONEDAS=["USD","EUR","ARS","BRL"];
const IDIOMAS=[["es","Español"],["en","English"],["pt","Português"],["it","Italiano"],["fr","Français"],["de","Deutsch"]];

type FormState={operacionId:string;tipo:"F1"|"F2";producto:string;cantidad:string;precio:string;condicion:string;puerto:string;entrega:string;pago:string;observaciones:string;vendedor:string;comprador:string};
type Operation={id:string;codigo:string;cantidad_tn:number;precio_tn:number;importe_total:number;estado:string};

const initial:FormState={operacionId:"",tipo:"F1",producto:"",cantidad:"",precio:"",condicion:"FAS",puerto:"",entrega:"",pago:"Transferencia bancaria",observaciones:"",vendedor:"",comprador:""};

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
 line("3. CALIDAD",esc(f.observaciones||"Según normas y especificaciones comerciales acordadas por las partes."));
 line("4. PRECIO",`USD ${money(f.precio)} por tonelada métrica.`);
 line("5. CONDICIÓN DE PRECIO",esc(f.condicion));
 line("6. LUGAR DE ENTREGA",`Puerto de ${esc(f.puerto)}.`);
 line("7. PLAZO DE ENTREGA",esc(f.entrega));
 line("8. FORMA DE PAGO",esc(f.pago));
 line("9. DOCUMENTACIÓN","Factura comercial, Carta de Porte, certificados de calidad y demás documentación que corresponda a la operación.");
 line("10. CONFIDENCIALIDAD","Las partes se comprometen a mantener la confidencialidad de los términos del presente contrato.");
 if(f.tipo==="F1") line("11. LEGISLACIÓN APLICABLE","República Argentina. Las controversias se someterán a la jurisdicción que corresponda según la operación y la normativa aplicable.");
 else line("11. SOLUCIÓN DE CONTROVERSIAS","Las partes procurarán resolver de buena fe cualquier diferencia y, de corresponder, podrán acudir a mecanismos de arbitraje o jurisdicción pactados.");
 line("12. PARTES",`VENDEDOR: ${esc(f.vendedor||"________________________________")}\nCOMPRADOR: ${esc(f.comprador||"________________________________")}`);
 y=Math.min(y,H-75);pdf.setFontSize(8);pdf.setTextColor(80,95,110);pdf.text("Generado digitalmente por AgroBrokerIA · La validez jurídica depende de la información, firmas y requisitos aplicables a la operación.",margin,H-42);
 return pdf;
}

export default function ContratosPage(){
 const [rows,setRows]=useState<C[]>([]),[versions,setVersions]=useState<V[]>([]),[productos,setProductos]=useState<string[]>(PRODUCTOS_BASE),[puertos,setPuertos]=useState<string[]>([]),[operaciones,setOperaciones]=useState<Operation[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState("");
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
     supabase.from("operaciones").select("id,codigo,cantidad_tn,precio_tn,importe_total,estado").order("fecha_operacion",{ascending:false})
   ]);
   if(c.error)setError(c.error.message); if(v.error)setError(v.error.message);
   setRows((c.data||[]) as C[]);setVersions((v.data||[]) as V[]);
   if(!p.error&&p.data?.length)setProductos(p.data.map((x:any)=>x.nombre));
   if(!port.error&&port.data?.length)setPuertos(port.data.map((x:any)=>x.nombre));
   setOperaciones((op.data||[]) as Operation[]);
   setLoading(false);
 }
 useEffect(()=>{void load()},[]);

 function selectOperation(id:string){
   const op=operaciones.find(x=>x.id===id);
   if(!op){ setForm(x=>({...x,operacionId:""})); return; }
   setForm(x=>({...x,operacionId:id,cantidad:String(op.cantidad_tn ?? ""),precio:String(op.precio_tn ?? "")}));
 }
 async function saveDraft(){
   if(!form.operacionId){setMessage("Seleccioná una operación.");return;}
   setBusy(true);setError("");setMessage("");
   const op=operaciones.find(x=>x.id===form.operacionId);
   if(!op){setError("La operación seleccionada ya no está disponible.");setBusy(false);return;}
   const cantidad=Number(form.cantidad)||0,precio=Number(form.precio)||0;
   const numeroContrato=selected?.numero_contrato||`ABIA-${op.codigo}-BORRADOR`;
   const payload={numero_contrato:numeroContrato,tipo_contrato:form.tipo,cantidad_tn:cantidad,precio_tn:precio,importe_total:cantidad*precio,condicion_entrega:form.condicion,lugar_carga:"",destino:form.puerto,forma_pago:form.pago,plazo_pago:"",flete:"",calidad:form.observaciones,observaciones:form.observaciones,vendedor:form.vendedor,comprador:form.comprador,contenido:contractContent(form)};
   const {error}=await supabase.rpc("guardar_contrato_comercial",{p_operacion_id:form.operacionId,p_datos:payload});
   if(error)setError(error.message);else{setMessage("Borrador guardado en la operación.");await load();}
   setBusy(false);
 }
 function contractContent(f:FormState){
   return JSON.stringify({tipo:f.tipo,producto:f.producto,cantidad_tn:Number(f.cantidad)||0,precio_tn:Number(f.precio)||0,condicion:f.condicion,puerto:f.puerto,entrega:f.entrega,pago:f.pago,observaciones:f.observaciones,vendedor:f.vendedor,comprador:f.comprador});
 }

 const update=(key:keyof FormState,value:string)=>setForm(x=>({...x,[key]:value}));
 const current=selected;

 function download(tipo:"F1"|"F2"){setForm(x=>({...x,tipo}));setTimeout(()=>buildPdf({...form,tipo}).save(`AgroBrokerIA-Contrato-${tipo}.pdf`),0);setMessage(`PDF ${tipo} generado en formato Legal.`)}
 function preview(tipo:"F1"|"F2"){setForm(x=>({...x,tipo}));setMessage(`Vista previa ${tipo} seleccionada.`)}
 function printPdf(){const pdf=buildPdf(form);const url=pdf.output("bloburl");window.open(url.toString(),"_blank","noopener,noreferrer")}
 function emailPdf(){const subject=encodeURIComponent(`Contrato ${form.tipo} AgroBrokerIA`);window.location.href=`mailto:?subject=${subject}&body=${encodeURIComponent("Adjuntá el PDF generado por AgroBrokerIA.")}`}
 function sharePdf(){if(navigator.share){void navigator.share({title:`Contrato ${form.tipo} AgroBrokerIA`,text:"Contrato generado por AgroBrokerIA"})}else{download(form.tipo)}}
 
 return <main className="contract-builder-reference">
  <header className="contract-builder-head"><div><h1>Contratos</h1><p>Generá, personalizá y descargá contratos en formato legal (PDF) con validez internacional.</p></div><div className="contract-builder-actions"><button onClick={()=>setTab("plantillas")}>▣ Plantillas</button><button onClick={()=>setTab("firmas")}>⌁ Firmas</button><button className="contract-new" onClick={()=>{setTab("tipos");setSelected(null);setForm(initial);setMessage("Nuevo contrato listo para completar.")}}>＋ Nuevo contrato</button></div></header>
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
       <label>Precio (USD/tn)<input value={form.precio} onChange={e=>update("precio",e.target.value)} inputMode="decimal"/></label>
       <label>Condición de precio<select value={form.condicion} onChange={e=>update("condicion",e.target.value)}>{["FAS","FOB","CIF","Precio pizarra","FCA"].map(x=><option key={x}>{x}</option>)}</select></label>
       <label>Puerto de entrega<select value={form.puerto} onChange={e=>update("puerto",e.target.value)}><option value="">Seleccionar puerto</option>{(puertos.length?puertos:["Rosario","San Lorenzo","General San Martín","Bahía Blanca","Quequén"]).map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Fecha de entrega<input value={form.entrega} onChange={e=>update("entrega",e.target.value)}/></label>
       <label>Forma de pago<select value={form.pago} onChange={e=>update("pago",e.target.value)}>{["Transferencia bancaria","Carta de crédito (LC)","Financiera","eCheq"].map(x=><option key={x}>{x}</option>)}</select></label>
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

  {tab==="firmas"&&<section className="contract-info-panel"><h2>Firmas</h2><p>La generación del PDF queda separada de la firma. Seleccioná un contrato desde “Mis contratos” y utilizá el flujo de firma correspondiente a la operación.</p><Link className="contract-route-button" href="/operaciones">Ir a operaciones →</Link></section>}

  {tab==="historial"&&<section className="contract-info-panel"><h2>Historial de versiones</h2>{versions.length===0?<p>No hay versiones registradas.</p>:versions.map(v=><article key={v.id}><b>Versión {v.version}</b><span>{v.estado} · {v.motivo||"Sin motivo"} · {new Date(v.creado_en).toLocaleString("es-AR")}</span></article>)}</section>}
  <div className="contract-language-bar"><span>Idioma del documento</span>{IDIOMAS.map(([code,name])=><button key={code} className={idioma===code?"active":""} onClick={()=>{setIdioma(code);setMessage(`Idioma seleccionado: ${name}.`)}}>{name}</button>)}</div>
 </main>
}

function PreviewCard({type,form,onDownload,active}:{type:"F1"|"F2";form:FormState;onDownload:(type:"F1"|"F2")=>void;active:boolean}){
 return <article className={"contract-preview-card "+(active?"active":"")}>
   <header><div className={type==="F1"?"green":"blue"}>▤</div><div><strong>Contrato {type} - {type==="F1"?"Blanco (Formal)":"Privado"}</strong><small>{type==="F1"?"Contrato registrable para operaciones formales.":"Contrato privado entre partes (no registrable)."}</small></div><button onClick={()=>onDownload(type)}>⇩ Descargar PDF</button></header>
   <div className="contract-paper"><div className="paper-brand"><strong>AgroBroker<em>IA</em></strong><span>Conectando el mundo agro</span></div><div className="paper-meta">N°: {type}-BORRADOR<br/>Fecha: {new Date().toLocaleDateString("es-AR")}</div><h3>{type==="F1"?"CONTRATO DE COMPRAVENTA DE GRANOS – F1 (BLANCO)":"CONTRATO PRIVADO DE COMPRAVENTA DE GRANOS – F2"}</h3><p>Entre <b>{form.vendedor||"EL VENDEDOR"}</b> y <b>{form.comprador||"EL COMPRADOR"}</b>, acuerdan celebrar el presente contrato de compraventa de <b>{form.producto}</b> bajo las siguientes cláusulas:</p>{[["1. OBJETO","Las partes acuerdan la compraventa de "+form.producto+" conforme a las condiciones comerciales establecidas."],["2. CANTIDAD",money(form.cantidad)+" toneladas métricas."],["3. CALIDAD",form.observaciones||"Según normas de la Cámara Arbitral de Cereales de Rosario."],["4. PRECIO","USD "+money(form.precio)+" por tonelada métrica."],["5. CONDICIÓN DE PRECIO",form.condicion],["6. LUGAR DE ENTREGA","Puerto de "+form.puerto+"."],["7. PLAZO DE ENTREGA",form.entrega],["8. FORMA DE PAGO",form.pago],["9. DOCUMENTACIÓN","Factura comercial, Carta de Porte, certificados y documentación requerida."],["10. CONFIDENCIALIDAD","Las partes se comprometen a mantener la confidencialidad de los términos."],["11. "+(type==="F1"?"LEGISLACIÓN APLICABLE":"SOLUCIÓN DE CONTROVERSIAS"),type==="F1"?"República Argentina y normativa aplicable.":"Las partes procurarán resolver de buena fe cualquier diferencia."]].map(([h,t])=><div className="paper-clause" key={h}><b>{h}</b><span>{t}</span></div>)}<div className="paper-signatures"><div><b>{form.vendedor||"VENDEDOR"}</b><small>Firma</small></div><div><b>{form.comprador||"COMPRADOR"}</b><small>Firma</small></div></div></div>
 </article>
}
