"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase/client";
import "./reference.css";

type C={id:string;operacion_id:string;numero_contrato:string;tipo_contrato:string|null;estado:string;fecha_firma:string|null;cantidad_tn:number|null;precio_tn:number|null;importe_total:number|null;contenido:string|null;creado_en?:string};
type V={id:string;contrato_id:string;version:number;estado:string;motivo:string|null;documento_hash:string|null;creado_en:string};

const IDIOMAS=[["es","Español"],["en","English"],["pt","Português"],["it","Italiano"],["fr","Français"],["de","Deutsch"]];

type FormState={operacionId:string;tipo:"F1"|"F2";producto:string;campania:string;cantidad:string;precio:string;moneda:string;condicion:string;puerto:string;entrega:string;pago:string;observaciones:string;vendedor:string;comprador:string;intermediario:string;procedencia:string;jurisdiccion:string;ciudadArbitral:string;comision:string};
type Operation={id:string;codigo:string;cantidad_tn:number;precio_tn:number;importe_total:number;estado:string;moneda:string|null};
type Extension={id:string;operacion_id:string;contrato_id:string;motivo:string;justificativo:string;dias_solicitados:number;vencimiento_solicitado_at:string;evidencia_url:string|null;estado_revision:string;dias_aprobados:number|null;vencimiento_aprobado_at:string|null;observaciones_revision:string|null;created_at:string};
type ConfidentialityStatus={rol:"COMPRADOR"|"VENDEDOR"|"INTERMEDIARIO";company_id:string;requerido:boolean;aceptado:boolean;aceptado_at:string|null;version:string|null;hash_sha256:string|null;documento_codigo?:string|null;documento_titulo?:string|null};

const initial:FormState={operacionId:"",tipo:"F1",producto:"",campania:"",cantidad:"",precio:"",moneda:"",condicion:"FAS",puerto:"",entrega:"",pago:"",observaciones:"",vendedor:"",comprador:"",intermediario:"",procedencia:"",jurisdiccion:"",ciudadArbitral:"",comision:""};

function esc(v:string){return v.replace(/[<>]/g,"");}
function money(v:string){const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2}):"0,00"}

function drawWrapped(pdf:jsPDF,text:string,x:number,y:number,maxWidth:number,fontSize=9,lineGap=11){
 pdf.setFont("helvetica","normal");pdf.setFontSize(fontSize);const lines=pdf.splitTextToSize(text,maxWidth);pdf.text(lines,x,y);return y+lines.length*lineGap;
}

function buildPdfWithoutIntermediary(f:FormState){
 const pdf=new jsPDF({orientation:"portrait",unit:"pt",format:"a4"});
 const W=pdf.internal.pageSize.getWidth();const m=42;const blue=[35,68,110] as const;
 const field=(v:string)=>v||"_______________________________";
 const wrap=(t:string,x:number,y:number,w:number,size=9,gap=11)=>{pdf.setFont("helvetica","normal");pdf.setFontSize(size);const ls=pdf.splitTextToSize(t,w);pdf.text(ls,x,y);return y+ls.length*gap};
 const title=(t:string)=>{pdf.setFont("helvetica","bold");pdf.setFontSize(15);pdf.setTextColor(...blue);pdf.text(t,W/2,42,{align:"center"});};
 title(f.tipo==="F1"?"CONTRATO DE COMPRAVENTA DE GRANOS – FORMATO F1":"CONTRATO PRIVADO DE COMPRAVENTA DE GRANOS – F2");
 pdf.setFont("helvetica","normal");pdf.setFontSize(8);pdf.setTextColor(55,55,55);pdf.text("Conste por el presente documento el contrato "+f.tipo+", celebrado el "+new Date().toLocaleDateString("es-AR")+", entre las partes identificadas a continuación.",m,70);
 let y=98;
 pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.text("1. PARTES INTERVINIENTES",m,y);y+=17;
 y=wrap("EL VENDEDOR: "+field(f.vendedor)+" con CUIT/RUT/RUC __________________ y domicilio en ______________________________.",m,y,W-2*m);
 y=wrap("EL COMPRADOR: "+field(f.comprador)+" con CUIT/RUT/RUC __________________ y domicilio en ______________________________.",m,y+4,W-2*m);
 y+=12;pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.text("2. CONDICIONES PARTICULARES",m,y);y+=16;
 const rows=[
  ["Grano / Producto",field(f.producto)],["Cosecha / Campaña",field(f.campania)],
  ["Cantidad",f.cantidad?money(f.cantidad)+" Toneladas Métricas (Tolerancia: +/- 5%)":"________________ Toneladas Métricas"],
  ["Precio Pactado",f.precio?money(f.precio)+" por Tonelada Métrica (Moneda: "+(f.moneda||"________")+")":"________________ por Tonelada Métrica"],
  ["Base de Entrega",f.condicion||"________________"],["Procedencia",field(f.procedencia)],
  ["Destino / Entrega",f.puerto||"________________"],["Período de Entrega",f.entrega||"Desde el ____/____/_______ hasta el ____/____/_______"],
  ["Forma de Pago",f.pago||"________________"],["Observaciones",f.observaciones||"________________"]
 ];
 const c1=145,c2=W-2*m-c1;
 for(const [a,b] of rows){const h=27;pdf.setDrawColor(175,190,205);pdf.rect(m,y,c1,h);pdf.rect(m+c1,y,c2,h);pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.setTextColor(...blue);pdf.text(a,m+6,y+17);pdf.setFont("helvetica","normal");pdf.setTextColor(30,30,30);pdf.text(pdf.splitTextToSize(b,c2-12),m+c1+6,y+11);y+=h;}
 y+=12;pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.text("3. CLÁUSULAS CONTRACTUALES",m,y);y+=17;
 const clauses=[
  ["PRIMERA: OBJETO","El Vendedor se obliga a transferir la propiedad y a entregar la cantidad de granos especificada en las condiciones particulares, y el Comprador se obliga a recibirla y pagar el precio estipulado."],
  ["SEGUNDA: CALIDAD","La mercadería deberá cumplir con los estándares de calidad comercial vigentes para el producto y lugar de entrega. Las determinaciones de calidad y peso se realizarán conforme a las condiciones comerciales pactadas."],
  ["TERCERA: CONFIDENCIALIDAD","Las partes se obligan a mantener la confidencialidad de los términos de la operación y de la información comercial no pública intercambiada con motivo de la misma. La aceptación del documento de confidencialidad de la operación es condición documental para su cierre en AgroBrokerIA."],
  ["CUARTA: DOCUMENTACIÓN Y ENTREGA","La documentación, lugar y período de entrega serán los consignados en las condiciones particulares y en los documentos operativos asociados a la operación."],
  ["QUINTA: JURISDICCIÓN","La ley aplicable y la jurisdicción serán las consignadas en la operación y deberán completarse antes de la firma definitiva."]
 ];
 for(const [h,t] of clauses){pdf.setFont("helvetica","bold");pdf.setFontSize(9);pdf.text(h,m,y);y=wrap(t,m,y+12,W-2*m,8.5,10);y+=7;if(y>760){pdf.addPage();y=48;}}
 y+=20;pdf.setFont("helvetica","normal");pdf.setFontSize(8);pdf.text("En prueba de conformidad, se firma el presente contrato por las partes intervinientes.",m,y);y+=42;
 const sigs=[["EL VENDEDOR",f.vendedor||"____________________________"],["EL COMPRADOR",f.comprador||"____________________________"]];
 sigs.forEach(([a,b],i)=>{const x=m+i*(W-2*m)/2;pdf.line(x,y,x+180,y);pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.text(a,x,y+13);pdf.setFont("helvetica","normal");pdf.text("Nombre: "+b,x,y+25);pdf.text("DNI/Pasaporte: __________________",x,y+37);});
 return pdf;
}

function buildPdf(f:FormState){
 if(!f.intermediario.trim()) return buildPdfWithoutIntermediary(f);
 const pdf=new jsPDF({orientation:"portrait",unit:"pt",format:"a4"});
 const W=pdf.internal.pageSize.getWidth();const H=pdf.internal.pageSize.getHeight();const m=42;const green=[41,105,72] as const;const blue=[35,68,110] as const;
 const field=(label:string,value:string)=>value||"_______________________________";
 const party=(role:string,value:string)=>`• EL ${role}: ${field(role,value)}`;
 const pageTitle=(title:string,subtitle?:string)=>{pdf.setFont("helvetica","bold");pdf.setFontSize(15);pdf.setTextColor(...(blue));pdf.text(title,W/2,42,{align:"center"});if(subtitle){pdf.setFontSize(10);pdf.setTextColor(...green);pdf.text(subtitle,W/2,57,{align:"center"})}};
 const header=(dateText:string)=>{pdf.setFont("helvetica","normal");pdf.setFontSize(8);pdf.setTextColor(55,55,55);pdf.text(`Conste por el presente documento que se celebra el ${dateText}, bajo las condiciones que se detallan a continuación.`,m,76);};
 if(f.tipo==="F1"){
   pageTitle("CONTRATO DE COMPRAVENTA DE GRANOS – FORMATO F1");
   header(new Date().toLocaleDateString("es-AR"));
   let y=100;
   pdf.setFont("helvetica","bold");pdf.setFontSize(11);pdf.setTextColor(25,25,25);pdf.text("1. PARTES INTERVINIENTES",m,y);y+=18;
   y=drawWrapped(pdf,party("VENDEDOR",f.vendedor)+` con CUIT/RUT/RUC __________________ y domicilio en ______________________________, representado por ____________________________.`,m,y,W-2*m,9);
   y+=5;y=drawWrapped(pdf,party("COMPRADOR",f.comprador)+` con CUIT/RUT/RUC __________________ y domicilio en ______________________________, representado por ____________________________.`,m,y,W-2*m,9);
   y+=5;y=drawWrapped(pdf,party("INTERMEDIARIO (BRÓKER)",f.intermediario)+` con CUIT/RUT/RUC __________________ y domicilio en ______________________________.`,m,y,W-2*m,9);
   y+=12;pdf.setFont("helvetica","bold");pdf.setFontSize(11);pdf.text("2. CONDICIONES PARTICULARES DE LA MERCADERÍA",m,y);y+=14;
   const rows=[["Grano / Producto",field("",f.producto)],["Cosecha / Campaña",field("",f.campania)],["Cantidad (Toneladas)",f.cantidad?money(f.cantidad)+" Toneladas Métricas (Tolerancia: +/- 5%)":"________________ Toneladas Métricas (Tolerancia: +/- 5%)"],["Precio Pactado",f.precio?money(f.precio)+" por Tonelada Métrica (Moneda: "+(f.moneda||"________")+")":"________________ por Tonelada Métrica (Moneda: ________)"],["Base de Entrega",f.condicion||"________________ (Ej: FAS / FOB / Planta)"],["Procedencia",field("",f.procedencia)],["Destino / Entrega",f.puerto||"_______________________________"],["Período de Entrega",f.entrega||"Desde el ____/____/_______ hasta el ____/____/_______"]];
   const col1=145,col2=W-2*m-col1;for(const [a,b] of rows){const h=28;pdf.setDrawColor(175,190,205);pdf.rect(m,y,col1,h);pdf.rect(m+col1,y,col2,h);pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.setTextColor(...blue);pdf.text(a,m+6,y+17);pdf.setFont("helvetica","normal");pdf.setTextColor(30,30,30);const ls=pdf.splitTextToSize(b,m+col1+6?col2-12:col2-12);pdf.text(ls,m+col1+6,y+12);y+=h;}
   y+=14;pdf.setFont("helvetica","bold");pdf.setFontSize(11);pdf.text("3. CLÁUSULAS CONTRACTUALES",m,y);y+=18;
   const clauses=[
    ["PRIMERA: OBJETO",`El Vendedor se obliga a transferir la propiedad y a entregar la cantidad de granos especificada en las Condiciones Particulares, y el Comprador se obliga a recibirla y a pagar el precio estipulado conforme a las modalidades comerciales acordadas.`],
    ["SEGUNDA: CALIDAD, MERMAS Y ACONDICIONAMIENTO",`La mercadería deberá cumplir con los estándares de calidad comercial vigentes para el tipo de grano en la región de entrega. Las determinaciones de calidad, peso, humedad y materias extrañas se realizarán en el punto de destino. Cualquier exceso sobre las bases de tolerancia autorizadas sufrirá las mermas y rebajas de precio correspondientes bajo las tablas oficiales del sector.`]
   ];
   for(const [h,t] of clauses){pdf.setFont("helvetica","bold");pdf.setFontSize(9);pdf.text(h,m,y);y=drawWrapped(pdf,t,m,y+12,W-2*m,8.5,10);y+=8;}
   pdf.addPage();y=48;pdf.setFont("helvetica","bold");pdf.setFontSize(9.5);pdf.setTextColor(25,25,25);pdf.text("TERCERA: INTERMEDIACIÓN Y PAGO DE COMISIONES",m,y);y=drawWrapped(pdf,`Las partes reconocen expresamente que la presente operación de compraventa ha sido gestionada, coordinada y concretada mediante la gestión del Intermediario.`,m,y+14,W-2*m,9,11);y+=7;
   y=drawWrapped(pdf,`1. Comisión: Se establece una comisión de ${f.comision||"_______________________"} sobre el valor total de la operación.`,m,y,W-2*m,9,11);
   y=drawWrapped(pdf,`2. Responsable del Pago: El pago de la comisión estará a cargo de ( ) El Vendedor / ( ) El Comprador / ( ) Ambas partes por partes iguales.`,m,y+3,W-2*m,9,11);
   y=drawWrapped(pdf,`3. Plazo de Pago: Dicha comisión deberá ser liquidada y abonada al Intermediario dentro de los ______ días hábiles posteriores a la liquidación parcial o total de cada entrega/embarque de los granos.`,m,y+3,W-2*m,9,11);
   y+=8;pdf.setFont("helvetica","bold");pdf.text("CUARTA: NO CIRCUNVENCIÓN",m,y);y=drawWrapped(pdf,"El Comprador y el Vendedor se comprometen a no realizar operaciones comerciales directas entre sí que eludan, omitan o salteen la participación del Intermediario respecto a este lote, su extensión, o contratos sucesivos derivados de este negocio durante un plazo de 3 (tres) años. El incumplimiento de esta cláusula penalizará a la parte infractora con el cobro del doble de las comisiones devengadas.",m,y+14,W-2*m,9,11);
   y+=8;pdf.setFont("helvetica","bold");pdf.text("QUINTA: JURISDICCIÓN Y SOLUCIÓN DE DISPUTAS",m,y);y=drawWrapped(pdf,`Para cualquier controversia que se suscite con motivo de la interpretación, cumplimiento o rescisión de este contrato, las partes se someten voluntariamente al arbitraje y jurisdicción de la Cámara Arbitral de Cereales de la ciudad de ${f.ciudadArbitral||"______________________"}, renunciando expresamente a cualquier otro fuero o jurisdicción.`,m,y+14,W-2*m,9,11);
   y+=20;pdf.setFont("helvetica","normal");pdf.text("En prueba de conformidad, se firman 3 (tres) ejemplares de un mismo tenor y a un solo efecto.",m,y);y+=38;
   const sigs=[["Por el Vendedor",f.vendedor||"____________________________"],["Por el Comprador",f.comprador||"____________________________"],["Por el Intermediario",f.intermediario||"____________________________"]];
   sigs.forEach(([a,b],i)=>{const x=m+i*(W-2*m)/3;pdf.line(x,y,x+135,y);pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.text(a,x,y+13);pdf.setFont("helvetica","normal");pdf.text("Nombre: "+b,x,y+25);pdf.text("DNI/Pasaporte: __________________",x,y+37);});
 } else {
   pageTitle("ACUERDO DE ABASTECIMIENTO CONTINUO DE GRANOS","CONTRATO MARCO REGENERATIVO - FORMATO F2");
   header(new Date().toLocaleDateString("es-AR"));
   let y=100;pdf.setFont("helvetica","bold");pdf.setFontSize(11);pdf.text("1. PARTES INTERVINIENTES",m,y);y+=18;
   y=drawWrapped(pdf,`EL VENDEDOR (PROVEEDOR): ${field("",f.vendedor)}   CUIT/RUT: ____________________   Domicilio: _______________________________ `,m,y,W-2*m,9);
   y=drawWrapped(pdf,`EL COMPRADOR (RECEPTOR): ${field("",f.comprador)}   CUIT/RUT: ____________________   Domicilio: _______________________________ `,m,y+4,W-2*m,9);
   y=drawWrapped(pdf,`EL INTERMEDIARIO (BRÓKER): ${field("",f.intermediario)}   CUIT/RUT: ____________________   Domicilio: _______________________________ `,m,y+4,W-2*m,9);
   y+=12;pdf.setFont("helvetica","bold");pdf.setFontSize(11);pdf.text("2. ESPECIFICACIONES DE LOGÍSTICA Y ABASTECIMIENTO (FORMATO F2)",m,y);y+=15;
   const rows=[["Especie / Grano",field("",f.producto),"Campaña Agrícola",f.campania||"2025 / 2026"],["Volumen Total Comprometido",f.cantidad?money(f.cantidad)+" Tons.":"____________ Tons.","Tolerancia Contractual","+/- 5 %"],["Esquema de Entregas / Cupos","Mensual [ ] Quincenal [ ] Según Plan de Cargas [ ]","Frecuencia de Carga","Programada F2"],["Precio Base / Fórmula",f.precio?(f.moneda||"USD")+" "+money(f.precio)+" por Tonelada":"USD ________ por Tonelada","Fijación de Precio","Pizarra [ ] Mercado [ ] Fijo [ ]"],["Procedencia de la Carga",f.procedencia||"________________________","Condición de Entrega",f.condicion||"Puesta en Destino / FAS / FOB"],["Destino Final / Puerto",f.puerto||"________________________","Plazo del Acuerdo","Hasta completar volumen"]];
   const c1=120,c2=175,c3=115,c4=W-2*m-c1-c2-c3;for(const r of rows){const h=30;let x=m;[c1,c2,c3,c4].forEach(w=>{pdf.setDrawColor(175,190,205);pdf.rect(x,y,w,h);x+=w});pdf.setFont("helvetica","bold");pdf.setFontSize(7.2);pdf.setTextColor(...green);pdf.text(r[0],m+4,y+11);pdf.text(r[2],m+c1+c2+4,y+11);pdf.setFont("helvetica","normal");pdf.setTextColor(30,30,30);pdf.text(pdf.splitTextToSize(r[1],c2-8),m+c1+4,y+11);pdf.text(pdf.splitTextToSize(r[3],c4-8),m+c1+c2+c3+4,y+11);y+=h;}
   y+=14;pdf.setFont("helvetica","bold");pdf.setFontSize(11);pdf.text("3. CLÁUSULAS GENERALES",m,y);y+=18;
   y=drawWrapped(pdf,"PRIMERA: NATURALEZA DEL FORMATO F2: El presente acuerdo rige bajo la modalidad F2 de abastecimiento programado. El Vendedor se obliga a asegurar la disponibilidad de los cupos y camiones/vagones de acuerdo al cronograma logístico pactado, garantizando un flujo continuo de mercadería hacia el destino fijado por el Comprador.",m,y,W-2*m,8.5,10);y+=8;
   y=drawWrapped(pdf,"SEGUNDA: CALIDAD Y TOLERANCIAS: Todos los embarques deberán cumplir estrictamente con el estándar de comercialización oficial. Las determinaciones de calidad (humedad, materias extrañas, daño por insectos o factores climáticos) se realizarán en la balanza de destino, aplicándose las mermas y rebajas correspondientes de acuerdo a las tablas vigentes del sector agrícola.",m,y,W-2*m,8.5,10);y+=8;
   y=drawWrapped(pdf,`TERCERA: COMISIONES DE INTERMEDIACIÓN: Las partes operativas (Vendedor y Comprador) reconocen de manera irrevocable la intervención directa del Intermediario en la estructuración de este canal de abastecimiento. Se fija una comisión de ${f.comision||"____________________"} (porcentaje o monto fijo por tonelada), que se devengará y liquidará automáticamente sobre cada entrega efectiva y parcial de granos, debiendo acreditarse al Intermediario dentro de los cinco (5) días hábiles posteriores a cada cobro.`,m,y,W-2*m,8.5,10);
   pdf.addPage();y=48;pdf.setFont("helvetica","bold");pdf.setFontSize(9.5);pdf.text("CUARTA: NO CIRCUNVENCIÓN Y EXCLUSIVIDAD",m,y);y=drawWrapped(pdf,"El Comprador y el Vendedor se obligan mutuamente a no entablar negociaciones de suministro directo, contratos laterales ni extensiones de cupos que eludan o excluyan la participación y el cobro de comisiones del Intermediario respecto de las partes o de la procedencia aquí descrita, por un plazo de tres (3) años contados desde la firma de este documento.",m,y+14,W-2*m,9,11);y+=10;pdf.setFont("helvetica","bold");pdf.text("QUINTA: JURISDICCIÓN ARBITRAL",m,y);y=drawWrapped(pdf,`Ante cualquier discrepancia en la interpretación de los rendimientos, mermas o ejecución comercial de este contrato marco F2, las partes se someten de común acuerdo a la competencia exclusiva de la Cámara Arbitral de Cereales de la jurisdicción aplicable, renunciando expresamente a la vía judicial ordinaria.`,m,y+14,W-2*m,9,11);y+=30;
   const sigs=[["POR EL VENDEDOR",f.vendedor],["POR EL COMPRADOR",f.comprador],["POR EL INTERMEDIARIO",f.intermediario]];sigs.forEach(([a,b],i)=>{const x=m+i*(W-2*m)/3;pdf.line(x,y,x+135,y);pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.text(a,x,y+13);pdf.setFont("helvetica","normal");pdf.text("Aclaración: "+(b||"________________"),x,y+26);});
 }
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
 if(hasIntermediary){
  lines('Conste por el presente documento el Contrato de Confidencialidad, No Circunvención y Pago de Comisiones (en adelante, el "Contrato"), que se celebra y entra en vigor a partir del 02 de octubre de 2026 (en adelante, la "Fecha de Entrada en Vigor"), entre las partes abajo firmantes:');
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
  lines('Conste por el presente documento el Contrato de Confidencialidad de la Operación (en adelante, el "Contrato"), que se celebra entre las partes identificadas en el cuadro de firmas respecto de la operación comercial registrada en AgroBrokerIA.');
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
 const [extensionDays,setExtensionDays]=useState("1"),[extensionReason,setExtensionReason]=useState(""),[extensionJustification,setExtensionJustification]=useState(""),[extensionEvidence,setExtensionEvidence]=useState(""),[extensionDetails,setExtensionDetails]=useState(""),[extensionBusy,setExtensionBusy]=useState(false);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState(""),[adobeBusy,setAdobeBusy]=useState(false),[adobeStatus,setAdobeStatus]=useState("");
 const [tab,setTab]=useState("tipos"),[idioma,setIdioma]=useState("es"),[busy,setBusy]=useState(false);
 const [form,setForm]=useState<FormState>(initial);
 const [selected,setSelected]=useState<C|null>(null);

 async function load(){
   setLoading(true);setError("");
   const selectedOperationId=selected?.operacion_id||form.operacionId||null;
   const [c,v,p,port,op,ext,conf]=await Promise.all([
     supabase.from("contratos").select("id,operacion_id,numero_contrato,tipo_contrato,estado,fecha_firma,cantidad_tn,precio_tn,importe_total,contenido,creado_en").order("creado_en",{ascending:false}),
     supabase.from("contrato_versiones").select("id,contrato_id,version,estado,motivo,documento_hash,creado_en").order("creado_en",{ascending:false}),
     supabase.from("productos").select("nombre").eq("activo",true).order("nombre"),
     supabase.from("catalogo_puertos").select("nombre").eq("activo",true).order("orden"),
     supabase.from("operaciones").select("id,codigo,cantidad_tn,precio_tn,importe_total,estado,monedas(codigo)").order("fecha_operacion",{ascending:false}),
     supabase.from("prorrogas_contrato").select("id,operacion_id,contrato_id,motivo,justificativo,dias_solicitados,vencimiento_solicitado_at,evidencia_url,estado_revision,dias_aprobados,vencimiento_aprobado_at,observaciones_revision,created_at").order("created_at",{ascending:false}),
     selectedOperationId?supabase.rpc("estado_confidencialidad_operacion",{p_operacion_id:selectedOperationId}):Promise.resolve({data:[],error:null})
   ]);
   if(c.error)setError(c.error.message); if(v.error)setError(v.error.message);
   setRows((c.data||[]) as C[]);setVersions((v.data||[]) as V[]);
   if(!p.error&&p.data?.length)setProductos(p.data.map((x:any)=>x.nombre));
   if(!port.error&&port.data?.length)setPuertos(port.data.map((x:any)=>x.nombre));
   setOperaciones((op.data||[]).map((x:any)=>({...x,moneda:x.monedas?.codigo||null})) as Operation[]);
   setExtensions((ext.data||[]) as Extension[]);
   if(!conf.error)setConfidentiality((conf.data||[]) as ConfidentialityStatus[]); else setConfidentiality([]);
   setLoading(false);
 }
 useEffect(()=>{void load(); (async()=>{ try{ const {data:{session}}=await supabase.auth.getSession(); if(!session?.access_token)return; const res=await fetch("/api/firma/adobe/status",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"}); const data=await res.json().catch(()=>({})); if(res.ok&&data.connected){setAdobeStatus("connected");} else {setAdobeStatus("");} const status=new URLSearchParams(window.location.search).get("firma"); if(status==="connected"&&!data.connected){setMessage("Adobe Sign no confirmó una conexión válida. Volvé a conectar desde este botón.");} else if(status){setMessage(status==="connected"?"Adobe Acrobat Sign conectado correctamente.":status==="denied"?"Autorización de Adobe Sign cancelada.":status==="token_exchange_failed"?`Adobe Sign rechazó el intercambio OAuth.${new URLSearchParams(window.location.search).get("detail")?" Detalle: "+new URLSearchParams(window.location.search).get("detail"):""}`:status==="expired_state"?"La autorización de Adobe Sign expiró.":status==="invalid_callback"?"La prueba OAuth llegó al callback sin estado de seguridad; iniciá la conexión desde AgroBrokerIA.":"No se pudo completar la conexión con Adobe Sign.");} }catch{setAdobeStatus("");}finally{setAdobeBusy(false)} })();},[]);
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
   if(!op){ setForm(x=>({...x,operacionId:""})); setConfidentiality([]); return; }
   setForm(x=>({...x,operacionId:id,cantidad:String(op.cantidad_tn ?? ""),precio:String(op.precio_tn ?? ""),moneda:op.moneda||""}));
   void cargarConfidencialidad(id);
   void cargarPartesOperacion(id);
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
     setMessage("Confidencialidad aceptada y registrada para "+rol+". Esta aceptación queda auditada y es obligatoria para cerrar la operación.");
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
   const payload={numero_contrato:numeroContrato,tipo_contrato:form.tipo,cantidad_tn:cantidad,precio_tn:precio,importe_total:cantidad*precio,moneda:form.moneda||null,condicion_entrega:form.condicion,lugar_carga:"",destino:form.puerto,forma_pago:form.pago,plazo_pago:"",flete:"",calidad:form.observaciones,observaciones:form.observaciones,vendedor:form.vendedor,comprador:form.comprador,contenido:contractContent(form)};
   const {error}=await supabase.rpc("guardar_contrato_comercial",{p_operacion_id:form.operacionId,p_datos:payload});
   if(error)setError(error.message);else{setMessage("Borrador guardado en la operación.");await load();}
   setBusy(false);
 }
 function contractContent(f:FormState){
   return JSON.stringify({tipo:f.tipo,producto:f.producto,campania:f.campania,cantidad_tn:Number(f.cantidad)||0,precio_tn:Number(f.precio)||0,moneda:f.moneda||null,condicion:f.condicion,puerto:f.puerto,entrega:f.entrega,pago:f.pago,observaciones:f.observaciones,vendedor:f.vendedor,comprador:f.comprador,intermediario:f.intermediario,procedencia:f.procedencia,comision:f.comision,jurisdiccion:f.jurisdiccion,ciudadArbitral:f.ciudadArbitral});
 }

 const update=(key:keyof FormState,value:string)=>setForm(x=>({...x,[key]:value}));
 const hasIntermediary=confidentiality.some(c=>c.rol==="INTERMEDIARIO")||Boolean(form.intermediario.trim());
 const effectiveForm={...form,intermediario:hasIntermediary?(form.intermediario||"EL INTERMEDIARIO"):""};
 const current=selected;

 function download(tipo:"F1"|"F2"){if(!form.operacionId||!form.producto||!form.moneda){setMessage("Seleccioná una operación, producto y moneda antes de generar el PDF.");return;}setForm(x=>({...x,tipo}));setTimeout(()=>buildPdf({...effectiveForm,tipo}).save(`AgroBrokerIA-Contrato-${tipo}.pdf`),0);setMessage(`PDF ${tipo} generado; sin cláusulas de intermediación cuando no existe intermediario.`)}
 function downloadConfidentiality(){const name=hasIntermediary?"AgroBrokerIA-Confidencialidad-No-Circunvencion-Comisiones.pdf":"AgroBrokerIA-Confidencialidad-Operacion.pdf";buildConfidentialityPdf(effectiveForm).save(name);setMessage(hasIntermediary?"Contrato de confidencialidad, no circunvención y comisiones generado según el modelo cargado.":"Contrato de confidencialidad de la operación generado sin cláusulas de intermediación ni comisión.");}
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
        <button className={form.tipo==="F1"?"selected f1":""} onClick={()=>preview("F1")}><b>▤</b><span><strong>F1</strong><small>Contrato F1</small></span><i>✓</i></button>
        <button className={form.tipo==="F2"?"selected f2":""} onClick={()=>preview("F2")}><b>▤</b><span><strong>F2</strong><small>Contrato F2</small></span><i>✓</i></button>
      </div>
      <h2>Seleccionar commodity</h2>
      <div className="contract-commodity-picks">{productos.slice(0,4).map((p,i)=><button type="button" key={p} className={form.producto===p?"selected":""} onClick={()=>update("producto",p)}><b>{["🫘","🌽","🌾","🌻"][i]}</b><span>{p}</span></button>)}<button type="button" className="more-commodity" onClick={()=>document.getElementById("commodity-select")?.focus()}><b>•••</b><span>Otros</span></button></div>
      <div className="contract-builder-section-title"><h2>Datos del contrato</h2><span>{form.tipo==="F1"?"F1":"F2"}</span></div>
      <div className="contract-builder-fields">
       <label>Operación<select value={form.operacionId} onChange={e=>selectOperation(e.target.value)}><option value="">Seleccionar operación</option>{operaciones.map(o=><option key={o.id} value={o.id}>{o.codigo} · {Number(o.cantidad_tn).toLocaleString("es-AR")} TN · {o.estado}</option>)}</select></label>
       <label>Tipo de contrato<select value={form.tipo} onChange={e=>update("tipo",e.target.value as "F1"|"F2")}><option value="F1">F1</option><option value="F2">F2</option></select></label>
       <label>Commodity<select id="commodity-select" value={form.producto} onChange={e=>update("producto",e.target.value)}>{productos.map(p=><option key={p}>{p}</option>)}</select></label>
       <label>Cantidad (TN)<input value={form.cantidad} onChange={e=>update("cantidad",e.target.value)} inputMode="decimal"/></label>
       <label>Precio / TN<input value={form.precio} onChange={e=>update("precio",e.target.value)} inputMode="decimal"/></label>
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
      {form.operacionId&&<section className="contract-info-panel" style={{marginTop:16}}>
       <h2>Confidencialidad obligatoria de la operación</h2>
       <p>Antes de confirmar/cerrar cualquier F1 o F2, todas las partes requeridas deben aceptar el <b>{hasIntermediary?"Contrato de Confidencialidad, No Circunvención y Reconocimiento de Comisiones":"Contrato de Confidencialidad de la Operación"}</b>. Si existe intermediario, se utiliza el documento con no circunvención y reconocimiento de comisiones; si no existe, se utiliza exclusivamente el documento de confidencialidad entre vendedor y comprador. La aceptación queda registrada con versión y huella del documento.</p>
       <div className="contract-sign-list">
        {confidentiality.length===0?<p>Cargando partes requeridas…</p>:confidentiality.map(c=><article className="contract-sign-card" key={c.rol+"-"+c.company_id}><div><strong>{c.rol}</strong><span>{c.aceptado?"✓ Aceptado":"Pendiente de aceptación"}</span><small>{c.aceptado_at?new Date(c.aceptado_at).toLocaleString("es-AR"):"Debe aceptarse antes del cierre"}{c.version?" · Versión "+c.version:""}</small></div><div className="contract-sign-actions"><button type="button" disabled={confidentialityBusy||c.aceptado} onClick={()=>void aceptarConfidencialidad(c.rol)}>{c.aceptado?"Aceptado ✓":"Aceptar contrato →"}</button></div></article>)}
       </div>
       {confidentiality.length>0&&confidentiality.some(c=>!c.aceptado)&&<div className="contract-builder-alert error">La operación no puede cerrarse mientras exista una aceptación de confidencialidad pendiente.</div>}
      </section>}
      <button className="contract-generate" onClick={()=>download(form.tipo)}>Generar contrato PDF&nbsp; →</button>
      <button className="contract-generate" onClick={downloadConfidentiality}>{hasIntermediary?"Generar confidencialidad + no circunvención + comisiones →":"Generar confidencialidad de la operación →"}</button>
      <button className="contract-generate" disabled={busy||!form.operacionId} onClick={saveDraft}>{busy?"Guardando…":"Guardar borrador en la operación →"}</button>
      <div className="contract-output-actions"><button onClick={()=>download(form.tipo)}>▣ Descargar PDF</button><button onClick={printPdf}>▣ Imprimir</button><button onClick={emailPdf}>✉ Enviar por email</button><button onClick={sharePdf}>⌁ Compartir</button></div>
    </div>
    <div className="contract-previews">
      <PreviewCard type="F1" form={form} onDownload={download} active={form.tipo==="F1"}/>
      <PreviewCard type="F2" form={form} onDownload={download} active={form.tipo==="F2"}/>
    </div>
  </section>:null}

  {tab==="mis"&&<section className="contract-list-panel"><h2>Mis contratos</h2>{loading?<p>Cargando contratos…</p>:rows.length===0?<p>No hay contratos registrados todavía.</p>:rows.map(c=><button key={c.id} onClick={()=>{setSelected(c);setTab("mis");setForm(x=>({...x,operacionId:c.operacion_id,precio:String(c.precio_tn||x.precio),cantidad:String(c.cantidad_tn||x.cantidad),tipo:String(c.tipo_contrato||"").toUpperCase().includes("F1")?"F1":"F2"}));setMessage("Contrato seleccionado.")}}><strong>{c.numero_contrato}</strong><span>{c.tipo_contrato||"Contrato"} · {c.estado}</span><small>{c.fecha_firma?new Date(c.fecha_firma).toLocaleDateString("es-AR"):"Sin firma"}</small></button>)}
   {selected&&<div className="contract-info-panel" style={{marginTop:16}}><h2>Confidencialidad de este contrato</h2><p>La aceptación es obligatoria antes del cierre. El documento se determina automáticamente: con intermediario se exige también su aceptación; sin intermediario sólo participan vendedor y comprador y no se genera ningún firmante/intermediario ficticio.</p>{selected.operacion_id&&<div className="contract-sign-list">{confidentiality.map(c=><article className="contract-sign-card" key={c.rol+"-"+c.company_id}><div><strong>{c.rol}</strong><span>{c.aceptado?"✓ Aceptado":"Pendiente"}</span></div><button type="button" disabled={confidentialityBusy||c.aceptado} onClick={()=>void aceptarConfidencialidad(c.rol)}>{c.aceptado?"Aceptado ✓":"Aceptar →"}</button></article>)}</div>}<h2 style={{marginTop:18}}>Solicitar más tiempo para cerrar el contrato</h2><p>La solicitud queda auditada. El vencimiento actual no cambia hasta que un administrador apruebe la prórroga.</p><div className="contract-builder-fields">
    <label>Días adicionales solicitados<input type="number" min="1" max="30" value={extensionDays} onChange={e=>setExtensionDays(e.target.value)}/></label>
    <label>Motivo<textarea value={extensionReason} onChange={e=>setExtensionReason(e.target.value)} placeholder="Por qué no se puede cerrar todavía"/></label>
    <label>Justificativo detallado<textarea value={extensionJustification} onChange={e=>setExtensionJustification(e.target.value)} placeholder="Todos los datos necesarios: qué falta, dependencias, fechas, responsables y por qué necesitás ese plazo."/></label>
    <label>Evidencia / comprobante (opcional)<input value={extensionEvidence} onChange={e=>setExtensionEvidence(e.target.value)} placeholder="URL o referencia del respaldo"/></label>
    <label>Datos adicionales para auditoría (opcional)<textarea value={extensionDetails} onChange={e=>setExtensionDetails(e.target.value)} placeholder="Documentación pendiente, fecha estimada, proveedor, entidad financiera u otros datos."/></label>
   </div><button className="contract-generate" disabled={extensionBusy} onClick={()=>void solicitarExtension()}>{extensionBusy?"Enviando…":"Solicitar prórroga para cerrar el contrato →"}</button></div>}
   <section className="contract-info-panel" style={{marginTop:16}}><h2>Historial de prórrogas auditadas</h2>{extensions.filter(x=>!selected||x.contrato_id===selected.id).length===0?<p>No hay solicitudes de prórroga para este contrato.</p>:extensions.filter(x=>!selected||x.contrato_id===selected.id).map(x=><article key={x.id}><b>{x.estado_revision} · {x.dias_solicitados} día(s) solicitados</b><span>{new Date(x.created_at).toLocaleString("es-AR")} · solicitado hasta {new Date(x.vencimiento_solicitado_at).toLocaleString("es-AR")}</span><span>{x.motivo}</span><small>{x.justificativo}</small>{x.dias_aprobados&&<span>Aprobados: {x.dias_aprobados} día(s) · nuevo vencimiento: {x.vencimiento_aprobado_at?new Date(x.vencimiento_aprobado_at).toLocaleString("es-AR"):"-"}</span>}{x.observaciones_revision&&<small>Auditoría: {x.observaciones_revision}</small>}</article>)}</section>
  </section>}

  {tab==="plantillas"&&<section className="contract-info-panel"><h2>Plantillas</h2><div className="contract-template-grid"><button type="button" onClick={()=>{setForm(x=>({...x,tipo:"F1",condicion:"FAS"}));setMessage("Plantilla F1 cargada.")}}><b>F1 · Blanco</b><span>Modelo F1 para la operación seleccionada.</span></button><button type="button" onClick={()=>{setForm(x=>({...x,tipo:"F2",condicion:"FOB"}));setMessage("Plantilla F2 cargada.")}}><b>F2 · Privado</b><span>Modelo F2 para la operación seleccionada.</span></button></div></section>}

  {tab==="clausulas"&&<section className="contract-info-panel"><h2>Cláusulas estándar</h2>{["Objeto y alcance","Cantidad y calidad","Precio y condición","Lugar y plazo de entrega","Forma de pago","Documentación","Confidencialidad","Legislación aplicable","Solución de controversias"].map((x,i)=><button className="contract-clause-button" type="button" key={x} onClick={()=>{const line=(i+1)+". "+x;setForm(f=>({...f,observaciones:f.observaciones?(f.observaciones+"\n"+line):line}));setMessage("Cláusula incorporada: "+x+".")}}><b>{i+1}. {x}</b><span>Agregar al contrato</span></button>)}</section>}

  {tab==="firmas"&&<section className="contract-info-panel"><h2>Firmas electrónicas</h2><p>Desde acá seleccionás un contrato, conectás Adobe Acrobat Sign y enviás el documento real a firma. El estado queda registrado en AgroBrokerIA.</p>{adobeStatus==="connected"&&<div className="contract-builder-alert">✓ Adobe Acrobat Sign está conectado.</div>}<button className="contract-route-button" disabled={adobeBusy} onClick={conectarAdobe}>{adobeBusy?"Conectando…":adobeStatus==="connected"?"Adobe Acrobat Sign conectado ✓":"Conectar Adobe Acrobat Sign →"}</button><div className="contract-sign-list">{loading?<p>Cargando contratos…</p>:rows.length===0?<p>No hay contratos registrados para firmar.</p>:rows.map(c=><article className={"contract-sign-card "+(selected?.id===c.id?"selected":"")} key={c.id}><div><strong>{c.numero_contrato}</strong><span>{c.tipo_contrato||"Contrato"} · {c.estado}</span><small>{c.cantidad_tn?Number(c.cantidad_tn).toLocaleString("es-AR")+" TN":"Cantidad no indicada"} · {c.fecha_firma?"Firmado":"Pendiente de firma"}</small></div><div className="contract-sign-actions"><button type="button" onClick={()=>{setSelected(c);setMessage("Contrato seleccionado para firma: "+c.numero_contrato)}}>Seleccionar</button><button type="button" disabled={adobeBusy||c.estado==="FIRMADO"} onClick={()=>void enviarAFirma(c.id)}>{adobeBusy&&selected?.id===c.id?"Enviando…":"Enviar a firma →"}</button></div></article>)}</div><Link className="contract-route-button" href="/operaciones">Ir a operaciones →</Link></section>}

  {tab==="historial"&&<section className="contract-info-panel"><h2>Historial de versiones</h2>{versions.length===0?<p>No hay versiones registradas.</p>:versions.map(v=><article key={v.id}><b>Versión {v.version}</b><span>{v.estado} · {v.motivo||"Sin motivo"} · {new Date(v.creado_en).toLocaleString("es-AR")}</span></article>)}</section>}
  <div className="contract-language-bar"><span>Idioma del documento</span>{IDIOMAS.map(([code,name])=><button key={code} className={idioma===code?"active":""} onClick={()=>{setIdioma(code);setMessage(`Idioma seleccionado: ${name}.`)}}>{name}</button>)}</div>
 </main>
}

function PreviewCard({type,form,onDownload,active}:{type:"F1"|"F2";form:FormState;onDownload:(type:"F1"|"F2")=>void;active:boolean}){
 return <article className={"contract-preview-card "+(active?"active":"")}>
   <header><div className={type==="F1"?"green":"blue"}>▤</div><div><strong>Contrato {type} - {type==="F1"?"Blanco (Formal)":"Privado"}</strong><small>{type==="F1"?"Documento F1 generado a partir de los datos registrados.":"Documento F2 generado a partir de los datos registrados."}</small></div><button onClick={()=>onDownload(type)}>⇩ Descargar PDF</button></header>
   <div className="contract-paper"><div className="paper-brand"><strong>AgroBroker<em>IA</em></strong><span>Conectando el mundo agro</span></div><div className="paper-meta">N°: {type}-BORRADOR<br/>Fecha: {new Date().toLocaleDateString("es-AR")}</div><h3>{type==="F1"?"CONTRATO DE COMPRAVENTA DE GRANOS – F1 (BLANCO)":"CONTRATO PRIVADO DE COMPRAVENTA DE GRANOS – F2"}</h3><p>Entre <b>{form.vendedor||"EL VENDEDOR"}</b> y <b>{form.comprador||"EL COMPRADOR"}</b>, acuerdan celebrar el presente contrato de compraventa de <b>{form.producto}</b> bajo las siguientes cláusulas:</p>{[["1. OBJETO",form.producto||"No especificado"],["2. CANTIDAD",form.cantidad?money(form.cantidad)+" toneladas métricas.":"No especificada"],["3. CALIDAD",form.observaciones||"No especificada"],["4. PRECIO",form.precio&&form.moneda?form.moneda+" "+money(form.precio)+" por tonelada métrica.":"No especificado"],["5. CONDICIÓN DE PRECIO",form.condicion||"No especificada"],["6. LUGAR DE ENTREGA",form.puerto||"No especificado"],["7. PLAZO DE ENTREGA",form.entrega||"No especificado"],["8. FORMA DE PAGO",form.pago||"No especificada"],["9. DOCUMENTACIÓN","No especificada"],["10. OBSERVACIONES",form.observaciones||"Sin observaciones registradas"]].map(([h,t])=><div className="paper-clause" key={h}><b>{h}</b><span>{t}</span></div>)}<div className="paper-signatures"><div><b>{form.vendedor||"VENDEDOR"}</b><small>Firma</small></div><div><b>{form.comprador||"COMPRADOR"}</b><small>Firma</small></div></div></div>
 </article>
}
