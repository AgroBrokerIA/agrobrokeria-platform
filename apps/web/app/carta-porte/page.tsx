"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Op = { id:string; codigo:string|null; cantidad_tn:number|null; estado:string|null };
type Viaje = {id:string;transportista_profile_id:string|null;patente_camion:string|null;patente_acoplado:string|null;estado:string|null;carta_porte_ctg:string|null};
type Transportista = {profile_id:string;cuit:string|null;nombre_completo:string|null;verificacion_estado:string};
type Log = {
  id:string; operacion_id:string; estado:string|null; carta_porte_numero:string|null;
  carta_porte_estado:string|null; carta_porte_origen:string|null; carta_porte_codigo:string|null;
  carta_porte_fecha_emision:string|null; carta_porte_fecha_vencimiento:string|null; carta_porte_qr:string|null;
  transportista:string|null; transportista_cuit:string|null; chofer_nombre:string|null; chofer_documento:string|null;
  patente_camion:string|null; patente_acoplado:string|null; fecha_carga:string|null; hora_carga:string|null;
  fecha_estimada_entrega:string|null; destino:string|null; numero_turno:string|null;
};

const empty = {
  estado:"PENDIENTE",
  carta_porte_numero:"", carta_porte_estado:"BORRADOR", carta_porte_origen:"PENDIENTE_INTEGRACION_OFICIAL",
  carta_porte_codigo:"", carta_porte_fecha_emision:"", carta_porte_fecha_vencimiento:"", carta_porte_qr:"",
  transportista:"", transportista_cuit:"", chofer_nombre:"", chofer_documento:"",
  patente_camion:"", patente_acoplado:"", fecha_carga:"", hora_carga:"",
  fecha_estimada_entrega:"", destino:"", numero_turno:"",
  tipo_cp:"", sucursal:"", cod_grano:"", peso_bruto_kg:"", peso_tara_kg:"",
  cuit_solicitante:"", origen_provincia:"", origen_localidad:"", nro_renspa:"",
  destino_cuit:"", destino_provincia:"", destino_localidad:"", planta:"", destinatario_cuit:"",
  km_recorrer:"", dominio_camion:"", chofer_cuit:"", cuit_pagador_flete:"", cuit_intermediario_flete:"", fecha_hora_partida:"",
  cosecha:"", codigo_turno:"", tarifa:"", corresponde_retiro_productor:"false", es_destino_campo:"false", mercaderia_fumigada:"false"
};

export default function CartaPortePage(){
  const [ops,setOps]=useState<Op[]>([]), [logs,setLogs]=useState<Log[]>([]);
  const [viajes,setViajes]=useState<Viaje[]>([]),[transportistas,setTransportistas]=useState<Transportista[]>([]);
  const [selected,setSelected]=useState(""),[selectedViaje,setSelectedViaje]=useState(""),[form,setForm]=useState(empty);
  const [loading,setLoading]=useState(true), [saving,setSaving]=useState(false), [emitting,setEmitting]=useState(false), [message,setMessage]=useState(""), [error,setError]=useState("");

  const logMap=useMemo(()=>new Map(logs.map(x=>[x.operacion_id,x])),[logs]);
  const current=selected?logMap.get(selected):undefined;

  async function load(){
    setLoading(true); setError("");
    const [o,l]=await Promise.all([
      supabase.from("operaciones").select("id,codigo,cantidad_tn,estado").order("fecha_operacion",{ascending:false}).limit(200),
      supabase.from("operacion_logistica").select("id,operacion_id,estado,carta_porte_numero,carta_porte_estado,carta_porte_origen,carta_porte_codigo,carta_porte_fecha_emision,carta_porte_fecha_vencimiento,carta_porte_qr,transportista,transportista_cuit,chofer_nombre,chofer_documento,patente_camion,patente_acoplado,fecha_carga,hora_carga,fecha_estimada_entrega,destino,numero_turno").order("updated_at",{ascending:false}).limit(200)
    ]);
    if(o.error||l.error){setError(o.error?.message||l.error?.message||"No se pudo cargar Carta de Porte.");setLoading(false);return}
    const oo=(o.data||[]) as Op[], ll=(l.data||[]) as Log[];
    setOps(oo); setLogs(ll);
    const requestedOperation=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("operacion"):null;
    if(requestedOperation && oo.some(x=>x.id===requestedOperation))setSelected(requestedOperation);
    else if(!selected && oo[0]) setSelected(oo[0].id);
    setLoading(false);
  }

  useEffect(()=>{void load()},[]);

  useEffect(()=>{
    if(!selected) return;
    setSelectedViaje("");
    void (async()=>{
      const {data:trips,error:tripError}=await supabase.from("viajes").select("id,transportista_profile_id,patente_camion,patente_acoplado,estado,carta_porte_ctg").eq("operacion_id",selected).order("creado_en",{ascending:true});
      if(tripError){setError("No se pudieron cargar los camiones asignados: "+tripError.message);setViajes([]);setTransportistas([]);return;}
      const rows=(trips||[]) as Viaje[];setViajes(rows);
      const ids=[...new Set(rows.map(x=>x.transportista_profile_id).filter(Boolean) as string[])];
      if(ids.length){
        const {data:drivers,error:driverError}=await supabase.from("transportistas").select("profile_id,cuit,nombre_completo,verificacion_estado").in("profile_id",ids);
        if(driverError){setError("No se pudieron cargar los datos de los transportistas: "+driverError.message);setTransportistas([]);}
        else setTransportistas((drivers||[]) as Transportista[]);
      }else setTransportistas([]);
      if(rows.length)setSelectedViaje(rows.find(x=>!x.carta_porte_ctg)?.id||rows[0].id);
    })();
    const l=logMap.get(selected);
    setForm(l ? {
      ...empty,
      estado:l.estado||"PENDIENTE", carta_porte_numero:l.carta_porte_numero||"",
      carta_porte_estado:l.carta_porte_estado||"BORRADOR", carta_porte_origen:l.carta_porte_origen||"PENDIENTE_INTEGRACION_OFICIAL",
      carta_porte_codigo:l.carta_porte_codigo||"", carta_porte_fecha_emision:l.carta_porte_fecha_emision?.slice(0,16)||"",
      carta_porte_fecha_vencimiento:l.carta_porte_fecha_vencimiento?.slice(0,16)||"", carta_porte_qr:l.carta_porte_qr||"",
      transportista:l.transportista||"", transportista_cuit:l.transportista_cuit||"", chofer_nombre:l.chofer_nombre||"",
      chofer_documento:l.chofer_documento||"", patente_camion:l.patente_camion||"", patente_acoplado:l.patente_acoplado||"",
      fecha_carga:l.fecha_carga||"", hora_carga:l.hora_carga||"", fecha_estimada_entrega:l.fecha_estimada_entrega||"",
      destino:l.destino||"", numero_turno:l.numero_turno||""
    } : empty);
  },[selected,logMap]);

  useEffect(()=>{
    const trip=viajes.find(x=>x.id===selectedViaje);
    if(!trip)return;
    const driver=transportistas.find(x=>x.profile_id===trip.transportista_profile_id);
    setForm(prev=>({...prev,
      transportista:prev.transportista||driver?.nombre_completo||"",
      transportista_cuit:prev.transportista_cuit||driver?.cuit||"",
      chofer_nombre:prev.chofer_nombre||driver?.nombre_completo||"",
      chofer_cuit:prev.chofer_cuit||driver?.cuit||"",
      dominio_camion:prev.dominio_camion||trip.patente_camion||"",
      patente_camion:prev.patente_camion||trip.patente_camion||"",
      patente_acoplado:prev.patente_acoplado||trip.patente_acoplado||""
    }));
  },[selectedViaje,viajes,transportistas]);

  const set=(k:keyof typeof form,v:string)=>setForm(x=>({...x,[k]:v}));
  async function emitArca(){
    if(!selected){setError("Seleccioná una operación.");return}
    setEmitting(true);setError("");setMessage("");
    if(!selectedViaje){setError("Primero asigná un camión a esta operación desde Operaciones → Logística.");setEmitting(false);return;}
    const trip=viajes.find(x=>x.id===selectedViaje);
    const driver=transportistas.find(x=>x.profile_id===trip?.transportista_profile_id);
    if(!trip?.transportista_profile_id){setError("El viaje seleccionado todavía no tiene transportista asignado.");setEmitting(false);return;}
    const payload={operation_id:selected,viaje_id:selectedViaje,...form,transportista_cuit:form.transportista_cuit||driver?.cuit||"",chofer_cuit:form.chofer_cuit||driver?.cuit||"",dominio_camion:form.dominio_camion||trip.patente_camion||"",dominio_acoplado:form.patente_acoplado||trip.patente_acoplado||"",sucursal:form.sucursal?Number(form.sucursal):undefined,fecha_hora_partida:form.fecha_hora_partida||(form.fecha_carga&&form.hora_carga?form.fecha_carga+"T"+form.hora_carga+":00":""),es_destino_campo:form.es_destino_campo==="true",corresponde_retiro_productor:form.corresponde_retiro_productor==="true",mercaderia_fumigada:form.mercaderia_fumigada==="true"};
    const {data,error:e}=await supabase.functions.invoke("carta-porte-arca",{body:payload});
    if(e){setError(e.message||"No se pudo invocar WSCPE.");setEmitting(false);return}
    if(!data?.ok){setError(data?.error||data?.errors?.map((x:any)=>x.code+": "+x.description).join(" | ")||"ARCA no autorizó la Carta de Porte.");setEmitting(false);return}
    setViajes(prev=>prev.map(x=>x.id===selectedViaje?{...x,carta_porte_ctg:String(data.nro_ctg)}:x));
    setMessage("Carta de Porte autorizada por ARCA. CTG "+data.nro_ctg+" · orden "+data.nro_orden+". "+(data.pdf_disponible?"El PDF oficial también se guardó automáticamente en el expediente del camión.":"ARCA no devolvió el PDF en esta respuesta ("+(data.pdf_error||"sin archivo") +"). El CTG y las toneladas quedaron guardados; adjuntá el PDF oficial desde la ficha de logística."));
    await load();setEmitting(false);
  }

  async function save(){
    if(!selected){setError("Seleccioná una operación.");return}
    setSaving(true);setError("");setMessage("");
    const payload={...form,id:current?.id||"",carta_porte_fecha_emision:form.carta_porte_fecha_emision?new Date(form.carta_porte_fecha_emision).toISOString():"",
      carta_porte_fecha_vencimiento:form.carta_porte_fecha_vencimiento?new Date(form.carta_porte_fecha_vencimiento).toISOString():""};
    const {error:e}=await supabase.rpc("guardar_operacion_logistica",{p_operacion_id:selected,p_datos:payload});
    if(e){setError(e.message);setSaving(false);return}
    setMessage("Carta de Porte guardada en la operación. La emisión oficial queda pendiente de la integración externa correspondiente.");
    await load(); setSaving(false);
  }

  return <main className="module-page">
    <div className="module-hero">
      <div><span className="eyebrow">LOGÍSTICA</span><h1>Carta de Porte</h1>
      <p>Prepará y controlá los datos de la Carta de Porte vinculados a cada operación. AgroBrokerIA no inventa números ni comprobantes oficiales.</p></div>
      <Link className="module-pill" href="/logistica">Volver a logística</Link>
    </div>
    {message&&<div className="module-alert">{message}</div>}
    {error&&<div className="module-alert module-alert-error">{error}</div>}
    <section className="company-card" style={{marginBottom:18}}>
      <label>Operación</label>
      <select value={selected} onChange={e=>setSelected(e.target.value)} style={{display:"block",width:"100%",marginTop:8,padding:12,borderRadius:10,border:"1px solid #dbe3ea"}}>
        <option value="">Seleccionar operación</option>
        {ops.map(o=><option key={o.id} value={o.id}>{o.codigo||o.id} · {Number(o.cantidad_tn||0).toLocaleString("es-AR")} TN · {o.estado||"sin estado"}</option>)}
      </select>
    </section>
    {selected&&<section className="company-card" style={{marginBottom:18}}>
      <label>Camión / viaje al que corresponde esta Carta de Porte</label>
      <select value={selectedViaje} onChange={e=>setSelectedViaje(e.target.value)} style={{display:"block",width:"100%",marginTop:8,padding:12,borderRadius:10,border:"1px solid #dbe3ea"}}>
        <option value="">Seleccionar camión asignado</option>
        {viajes.map(v=>{const t=transportistas.find(x=>x.profile_id===v.transportista_profile_id);return <option key={v.id} value={v.id}>{t?.nombre_completo||"Transportista"} · {v.patente_camion||"Sin patente"}{v.carta_porte_ctg?" · CTG "+v.carta_porte_ctg:" · Sin CTG"}</option>})}
      </select>
      {selectedViaje&&(()=>{const v=viajes.find(x=>x.id===selectedViaje);const t=transportistas.find(x=>x.profile_id===v?.transportista_profile_id);return <p style={{fontSize:12,color:"#475569",marginTop:8}}>Datos precargados: {t?.nombre_completo||"Transportista"} · CUIT {t?.cuit||"pendiente"} · Camión {v?.patente_camion||"patente pendiente"} · Acoplado {v?.patente_acoplado||"no registrado"}. Estado de identidad: {t?.verificacion_estado||"no disponible"}.</p>})()}
      {viajes.length===0&&<p style={{fontSize:13,color:"#b45309"}}>Todavía no hay camiones asignados. Volvé a la operación y asigná los transportistas antes de emitir.</p>}
    </section>}
    {loading?<section className="company-card">Cargando…</section>:selected&&<section className="company-card">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:16}}>
        {[
          ["carta_porte_estado","Estado Carta de Porte","select",["BORRADOR","PENDIENTE_EMISION","EMITIDA","VERIFICADA","OBSERVADA"]],
          ["carta_porte_numero","Número oficial","text"],["carta_porte_codigo","Código","text"],
          ["carta_porte_origen","Origen del comprobante","text"],["carta_porte_fecha_emision","Fecha emisión","datetime-local"],
          ["carta_porte_fecha_vencimiento","Fecha vencimiento","datetime-local"],["transportista","Transportista","text"],
          ["transportista_cuit","CUIT transportista","text"],["chofer_nombre","Chofer","text"],["chofer_documento","Documento chofer","text"],
          ["patente_camion","Patente camión","text"],["patente_acoplado","Patente acoplado","text"],["fecha_carga","Fecha carga","date"],
          ["hora_carga","Hora carga","time"],["fecha_estimada_entrega","Entrega estimada","date"],["destino","Destino","text"],
          ["numero_turno","Número de turno","text"],["carta_porte_qr","QR / referencia oficial","text"]
        ].map((x:any)=><label key={x[0]}>{x[1]}
          {x[2]==="select"?<select value={(form as any)[x[0]]} onChange={e=>set(x[0],e.target.value)} style={{display:"block",width:"100%",marginTop:7,padding:11,borderRadius:9,border:"1px solid #dbe3ea"}}>{x[3].map((v:string)=><option key={v}>{v}</option>)}</select>
          :<input type={x[2]} value={(form as any)[x[0]]} onChange={e=>set(x[0],e.target.value)} style={{display:"block",width:"100%",marginTop:7,padding:11,borderRadius:9,border:"1px solid #dbe3ea"}} />}
        </label>)}
      </div>
      <div style={{marginTop:18,padding:14,borderRadius:10,background:"#f7faf8",fontSize:13}}>
        <strong>Integración oficial:</strong> los campos oficiales se almacenan solamente cuando provienen de la fuente externa autorizada. Hasta configurar esa integración, el sistema conserva el expediente como preparación/pending y no genera una Carta de Porte ficticia.
      </div>
      <div style={{marginTop:22,padding:16,borderRadius:12,border:"1px solid #dbe3ea"}}>
        <strong>Emisión oficial ARCA — WSCPE</strong>
        <p style={{fontSize:13,marginTop:6}}>Estos datos son los exigidos por el servicio oficial. No se envía nada a ARCA hasta que completes los campos y la empresa tenga certificado/clave y autorización WSCPE configurados.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,marginTop:12}}>
          {[
            ["tipo_cp","Tipo CPE","text"],["sucursal","Sucursal","number"],["cod_grano","Código de grano ARCA","text"],
            ["peso_bruto_kg","Peso bruto kg","number"],["peso_tara_kg","Peso tara kg","number"],["cuit_solicitante","CUIT solicitante","text"],
            ["origen_provincia","Código provincia origen","text"],["origen_localidad","Código localidad origen","text"],["nro_renspa","RENSPA","text"],
            ["destino_cuit","CUIT destino","text"],["destino_provincia","Código provincia destino","text"],["destino_localidad","Código localidad destino","text"],
            ["planta","Planta destino","text"],["destinatario_cuit","CUIT destinatario","text"],["transportista_cuit","CUIT transportista","text"],
            ["dominio_camion","Dominio camión","text"],["chofer_cuit","CUIT chofer","text"],["km_recorrer","Km a recorrer","number"],
            ["cuit_pagador_flete","CUIT pagador flete","text"],["cuit_intermediario_flete","CUIT intermediario flete","text"],["codigo_turno","Código turno","text"],
            ["cosecha","Cosecha","text"],["tarifa","Tarifa","number"],["fecha_hora_partida","Fecha y hora de partida","datetime-local"]
          ].map((x:any)=><label key={x[0]}>{x[1]}<input type={x[2]} value={(form as any)[x[0]]||""} onChange={e=>set(x[0],e.target.value)} style={{display:"block",width:"100%",marginTop:6,padding:10,borderRadius:8,border:"1px solid #dbe3ea"}} /></label>)}
        </div>
        <div style={{display:"flex",gap:20,marginTop:12,flexWrap:"wrap"}}>
          {[["es_destino_campo","Destino campo"],["corresponde_retiro_productor","Retiro productor"],["mercaderia_fumigada","Mercadería fumigada"]].map((x:any)=><label key={x[0]}><input type="checkbox" checked={(form as any)[x[0]]==="true"} onChange={e=>set(x[0],e.target.checked?"true":"false")} /> {x[1]}</label>)}
        </div>
        <button className="module-pill" type="button" disabled={emitting||!selectedViaje||Boolean(viajes.find(x=>x.id===selectedViaje)?.carta_porte_ctg)} onClick={()=>void emitArca()} style={{marginTop:16}}>{emitting?"Enviando a ARCA…":viajes.find(x=>x.id===selectedViaje)?.carta_porte_ctg?"Carta de Porte ya emitida":"Emitir oficialmente en ARCA"}</button>
      </div>
      <button className="module-pill" type="button" disabled={saving} onClick={()=>void save()} style={{marginTop:18}}>{saving?"Guardando…":"Guardar Carta de Porte"}</button>
    </section>}
  </main>
}
