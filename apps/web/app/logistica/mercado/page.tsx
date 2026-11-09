"use client";
import {useCallback,useEffect,useMemo,useState,type CSSProperties,type ReactNode} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";

type Listing={id:string;cantidad_camiones:number;ubicacion_actual:string;destino_solicitado:string|null;fecha_disponibilidad:string;tipo_carroceria:string;observaciones:string|null;empresa_transportista_id:string;transportista_id:string;estado:string;};
type Demand={id:string;cantidad_camiones_necesitados:number;origen_carga:string;destino_carga:string;tarifa_estimada_ars:number|null;distancia_estimada_km:number|null;permite_adelanto_combustible:boolean;fecha_requerida:string|null;tipo_carroceria:string;observaciones:string|null;empresa_dadora_id:string;estado:string;};
type Closure={id:string;codigo_operacion:string;total_flete_pactado_ars:number;valor_flete_por_camion_ars:number;comision_logistica_pct:number;comision_logistica_por_camion_ars:number;comision_logistica_ars:number;estado_pago_comision_logistica:string;url_comprobante_logistica:string|null;id_oferta_flete:string;id_demanda_flete:string;empresa_transportista_id:string;empresa_dadora_id:string;operacion_id:string|null;};
type Advance={id:string;cierre_logistica_id:string;solicitado_por:string;monto_solicitado_ars:number;porcentaje_flete:number;estado:string;comprobante_path:string|null;referencia_transferencia:string|null;};
type Postulation={id:string;id_demanda_flete:string;id_oferta_flete:string;empresa_transportista_id:string;estado:string;};
type Company={id:string;razon_social:string;agrobroker_score:number|null};
const input:CSSProperties={width:"100%",minHeight:42,border:"1px solid #cbd5e1",borderRadius:9,padding:"9px 11px",background:"#fff",color:"#0f172a"};
const panel:React.CSSProperties={border:"1px solid #dbe3ec",borderRadius:14,padding:16,background:"#fff",display:"grid",gap:12};
const primary:React.CSSProperties={border:0,borderRadius:9,padding:"10px 14px",background:"#087a50",color:"#fff",fontWeight:750,cursor:"pointer"};
const secondary:React.CSSProperties={border:"1px solid #cbd5e1",borderRadius:9,padding:"9px 12px",background:"#fff",color:"#334155",fontWeight:700,cursor:"pointer"};
const field=(label:string,child:ReactNode)=><label style={{display:"grid",gap:5,fontSize:12,fontWeight:700,color:"#475569"}}>{label}{child}</label>;

export default function MercadoFletesPage(){
 const [tab,setTab]=useState<"OFERTAS"|"DEMANDAS"|"MIS_CIERRES">("OFERTAS");
 const [offers,setOffers]=useState<Listing[]>([]),[demands,setDemands]=useState<Demand[]>([]),[closures,setClosures]=useState<Closure[]>([]),[advances,setAdvances]=useState<Advance[]>([]),[postulations,setPostulations]=useState<Postulation[]>([]),[offerChoice,setOfferChoice]=useState<Record<string,string>>({}),[advanceFiles,setAdvanceFiles]=useState<Record<string,File|null>>({}),[advanceRefs,setAdvanceRefs]=useState<Record<string,string>>({});
 const [companies,setCompanies]=useState<Record<string,Company>>({});
 const [companyId,setCompanyId]=useState(""),[transportistaId,setTransportistaId]=useState(""),[profileId,setProfileId]=useState("");
 const [isAdmin,setIsAdmin]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [offerForm,setOfferForm]=useState({cantidad:"1",ubicacion:"",destino:"Puerto Rosario",fecha:new Date().toISOString().slice(0,10),carroceria:"Granelero / Cerealero",observaciones:""});
 const [demandForm,setDemandForm]=useState({cantidad:"1",origen:"",destino:"",tarifa:"",distancia:"",fecha:"",carroceria:"Granelero / Cerealero",adelanto:true,observaciones:""});
 const [selectedDemand,setSelectedDemand]=useState<Record<string,string>>({}),[fleteTotal,setFleteTotal]=useState<Record<string,string>>({});
 const [selectedClosure,setSelectedClosure]=useState<Closure|null>(null),[comprobante,setComprobante]=useState<File|null>(null),[referencia,setReferencia]=useState("");
 const [messages,setMessages]=useState<any[]>([]),[conversationId,setConversationId]=useState(""),[chatText,setChatText]=useState("");
 const [distanceKm,setDistanceKm]=useState(""),[tonnes,setTonnes]=useState(""),[catac,setCatac]=useState<any>(null);
 const [advanceAmount,setAdvanceAmount]=useState(""),[advancePct,setAdvancePct]=useState("30");
 const [bankAccounts,setBankAccounts]=useState<any[]>([]);
 const [q,setQ]=useState(""),[originFilter,setOriginFilter]=useState(""),[destinationFilter,setDestinationFilter]=useState("");

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error("Iniciá sesión para acceder al mercado de fletes.");
   setProfileId(user.id);
   const [{data:profile},{data:admin},{data:o,error:oe},{data:d,error:de},{data:c,error:ce},{data:adv,error:ae},{data:posts,error:pe}]=await Promise.all([
    supabase.from("profiles").select("active_company_id").eq("id",user.id).maybeSingle(),
    supabase.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle(),
    supabase.from("ofertas_logistica").select("*").order("creado_at",{ascending:false}).limit(100),
    supabase.from("demandas_logistica").select("*").order("creado_at",{ascending:false}).limit(100),
    supabase.from("cierres_logistica").select("id,codigo_operacion,total_flete_pactado_ars,valor_flete_por_camion_ars,comision_logistica_pct,comision_logistica_por_camion_ars,comision_logistica_ars,estado_pago_comision_logistica,url_comprobante_logistica,id_oferta_flete,id_demanda_flete,empresa_transportista_id,empresa_dadora_id,operacion_id").order("fecha_cierre",{ascending:false}).limit(100),
    supabase.from("logistica_adelantos_combustible").select("id,cierre_logistica_id,solicitado_por,monto_solicitado_ars,porcentaje_flete,estado,comprobante_path,referencia_transferencia").order("creado_at",{ascending:false}).limit(100),
    supabase.from("postulaciones_logistica").select("id,id_demanda_flete,id_oferta_flete,empresa_transportista_id,estado").order("creado_at",{ascending:false}).limit(200)
   ]);
   if(oe||de||ce||ae||pe)throw new Error((oe||de||ce||ae||pe)?.message||"No se pudo cargar el mercado.");
   setIsAdmin(Boolean(admin));setAdvances((adv||[]) as Advance[]);setPostulations((posts||[]) as Postulation[]);
   let ownCompany="";
   if(profile?.active_company_id){
    const {data:map}=await supabase.from("company_empresa_map").select("empresa_id").eq("company_id",profile.active_company_id).order("verified",{ascending:false}).limit(1);
    ownCompany=map?.[0]?.empresa_id||profile.active_company_id;
   }
   setCompanyId(ownCompany);setOffers((o||[]) as Listing[]);setDemands((d||[]) as Demand[]);setClosures((c||[]) as Closure[]);
   const ids=[...new Set([...(o||[]).map((x:any)=>x.empresa_transportista_id),...(d||[]).map((x:any)=>x.empresa_dadora_id)].filter(Boolean))];
   if(ids.length){const {data:co}=await supabase.from("empresas").select("id,razon_social,agrobroker_score").in("id",ids);setCompanies(Object.fromEntries((co||[]).map((x:any)=>[x.id,x])));}
   if(ownCompany){
    const {data:t}=await supabase.from("transportistas").select("id,verificacion_estado").eq("profile_id",user.id).eq("empresa_id",ownCompany).maybeSingle();
    setTransportistaId(t?.verificacion_estado==="VERIFICADO"?t.id:"");
   }
   const {data:accounts}=await supabase.rpc("listar_cuentas_pago_logistica");setBankAccounts(accounts||[]);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar el mercado.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load()},[load]);

 const filteredOffers=useMemo(()=>offers.filter(x=>x.estado==="PUBLICADA"&&(!q||x.ubicacion_actual.toLowerCase().includes(q.toLowerCase())||String(companies[x.empresa_transportista_id]?.razon_social||"").toLowerCase().includes(q.toLowerCase()))&&(!originFilter||x.ubicacion_actual.toLowerCase().includes(originFilter.toLowerCase()))&&(!destinationFilter||String(x.destino_solicitado||"").toLowerCase().includes(destinationFilter.toLowerCase()))),[offers,q,originFilter,destinationFilter,companies]);
 const filteredDemands=useMemo(()=>demands.filter(x=>["PUBLICADA","PARCIAL"].includes(x.estado)&&(!q||x.origen_carga.toLowerCase().includes(q.toLowerCase())||x.destino_carga.toLowerCase().includes(q.toLowerCase())||String(companies[x.empresa_dadora_id]?.razon_social||"").toLowerCase().includes(q.toLowerCase()))&&(!originFilter||x.origen_carga.toLowerCase().includes(originFilter.toLowerCase()))&&(!destinationFilter||x.destino_carga.toLowerCase().includes(destinationFilter.toLowerCase()))),[demands,q,originFilter,destinationFilter,companies]);

 async function createOffer(){
  if(!companyId||!transportistaId){setError("Para publicar camiones necesitás un registro de transportista verificado y vinculado a tu empresa.");return;}
  if(!offerForm.ubicacion.trim()){setError("Ingresá la ubicación actual.");return;}
  setBusy(true);setError("");setNotice("");
  const {error:e}=await supabase.from("ofertas_logistica").insert({transportista_id:transportistaId,empresa_transportista_id:companyId,cantidad_camiones:Number(offerForm.cantidad),ubicacion_actual:offerForm.ubicacion.trim(),destino_solicitado:offerForm.destino.trim()||null,fecha_disponibilidad:offerForm.fecha,tipo_carroceria:offerForm.carroceria,observaciones:offerForm.observaciones||null,creado_por:profileId});
  if(e)setError(e.message);else{setNotice("Oferta de camiones publicada.");setOfferForm(v=>({...v,ubicacion:"",observaciones:""}));await load();}
  setBusy(false);
 }
 async function createDemand(){
  if(!companyId){setError("Necesitás una empresa activa para publicar una demanda de flete.");return;}
  if(!demandForm.origen.trim()||!demandForm.destino.trim()){setError("Completá origen y destino.");return;}
  setBusy(true);setError("");setNotice("");
  const {error:e}=await supabase.from("demandas_logistica").insert({empresa_dadora_id:companyId,cantidad_camiones_necesitados:Number(demandForm.cantidad),origen_carga:demandForm.origen.trim(),destino_carga:demandForm.destino.trim(),tarifa_estimada_ars:demandForm.tarifa?Number(demandForm.tarifa):null,distancia_estimada_km:demandForm.distancia?Number(demandForm.distancia):null,permite_adelanto_combustible:demandForm.adelanto,fecha_requerida:demandForm.fecha||null,tipo_carroceria:demandForm.carroceria,observaciones:demandForm.observaciones||null,creado_por:profileId});
  if(e)setError(e.message);else{setNotice("Demanda de camiones publicada.");setDemandForm(v=>({...v,origen:"",destino:"",observaciones:""}));await load();}
  setBusy(false);
 }
 async function postulate(demand:Demand){
  const offerId=offerChoice[demand.id];if(!offerId){setError("Elegí una oferta de camiones propia para postularte.");return;}
  const {data,error:e}=await supabase.rpc("postular_camiones_logistica",{p_demanda_id:demand.id,p_oferta_id:offerId});
  if(e)setError(e.message);else{setNotice("Postulación enviada al dador de carga.");await load();}
 }
 async function closeFreight(offer:Listing){
  const demandId=selectedDemand[offer.id],total=Number(fleteTotal[offer.id]||0);
  if(!demandId||!total||total<=0){setError("Elegí la demanda y cargá el importe total del flete pactado.");return;}
  setBusy(true);setError("");setNotice("");
  const {data,error:e}=await supabase.rpc("cerrar_operacion_logistica_market",{p_oferta_id:offer.id,p_demanda_id:demandId,p_total_flete_ars:total});
  if(e)setError(e.message);else{setNotice("Flete cerrado. Se creó una sala privada de chat y la comisión del transportista quedó pendiente de comprobante y aprobación manual.");await load();}
  setBusy(false);
 }
 async function openChat(c:Closure){
  setSelectedClosure(c);setMessages([]);setConversationId("");
  const {data:conv,error:e}=await supabase.from("conversaciones_fletes").select("id").eq("cierre_logistica_id",c.id).maybeSingle();
  if(e||!conv){setError(e?.message||"No se encontró el chat del flete.");return;}
  setConversationId(conv.id);
  const {data:msgs,error:me}=await supabase.from("mensajes_fletes").select("id,emisor_profile_id,es_sistema,mensaje,adjunto_path,creado_at").eq("conversacion_id",conv.id).order("creado_at");
  if(me)setError(me.message);else setMessages(msgs||[]);
 }
 async function sendMessage(){
  if(!conversationId||!chatText.trim())return;
  const {error:e}=await supabase.from("mensajes_fletes").insert({conversacion_id:conversationId,emisor_profile_id:profileId,mensaje:chatText.trim(),es_sistema:false});
  if(e)setError(e.message);else{setChatText("");await openChat(selectedClosure!);}
 }
 async function uploadCommissionProof(){
  if(!selectedClosure||!comprobante){setError("Seleccioná el comprobante bancario.");return;}
  if(!["application/pdf","image/jpeg","image/png"].includes(comprobante.type)||comprobante.size>10*1024*1024){setError("Adjuntá PDF/JPG/PNG de hasta 10 MB.");return;}
  setBusy(true);setError("");const safe=comprobante.name.replace(/[^a-zA-Z0-9._-]/g,"_"),path=selectedClosure.id+"/comision/"+crypto.randomUUID()+"-"+safe;
  const {error:up}=await supabase.storage.from("logistica-comprobantes").upload(path,comprobante,{contentType:comprobante.type,upsert:false});
  if(up){setError(up.message);setBusy(false);return;}
  const {error:e}=await supabase.rpc("registrar_comprobante_comision_logistica",{p_cierre_id:selectedClosure.id,p_storage_path:path,p_referencia:referencia||null});
  if(e)setError(e.message);else{setNotice("Comprobante enviado. La comisión sigue pendiente hasta que Administración contraste el ingreso en su homebanking.");setComprobante(null);await load();}
  setBusy(false);
 }
 async function openCommissionProof(c:Closure){
  if(!c.url_comprobante_logistica){setError("No hay comprobante cargado.");return;}
  const {data,error:e}=await supabase.storage.from("logistica-comprobantes").createSignedUrl(c.url_comprobante_logistica,600);
  if(e||!data?.signedUrl){setError(e?.message||"No se pudo abrir el comprobante.");return;}
  window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 async function reviewCommission(c:Closure,approve:boolean){
  const {error:e}=await supabase.rpc("revisar_comision_logistica",{p_cierre_id:c.id,p_aprobar:approve,p_motivo:approve?null:"Comprobante no conciliado con el ingreso bancario."});
  if(e)setError(e.message);else{setNotice(approve?"Comisión de flete aprobada manualmente.":"Comprobante rechazado.");await load();}
 }
 async function calculateDistance(){
  if(!demandForm.origen.trim()||!demandForm.destino.trim()){setError("Ingresá origen y destino para calcular la distancia.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const {data:session}=await supabase.auth.getSession();const token=session.session?.access_token;if(!token)throw new Error("Sesión vencida.");
   const response=await fetch("/api/logistica/distance",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({origin:demandForm.origen,destination:demandForm.destino})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"No se pudo calcular la distancia.");
   setDemandForm(v=>({...v,distancia:String(result.distance_km)}));setNotice("Distancia vial calculada por Google Maps: "+result.distance_km+" km ("+result.distance_text+").");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo calcular la distancia.");}finally{setBusy(false);}
 }
 async function findCatac(){
  const km=Number(distanceKm),tn=Number(tonnes);if(!km||km<=0||!tn||tn<=0){setError("Ingresá distancia y toneladas válidas.");return;}
  const {data,error:e}=await supabase.rpc("buscar_tarifa_referencia_catac",{p_distancia_km:km});
  if(e)setError(e.message);else if(!data?.length){setCatac(null);setError("No hay una tarifa CATAC vigente cargada para ese rango. Administración debe cargar la tabla oficial; no se estimará un valor inventado.");}else setCatac({...data[0],total:Number(data[0].valor_tonelada_ars)*tn,tonnes:tn});
 }
 async function respondAdvance(a:Advance,accept:boolean){
  const {error:e}=await supabase.rpc("responder_adelanto_combustible_logistica",{p_adelanto_id:a.id,p_aceptar:accept});
  if(e)setError(e.message);else{setNotice(accept?"Adelanto aceptado. El dador debe transferir y subir el comprobante.":"Solicitud de adelanto rechazada.");await load();}
 }
 async function uploadAdvanceProof(a:Advance){
  const file=advanceFiles[a.id];if(!file){setError("Seleccioná el comprobante de transferencia del adelanto.");return;}
  if(!["application/pdf","image/jpeg","image/png"].includes(file.type)||file.size>10*1024*1024){setError("Adjuntá PDF/JPG/PNG de hasta 10 MB.");return;}
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_"),path=a.cierre_logistica_id+"/adelantos/"+crypto.randomUUID()+"-"+safe;
  const {error:up}=await supabase.storage.from("logistica-comprobantes").upload(path,file,{contentType:file.type,upsert:false});if(up){setError(up.message);return;}
  const {error:e}=await supabase.rpc("registrar_comprobante_adelanto_logistica",{p_adelanto_id:a.id,p_storage_path:path,p_referencia:advanceRefs[a.id]||null});
  if(e)setError(e.message);else{setNotice("Comprobante del adelanto cargado; pendiente de verificación manual.");await load();}
 }
 async function reviewAdvance(a:Advance,approve:boolean){
  const {error:e}=await supabase.rpc("revisar_adelanto_combustible_logistica",{p_adelanto_id:a.id,p_aprobar:approve,p_motivo:approve?null:"Comprobante no conciliado."});
  if(e)setError(e.message);else{setNotice(approve?"Adelanto verificado por Administración.":"Comprobante de adelanto rechazado.");await load();}
 }
 async function sendCatacToChat(){
  if(!selectedClosure||!conversationId||!catac)return;
  const message="Referencia CATAC para el trayecto: "+distanceKm+" km. Tarifa vigente: "+new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(catac.valor_tonelada_ars)+" por tonelada. Para "+catac.tonnes+" TN, total referencial "+new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(catac.total)+". Es una referencia editable; el valor final debe ser acordado por las partes.";
  const {error:e}=await supabase.from("mensajes_fletes").insert({conversacion_id:conversationId,emisor_profile_id:profileId,mensaje:message,es_sistema:false});
  if(e)setError(e.message);else{setNotice("Referencia CATAC enviada al chat privado.");await openChat(selectedClosure);}
 }
 async function requestAdvance(c:Closure){
  const amount=Number(advanceAmount),pct=Number(advancePct);const {data,error:e}=await supabase.rpc("solicitar_adelanto_combustible_logistica",{p_cierre_id:c.id,p_monto_ars:amount,p_porcentaje:pct});
  if(e)setError(e.message);else setNotice("Solicitud de adelanto registrada con estado pendiente. El dador debe confirmar y transferir externamente; cargará el comprobante antes de habilitar el viaje.");
 }

 return <main style={{maxWidth:1440,margin:"0 auto",padding:"24px 18px 60px",display:"grid",gap:16,color:"#142033"}}>
  <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h1 style={{fontSize:28,fontWeight:850}}>Mercado de Fletes</h1><p style={{color:"#64748b"}}>Conectá transportistas con productores, acopios y dadores de carga.</p></div><Link href="/logistica" style={{color:"#087a50",fontWeight:750}}>← Volver a Logística</Link></header>
  {error&&<div style={{background:"#fff1f2",border:"1px solid #fecdd3",padding:12,borderRadius:10,color:"#9f1239"}}>{error}</div>}
  {notice&&<div style={{background:"#ecfdf5",border:"1px solid #a7f3d0",padding:12,borderRadius:10,color:"#065f46"}}>{notice}</div>}
  <nav style={{display:"flex",gap:8,flexWrap:"wrap"}}>{([["OFERTAS","Ofrecen camiones"],["DEMANDAS","Buscan camiones"],["MIS_CIERRES","Mis cierres y chats"]] as const).map(([v,l])=><button key={v} onClick={()=>setTab(v)} style={{...secondary,background:tab===v?"#087a50":"#fff",color:tab===v?"#fff":"#334155"}}>{l}</button>)}</nav>
  <section style={panel}><h2 style={{fontSize:18,fontWeight:800}}>Buscar fletes</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9}}>{field("Buscar transportista, empresa u origen",<input style={input} value={q} onChange={e=>setQ(e.target.value)} placeholder="Empresa, localidad…"/>)}{field("Origen",<input style={input} value={originFilter} onChange={e=>setOriginFilter(e.target.value)} placeholder="Provincia o localidad"/>)}{field("Destino",<input style={input} value={destinationFilter} onChange={e=>setDestinationFilter(e.target.value)} placeholder="Puerto o localidad"/>)}</div></section>
  {loading?<p>Cargando mercado…</p>:tab==="OFERTAS"?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:14,alignItems:"start"}}>
   <section style={panel}><h2 style={{fontSize:18,fontWeight:800}}>Publicar camiones disponibles</h2>{field("Cantidad de camiones",<input style={input} type="number" min="1" value={offerForm.cantidad} onChange={e=>setOfferForm(v=>({...v,cantidad:e.target.value}))}/>)}{field("Ubicación actual",<input style={input} value={offerForm.ubicacion} onChange={e=>setOfferForm(v=>({...v,ubicacion:e.target.value}))} placeholder="Chaco, Resistencia"/>)}{field("Destino sugerido",<input style={input} value={offerForm.destino} onChange={e=>setOfferForm(v=>({...v,destino:e.target.value}))}/>)}{field("Disponibilidad",<input style={input} type="date" value={offerForm.fecha} onChange={e=>setOfferForm(v=>({...v,fecha:e.target.value}))}/>)}{field("Tipo de carrocería",<select style={input} value={offerForm.carroceria} onChange={e=>setOfferForm(v=>({...v,carroceria:e.target.value}))}><option>Granelero / Cerealero</option><option>Baranda volcable</option><option>Semirremolque</option><option>Otro</option></select>)}{field("Observaciones",<textarea style={{...input,minHeight:70}} value={offerForm.observaciones} onChange={e=>setOfferForm(v=>({...v,observaciones:e.target.value}))}/>)}<button style={primary} disabled={busy||!transportistaId} onClick={()=>void createOffer()}>{transportistaId?"Publicar oferta":"Requiere transportista verificado"}</button></section>
   <section style={{display:"grid",gap:12}}><h2 style={{fontSize:18,fontWeight:800}}>Camiones publicados ({filteredOffers.length})</h2>{filteredOffers.map(o=><article key={o.id} style={panel}><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><h3 style={{fontSize:17,fontWeight:850}}>🚚 {o.cantidad_camiones} camión(es) disponibles en {o.ubicacion_actual}</h3><b style={{color:"#087a50"}}>{companies[o.empresa_transportista_id]?.agrobroker_score??"—"} pts</b></div><p>Transportista: <b>{companies[o.empresa_transportista_id]?.razon_social||"Empresa transportista"}</b></p><p>Destino sugerido: {o.destino_solicitado||"A convenir"} · Disponibilidad: {new Date(o.fecha_disponibilidad+"T12:00:00").toLocaleDateString("es-AR")}</p><p>Carrocería: {o.tipo_carroceria}</p>{companyId&&companyId!==o.empresa_transportista_id&&demands.some(d=>d.estado==="PUBLICADA"||d.estado==="PARCIAL")&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}><select style={input} value={selectedDemand[o.id]||""} onChange={e=>setSelectedDemand(v=>({...v,[o.id]:e.target.value}))}><option value="">Seleccioná demanda compatible</option>{demands.filter(d=>["PUBLICADA","PARCIAL"].includes(d.estado)).map(d=><option key={d.id} value={d.id}>{d.origen_carga} → {d.destino_carga} · {d.cantidad_camiones_necesitados} camiones</option>)}</select><div style={{display:"grid",gap:5}}><input style={input} type="number" min="1" value={fleteTotal[o.id]||""} onChange={e=>setFleteTotal(v=>({...v,[o.id]:e.target.value}))} placeholder="Total del flete pactado (ARS)"/><small style={{color:"#64748b"}}>El sistema divide el total entre los camiones contratados y calcula el 1% individual por unidad. Si cada camión tiene una tarifa distinta, cerrá operaciones separadas.</small></div><button style={primary} disabled={busy} onClick={()=>void closeFreight(o)}>Contratar fletes</button></div>}</article>)}{!filteredOffers.length&&<p style={{color:"#64748b"}}>No hay ofertas activas con esos filtros.</p>}</section>
  </div>:tab==="DEMANDAS"?<div style={{display:"grid",gridTemplateColumns:"minmax(280px,0.8fr) minmax(0,1.6fr)",gap:14,alignItems:"start"}}>
   <section style={panel}><h2 style={{fontSize:18,fontWeight:800}}>Publicar demanda de camiones</h2>{field("Cantidad de camiones",<input style={input} type="number" min="1" value={demandForm.cantidad} onChange={e=>setDemandForm(v=>({...v,cantidad:e.target.value}))}/>)}{field("Origen de carga",<input style={input} value={demandForm.origen} onChange={e=>setDemandForm(v=>({...v,origen:e.target.value}))} placeholder="Venado Tuerto, Santa Fe"/>)}{field("Destino",<input style={input} value={demandForm.destino} onChange={e=>setDemandForm(v=>({...v,destino:e.target.value}))} placeholder="Puerto San Lorenzo"/>)}{field("Tarifa estimada (ARS)",<input style={input} type="number" min="0" value={demandForm.tarifa} onChange={e=>setDemandForm(v=>({...v,tarifa:e.target.value}))}/>)}{field("Distancia estimada (km)",<div style={{display:"grid",gap:6}}><input style={input} type="number" min="1" value={demandForm.distancia} onChange={e=>setDemandForm(v=>({...v,distancia:e.target.value}))}/><button type="button" style={secondary} disabled={busy} onClick={()=>void calculateDistance()}>Calcular distancia vial con Google Maps</button></div>)}{field("Fecha requerida",<input style={input} type="date" value={demandForm.fecha} onChange={e=>setDemandForm(v=>({...v,fecha:e.target.value}))}/>)}{field("Tipo de carrocería",<select style={input} value={demandForm.carroceria} onChange={e=>setDemandForm(v=>({...v,carroceria:e.target.value}))}><option>Granelero / Cerealero</option><option>Baranda volcable</option><option>Semirremolque</option><option>Otro</option></select>)}<label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={demandForm.adelanto} onChange={e=>setDemandForm(v=>({...v,adelanto:e.target.checked}))}/> Permitir solicitudes de adelanto para combustible</label>{field("Observaciones",<textarea style={{...input,minHeight:70}} value={demandForm.observaciones} onChange={e=>setDemandForm(v=>({...v,observaciones:e.target.value}))}/>)}<button style={primary} disabled={busy} onClick={()=>void createDemand()}>Publicar demanda</button></section>
   <section style={{display:"grid",gap:12}}><h2 style={{fontSize:18,fontWeight:800}}>Solicitudes de transporte ({filteredDemands.length})</h2>{filteredDemands.map(d=><article key={d.id} style={panel}><h3 style={{fontSize:17,fontWeight:850}}>🌾 Se necesitan {d.cantidad_camiones_necesitados} camión(es) · {d.tipo_carroceria}</h3><p>Dador de carga: <b>{companies[d.empresa_dadora_id]?.razon_social||"Empresa participante"}</b> · Scoring: {companies[d.empresa_dadora_id]?.agrobroker_score??"—"}</p><p>Trayecto: {d.origen_carga} → {d.destino_carga}</p><p>Tarifa de referencia: {d.tarifa_estimada_ars?new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(d.tarifa_estimada_ars):"A convenir"} · Distancia: {d.distancia_estimada_km?d.distancia_estimada_km+" km":"No informada"}</p><p>Adelanto combustible: {d.permite_adelanto_combustible?"Permitido bajo confirmación del dador":"No permitido"}</p>{companyId&&companyId!==d.empresa_dadora_id&&transportistaId&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}><select style={input} value={offerChoice[d.id]||""} onChange={e=>setOfferChoice(v=>({...v,[d.id]:e.target.value}))}><option value="">Elegí tus camiones disponibles</option>{offers.filter(o=>o.estado==="PUBLICADA"&&o.empresa_transportista_id===companyId).map(o=><option key={o.id} value={o.id}>{o.cantidad_camiones} camiones · {o.ubicacion_actual}</option>)}</select><button style={primary} onClick={()=>void postulate(d)}>Postular mis unidades</button></div>}{companyId===d.empresa_dadora_id&&<p>Postulaciones recibidas: <b>{postulations.filter(p=>p.id_demanda_flete===d.id&&p.estado==="PENDIENTE").length}</b>. Para formalizar, seleccioná una oferta en “Ofrecen camiones” y cerrá el flete con el total pactado.</p>}</article>)}{!filteredDemands.length&&<p style={{color:"#64748b"}}>No hay demandas activas con esos filtros.</p>}</section>
  </div>:<div style={{display:"grid",gap:12}}><h2 style={{fontSize:18,fontWeight:800}}>Cierres de flete y comisiones</h2>{closures.map(c=><article key={c.id} style={panel}><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><h3 style={{fontWeight:850}}>{c.codigo_operacion}</h3><b>{c.estado_pago_comision_logistica.replaceAll("_"," ")}</b></div><p>Flete total: {new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(c.total_flete_pactado_ars)} · {c.cantidad_camiones} camiones · Flete por camión: {new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(c.valor_flete_por_camion_ars)}<br/>Comisión AgroBrokerIA: 1% por camión ({new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(c.comision_logistica_por_camion_ars)}) · Total: {new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(c.comision_logistica_ars)}</p><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={secondary} onClick={()=>void openChat(c)}>Abrir chat privado</button>{c.estado_pago_comision_logistica==="esperando_comprobante"&&<button style={secondary} onClick={()=>setSelectedClosure(c)}>Adjuntar comprobante comisión</button>}{isAdmin&&c.estado_pago_comision_logistica==="comprobante_enviado"&&<><button style={primary} onClick={()=>void reviewCommission(c,true)}>Dar OK logística</button><button style={secondary} onClick={()=>void reviewCommission(c,false)}>Rechazar</button></>}</div>{selectedClosure?.id===c.id&&<div style={{display:"grid",gap:8}}><p>Comisión tecnológica a transferir por la empresa transportista a la cuenta oficial configurada de AgroBrokerIA.</p><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>setComprobante(e.target.files?.[0]||null)}/><input style={input} value={referencia} onChange={e=>setReferencia(e.target.value)} placeholder="Referencia de transferencia (opcional)"/><button style={primary} disabled={busy||!comprobante} onClick={()=>void uploadCommissionProof()}>Enviar comprobante a auditoría</button></div>}{c.estado_pago_comision_logistica==="comprobante_enviado"&&<button style={secondary} onClick={()=>void openCommissionProof(c)}>Ver comprobante bancario</button>}{isAdmin&&c.estado_pago_comision_logistica==="comprobante_enviado"&&<p style={{color:"#9a3412"}}>Verificá el ingreso en homebanking antes de aprobar. La carga del archivo no confirma el pago.</p>}
    {advances.filter(a=>a.cierre_logistica_id===c.id).map(a=><div key={a.id} style={{borderTop:"1px solid #e2e8f0",paddingTop:10,display:"grid",gap:7}}><b>Adelanto combustible · {new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(a.monto_solicitado_ars)} ({a.porcentaje_flete}%)</b><span>Estado: {a.estado.replaceAll("_"," ")}</span>{a.estado==="SOLICITADO"&&companyId===c.empresa_dadora_id&&<div style={{display:"flex",gap:8}}><button style={primary} onClick={()=>void respondAdvance(a,true)}>Aceptar adelanto</button><button style={secondary} onClick={()=>void respondAdvance(a,false)}>Rechazar</button></div>}{a.estado==="ACEPTADO_POR_DADOR"&&companyId===c.empresa_dadora_id&&<div style={{display:"grid",gap:7}}><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>setAdvanceFiles(v=>({...v,[a.id]:e.target.files?.[0]||null}))}/><input style={input} value={advanceRefs[a.id]||""} onChange={e=>setAdvanceRefs(v=>({...v,[a.id]:e.target.value}))} placeholder="Referencia bancaria (opcional)"/><button style={primary} onClick={()=>void uploadAdvanceProof(a)}>Cargar comprobante del adelanto</button></div>}{isAdmin&&a.estado==="COMPROBANTE_CARGADO"&&<div style={{display:"flex",gap:8}}><button style={primary} onClick={()=>void reviewAdvance(a,true)}>Validar adelanto</button><button style={secondary} onClick={()=>void reviewAdvance(a,false)}>Rechazar comprobante</button></div>}</div>)}</article>)}{!closures.length&&<p>No hay cierres registrados.</p>}</div>}
  {selectedClosure&&conversationId&&<section style={panel}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><h2 style={{fontWeight:850}}>Chat de {selectedClosure.codigo_operacion}</h2><button style={secondary} onClick={()=>{setSelectedClosure(null);setConversationId("")}}>Cerrar chat</button></div><div style={{maxHeight:300,overflow:"auto",display:"grid",gap:8}}>{messages.map(m=><div key={m.id} style={{padding:10,borderRadius:9,background:m.es_sistema?"#eef6ff":"#f8fafc"}}><small>{m.es_sistema?"AgroBrokerIA Logística":m.emisor_profile_id===profileId?"Vos":"Participante"} · {new Date(m.creado_at).toLocaleString("es-AR")}</small><p>{m.mensaje}</p></div>)}</div><div style={{display:"flex",gap:8}}><input style={input} value={chatText} onChange={e=>setChatText(e.target.value)} placeholder="Escribí un mensaje…" onKeyDown={e=>{if(e.key==="Enter")void sendMessage()}}/><button style={primary} onClick={()=>void sendMessage()}>Enviar</button></div>{catac&&<button style={secondary} onClick={()=>void sendCatacToChat()}>Enviar referencia CATAC al chat</button>}<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}><input style={input} value={advanceAmount} onChange={e=>setAdvanceAmount(e.target.value)} type="number" placeholder="Adelanto ARS"/><input style={input} value={advancePct} onChange={e=>setAdvancePct(e.target.value)} type="number" placeholder="% del flete"/><button style={secondary} onClick={()=>void requestAdvance(selectedClosure)}>Solicitar adelanto</button></div></section>}
  <section style={panel}><h2 style={{fontSize:18,fontWeight:850}}>Calculadora de referencia CATAC</h2><p style={{color:"#64748b"}}>La tarifa se calcula únicamente cuando Administración cargó una tabla CATAC vigente. No se estiman tarifas no verificadas.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>{field("Distancia (km)",<input style={input} type="number" value={distanceKm} onChange={e=>setDistanceKm(e.target.value)}/>)}{field("Toneladas",<input style={input} type="number" value={tonnes} onChange={e=>setTonnes(e.target.value)}/>)}<button style={primary} onClick={()=>void findCatac()}>Calcular referencia</button></div>{catac&&<p>Tarifa {catac.fuente}: {new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(catac.valor_tonelada_ars)} / TN · Total referencial: <b>{new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(catac.total)}</b> · Rango {catac.distancia_km_desde}-{catac.distancia_km_hasta} km.</p>}</section>
  <section style={panel}><h2 style={{fontWeight:850}}>Cuentas oficiales de pago de AgroComercio Santa Fe</h2>{bankAccounts.length>0?bankAccounts.map((a:any)=><div key={a.id}><b>{a.account_holder}</b> · {a.bank_name} · {a.currency}<p>CBU: {a.cbu} · Alias: {a.alias||"—"}</p></div>):<p style={{color:"#9a3412"}}>No hay una cuenta bancaria activa cuyo titular esté identificado como AgroComercio Santa Fe. No transfieras a otra cuenta hasta que Administración cargue y verifique los datos oficiales.</p>}</section>
 </main>;
}
