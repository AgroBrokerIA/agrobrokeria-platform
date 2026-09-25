import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deflateRawSync } from "node:zlib";

export const runtime="nodejs";

function esc(s:string){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}
function crc32(buf:Buffer){let c=0xffffffff;for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function zip(entries:{name:string,data:Buffer}[]){const locals:Buffer[]=[];const centrals:Buffer[]=[];let offset=0;for(const e of entries){const c=crc32(e.data),z=deflateRawSync(e.data),n=Buffer.from(e.name);const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0,6);lh.writeUInt16LE(8,8);lh.writeUInt16LE(0,10);lh.writeUInt16LE(0,12);lh.writeUInt32LE(c,14);lh.writeUInt32LE(z.length,18);lh.writeUInt32LE(e.data.length,22);lh.writeUInt16LE(n.length,26);lh.writeUInt16LE(0,28);locals.push(Buffer.concat([lh,n,z]));const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(0,8);ch.writeUInt16LE(8,10);ch.writeUInt16LE(0,12);ch.writeUInt16LE(0,14);ch.writeUInt32LE(c,16);ch.writeUInt32LE(z.length,20);ch.writeUInt32LE(e.data.length,24);ch.writeUInt16LE(n.length,28);ch.writeUInt16LE(0,30);ch.writeUInt16LE(0,32);ch.writeUInt16LE(0,34);ch.writeUInt16LE(0,36);ch.writeUInt32LE(0,38);ch.writeUInt32LE(offset,42);centrals.push(Buffer.concat([ch,n]));offset+=lh.length+n.length+z.length}const body=Buffer.concat(locals),cd=Buffer.concat(centrals),eoc=Buffer.alloc(22);eoc.writeUInt32LE(0x06054b50,0);eoc.writeUInt16LE(8,8);eoc.writeUInt16LE(8,10);eoc.writeUInt32LE(cd.length,12);eoc.writeUInt32LE(body.length,16);return Buffer.concat([body,cd,eoc])}
function para(text:string,bold=false){return "<w:p><w:r>"+(bold?"<w:rPr><w:b/></w:rPr>":"")+"<w:t xml:space=\"preserve\">"+esc(text)+"</w:t></w:r></w:p>"}
function docXml(title:string,meta:string[],content:string){const lines=content.split(/\r?\n/);let body=para(title,true)+meta.map(x=>para(x)).join("")+"<w:p/>"+lines.map(x=>x.trim()?para(x):"<w:p/>").join("");return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>'}

export async function POST(req:NextRequest){
 try{
  const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
  const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
  const {contractId}=await req.json();if(typeof contractId!=="string"||!/^[0-9a-f-]{36}$/i.test(contractId))return NextResponse.json({error:"INVALID_CONTRACT_ID"},{status:400});
  const {data:c,error}=await sb.from("contratos").select("*").eq("id",contractId).single();if(error||!c)return NextResponse.json({error:"CONTRACT_NOT_FOUND"},{status:404});
  const {data:parts}=await sb.from("operacion_participantes").select("empresa_id,rol").eq("operacion_id",c.operacion_id);
  const ids=(parts||[]).map(x=>x.empresa_id);const {data:companies}=ids.length?await sb.from("empresas").select("id,razon_social,cuit,direccion,localidad,provincia").in("id",ids):{data:[]};
  const names=(companies||[]).map(x=>{const p=(parts||[]).find(y=>y.empresa_id===x.id);return (p?.rol||"PARTE")+": "+x.razon_social+" — CUIT "+x.cuit+(x.direccion? " — "+x.direccion:"")}).join(" | ");
  const xml=docXml("CONTRATO "+c.numero_contrato,[ "AgroBrokerIA — documento contractual", "Tipo: "+(c.tipo_contrato||"No especificado"), "Operación: "+c.operacion_id, names, "Estado: "+(c.estado||"BORRADOR") ],c.contenido||"");
  const files=[
   {name:"[Content_Types].xml",data:Buffer.from('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>')},
   {name:"_rels/.rels",data:Buffer.from('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>')},
   {name:"word/document.xml",data:Buffer.from(xml)},
   {name:"docProps/core.xml",data:Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Contrato '+esc(c.numero_contrato)+'</dc:title><dc:creator>AgroBrokerIA</dc:creator><cp:lastModifiedBy>AgroBrokerIA</cp:lastModifiedBy></cp:coreProperties>')}
  ];
  const out=zip(files);return new NextResponse(out,{status:200,headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","Content-Disposition":"attachment; filename=\"Contrato-"+String(c.numero_contrato).replace(/[^a-zA-Z0-9_-]/g,"_")+".docx\"","Cache-Control":"private, no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"DOCX_GENERATION_ERROR"},{status:500})}
}