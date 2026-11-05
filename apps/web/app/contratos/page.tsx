"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase/client";
import "./reference.css";

type C={id:string;operacion_id:string;numero_contrato:string;estado:string;fecha_firma:string|null;cantidad_tn:number|null;precio_tn:number|null;importe_total:number|null;contenido:string|null;creado_en?:string};
type V={id:string;contrato_id:string;version:number;estado:string;motivo:string|null;documento_hash:string|null;creado_en:string};

const IDIOMAS=[["es","Español"],["en","English"],["pt","Português"],["it","Italiano"],["fr","Français"],["de","Deutsch"]];

type FormState={operacionId:string;tipo:"F1";tipoOperacion:string;producto:string;campania:string;cantidad:string;precio:string;moneda:string;condicion:string;puerto:string;entrega:string;pago:string;observaciones:string;vendedor:string;comprador:string;intermediario:string;procedencia:string;jurisdiccion:string;ciudadArbitral:string;comision:string};
type Operation={id:string;codigo:string;cantidad_tn:number;precio_tn:number;importe_total:number;estado:string;moneda:string|null;publicacion_compra_id:string|null;publicacion_venta_id:string|null};
type Extension={id:string;operacion_id:string;contrato_id:string;motivo:string;justificativo:string;dias_solicitados:number;vencimiento_solicitado_at:string;evidencia_url:string|null;estado_revision:string;dias_aprobados:number|null;vencimiento_aprobado_at:string|null;observaciones_revision:string|null;created_at:string};
type ConfidentialityStatus={rol:"COMPRADOR"|"VENDEDOR"|"INTERMEDIARIO";company_id:string;requerido:boolean;aceptado:boolean;aceptado_at:string|null;version:string|null;hash_sha256:string|null;documento_codigo?:string|null;documento_titulo?:string|null};
type ExternalDoc={id:string;nombre_archivo:string|null;url_archivo:string|null;aprobado:boolean|null;firmado_externamente:boolean|null;sha256:string|null;creado_en:string|null;operacion_id:string};

const initial:FormState={operacionId:"",tipo:"F1",tipoOperacion:"COMPRAVENTA (COMPRA + VENTA)",producto:"",campania:"",cantidad:"",precio:"",moneda:"USD",condicion:"FAS",puerto:"",entrega:"",pago:"",observaciones:"",vendedor:"",comprador:"",intermediario:"",procedencia:"",jurisdiccion:"",ciudadArbitral:"",comision:""};

function esc(v:string){return v.replace(/[<>]/g,"");}
function money(v:string){const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2}):"0,00"}

function drawWrapped(pdf:jsPDF,text:string,x:number,y:number,maxWidth:number,fontSize=9,lineGap=11){
 pdf.setFont("helvetica","normal");pdf.setFontSize(fontSize);const lines=pdf.splitTextToSize(text,maxWidth);pdf.text(lines,x,y);return y+lines.length*lineGap;
}

function buildPdf(f:FormState){
 const pdf=new jsPDF({orientation:"portrait",unit:"pt",format:"a4"});
 const W=pdf.internal.pageSize.getWidth(),H=pdf.internal.pageSize.getHeight(),m=42;
 const blue=[35,68,110] as const;
 const wrap=(value:string,x:number,y:number,width:number,size=8.5,gap=10)=>{pdf.setFont("helvetica","normal");pdf.setFontSize(size);const lines=pdf.splitTextToSize(value,width);pdf.text(lines,x,y);return y+lines.length*gap;};
 pdf.setFont("helvetica","bold");pdf.setFontSize(15);pdf.setTextColor(...blue);
 pdf.text("BORRADOR DE CONDICIONES COMERCIALES · REFERENCIA F1",W/2,42,{align:"center"});
 pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.setTextColor(160,45,35);
 pdf.text("BORRADOR · NO FIRMADO · NO REGISTRADO",W/2,58,{align:"center"});
 let y=80;
 y=wrap("Documento preliminar generado por AgroBrokerIA a partir de los datos comerciales cargados. No es un formulario oficial homologado, no constituye por sí solo un contrato firmado y no sustituye el modelo vigente de la Bolsa ni la revisión de las partes.",m,y,W-2*m,8,10)+8;
 pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.setTextColor(...blue);pdf.text("1. PARTES Y REFERENCIAS",m,y);y+=16;
 const rows=[
  ["Vendedor",f.vendedor||"Pendiente de completar"],
  ["Comprador",f.comprador||"Pendiente de completar"],
  ["Intermediario",f.intermediario||"No indicado"],
  ["Tipo de operación",f.tipoOperacion||"Compraventa"],
  ["Producto / grano",f.producto||"Pendiente de completar"],
  ["Campaña",f.campania||"Pendiente de completar"],
  ["Cantidad",f.cantidad?money(f.cantidad)+" toneladas métricas":"Pendiente de completar"],
  ["Precio y moneda",f.precio?money(f.precio)+" "+(f.moneda||"")+"/ tonelada":"Pendiente de completar"],
  ["Condición comercial",f.condicion||"Pendiente de completar"],
  ["Procedencia",f.procedencia||"Pendiente de completar"],
  ["Destino / puerto",f.puerto||"Pendiente de completar"],
  ["Período de entrega",f.entrega||"Pendiente de completar"],
  ["Forma y plazo de pago",f.pago||"Pendiente de completar"],
  ["Observaciones de calidad",f.observaciones||"Pendiente de especificación"]
 ];
 const labelWidth=135,valueWidth=W-2*m-labelWidth;
 for(const [label,value] of rows){
  const left=pdf.splitTextToSize(label,labelWidth-12),right=pdf.splitTextToSize(value,valueWidth-12);
  const height=Math.max(left.length,right.length)*10+9;
  if(y+height>H-112){pdf.addPage();y=48;}
  pdf.setDrawColor(185,197,208);pdf.rect(m,y,labelWidth,height);pdf.rect(m+labelWidth,y,valueWidth,height);
  pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.setTextColor(...blue);pdf.text(left,m+6,y+13);
  pdf.setFont("helvetica","normal");pdf.setTextColor(35,35,35);pdf.text(right,m+labelWidth+6,y+13);
  y+=height;
 }
 y+=18;
 if(y>H-105){pdf.addPage();y=48;}
 pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.setTextColor(...blue);pdf.text("2. PUNTOS PENDIENTES DE CONFIRMACIÓN",m,y);y+=16;
 y=wrap("Antes de formalizar: confirmar especificaciones de calidad y tolerancias, punto exacto de entrega, período/cupos, fórmula o referencia de precio, moneda, impuestos, documentación exigible, forma y plazo de pago y jurisdicción aplicable.",m,y,W-2*m,8.5,11)+10;
 y=wrap("La comisión por el servicio tecnológico de intermediación se gestiona y documenta en el módulo de Comisiones de AgroBrokerIA; no se incorpora aquí como cláusula contractual del modelo F1.",m,y,W-2*m,8.5,11)+10;
 y=wrap("Formalización: incorporar el formulario oficial vigente que corresponda y completar firma y registración por el canal institucional habilitado. La Bolsa de Comercio de Rosario ofrece el servicio Confirma para instrumentar, firmar y registrar contratos de compraventa de granos.",m,y,W-2*m,8.5,11)+12;
 pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.setTextColor(160,45,35);
 pdf.text("Este archivo es únicamente un borrador de trabajo. No debe utilizarse como contrato oficial ni como constancia de registración.",m,y);
 return pdf;
}

function buildConfidentialityPdf(f:FormState){
 const pdf=new jsPDF({orientation:"portrait",unit:"pt",format:"a4"});const W=pdf.internal.pageSize.getWidth(),m=42;let y=45;
 const lines=(t:string,size=9)=>{pdf.setFont("helvetica","normal");pdf.setFontSize(size);const ls=pdf.splitTextToSize(t,W-2*m);pdf.text(ls,m,y);y+=ls.length*(size+2)+8;if(y>780){pdf.addPage();y=45}};
 const bold=(t:string)=>{pdf.setFont("helvetica","bold");pdf.setFontSize(9);pdf.text(t,m,y);y+=13};
 const hasIntermediary=Boolean(f.intermediario.trim());
 pdf.setFont("helvetica","bold");pdf.setFontSize(15);pdf.text(hasIntermediary?"CONTRATO DE CONFIDENCIALIDAD, NO CIRCUNVENCIÓN Y":"CONTRATO DE CONFIDENCIALIDAD DE LA OPERACIÓN",W/2,32,{align:"center"});
 if(hasIntermediary) pdf.text("RECONOCIMIENTO DE COMISIONES",W/2,48,{align:"center"});
 y=hasIntermediary?72:55;
 lines("BORRADOR PARTICULAR PARA REVISIÓN LEGAL. No es un modelo oficial de la Bolsa ni asesoramiento jurídico. Las cláusulas de confidencialidad, no circunvención, comisiones, penalidades y jurisdicción deben ser revisadas y aceptadas expresamente por las partes antes de cualquier firma o uso.",8);
 if(hasIntermediary){
  lines('Este borrador particular se entrega para revisión de las partes. La aceptación operativa registrada en AgroBrokerIA no constituye firma digital certificada ni reemplaza la firma formal del documento por los medios legalmente habilitados. Las partes deben revisar y aprobar expresamente sus cláusulas antes de utilizarlo.');lines('Conste por el presente documento el borrador de confidencialidad, no circunvención y reconocimiento de comisiones, propuesto entre las partes abajo firmantes:');
  bold("POR UNA PARTE:");lines('La empresa comercializadora, productora o persona humana / jurídica identificada en el cuadro de firmas, en adelante denominada la "Parte Contratante".');
  bold("Y POR LA OTRA PARTE:");lines('La empresa o persona humana / jurídica dedicada al corretaje e intermediación comercial identificada en el cuadro de firmas, en adelante denominado el "Intermediario".');
  bold("DECLARACIONES");lines("I. El Intermediario posee contactos comerciales estratégicos, bases de datos de productores, compradores, vendedores, acopiadores y fuentes de suministro dentro del sector de granos y oleaginosas.");lines('II. La Parte Contratante desea acceder de manera legítima a dichos contactos e información comercial exclusiva con el objeto y fin de evaluar, negociar y concretar operaciones de compraventa de granos (en adelante, el "Propósito").');lines("III. Ambas Partes acuerdan expresamente que el Intermediario facilita estas conexiones bajo la condición estricta de proteger su propiedad intelectual comercial, resguardar el secreto de su cartera y asegurar la retribución económica correspondiente por sus gestiones de corretaje.");
  bold("CLÁUSULAS");bold("PRIMERA: OBJETO Y CONFIDENCIALIDAD");lines("La Parte Contratante se obliga a mantener la más estricta reserva y confidencialidad sobre toda la información, identidades de clientes, datos de contacto, especificaciones técnicas, operativas, comerciales o logísticas de los compradores, proveedores o productores de granos que el Intermediario le presente, ya sea de forma verbal, escrita, electrónica o visual. Queda prohibida su divulgación a terceros sin autorización previa.");
  bold("SEGUNDA: OBLIGACIÓN DE NO CIRCUNVENCIÓN");lines("La Parte Contratante se obliga formalmente a no eludir, omitir, ni circunvenir (saltear) al Intermediario en ninguna de las operaciones comerciales presentes o futuras con los contactos provistos por este. En consecuencia, la Parte Contratante no podrá iniciar negociaciones directas, firmar contratos ni realizar transacciones comerciales con los clientes o proveedores presentados por el Intermediario sin la participación expresa y el consentimiento por escrito de este último. Esta restricción se extiende a las empresas matrices, filiales, subsidiarias, empleados o socios de la Parte Contratante.");
  bold("TERCERA: RECONOCIMIENTO Y PAGO DE COMISIONES");lines("Por cada operación comercial de compraventa de granos que se concrete, directa o indirectamente, con los contactos facilitados por el Intermediario, la Parte Contratante se obliga irrevocablemente a pagar al Intermediario una comisión conforme a las siguientes pautas:");lines("• Monto de la Comisión: Se fija una comisión de "+(f.comision||"________________________________")+" (en letras y números), o en su defecto el ________ % del valor bruto total de la operación.");lines("• Momento del Pago: La comisión se devengará en el momento en que se liquide cada contrato, camión o embarque de granos, y deberá ser transferida a la cuenta del Intermediario dentro de los _____ días hábiles posteriores a que la Parte Contratante perciba el pago o el producto.");lines("• Operaciones Sucesivas: Esta comisión se aplicará de igual forma a todas las renovaciones, extensiones, adendas o nuevos contratos celebrados con dichos contactos durante la vigencia del acuerdo y su extensión posterior.");
  bold("CUARTA: DURACIÓN Y VIGENCIA");lines("Este Contrato entra en vigor en la fecha de su firma y tendrá una duración de 3 (tres) años. Las obligaciones de confidencialidad, no circunvención y el derecho al cobro de comisiones por los contactos presentados seguirán plenamente vigentes por un plazo adicional de 3 (tres) años posteriores a la terminación formal de este Contrato.");
  bold("QUINTA: PENALIZACIÓN POR INCUMPLIMIENTO");lines("En caso de que la Parte Contratante incumpla las cláusulas de confidencialidad o circunvenga al Intermediario realizando transacciones directas para evitar el pago de comisiones, quedará obligada de pleno derecho a: 1) Pagar al Intermediario una indemnización equivalente al doble del total de las comisiones que le hubieran correspondido por la totalidad del volumen de granos transaccionado en la operación eludida. 2) Resarcir todos los daños, perjuicios y gastos legales (incluyendo honorarios de abogados) derivados de la reclamación.");
  bold("SEXTA: LEY APLICABLE Y JURISDICCIÓN");lines("Este Contrato se regirá e interpretará de conformidad con las leyes vigentes de "+(f.jurisdiccion||"__________________________")+". Para cualquier controversia derivada del presente acuerdo, las Partes se someten expresamente a los tribunales ordinarios de la Ciudad de "+(f.ciudadArbitral||"__________________________")+", renunciando a cualquier otro fuero o jurisdicción que pudiera corresponderles.");
  y+=12;pdf.setFont("helvetica","bold");pdf.setFontSize(9);pdf.text("POR LA PARTE CONTRATANTE",m,y);pdf.text("POR EL INTERMEDIARIO",W/2+10,y);y+=30;pdf.line(m,y,m+170,y);pdf.line(W/2+10,y,W-42,y);y+=14;pdf.setFont("helvetica","normal");pdf.text("Nombre: "+(f.comprador||f.vendedor||""),m,y);pdf.text("Nombre: "+(f.intermediario||""),W/2+10,y);y+=14;pdf.text("DNI/Pasaporte: __________________",m,y);pdf.text("DNI/Pasaporte: __________________",W/2+10,y);y+=14;pdf.text("Empresa: "+(f.comprador||f.vendedor||""),m,y);pdf.text("Empresa: "+(f.intermediario||""),W/2+10,y);
 } else {
  lines('Este borrador particular se entrega para revisión de las partes. La aceptación operativa registrada en AgroBrokerIA no constituye firma digital certificada ni reemplaza la firma formal del documento por los medios legalmente habilitados. Las partes deben revisar y aprobar expresamente sus cláusulas antes de utilizarlo.');lines('Conste por el presente documento el borrador de confidencialidad de la operación, propuesto entre las partes identificadas en el cuadro de firmas respecto de la operación comercial registrada en AgroBrokerIA.');
  bold("PARTES");lines("EL VENDEDOR: "+(f.vendedor||"_______________________________")+".");lines("EL COMPRADOR: "+(f.comprador||"_______________________________")+".");
  bold("DECLARACIONES");lines("I. Las partes intercambiarán información comercial, económica, técnica, operativa y logística necesaria para evaluar, negociar, documentar, ejecutar y liquidar la operación.");lines("II. Las partes reconocen que determinada información de la operación puede no ser pública y que su divulgación o uso fuera del propósito de la operación puede perjudicar a la parte que la proporciona.");
  bold("CLÁUSULAS");bold("PRIMERA: OBJETO Y CONFIDENCIALIDAD");lines("Las partes se obligan a mantener estricta reserva sobre la información no pública relacionada con la operación, incluyendo identidades, datos de contacto, cantidades, precios, condiciones comerciales, formas de pago, documentación, especificaciones técnicas y logísticas, datos de origen y destino y cualquier otra información intercambiada con motivo de la operación. La información no podrá divulgarse ni utilizarse para un fin ajeno a la operación sin autorización previa de la parte que la proporcionó, salvo obligación legal o requerimiento de autoridad competente.");
  bold("SEGUNDA: USO LIMITADO");lines("La información confidencial sólo podrá utilizarse para evaluar, negociar, documentar, ejecutar y liquidar la operación identificada en AgroBrokerIA. Cada parte deberá limitar el acceso a quienes necesiten conocerla para esos fines y resulten legítimamente habilitados.");
  bold("TERCERA: PROTECCIÓN Y NOTIFICACIÓN");lines("Cada parte adoptará medidas razonables para evitar acceso, copia, divulgación o uso no autorizado de la información confidencial y comunicará a la otra cualquier pérdida, acceso o divulgación no autorizada de la que tome conocimiento.");
  bold("CUARTA: EXCEPCIONES");lines("No se considerará confidencial la información que ya sea pública sin incumplimiento de este Contrato, que la parte receptora pueda acreditar que conocía legítimamente con anterioridad, o cuya divulgación sea exigida por ley o por una autoridad competente. Cuando legalmente sea posible, la parte requerida notificará previamente a la otra.");
  bold("QUINTA: VIGENCIA");lines("Este Contrato entra en vigor en la fecha de su aceptación y tendrá una duración de 3 (tres) años. La obligación de confidencialidad continuará durante 3 (tres) años adicionales respecto de la información recibida durante su vigencia.");
  bold("SEXTA: INCUMPLIMIENTO");lines("El incumplimiento del deber de confidencialidad dará lugar a las responsabilidades que correspondan conforme al contrato de la operación y la legislación aplicable, sin perjuicio de las medidas judiciales o extrajudiciales que pudieran corresponder.");
  bold("SÉPTIMA: LEY APLICABLE Y JURISDICCIÓN");lines("Este Contrato se regirá por la legislación aplicable que corresponda a la operación y por la jurisdicción consignada en el contrato comercial, sin perjuicio de las normas imperativas aplicables.");
  y+=12;pdf.setFont("helvetica","bold");pdf.setFontSize(9);pdf.text("EL VENDEDOR",m,y);pdf.text("EL COMPRADOR",W/2+10,y);y+=30;pdf.line(m,y,m+170,y);pdf.line(W/2+10,y,W-42,y);y+=14;pdf.setFont("helvetica","normal");pdf.text("Nombre: "+(f.vendedor||""),m,y);pdf.text("Nombre: "+(f.comprador||""),W/2+10,y);y+=14;pdf.text("DNI/Pasaporte: __________________",m,y);pdf.text("DNI/Pasaporte: __________________",W/2+10,y);y+=14;pdf.text("Empresa: "+(f.vendedor||""),m,y);pdf.text("Empresa: "+(f.comprador||""),W/2+10,y);
 }
 return pdf;
}

export default function ContratosPage(){
 const [rows,setRows]=useState<C[]>([]),[versions,setVersions]=useState<V[]>([]),[productos,setProductos]=useState<string[]>([]),[puertos,setPuertos]=useState<string[]>([]),[operaciones,setOperaciones]=useState<Operation[]>([]),[extensions,setExtensions]=useState<Extension[]>([]),[confidentiality,setConfidentiality]=useState<ConfidentialityStatus[]>([]),[confidentialityBusy,setConfidentialityBusy]=useState(false);
 const [extensionDays,setExtensionDays]=useState("1"),[extensionReason,setExtensionReason]=useState(""),[extensionJustification,setExtensionJustification]=useState(""),[extensionEvidence,setExtensionEvidence]=useState(""),[extensionDetails,setExtensionDetails]=useState(""),[extensionBusy,setExtensionBusy]=useState(false),[cancelReason,setCancelReason]=useState(""),[cancelJustification,setCancelJustification]=useState(""),[cancelEvidence,setCancelEvidence]=useState(""),[cancelBusy,setCancelBusy]=useState(false);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState(""),[externalDocs,setExternalDocs]=useState<ExternalDoc[]>([]),[externalDocId,setExternalDocId]=useState(""),[externalSha,setExternalSha]=useState(""),[externalBusy,setExternalBusy]=useState(false);
 const [tab,setTab]=useState("tipos"),[idioma,setIdioma]=useState("es"),[busy,setBusy]=useState(false),[signedPdfFile,setSignedPdfFile]=useState<File|null>(null),[signedUploadBusy,setSignedUploadBusy]=useState(false),[vendorFile,setVendorFile]=useState<File|null>(null),[buyerFile,setBuyerFile]=useState<File|null>(null),[copyRows,setCopyRows]=useState<any[]>([]),[copyBusy,setCopyBusy]=useState<"VENDEDOR"|"COMPRADOR"|null>(null),[isPlatformAdmin,setIsPlatformAdmin]=useState(false),[allowedCopyRoles,setAllowedCopyRoles]=useState<string[]>([]),[cancelRows,setCancelRows]=useState<any[]>([]);
 const [form,setForm]=useState<FormState>(initial);
 const [selected,setSelected]=useState<C|null>(null);

 async function load(){
   setLoading(true);setError("");
   const {data:{user:sessionUser}}=await supabase.auth.getUser();
   if(sessionUser){const {data:adminRow}=await supabase.from("platform_admins").select("user_id").eq("user_id",sessionUser.id).maybeSingle();const admin=!!adminRow;setIsPlatformAdmin(admin);if(admin){const {data:requests,error:requestsError}=await supabase.from("cancelaciones_contrato").select("id,operacion_id,contrato_id,motivo,justificativo,evidencia_url,estado_revision,created_at,observaciones_revision").order("created_at",{ascending:false});if(requestsError)setError(requestsError.message);setCancelRows(requests||[]);}else setCancelRows([]);}
   const selectedOperationId=selected?.operacion_id||form.operacionId||null;
   const [c,v,p,port,op,ext,conf]=await Promise.all([
     supabase.from("contratos").select("id,operacion_id,numero_contrato,estado,fecha_firma,cantidad_tn,precio_tn,importe_total,contenido,creado_en").order("creado_en",{ascending:false}),
     supabase.from("contrato_versiones").select("id,contrato_id,version,estado,motivo,documento_hash,creado_en").order("creado_en",{ascending:false}),
     supabase.from("productos").select("nombre").eq("activo",true).order("nombre"),
     supabase.from("catalogo_puertos").select("nombre").eq("activo",true).order("orden"),
     supabase.from("operaciones").select("id,codigo,cantidad_tn,precio_tn,importe_total,estado,monedas(codigo),publicacion_compra_id,publicacion_venta_id").order("fecha_operacion",{ascending:false}),
     supabase.from("prorrogas_contrato").select("id,operacion_id,contrato_id,motivo,justificativo,dias_solicitados,vencimiento_solicitado_at,evidencia_url,estado_revision,dias_aprobados,vencimiento_aprobado_at,observaciones_revision,created_at").order("created_at",{ascending:false}),
     selectedOperationId?supabase.rpc("estado_confidencialidad_operacion",{p_operacion_id:selectedOperationId}):Promise.resolve({data:[],error:null})
   ]);
   if(c.error)setError(c.error.message); if(v.error)setError(v.error.message);
   const contratosCargados=(c.data||[]) as C[];
   setRows(contratosCargados);setVersions((v.data||[]) as V[]);
   const params=new URLSearchParams(window.location.search);
   const requestedOperation=params.get("operacion");
   if(requestedOperation){
     const contratoDestino=contratosCargados.find(x=>x.operacion_id===requestedOperation);
     if(contratoDestino){
       setSelected(contratoDestino);setTab(params.get("tab")==="firmas"?"firmas":"mis");
       setForm(x=>({...x,operacionId:contratoDestino.operacion_id,precio:String(contratoDestino.precio_tn||x.precio),cantidad:String(contratoDestino.cantidad_tn||x.cantidad),tipo:"F1"}));
       const {data:estadoConf,error:confError}=await supabase.rpc("estado_confidencialidad_operacion",{p_operacion_id:requestedOperation});
       if(confError)setError(confError.message);else setConfidentiality((estadoConf||[]) as ConfidentialityStatus[]);
       void loadSignedCopies(contratoDestino.id,contratoDestino.operacion_id);
     } else if(params.get("tab")==="mis") setTab("mis");
   }
   if(p.error)setError("No se pudo cargar el catálogo de productos: "+p.error.message);else setProductos((p.data||[]).map((x:any)=>String(x.nombre)));
   if(port.error)setError("No se pudo cargar el catálogo de puertos: "+port.error.message);else setPuertos((port.data||[]).map((x:any)=>String(x.nombre)));
   setOperaciones((op.data||[]).map((x:any)=>({...x,moneda:x.monedas?.codigo||null})) as Operation[]);
   setExtensions((ext.data||[]) as Extension[]);
   if(!conf.error)setConfidentiality((conf.data||[]) as ConfidentialityStatus[]); else setConfidentiality([]);
   setLoading(false);
 }
 useEffect(()=>{void load(); const requested=new URLSearchParams(window.location.search).get("tab"); if(requested==="firmas")setTab("firmas"); else if(requested==="mis")setTab("mis");},[]);
 async function revisarCancelacion(id:string,resultado:"APROBADA"|"RECHAZADA"){
   const observaciones=window.prompt(resultado==="APROBADA"?"Observación administrativa (opcional):":"Motivo del rechazo:");
   if(resultado==="RECHAZADA"&&!observaciones?.trim()){setError("Para rechazar, ingresá el motivo.");return;}
   const {error}=await supabase.rpc("revisar_cancelacion_contrato",{p_cancelacion_id:id,p_resultado:resultado,p_observaciones:observaciones?.trim()||null});
   if(error){setError(error.message);return;}
   setMessage(resultado==="APROBADA"?"Cancelación aprobada y registrada.":"Solicitud de cancelación rechazada.");
   await load();
 }
 async function solicitarCancelacion(){
   if(!selected?.operacion_id){setError("Seleccioná primero un contrato.");return;}
   if(cancelReason.trim().length<3){setError("Indicá el motivo de cancelación.");return;}
   if(cancelJustification.trim().length<10){setError("El justificativo debe tener al menos 10 caracteres.");return;}
   setCancelBusy(true);setError("");setMessage("");
   try{
     const {data,error}=await supabase.rpc("solicitar_cancelacion_contrato",{p_operacion_id:selected.operacion_id,p_motivo:cancelReason.trim(),p_justificativo:cancelJustification.trim(),p_evidencia_url:cancelEvidence.trim()||null});
     if(error)throw error;
     setMessage("Solicitud de cancelación registrada y enviada a revisión. El contrato sigue vigente hasta que se apruebe.");
     setCancelReason("");setCancelJustification("");setCancelEvidence("");
     await load();
   }catch(e){setError(e instanceof Error?e.message:"No se pudo solicitar la cancelación.");}
   finally{setCancelBusy(false);}
 }
 async function solicitarExtension(){
   if(!selected?.operacion_id){setMessage("Seleccioná primero un contrato en Mis contratos.");return;}
   const days=Number(extensionDays);
   if(!Number.isInteger(days)||days<1||days>30){setError("La prórroga debe ser de 1 a 30 días.");return;}
   if(extensionReason.trim().length<3){setError("Indicá el motivo de la prórroga.");return;}
   if(extensionJustification.trim().length<10){setError("El justificativo debe explicar con detalle por qué necesitás más tiempo.");return;}
   setExtensionBusy(true);setError("");setMessage("");
   try{
     const {error}=await supabase.rpc("solicitar_prorroga_contrato",{p_operacion_id:selected.operacion_id,p_dias_solicitados:days,p_motivo:extensionReason.trim(),p_justificativo:extensionJustification.trim(),p_evidencia_url:extensionEvidence.trim()||null,p_datos_adicionales:{detalle_necesidad:extensionDetails.trim()||null}});
     if(error) throw error;
     setMessage("Solicitud de prórroga enviada para auditoría. El plazo no cambia hasta que sea aprobada.");
     setExtensionReason("");setExtensionJustification("");setExtensionEvidence("");setExtensionDetails("");setExtensionDays("1"); await load();
   }catch(e){setError(e instanceof Error?e.message:"No se pudo solicitar la prórroga.");} finally{setExtensionBusy(false);}
 }

 async function loadSignedCopies(contractId:string,operationId?:string){
   const {data,error}=await supabase.from("contrato_copias_firmadas").select("id,rol,empresa_id,version_contrato,nombre_archivo,storage_path,sha256,estado,observaciones,subido_at,revisado_at").eq("contrato_id",contractId).order("subido_at",{ascending:true});
   if(error){setError(error.message);setCopyRows([]);return;} setCopyRows(data||[]);
   // La aprobación de ambas copias debe llevar automáticamente la operación a Logística.
   const latestVersion=Math.max(0,...(data||[]).map((x:any)=>Number(x.version_contrato||0)));
   const latestCopies=(data||[]).filter((x:any)=>Number(x.version_contrato||0)===latestVersion);
   const bothApproved=["VENDEDOR","COMPRADOR"].every((role)=>latestCopies.some((x:any)=>String(x.rol).toUpperCase()===role&&String(x.estado).toUpperCase()==="APROBADA"));
   if(bothApproved){
     const {data:syncResult,error:syncError}=await supabase.rpc("sincronizar_workflow_firmas_contrato",{p_contrato_id:contractId});
     if(syncError){console.error("No se pudo avanzar automáticamente a Logística / Entrega:",syncError);setError("Las dos firmas están aprobadas, pero no se pudo avanzar la operación: "+syncError.message);}
     else if(syncResult?.avanzada){setMessage("Las dos firmas fueron aprobadas. La operación avanzó automáticamente a Logística / Entrega.");}
   }
   const {data:{user}}=await supabase.auth.getUser();
   if(user){
     const {data:profile}=await supabase.from("profiles").select("active_company_id").eq("id",user.id).maybeSingle();
     if(profile?.active_company_id&&(operationId||selected?.operacion_id)){
       const {data:participants}=await supabase.from("operacion_participantes").select("rol").eq("operacion_id",operationId||selected!.operacion_id).eq("empresa_id",profile.active_company_id).in("rol",["VENDEDOR","COMPRADOR"]);
       setAllowedCopyRoles((participants||[]).map((x:any)=>String(x.rol).toUpperCase()));
     }else setAllowedCopyRoles([]);
   }
 }
 async function uploadPartyCopy(role:"VENDEDOR"|"COMPRADOR",file:File|null){
   if(!selected?.id||!selected.operacion_id){setError("Seleccioná un contrato.");return;}
   if(!file||file.type!=="application/pdf"){setError("Cada parte debe subir su copia firmada en PDF.");return;}
   setCopyBusy(role);setError("");setMessage("");
   let path:string|null=null;
   try{
     const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Iniciá sesión.");
     const bytes=await file.arrayBuffer();const digest=await crypto.subtle.digest("SHA-256",bytes);
     const sha=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
     const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100);
     path=selected.operacion_id+"/contratos/"+selected.id+"/"+role+"/"+crypto.randomUUID()+"-"+safe;
     const {error:up}=await supabase.storage.from("documentos-operacion").upload(path,file,{contentType:"application/pdf",upsert:false});if(up)throw up;
     const rpcName=isPlatformAdmin?"registrar_copia_firmada_contrato_admin":"registrar_copia_firmada_contrato";
     const {error:rpcError}=await supabase.rpc(rpcName,{p_contrato_id:selected.id,p_rol:role,p_storage_path:path,p_nombre_archivo:file.name,p_sha256:sha});
     if(rpcError)throw rpcError;
     setMessage("Firma del "+(role==="VENDEDOR"?"vendedor":"comprador")+" recibida. Queda pendiente de tu revisión.");
     if(role==="VENDEDOR")setVendorFile(null);else setBuyerFile(null);
     await loadSignedCopies(selected.id,selected.operacion_id);
   }catch(e:any){if(path)await supabase.storage.from("documentos-operacion").remove([path]);const detail=String(e?.message||e?.error_description||"Error desconocido");setError("No se pudo registrar la firma: "+detail+(e?.code?" (código "+e.code+")":""));}
   finally{setCopyBusy(null);}
 }
 async function revisarCopiaFirmada(id:string,result:"APROBADA"|"RECHAZADA"){
   let reason:string|null=null;
   if(result==="RECHAZADA"){reason=window.prompt("Indicá el motivo del rechazo para que la parte pueda corregirlo:")?.trim()||null;if(!reason){setError("Para rechazar una firma tenés que indicar el motivo.");return;}}
   setError("");setMessage("");
   const {error}=await supabase.rpc("revisar_copia_firmada_contrato",{p_copia_id:id,p_resultado:result,p_observaciones:reason});
   if(error){setError(error.message);return;}
   setMessage(result==="APROBADA"?"Firma aprobada. Se verificará automáticamente la segunda firma para avanzar a Logística / Entrega.":"Firma rechazada. El motivo queda registrado para que la parte corrija y vuelva a cargar el PDF.");
   if(selected?.id)await loadSignedCopies(selected.id);
   await load();
 }
 async function abrirCopiaFirmada(path:string){
   const {data,error}=await supabase.storage.from("documentos-operacion").createSignedUrl(path,60);
   if(error||!data?.signedUrl){setError(error?.message||"No se pudo abrir el PDF.");return;}
   window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 async function subirPdfFirmado(){
   if(!selected?.operacion_id){setError("Seleccioná primero un contrato.");return;}
   if(!signedPdfFile){setError("Seleccioná un archivo PDF firmado.");return;}
   if(signedPdfFile.type!=="application/pdf"){setError("Solo se admite PDF.");return;}
   setSignedUploadBusy(true);setError("");setMessage("");
   try{
     const bytes=await signedPdfFile.arrayBuffer();
     const hash=await crypto.subtle.digest("SHA-256",bytes);
     const sha=Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
     const safe=signedPdfFile.name.replace(/[^a-zA-Z0-9._-]/g,"_");
     const path=selected.operacion_id+"/"+crypto.randomUUID()+"-"+safe;
     const {error:upError}=await supabase.storage.from("documentos-operacion").upload(path,signedPdfFile,{contentType:"application/pdf",upsert:false});
     if(upError)throw upError;
     const {data,error:dbError}=await supabase.from("documentos_operacion").insert({operacion_id:selected.operacion_id,tipo_documento:"CONTRATO_FIRMADO_EXTERNAMENTE",nombre_archivo:signedPdfFile.name,url_archivo:"storage://documentos-operacion/"+path,version:1,obligatorio:false,aprobado:false,sha256:sha}).select("id,nombre_archivo,url_archivo,aprobado,firmado_externamente,sha256,creado_en,operacion_id").single();
     if(dbError)throw dbError;
     setExternalDocs(prev=>[data as ExternalDoc,...prev]);setExternalDocId(data.id);setExternalSha(sha);setSignedPdfFile(null);
     setMessage("PDF firmado cargado correctamente. Queda pendiente de aprobación documental antes de confirmar la firma.");
   }catch(e){setError(e instanceof Error?e.message:"No se pudo subir el PDF firmado.");}
   finally{setSignedUploadBusy(false);}
 }
 async function confirmarFirmaExterna(){
   if(!selected?.id){setError("Seleccioná primero un contrato.");return;}
   if(!externalDocId){setError("Seleccioná el documento firmado externamente.");return;}
   if(!/^[0-9a-fA-F]{64}$/.test(externalSha.trim())){setError("Ingresá el SHA-256 de 64 caracteres hexadecimales del PDF firmado.");return;}
   setExternalBusy(true);setError("");setMessage("");
   try{
     const {data,error}=await supabase.rpc("confirmar_firma_externa",{p_contrato_id:selected.id,p_documento_id:externalDocId,p_sha256:externalSha.trim(),p_nombre_archivo:externalDocs.find(d=>d.id===externalDocId)?.nombre_archivo||null});
     if(error)throw error;
     setMessage("Firma externa confirmada. El contrato quedó registrado con evidencia EXTERNA_MANUAL y SHA-256.");
     setExternalSha(""); await load();
   }catch(e){setError(e instanceof Error?e.message:"No se pudo confirmar la firma externa.");}
   finally{setExternalBusy(false);}
 }
 async function cargarDocumentosFirma(operationId:string){
   const {data,error}=await supabase.from("documentos_operacion").select("id,nombre_archivo,url_archivo,aprobado,firmado_externamente,sha256,creado_en,operacion_id").eq("operacion_id",operationId).order("creado_en",{ascending:false});
   if(error){setError(error.message);setExternalDocs([]);return;}
   setExternalDocs((data||[]) as ExternalDoc[]);
   const first=(data||[]).find((d:any)=>d.aprobado&&d.url_archivo&&!d.firmado_externamente);
   setExternalDocId(first?.id||"");
 }
 async function abrirDocumentoExterno(raw:string){
   if(raw.startsWith("storage://")){
     const value=raw.slice("storage://".length); const slash=value.indexOf("/"); const bucket=value.slice(0,slash),path=value.slice(slash+1);
     const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,3600);
     if(error||!data?.signedUrl){setError(error?.message||"No se pudo abrir el documento seguro.");return;}
     window.open(data.signedUrl,"_blank","noopener,noreferrer"); return;
   }
   window.open(raw,"_blank","noopener,noreferrer");
 }
 function calculateShaFromFile(file:File){
   void file.arrayBuffer().then(buf=>crypto.subtle.digest("SHA-256",buf)).then(hash=>{const hex=Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");setExternalSha(hex);setMessage("SHA-256 calculado. Registrá ese mismo PDF en Documentos antes de confirmar la firma.");}).catch(()=>setError("No se pudo calcular el SHA-256 del archivo."));
 }

 function selectOperation(id:string){
   const op=operaciones.find(x=>x.id===id);
   if(!op){ setForm(x=>({...x,operacionId:""})); setConfidentiality([]); return; }
   setForm(x=>({...x,operacionId:id,cantidad:String(op.cantidad_tn ?? ""),precio:String(op.precio_tn ?? ""),moneda:"USD",tipoOperacion:op.publicacion_compra_id&&op.publicacion_venta_id?"COMPRAVENTA (COMPRA + VENTA)":op.publicacion_compra_id?"COMPRA":"VENTA"}));
   void cargarConfidencialidad(id);
   void cargarPartesOperacion(id);
   void cargarDocumentosFirma(id);
 }
 async function cargarPartesOperacion(operationId:string){
   const {data}=await supabase.from("partes_operacion").select("rol,nombre_razon_social").eq("operacion_id",operationId);
   if(!data)return;
   setForm(x=>({...x,
     vendedor:data.find((p:any)=>String(p.rol).toUpperCase()==="VENDEDOR")?.nombre_razon_social||"",
     comprador:data.find((p:any)=>String(p.rol).toUpperCase()==="COMPRADOR")?.nombre_razon_social||"",
     intermediario:data.find((p:any)=>String(p.rol).toUpperCase()==="INTERMEDIARIO")?.nombre_razon_social||""
   }));
 }
 async function cargarConfidencialidad(operationId:string){
   const {data,error}=await supabase.rpc("estado_confidencialidad_operacion",{p_operacion_id:operationId});
   if(error){setError(error.message);setConfidentiality([]);return;}
   setConfidentiality((data||[]) as ConfidentialityStatus[]);
 }
 async function aceptarConfidencialidad(rol:ConfidentialityStatus["rol"]){
   if(!form.operacionId)return;
   setConfidentialityBusy(true);setError("");setMessage("");
   try{
     const {data:{session}}=await supabase.auth.getSession();
     const ua=typeof navigator!=="undefined"?navigator.userAgent:null;
     const ip=null;
     const {error}=await supabase.rpc("aceptar_confidencialidad_operacion",{p_operacion_id:form.operacionId,p_rol:rol,p_ip:ip,p_user_agent:ua});
     if(error)throw error;
     setMessage("Conformidad operativa de confidencialidad registrada para "+rol+". El evento queda auditado, pero no equivale a firma digital certificada ni sustituye la firma formal del acuerdo.");
     await cargarConfidencialidad(form.operacionId);
   }catch(e){setError(e instanceof Error?e.message:"No se pudo registrar la aceptación.");}
   finally{setConfidentialityBusy(false);}
 }
 async function saveDraft(){
   if(!form.operacionId){setMessage("Seleccioná una operación.");return;}
   setBusy(true);setError("");setMessage("");
   const op=operaciones.find(x=>x.id===form.operacionId);
   if(!op){setError("La operación seleccionada ya no está disponible.");setBusy(false);return;}
   const cantidad=Number(form.cantidad)||0,precio=Number(form.precio)||0;
   const numeroContrato=selected?.numero_contrato||`ABIA-${op.codigo}-BORRADOR`;
   const payload={numero_contrato:numeroContrato,cantidad_tn:cantidad,precio_tn:precio,importe_total:cantidad*precio,moneda:"USD",condicion_entrega:form.condicion,lugar_carga:"",destino:form.puerto,forma_pago:form.pago,plazo_pago:"",flete:"",calidad:form.observaciones,observaciones:form.observaciones,vendedor:form.vendedor,comprador:form.comprador,contenido:contractContent(form)};
   const {error}=await supabase.rpc("guardar_contrato_comercial",{p_operacion_id:form.operacionId,p_datos:payload});
   if(error)setError(error.message);else{setMessage("Borrador guardado en la operación.");await load();}
   setBusy(false);
 }
 function contractContent(f:FormState){
   return JSON.stringify({tipo:f.tipo,tipo_operacion:f.tipoOperacion,producto:f.producto,campania:f.campania,cantidad_tn:Number(f.cantidad)||0,precio_tn:Number(f.precio)||0,moneda:"USD",condicion:f.condicion,puerto:f.puerto,entrega:f.entrega,pago:f.pago,observaciones:f.observaciones,vendedor:f.vendedor,comprador:f.comprador,intermediario:f.intermediario,procedencia:f.procedencia,comision:f.comision,jurisdiccion:f.jurisdiccion,ciudadArbitral:f.ciudadArbitral});
 }

 const update=(key:keyof FormState,value:string)=>setForm(x=>({...x,[key]:value}));
 const hasIntermediary=confidentiality.some(c=>c.rol==="INTERMEDIARIO")||Boolean(form.intermediario.trim());
 const effectiveForm={...form,intermediario:hasIntermediary?(form.intermediario||"EL INTERMEDIARIO"):""};
 const current=selected;

 function savePdfFile(pdf:jsPDF,filename:string){
  const blob=pdf.output("blob");
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;
  anchor.download=filename;
  anchor.rel="noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 function download(tipo:"F1"){
  if(!form.operacionId||!form.producto){setMessage("Seleccioná una operación y producto antes de generar el PDF.");return;}
  try{
   const next={...effectiveForm,tipo};
   setForm(x=>({...x,tipo}));
   savePdfFile(buildPdf(next),`AgroBrokerIA-Borrador-Comercial-${tipo}.pdf`);
   setError("");
   setMessage(`Borrador comercial ${tipo} descargado correctamente.`);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo descargar el PDF.");}
 }
 function downloadConfidentiality(){
  try{
   const name=hasIntermediary?"AgroBrokerIA-Borrador-Confidencialidad-No-Circunvencion-Comisiones.pdf":"AgroBrokerIA-Borrador-Confidencialidad-Operacion.pdf";
   savePdfFile(buildConfidentialityPdf(effectiveForm),name);
   setError("");
   setMessage(hasIntermediary?"Borrador de confidencialidad, no circunvención y comisiones descargado; requiere revisión legal.":"Borrador de confidencialidad de la operación descargado; requiere revisión legal.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo descargar el PDF.");}
 }
 function preview(tipo:"F1"){setForm(x=>({...x,tipo}));setMessage(`Vista previa ${tipo} seleccionada.`)}
 function printPdf(){const pdf=buildPdf(form);const url=pdf.output("bloburl");window.open(url.toString(),"_blank","noopener,noreferrer")}
 function emailPdf(){const subject=encodeURIComponent(`Contrato ${form.tipo} AgroBrokerIA`);window.location.href=`mailto:?subject=${subject}&body=${encodeURIComponent("Adjuntá el PDF generado por AgroBrokerIA.")}`}
 function sharePdf(){if(navigator.share){void navigator.share({title:`Contrato ${form.tipo} AgroBrokerIA`,text:"Contrato generado por AgroBrokerIA"})}else{download(form.tipo)}}
 
 return <main className="contract-builder-reference">
  <header className="contract-builder-head"><div><h1>Contratos</h1><p>Contratos Digitales · Borradores F1 de referencia para compraventa y abastecimiento. Toda oferta aceptada genera un borrador de condiciones comerciales para revisión de ambas partes. Hasta incorporar el formulario oficial vigente de la Bolsa, el PDF de AgroBrokerIA no se presenta como modelo homologado ni como contrato firmado o registrado.</p></div><div className="contract-builder-actions"><button onClick={()=>setTab("plantillas")}>▣ Plantillas</button><button onClick={()=>setTab("firmas")}>⌁ Firmas</button><button className="contract-new" onClick={()=>{setTab("tipos");setSelected(null);setForm(initial);setMessage("Nuevo contrato listo para completar.")}}>＋ Nuevo contrato</button></div></header>
  {error&&<div className="contract-builder-alert error">{error}</div>}{message&&<div className="contract-builder-alert">{message}</div>}

  <nav className="contract-builder-tabs">{[["tipos","Tipos de contratos"],["mis","Mis contratos"],["plantillas","Plantillas"],["clausulas","Puntos a revisar"],["firmas","Firmas"],["historial","Historial"]].map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}</button>)}</nav>

  {tab==="tipos"?<section className="contract-builder-grid">
    <div className="contract-builder-form">
      <h2>Seleccionar tipo de contrato</h2>
      <div className="contract-type-picks">
        <div className="contract-template-single"><b>Contratos Digitales · Modelo F1</b><span>Borrador de condiciones comerciales estructurado bajo esquema F1. No sustituye el formulario oficial vigente de la Bolsa. La firma digital integrada dentro de AgroBrokerIA está próximamente; la instrumentación, firma y registración institucional pueden realizarse mediante Confirma de la BCR, sujeto a sus requisitos.</span><a href="https://www.bcr.com.ar/es/servicios/servicios-digitales/confirma" target="_blank" rel="noreferrer">Consultar servicio digital Confirma de la Bolsa de Comercio de Rosario ↗</a></div>
        <button className={form.tipo==="F1"?"selected f1":""} onClick={()=>preview("F1")}><b>▤</b><span><strong>F1</strong><small>Borrador F1 de referencia</small></span><i>✓</i></button>
      </div>
      <h2>Seleccionar commodity</h2>
      <div className="contract-commodity-picks">{productos.slice(0,4).map((p,i)=><button type="button" key={p} className={form.producto===p?"selected":""} onClick={()=>update("producto",p)}><b>{["🫘","🌽","🌾","🌻"][i]}</b><span>{p}</span></button>)}<button type="button" className="more-commodity" onClick={()=>document.getElementById("commodity-select")?.focus()}><b>•••</b><span>Otros</span></button></div>
      <div className="contract-builder-section-title"><h2>Datos del contrato</h2><span>{form.tipo==="F1"?"F1":"F1"}</span></div>
      <div className="contract-builder-fields">
       <label>Operación<select value={form.operacionId} onChange={e=>selectOperation(e.target.value)}><option value="">Seleccionar operación</option>{operaciones.map(o=><option key={o.id} value={o.id}>{o.codigo} · {o.publicacion_compra_id&&o.publicacion_venta_id?"Compra + Venta":o.publicacion_compra_id?"Compra":"Venta"} · {Number(o.cantidad_tn).toLocaleString("es-AR")} TN · {o.estado}</option>)}</select></label>
       <label>Tipo de operación<input value={form.tipoOperacion} readOnly/><small>Se determina por la operación: compra + venta.</small></label><label>Tipo de contrato<select value={form.tipo} onChange={e=>update("tipo",e.target.value as "F1")}><option value="F1">F1</option></select></label>
       <label>Commodity<select id="commodity-select" value={form.producto} onChange={e=>update("producto",e.target.value)}>{productos.map(p=><option key={p}>{p}</option>)}</select></label>
       <label>Cantidad (TN)<input value={form.cantidad} onChange={e=>update("cantidad",e.target.value)} inputMode="decimal"/></label>
       <label>Precio (USD / TN)<input value={form.precio} onChange={e=>update("precio",e.target.value)} inputMode="decimal"/></label>
       <label>Condición de precio<select value={form.condicion} onChange={e=>update("condicion",e.target.value)}>{["FAS","FOB","CIF","Precio pizarra","FCA"].map(x=><option key={x}>{x}</option>)}</select></label>
       <label>Puerto de entrega<select value={form.puerto} onChange={e=>update("puerto",e.target.value)}><option value="">Seleccionar puerto</option>{puertos.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Fecha de entrega<input value={form.entrega} onChange={e=>update("entrega",e.target.value)}/></label>
       <label>Forma de pago<input value={form.pago} onChange={e=>update("pago",e.target.value)} placeholder="Completar según la operación"/></label>
       <label>Vendedor<input value={form.vendedor} onChange={e=>update("vendedor",e.target.value)} placeholder="Razón social"/></label>
       <label>Comprador<input value={form.comprador} onChange={e=>update("comprador",e.target.value)} placeholder="Razón social"/></label>
       <label>Intermediario (si existe)<input value={form.intermediario} onChange={e=>update("intermediario",e.target.value)} placeholder="Se deja vacío si no hay intermediario"/></label>
       <label>Campaña<input value={form.campania} onChange={e=>update("campania",e.target.value)} placeholder="Ej. 2025/2026"/></label>
       <label>Procedencia<input value={form.procedencia} onChange={e=>update("procedencia",e.target.value)}/></label>
       <label>Comisión<input value={form.comision} onChange={e=>update("comision",e.target.value)} placeholder="Porcentaje o monto por tonelada"/></label>
      </div>
      <label className="contract-builder-observation">Observaciones (opcional)<textarea value={form.observaciones} onChange={e=>update("observaciones",e.target.value)} /></label>

      <button className="contract-generate" onClick={()=>download(form.tipo)}>Generar contrato PDF&nbsp; →</button>
      <button className="contract-generate" disabled={busy||!form.operacionId} onClick={saveDraft}>{busy?"Guardando…":"Guardar borrador en la operación →"}</button>
      <div className="contract-output-actions"><button onClick={()=>download(form.tipo)}>▣ Descargar PDF</button><button onClick={printPdf}>▣ Imprimir</button><button onClick={emailPdf}>✉ Enviar por email</button><button onClick={sharePdf}>⌁ Compartir</button></div>
    </div>
    <div className="contract-previews">
      <PreviewCard type="F1" form={form} onDownload={download} active/>
    </div>
  </section>:null}

  {tab==="mis"&&<section className="contract-list-panel"><h2>Mis contratos</h2>{loading?<p>Cargando contratos…</p>:rows.length===0?<p>No hay contratos registrados todavía.</p>:rows.map(c=><button key={c.id} onClick={()=>{setSelected(c);setTab("mis");setForm(x=>({...x,operacionId:c.operacion_id,precio:String(c.precio_tn||x.precio),cantidad:String(c.cantidad_tn||x.cantidad),tipo:"F1"}));setMessage("Contrato seleccionado.");void loadSignedCopies(c.id)}}><strong>{c.numero_contrato}</strong><span>Borrador F1 · {c.estado}</span><small>{c.fecha_firma?new Date(c.fecha_firma).toLocaleDateString("es-AR"):"Sin firma"}</small></button>)}
   {selected&&<div className="contract-info-panel" style={{marginTop:16}}><h2 style={{marginTop:18}}>Solicitar más tiempo para cerrar el contrato</h2><p>La solicitud queda auditada. El vencimiento actual no cambia hasta que un administrador apruebe la prórroga.</p><div className="contract-builder-fields">
    <label>Días adicionales solicitados<input type="number" min="1" max="30" value={extensionDays} onChange={e=>setExtensionDays(e.target.value)}/></label>
    <label>Motivo<textarea value={extensionReason} onChange={e=>setExtensionReason(e.target.value)} placeholder="Por qué no se puede cerrar todavía"/></label>
    <label>Justificativo detallado<textarea value={extensionJustification} onChange={e=>setExtensionJustification(e.target.value)} placeholder="Todos los datos necesarios: qué falta, dependencias, fechas, responsables y por qué necesitás ese plazo."/></label>
    <label>Evidencia / comprobante (opcional)<input value={extensionEvidence} onChange={e=>setExtensionEvidence(e.target.value)} placeholder="URL o referencia del respaldo"/></label>
    <label>Datos adicionales para auditoría (opcional)<textarea value={extensionDetails} onChange={e=>setExtensionDetails(e.target.value)} placeholder="Documentación pendiente, fecha estimada, proveedor, entidad financiera u otros datos."/></label>
   </div><button className="contract-generate" disabled={extensionBusy} onClick={()=>void solicitarExtension()}>{extensionBusy?"Enviando…":"Solicitar prórroga para cerrar el contrato →"}</button><div className="contract-cancel-panel"><h3>Solicitar cancelación del contrato</h3><p>La solicitud queda registrada y auditada. El contrato no se cancela hasta que la revisión administrativa la apruebe.</p><div className="contract-builder-fields"><label>Motivo de cancelación<input value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="Ej. Las partes decidieron no continuar"/></label><label>Justificativo detallado<textarea value={cancelJustification} onChange={e=>setCancelJustification(e.target.value)} placeholder="Explicá por qué no desean continuar con la operación."/></label><label>Evidencia o respaldo (opcional)<input value={cancelEvidence} onChange={e=>setCancelEvidence(e.target.value)} placeholder="URL o referencia del respaldo"/></label></div><button type="button" className="contract-cancel-request" disabled={cancelBusy||selected.estado==="CANCELADO"} onClick={()=>void solicitarCancelacion()}>{cancelBusy?"Enviando solicitud…":selected.estado==="CANCELADO"?"Contrato cancelado":"Solicitar cancelación →"}</button></div></div>}
   <section className="contract-info-panel" style={{marginTop:16}}><h2>Solicitudes de cancelación · Administración</h2>{!isPlatformAdmin?<p>La revisión está reservada a Administración.</p>:cancelRows.length===0?<p>No hay solicitudes de cancelación registradas.</p>:cancelRows.map((x:any)=><article key={x.id} className="contract-cancel-request-row"><b>{x.estado_revision} · Operación {x.operacion_id}</b><span>{x.motivo}</span><small>{x.justificativo}</small>{x.evidencia_url&&<a href={x.evidencia_url} target="_blank" rel="noreferrer">Ver evidencia</a>}{x.estado_revision==="PENDIENTE"&&<div><button type="button" onClick={()=>void revisarCancelacion(x.id,"APROBADA")}>Aprobar cancelación</button><button type="button" onClick={()=>void revisarCancelacion(x.id,"RECHAZADA")}>Rechazar solicitud</button></div>}</article>)}</section><section className="contract-info-panel" style={{marginTop:16}}><h2>Historial de prórrogas auditadas</h2>{extensions.filter(x=>!selected||x.contrato_id===selected.id).length===0?<p>No hay solicitudes de prórroga para este contrato.</p>:extensions.filter(x=>!selected||x.contrato_id===selected.id).map(x=><article key={x.id}><b>{x.estado_revision} · {x.dias_solicitados} día(s) solicitados</b><span>{new Date(x.created_at).toLocaleString("es-AR")} · solicitado hasta {new Date(x.vencimiento_solicitado_at).toLocaleString("es-AR")}</span><span>{x.motivo}</span><small>{x.justificativo}</small>{x.dias_aprobados&&<span>Aprobados: {x.dias_aprobados} día(s) · nuevo vencimiento: {x.vencimiento_aprobado_at?new Date(x.vencimiento_aprobado_at).toLocaleString("es-AR"):"-"}</span>}{x.observaciones_revision&&<small>Auditoría: {x.observaciones_revision}</small>}</article>)}</section>
  </section>}

  {tab==="plantillas"&&<section className="contract-info-panel"><h2>Plantillas</h2><div className="contract-template-grid"><button type="button" onClick={()=>{setForm(x=>({...x,tipo:"F1",condicion:"FAS"}));setMessage("Plantilla F1 cargada.")}}><b>F1 · Referencia</b><span>Borrador comercial F1; pendiente de incorporar el formulario oficial vigente de la Bolsa.</span></button></div></section>}

  {tab==="clausulas"&&<section className="contract-info-panel"><h2>Puntos comerciales a revisar</h2>{["Producto y variedad","Cantidad y tolerancias","Calidad y humedad","Precio y moneda","Condición comercial","Lugar y plazo de entrega","Flete y logística","Forma y plazo de pago","Documentación fiscal","Impuestos y retenciones"].map((x,i)=><button className="contract-clause-button" type="button" key={x} onClick={()=>{const line=(i+1)+". "+x;setForm(f=>({...f,observaciones:f.observaciones?(f.observaciones+"\\n"+line):line}));setMessage("Punto de revisión agregado: "+x+".")}}><b>{i+1}. {x}</b><span>Agregar punto a revisar</span></button>)}</section>}

  {tab==="firmas"&&<section className="contract-info-panel"><h2>Firmas</h2>{selected&&<div className="contract-info-panel signature-workflow" style={{marginTop:16}}>
  <h3>Firmas del contrato</h3><p>Solo se requieren dos copias del mismo contrato: una firmada por el vendedor y otra por el comprador. Administración revisa cada PDF y acepta o rechaza la evidencia.</p>
  {(allowedCopyRoles.length>0||isPlatformAdmin)?<div className="signature-upload-grid">
   {(allowedCopyRoles.includes("VENDEDOR")||isPlatformAdmin)&&<article className="signature-upload-card"><h4>Firma del vendedor</h4><p>{isPlatformAdmin?"Cargá aquí la copia firmada que recibiste del vendedor.":"Descargá el contrato, firmalo y cargá aquí tu copia en PDF."}</p><input type="file" accept="application/pdf" onChange={e=>setVendorFile(e.target.files?.[0]||null)}/><button className="contract-generate" disabled={copyBusy!==null||!vendorFile} onClick={()=>void uploadPartyCopy("VENDEDOR",vendorFile)}>{copyBusy==="VENDEDOR"?"Subiendo…":"Enviar firma del vendedor"}</button></article>}
   {(allowedCopyRoles.includes("COMPRADOR")||isPlatformAdmin)&&<article className="signature-upload-card"><h4>Firma del comprador</h4><p>{isPlatformAdmin?"Cargá aquí la copia firmada que recibiste del comprador.":"Descargá el mismo contrato, firmalo y cargá aquí tu copia en PDF."}</p><input type="file" accept="application/pdf" onChange={e=>setBuyerFile(e.target.files?.[0]||null)}/><button className="contract-generate" disabled={copyBusy!==null||!buyerFile} onClick={()=>void uploadPartyCopy("COMPRADOR",buyerFile)}>{copyBusy==="COMPRADOR"?"Subiendo…":"Enviar firma del comprador"}</button></article>}
  </div>:<div className="signature-no-upload">{isPlatformAdmin?"Tu cuenta tiene permisos de administración, pero no está asignada como vendedor ni comprador en esta operación. Desde aquí podés revisar y aceptar o rechazar las firmas que carguen las partes.":"Esta cuenta no tiene asignado el rol de vendedor o comprador en esta operación. Ingresá con la cuenta correspondiente para cargar la firma."}</div>}
  <div className="signature-review-list"><h4>{isPlatformAdmin?"Revisión administrativa de firmas":"Estado de las firmas"}</h4>
   {copyRows.length===0?<p>Todavía no se recibieron firmas.</p>:copyRows.map((r:any)=><article className="contract-sign-card" key={r.id}><div><strong>Firma {r.rol==="VENDEDOR"?"del vendedor":r.rol==="COMPRADOR"?"del comprador":r.rol} · versión {r.version_contrato}</strong><span>{r.estado==="APROBADA"?"Aceptada":r.estado==="RECHAZADA"?"Rechazada":"Pendiente de revisión"}</span><small>{r.nombre_archivo} · {new Date(r.subido_at).toLocaleString("es-AR")}</small>{r.observaciones&&<small>Observación: {r.observaciones}</small>}</div><div className="signature-review-actions"><button type="button" onClick={()=>void abrirCopiaFirmada(r.storage_path)}>Ver PDF</button>{isPlatformAdmin&&r.estado==="PENDIENTE"&&<><button type="button" onClick={()=>void revisarCopiaFirmada(r.id,"APROBADA")}>Aceptar</button><button type="button" onClick={()=>void revisarCopiaFirmada(r.id,"RECHAZADA")}>Rechazar</button></>}</div></article>)}
  </div>
 </div>}
<div className="contract-sign-list">{loading?<p>Cargando contratos…</p>:rows.length===0?<p>No hay contratos registrados para firmar.</p>:rows.map(c=><article className={"contract-sign-card "+(selected?.id===c.id?"selected":"")} key={c.id}><div><strong>{c.numero_contrato}</strong><span>Borrador F1 · {c.estado}</span><small>{c.cantidad_tn?Number(c.cantidad_tn).toLocaleString("es-AR")+" TN":"Cantidad no indicada"} · {c.fecha_firma?"Firmado":"Pendiente de firma"}</small></div><button type="button" onClick={()=>{setSelected(c);setTab("firmas");void cargarDocumentosFirma(c.operacion_id);void loadSignedCopies(c.id);setMessage("Contrato seleccionado.")}}>Seleccionar</button></article>)}</div><Link className="contract-route-button" href="/documentos">Ir a Documentos →</Link></section>}

{tab==="historial"&&<section className="contract-info-panel"><h2>Historial de versiones</h2>{versions.length===0?<p>No hay versiones registradas.</p>:versions.map(v=><article key={v.id}><b>Versión {v.version}</b><span>{v.estado} · {v.motivo||"Sin motivo"} · {new Date(v.creado_en).toLocaleString("es-AR")}</span></article>)}</section>}
  <div className="contract-language-bar"><span>Idioma del documento</span>{IDIOMAS.map(([code,name])=><button key={code} className={idioma===code?"active":""} onClick={()=>{setIdioma(code);setMessage(`Idioma seleccionado: ${name}.`)}}>{name}</button>)}</div>
 </main>
}

function PreviewCard({type,form,onDownload,active}:{type:"F1";form:FormState;onDownload:(type:"F1")=>void;active:boolean}){const items:[string,string][]=[["Vendedor",form.vendedor],["Comprador",form.comprador],["Intermediario",form.intermediario],["Producto",form.producto],["Campaña",form.campania],["Cantidad",form.cantidad?money(form.cantidad)+" toneladas métricas":""],["Precio",form.precio?money(form.precio)+" "+form.moneda+"/ tonelada":""],["Condición",form.condicion],["Procedencia",form.procedencia],["Destino / puerto",form.puerto],["Entrega",form.entrega],["Pago",form.pago],["Calidad / observaciones",form.observaciones]];return <article className={"contract-preview-card "+(active?"active":"")}><div className="paper-header"><span>AGROBROKERIA · BORRADOR</span><b>{type}</b></div><h3>Borrador de condiciones comerciales</h3><p style={{fontSize:11,color:"#9b2c2c",fontWeight:700}}>REFERENCIA F1 · NO FIRMADO · NO REGISTRADO</p><p style={{fontSize:11,color:"#475569"}}>Este documento es un borrador de trabajo. No es el formulario oficial homologado de la Bolsa y no sustituye su revisión ni registración institucional.</p><div className="paper-clauses">{items.map(([h,t])=><div className="paper-clause" key={h}><b>{h}</b><span>{t||"Pendiente de completar"}</span></div>)}</div><div className="paper-signatures"><p>Antes de formalizar, confirmar calidad, tolerancias, entrega, precio, moneda, impuestos y condiciones de pago.</p><p>La comisión por servicio tecnológico se gestiona en el módulo de Comisiones y no se incorpora como cláusula de este borrador.</p><p>Firma y registración: utilizar el formulario oficial vigente y el canal institucional correspondiente, como Confirma de la BCR.</p></div><button type="button" onClick={()=>onDownload(type)}>Descargar borrador PDF</button></article>}
