import { parseHTML } from "npm:linkedom@0.18.12";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";
const URL=Deno.env.get("SUPABASE_URL")!,ANON=Deno.env.get("SUPABASE_ANON_KEY")!,SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,db=createClient(URL,SERVICE);
const BCR_LOCAL="https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-0",BCR_FOB="https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-1",BCR_AVAILABLE="https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-2",SOURCE="BCR/CAC";
const norm=(s:string)=>s.replace(/\s+/g," ").trim();
function num(s:string){const r=norm(s).replace(/[$u\$s\/tn]/gi,"").trim();if(!r||/^(S\/C|—|-)$/.test(r))return null;const m=r.match(/-?\d[\d.]*,?\d*/);if(!m)return null;const t=m[0],n=t.includes(",")?Number(t.replace(/\./g,"").replace(",",".")):Number(t.replace(/,/g,""));return Number.isFinite(n)?n:null}
function dateFromText(s:string){const m=norm(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0"):null}
function code(s:string){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase()}
async function commodityId(name:string){const {data}=await db.from("commodities").select("id").eq("codigo",code(name)).maybeSingle();return data?.id??null}
async function save(q:any){const stable={source:q.source,source_reference:q.source_reference,market_date:q.market_date,commodity_id:q.commodity_id,product_id:q.product_id,variety:q.variety,position:q.position,market:q.market,port:q.port,price_type:q.price_type,price:q.price,currency:q.currency,unit:q.unit};const fp=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(stable)));q.fingerprint=Array.from(new Uint8Array(fp)).map(b=>b.toString(16).padStart(2,"0")).join("");const {error}=await db.from("market_quotes").upsert(q,{onConflict:"fingerprint",ignoreDuplicates:true});if(error)throw error;return 1}
async function html(url:string){const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36","accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","accept-language":"es-AR,es;q=0.9,en;q=0.8","referer":"https://www.bolsadecereales.com/"}});if(!r.ok)throw new Error("SOURCE_HTTP_"+r.status);return await r.text()}
async function authorized(req:Request){
 const cron=Deno.env.get("CRON_SECRET"),a=req.headers.get("authorization")||"";
 if(cron&&a==="Bearer "+cron)return true;
 if(SERVICE&&a==="Bearer "+SERVICE)return true;
 const token=a.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token)return false;
 const {data:cronValid,error:cronError}=await db.rpc("validar_cron_market_sync",{p_token:token});
 if(!cronError&&cronValid===true)return true;
 const c=createClient(URL,ANON,{global:{headers:{Authorization:"Bearer "+token}}});
 const {data:{user},error:userError}=await c.auth.getUser(token);
 if(userError||!user)return false;
 const {data:admin,error:adminError}=await db.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 return !adminError&&!!admin;
}
async function parseLocal(body:string,runId:string){const d=parseHTML(body).document;if(!d)throw new Error("BCR_HTML_PARSE_ERROR");const rows=Array.from(d.querySelectorAll("tr"));let dates:string[]=[],saved=0;for(const tr of rows){const cells=Array.from(tr.querySelectorAll("th,td")).map(x=>norm(x.textContent||""));if(cells.some(x=>/Fecha Negociación/i.test(x))){dates=cells.map(dateFromText).filter((x):x is string=>!!x);continue}const idx=cells.findIndex(x=>/^(Soja|Ma[ií]z|Trigo|Girasol|Sorgo)$/i.test(x));if(idx<0||!dates.length)continue;const commodity=cells[idx],id=await commodityId(commodity),values=cells.slice(idx+1),offset=num(values[0])===null?1:0,value=num(values[offset]),prev=num(values[offset+1]);if(value==null)continue;saved+=await save({source:SOURCE,source_reference:BCR_LOCAL,market_date:dates[0],published_at:null,commodity_id:id,product_id:null,variety:null,position:"SPOT",market:"ROSARIO",port:"ROSARIO",price_type:"PIZARRA_CAC",price:value,currency:"ARS",unit:"T",status:"VALID",freshness:"UPDATED",previous_value:prev,variation:value!==null&&prev!==null?value-prev:null,payload:{commodity,dates,raw_cells:cells,run_id:runId}})}return saved}
async function parseAvailable(body:string,runId:string){
 const d=parseHTML(body).document;if(!d)throw new Error("BCR_HTML_PARSE_ERROR");
 const rows=Array.from(d.querySelectorAll("tr"));let commodity="",marketDate:string|null=null,saved=0;
 const products=/^(Trigo|Ma[ií]z|Cebada|Sorgo|Soja|Girasol)$/i;
 for(const tr of rows){
  const cells=Array.from(tr.querySelectorAll("th,td")).map(x=>norm(x.textContent||""));
  if(!cells.length)continue;
  const dateCell=cells.find(x=>/\d{2}\/\d{2}\/\d{4}/.test(x));if(dateCell)marketDate=dateFromText(dateCell)||marketDate;
  const heading=cells.find(x=>products.test(x));if(heading){commodity=heading;continue}
  if(!commodity||!marketDate||cells.length<2)continue;
  const priceText=cells[cells.length-1],value=num(priceText);if(value==null)continue;
  const currency=/u\$s|USD/i.test(priceText)?"USD":"ARS";
  const delivery=cells.slice(1,-1).filter(Boolean).join(" · ");
  const destination=cells[0]||"ROSARIO";
  const id=await commodityId(commodity);
  saved+=await save({source:SOURCE,source_reference:BCR_AVAILABLE,market_date:marketDate,published_at:null,commodity_id:id,product_id:null,variety:null,position:delivery||"SPOT",market:"ROSARIO",port:destination,price_type:"PIZARRA_DISPONIBLE",price:value,currency,unit:"T",status:"VALID",freshness:"UPDATED",previous_value:null,variation:null,payload:{commodity,destination,delivery,quality:cells.length>2?cells[cells.length-2]:null,raw_cells:cells,run_id:runId}});
 }
 return saved
}

const BCP_FAS_FOB="https://bcp.org.ar/cotizaciones/precios-fas-matba-fob.asp",BCP_ORIENTATIVOS="https://bcp.org.ar/cotizaciones/precios-orientativos.asp",BCBA_QUOTES="https://www.bolsadecereales.com/precios-oficiales",BCCBA_HOME="https://bccba.org.ar/";
function commodityCode(label:string){const n=code(label);if(n.includes("ACEITE")&&n.includes("GIRASOL"))return "ACEITE_GIRASOL";if(n.includes("ACEITE")&&n.includes("SOJA"))return "ACEITE_SOJA";if(n.includes("PELLET"))return "PELLETS_SOJA";if(n.includes("HARINA"))return "HARINA_SOJA";if(n.includes("EXPeller".toUpperCase()))return "EXPELLER_SOJA";if(n.includes("MANI"))return "MANI";if(n.includes("CEBADA"))return "CEBADA";if(n.includes("GIRASOL"))return "GIRASOL";if(n.includes("SOJA"))return "SOJA";if(n.includes("MAIZ"))return "MAIZ";if(n.includes("TRIGO"))return "TRIGO";if(n.includes("SORGO"))return "SORGO";return n.replace(/[^A-Z0-9]+/g,"_");}
function pageDate(text:string){const matches=[...text.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];const m=matches[0];if(!m)throw new Error("SOURCE_MARKET_DATE_NOT_FOUND");return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0")}
async function parseBahiaBlanca(body:string,runId:string,orientative=false){
 const d=parseHTML(body).document;if(!d)throw new Error("BCP_HTML_PARSE_ERROR");const text=norm(d.body?.textContent||"");const date=pageDate(text);let saved=0;
 for(const tr of Array.from(d.querySelectorAll("tr"))){const cells=Array.from(tr.querySelectorAll("th,td")).map(x=>norm(x.textContent||""));if(cells.length<2)continue;
  const product=cells[0];if(!/^(Cebada|Girasol|Ma[ií]z|Soja|Sorgo|Trigo|Aceite de soja|Aceite de girasol|Pellets de soja)$/i.test(product))continue;
  const raw=cells.slice(1).join(" ");const value=num(raw);if(value==null)continue;const currency=/u\s?\$\s?s|us\$|usd/i.test(raw)?"USD":"ARS";const type=orientative?"PRECIO_ORIENTATIVO":currency==="USD"?"FOB_MINAGRI":"FAS_THEORETICAL";const marketDate=pageDate(cells.join(" ")+" "+text);
  const id=await commodityId(commodityCode(product));
  saved+=await save({source:"Bolsa de Cereales y Productos de Bahía Blanca",source_reference:orientative?BCP_ORIENTATIVOS:BCP_FAS_FOB,market_date:marketDate||date,published_at:null,commodity_id:id,product_id:null,variety:null,position:"SPOT",market:"BAHIA_BLANCA",port:"BAHIA BLANCA",price_type:type,price:value,currency,unit:"T",status:"VALID",freshness:"UPDATED",previous_value:null,variation:null,payload:{product,raw_cells:cells,run_id:runId}});
 }return saved;
}
async function parseBuenosAires(body:string,runId:string){
 const d=parseHTML(body).document;if(!d)throw new Error("BCBA_HTML_PARSE_ERROR");
 const text=norm(d.body?.textContent||"");const marketDate=pageDate(text);let saved=0;
 const products=["Aceite de Girasol","Aceite de Soja","Cebada","Girasol","Maiz","Pellets de Soja","Soja","Sorgo","Trigo Pan"];
 const productFor=(cell:string)=>{const n=code(cell);return products.find(p=>n.includes(code(p)))||null;};
 const tables=Array.from(d.querySelectorAll("table"));
 for(const table of tables){
  const rows=Array.from(table.querySelectorAll("tr")).map(tr=>Array.from(tr.querySelectorAll("th,td")).map(x=>norm(x.textContent||""))).filter(row=>row.length);
  if(!rows.length)continue;
  const fobHeaderIndex=rows.findIndex(row=>row.some(x=>/^Posici[oó]n$/i.test(x))&&row.some(x=>!!productFor(x)));
  if(fobHeaderIndex>=0){
   const header=rows[fobHeaderIndex];const productColumns=header.map(productFor);
   for(const cells of rows.slice(fobHeaderIndex+1)){
    const position=cells[0]||"";if(!/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{2}$/i.test(position))continue;
    for(let i=1;i<Math.min(cells.length,productColumns.length);i++){
     const product=productColumns[i],value=num(cells[i]);if(!product||value===null)continue;
     const id=await commodityId(commodityCode(product));
     saved+=await save({source:"Bolsa de Cereales de Buenos Aires",source_reference:BCBA_QUOTES,market_date:marketDate,commodity_id:id,product_id:null,variety:null,position,market:"BUENOS_AIRES",port:null,price_type:"FOB_MINAGRI",price:value,currency:"USD",unit:"T",status:"VALID",freshness:"UPDATED",previous_value:null,variation:null,payload:{product,position,table:"FOB_LEY_21453",raw_cells:cells,run_id:runId}});
    }
   }
  }
  const fasHeaderIndex=rows.findIndex(row=>row.some(x=>/^Producto$/i.test(x))&&row.some(x=>/^Actual$/i.test(x))&&row.some(x=>/^Anterior$/i.test(x)));
  if(fasHeaderIndex>=0){
   for(const cells of rows.slice(fasHeaderIndex+1)){
    const productCell=cells.find(x=>!!productFor(x));if(!productCell)continue;
    const product=productFor(productCell)!;const productIndex=cells.indexOf(productCell);
    const values=cells.slice(productIndex+1).map(num).filter((v):v is number=>v!==null);
    const value=values[0];if(value===undefined)continue;
    const id=await commodityId(commodityCode(product));
    saved+=await save({source:"Bolsa de Cereales de Buenos Aires",source_reference:BCBA_QUOTES,market_date:marketDate,commodity_id:id,product_id:null,variety:null,position:"SPOT",market:"BUENOS_AIRES",port:null,price_type:"FAS_THEORETICAL",price:value,currency:"ARS",unit:"T",status:"VALID",freshness:"UPDATED",previous_value:values[1]??null,variation:values[1]!==undefined?value-values[1]:null,payload:{product,table:"FAS_RES_42_2007",raw_cells:cells,run_id:runId}});
   }
  }
 }
 if(saved===0)throw new Error("BCBA_OFFICIAL_QUOTES_NOT_PARSED");
 return saved;
}
async function parseCordoba(body:string,runId:string){
 const d=parseHTML(body).document;if(!d)throw new Error("BCCBA_HTML_PARSE_ERROR");
 const text=norm(d.body?.textContent||"");const date=pageDate(text);let saved=0;
 const sections:[RegExp,string][]=[
  [/Precios Pizarra Córdoba[^]*?(?=Precios Pizarra|Expeller de Soja|DATOS DE HOY)/i,"CORDOBA"],
  [/Expeller de Soja[^]*?(?=MERCADOS|DATOS DE HOY)/i,"CORDOBA"]
 ];
 const products=["Trigo duro","Maní Industria","Maní Runner","Expeller de soja"];
 for(const [pattern,market] of sections){
  const match=text.match(pattern);if(!match)continue;const section=match[0];
  const occurrences=products.map(product=>({product,index:section.toLowerCase().indexOf(product.toLowerCase())})).filter(x=>x.index>=0).sort((a,b)=>a.index-b.index);
  for(let i=0;i<occurrences.length;i++){
   const current=occurrences[i];const next=occurrences[i+1];const snippet=section.slice(current.index,next?next.index:Math.min(section.length,current.index+240));
   const moneyMatch=snippet.match(/(?:U\$S\s?[\d.]+(?:,\d+)?|\$\s?[\d.]+(?:,\d+)?)/i);
   if(!moneyMatch)continue;
   const value=num(moneyMatch[0]);if(value==null)continue;
   const currency=/U\$S/i.test(moneyMatch[0])?"USD":"ARS";
   const id=await commodityId(commodityCode(current.product));
   saved+=await save({source:"Bolsa de Cereales de Córdoba",source_reference:BCCBA_HOME,market_date:date,commodity_id:id,product_id:null,variety:null,position:"SPOT",market,port:"CORDOBA",price_type:"PIZARRA_CAC",price:value,currency,unit:"T",status:"VALID",freshness:"UPDATED",previous_value:null,variation:null,payload:{product:current.product,excerpt:snippet,estimated:snippet.toLowerCase().includes("estimado")||snippet.toLowerCase().includes("s/n"),run_id:runId}});
  }
 }
 return saved;
}
async function syncChicago(runId:string){
 const contracts=[
  {symbol:"ZS=F",code:"SOJA",unit:"USD/bu"},
  {symbol:"ZC=F",code:"MAIZ",unit:"USD/bu"},
  {symbol:"ZW=F",code:"TRIGO",unit:"USD/bu"},
  {symbol:"ZM=F",code:"HARINA_SOJA",unit:"USD/short ton"},
  {symbol:"ZL=F",code:"ACEITE_SOJA",unit:"¢/lb"},
  {symbol:"ZO=F",code:"AVENA",unit:"USD/bu"},
 ];
 let saved=0;const errors:string[]=[];
 await Promise.all(contracts.map(async item=>{
  try{
   const endpoint="https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(item.symbol)+"?range=10d&interval=1d";
   const response=await fetch(endpoint,{headers:{"user-agent":"Mozilla/5.0 AgroBrokerIA MarketDataService/1.0","accept":"application/json"}});
   if(!response.ok)throw new Error("QUOTE_HTTP_"+response.status);
   const json=await response.json();const result=json?.chart?.result?.[0];if(!result)throw new Error("QUOTE_NOT_AVAILABLE");
   const meta=result.meta||{},timestamps=result.timestamp||[],closes=result.indicators?.quote?.[0]?.close||[];
   const valid=closes.map((v:number|null,i:number)=>({value:v,time:timestamps[i]})).filter((x:any)=>typeof x.value==="number"&&Number.isFinite(x.value));
   const last=valid[valid.length-1];if(!last)throw new Error("QUOTE_WITHOUT_PRICE");
   const previous=valid.length>1?valid[valid.length-2].value:(typeof meta.chartPreviousClose==="number"?meta.chartPreviousClose:null);
   const date=new Date((last.time||meta.regularMarketTime||Date.now())*1000).toISOString().slice(0,10);
   const id=await commodityId(item.code);
   const label=String(meta.shortName||meta.longName||item.symbol);
   saved+=await save({source:"Yahoo Finance / CBOT",source_reference:endpoint,market_date:date,published_at:null,commodity_id:id,product_id:null,variety:null,position:String(meta.contractSymbol||label),market:"CHICAGO",port:null,price_type:"FUTURES",price:last.value,currency:"USD",unit:item.unit,status:"VALID",freshness:"UPDATED",previous_value:previous,variation:previous==null?null:last.value-previous,payload:{symbol:item.symbol,contract:meta.contractSymbol||null,exchange:"CBOT",quote_time:new Date((last.time||Date.now())*1000).toISOString(),run_id:runId,delayed:true}});
  }catch(error){errors.push(item.symbol+":"+(error instanceof Error?error.message:"QUOTE_ERROR"))}
 }));
 return {saved,errors};
}
async function parseFob(body:string,runId:string){const d=parseHTML(body).document;if(!d)throw new Error("BCR_HTML_PARSE_ERROR");const rows=Array.from(d.querySelectorAll("tr"));let commodity="",delivery:string[]=[],marketDate:string|null=null,saved=0;for(const tr of rows){const cells=Array.from(tr.querySelectorAll("th,td")).map(x=>norm(x.textContent||""));if(!cells.length)continue;const text=cells.join(" | "),ds=text.match(/\d{2}\/\d{2}\/\d{4}/);if(ds)marketDate=dateFromText(ds[0])||marketDate;const cm=cells.find(x=>/^(Trigo|Ma[ií]z|Soja|Girasol|Sorgo)$/i.test(x));if(cm){commodity=cm;delivery=[];continue}if(/^Fecha Embarque\/Delivery date/i.test(cells[0]||"")){delivery=cells.slice(1);continue}if(!commodity||!marketDate)continue;const metric=cells[0]||"";if(/^FOB ACEITE/i.test(metric)||/^FOB PELLETS/i.test(metric)){const specialCode=/^FOB ACEITE/i.test(metric)?"ACEITE_SOJA":"PELLETS_SOJA";const id=await commodityId(specialCode);let emitted=0;for(let i=1;i<cells.length&&emitted<2;i++){const value=num(cells[i]);if(value==null)continue;emitted++;saved+=await save({source:SOURCE,source_reference:BCR_FOB,market_date:marketDate,published_at:null,commodity_id:id,product_id:null,variety:null,position:delivery[i-1]||"SPOT",market:"ARGENTINA",port:"Up River",price_type:/^FOB ACEITE/i.test(metric)?"FOB_OIL":"FOB_MEAL",price:value,currency:"USD",unit:"T",status:"VALID",freshness:"UPDATED",previous_value:null,variation:null,payload:{commodity:specialCode,metric,delivery:delivery[i-1]||null,raw_cells:cells,run_id:runId}})}continue;}let type:string|null=null;if(/^FOB comprador/i.test(metric))type="FOB_BID";else if(/^FOB vendedor/i.test(metric))type="FOB_OFFER";else if(/^a\) Impuestos/i.test(metric))type="EXPORT_DUTIES";else if(/^b\) Gastos en puertos/i.test(metric))type="PORT_COST";else if(/^c\) Gtos/i.test(metric))type="MARKETING_COST";else if(/^Total USD/i.test(metric))type="TOTAL_COST";else if(/^FAS Te[oó]rico/i.test(metric))type="FAS_THEORETICAL";if(!type)continue;const id=await commodityId(commodity);for(let i=1;i<cells.length;i++){const value=num(cells[i]);if(value==null)continue;saved+=await save({source:SOURCE,source_reference:BCR_FOB,market_date:marketDate,published_at:null,commodity_id:id,product_id:null,variety:null,position:delivery[i-1]||"SPOT",market:"ARGENTINA",port:"SAGyP/UP RIVER",price_type:type,price:value,currency:"USD",unit:"T",status:"VALID",freshness:"UPDATED",previous_value:null,variation:null,payload:{commodity,metric:type,delivery:delivery[i-1]||null,raw_cells:cells,run_id:runId}})}}return saved}
function corsHeaders(req:Request){
 const origin=req.headers.get("origin")||"";
 const allowed=/^https:\/\/(([a-z0-9-]+\.)?agrobrokeria\.online|([a-z0-9-]+\.)?agrobrokeria\.com\.ar)$/i.test(origin)
   || /^http:\/\/localhost(:\d+)?$/i.test(origin);
 const headers=new Headers({
  "Vary":"Origin",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age":"86400"
 });
 if(allowed)headers.set("Access-Control-Allow-Origin",origin);
 return headers;
}
function jsonResponse(req:Request,body:unknown,status=200){
 const headers=corsHeaders(req);headers.set("content-type","application/json");
 return new Response(JSON.stringify(body),{status,headers});
}
Deno.serve(async req=>{let runId:string|null=null;try{if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders(req)});if(req.method!=="POST")return jsonResponse(req,{error:"METHOD_NOT_ALLOWED"},405);if(!(await authorized(req)))return jsonResponse(req,{error:"AUTH_REQUIRED"},401);const {data:run,error:re}=await db.from("market_sync_runs").insert({source:SOURCE,status:"RUNNING"}).select("id").single();if(re)throw re;runId=run.id;const [local,fob,available]=await Promise.all([html(BCR_LOCAL),html(BCR_FOB),html(BCR_AVAILABLE)]),[a,b,c]=await Promise.all([parseLocal(local,runId),parseFob(fob,runId),parseAvailable(available,runId)]);const sourceWarnings:string[]=[];const safeSource=async(label:string,task:()=>Promise<number>)=>{try{return await task()}catch(error){sourceWarnings.push(label+":"+(error instanceof Error?error.message:"SOURCE_ERROR"));return 0}};const [bahia,orient,bsas,cordoba]=await Promise.all([safeSource("BCP_FAS_FOB",async()=>parseBahiaBlanca(await html(BCP_FAS_FOB),runId,false)),safeSource("BCP_ORIENTATIVOS",async()=>parseBahiaBlanca(await html(BCP_ORIENTATIVOS),runId,true)),safeSource("BCBA",async()=>parseBuenosAires(await html(BCBA_QUOTES),runId)),safeSource("BCCBA",async()=>parseCordoba(await html(BCCBA_HOME),runId))]);const chicago=await syncChicago(runId),total=a+b+c+bahia+orient+bsas+cordoba+chicago.saved;if(total===0){await db.from("market_sync_runs").update({finished_at:new Date().toISOString(),status:"NO_DATA",records_seen:0,records_saved:0}).eq("id",runId);return jsonResponse(req,{ok:true,source:SOURCE,run_id:runId,records_saved:0,no_data:true})}const warnings=[...sourceWarnings,...chicago.errors];const syncStatus=warnings.length?"PARTIAL":"SUCCESS";await db.from("market_sync_runs").update({finished_at:new Date().toISOString(),status:syncStatus,records_seen:total,records_saved:total,error_message:warnings.length?warnings.join("; ").slice(0,1000):null}).eq("id",runId);
    const { error: refreshError } = await db.rpc("refresh_market_public_summary_data");
    if (refreshError) throw refreshError;return jsonResponse(req,{ok:true,source:SOURCE,run_id:runId,status:syncStatus,records_saved:total,chicago_records_saved:chicago.saved,bahia_blanca_records_saved:bahia+orient,buenos_aires_records_saved:bsas,cordoba_records_saved:cordoba,chicago_warnings:chicago.errors,source_warnings:sourceWarnings})}catch(e){const msg=e instanceof Error?e.message:"MARKET_SYNC_ERROR";if(runId)await db.from("market_sync_runs").update({finished_at:new Date().toISOString(),status:"ERROR",error_code:msg.slice(0,80),error_message:msg}).eq("id",runId);return jsonResponse(req,{ok:false,error:msg,run_id:runId},502)}});
