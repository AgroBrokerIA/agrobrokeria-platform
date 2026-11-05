"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Logistica = {
  id?: string;
  operacion_id: string;
  estado: string;
  carta_porte_numero: string;
  carta_porte_estado: string;
  carta_porte_origen: string;
  carta_porte_verificada_at: string;
  carta_porte_response: unknown;
  carta_porte_codigo: string;
  carta_porte_fecha_emision: string;
  carta_porte_fecha_vencimiento: string;
  carta_porte_qr: string;
  transportista: string;
  transportista_cuit: string;
  chofer_nombre: string;
  chofer_documento: string;
  patente_camion: string;
  patente_acoplado: string;
  fecha_carga: string;
  hora_carga: string;
  fecha_estimada_entrega: string;
  destino: string;
  numero_turno: string;
  fecha_entrega: string;
  kilos_entregados: string;
  observaciones_entrega: string;
};

const inicial: Logistica = {
  operacion_id: "",
  estado: "PENDIENTE",
  carta_porte_numero: "",
  carta_porte_estado: "PENDIENTE_ARCA",
  carta_porte_origen: "ARCA",
  carta_porte_verificada_at: "",
  carta_porte_response: null,
    carta_porte_codigo: "",
    carta_porte_fecha_emision: "",
    carta_porte_fecha_vencimiento: "",
    carta_porte_qr: "",
  transportista: "",
  transportista_cuit: "",
  chofer_nombre: "",
  chofer_documento: "",
  patente_camion: "",
  patente_acoplado: "",
  fecha_carga: "",
  hora_carga: "",
  fecha_estimada_entrega: "",
  destino: "",
  numero_turno: "",
  fecha_entrega: "",
  kilos_entregados: "",
  observaciones_entrega: "",
};

export default function LogisticaEntrega({
  operacionId,
  onEntregaConfirmada,
}: {
  operacionId: string;
  onEntregaConfirmada?: () => Promise<boolean>;
}) {
  const [datos, setDatos] = useState<Logistica>({
    ...inicial,
    operacion_id: operacionId,
  });

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, [operacionId]);

  async function cargar() {
    setError("");

    const { data, error } = await supabase
      .from("operacion_logistica")
      .select("*")
      .eq("operacion_id", operacionId)
      .order("creado_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setError(`No se pudo cargar la logística: ${error.message}`);
      return;
    }

    if (data) {
      setDatos({
        ...inicial,
        ...data,
        fecha_carga: data.fecha_carga || "",
        hora_carga: data.hora_carga || "",
        fecha_estimada_entrega: data.fecha_estimada_entrega || "",
        fecha_entrega: data.fecha_entrega || "",
        kilos_entregados:
          data.kilos_entregados != null
            ? String(data.kilos_entregados)
            : "",
      });
    }
  }

  function cambiar(campo: keyof Logistica, valor: string) {
    setDatos((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function abrirARCA() {
    window.open(
      "https://auth.arca.gob.ar/",
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function registrarCartaPorteARCA() {
    setError("");
    setMensaje("");

    const numero = datos.carta_porte_numero.trim();

    if (!numero) {
      setError("⚠️ Ingresá el número de Carta de Porte Electrónica emitida por ARCA.");
      return;
    }

    setGuardando(true);

    const ahora = new Date().toISOString();

    const cambios = {
      carta_porte_numero: numero,
      carta_porte_estado: "EMITIDA_ARCA",
      carta_porte_origen: "ARCA",
      carta_porte_verificada_at: ahora,
      updated_at: ahora,
    };

    const resultado = await supabase.rpc("guardar_operacion_logistica", {
      p_operacion_id: operacionId,
      p_datos: { id: datos.id || null, ...datos, ...cambios },
    });

    if (resultado.error) {
      setError(
        `No se pudo registrar la Carta de Porte ARCA: ${resultado.error.message}`
      );
      setGuardando(false);
      return;
    }

    setDatos({
      ...datos,
      ...resultado.data,
      carta_porte_estado: "EMITIDA_ARCA",
      carta_porte_origen: "ARCA",
      carta_porte_verificada_at: ahora,
    });

    setMensaje(
      "✅ Carta de Porte registrada como emitida por ARCA."
    );

    setGuardando(false);
  }

  async function guardar(nuevoEstado?: string) {
    setGuardando(true);
    setMensaje("");
    setError("");

    const payload = {
      ...datos,
      operacion_id: operacionId,
      estado: nuevoEstado || datos.estado,
      kilos_entregados:
        datos.kilos_entregados === ""
          ? null
          : Number(datos.kilos_entregados),
      fecha_entrega:
        datos.fecha_entrega === "" ? null : datos.fecha_entrega,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.rpc("guardar_operacion_logistica", {
      p_operacion_id: operacionId,
      p_datos: { id: datos.id || null, ...payload },
    });

    if (error) {
      setError(`No se pudo guardar la logística: ${error.message}`);
      setGuardando(false);
      return;
    }

    setDatos({
      ...datos,
      ...data,
      estado: data.estado,
      kilos_entregados:
        data.kilos_entregados != null
          ? String(data.kilos_entregados)
          : "",
    });

    setMensaje("✅ Información logística guardada.");
    setGuardando(false);
  }

  const campo = (label: string, nombre: keyof Logistica, tipo = "text") => (
    <label style={{display:"grid",gap:6,minWidth:0,color:"#334155",fontSize:13,fontWeight:700}}>
      {label}
      <input
        type={tipo}
        value={String(datos[nombre] || "")}
        onChange={(e) => cambiar(nombre, e.target.value)}
        style={{width:"100%",minWidth:0,boxSizing:"border-box",height:42,padding:"9px 11px",borderRadius:9,border:"1px solid #cbd5e1",background:"#fff",color:"#0f172a",fontSize:14,fontWeight:500,outlineColor:"#0d9566"}}
      />
    </label>
  );

  return (
    <div style={{display:"grid",gap:16,minWidth:0,color:"#0f172a"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:"12px 15px",border:"1px solid #dbe7f2",borderRadius:12,background:"#f8fafc"}}>
        <div><div style={{fontSize:15,fontWeight:800}}>🚚 Datos de transporte y entrega</div><div style={{fontSize:12,color:"#64748b",marginTop:3}}>Los cambios quedan asociados a esta operación.</div></div>
        <span style={{padding:"6px 10px",borderRadius:999,background:datos.estado==="ENTREGADA"?"#dcfce7":"#eaf2ff",color:datos.estado==="ENTREGADA"?"#166534":"#1d4ed8",fontSize:12,fontWeight:800}}>{String(datos.estado).replaceAll("_"," ")}</span>
      </div>

      <section style={{display:"grid",gap:12,padding:16,border:"1px solid #dbe3ed",borderRadius:12,background:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
          <div><h4 style={{margin:0,fontSize:15}}>🧾 Carta de Porte Electrónica (ARCA)</h4><p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>Emitila en ARCA y registrá aquí el número oficial.</p></div>
          <span style={{fontSize:11,fontWeight:800,padding:"6px 9px",borderRadius:999,background:datos.carta_porte_estado==="EMITIDA_ARCA"?"#dcfce7":"#fff1f2",color:datos.carta_porte_estado==="EMITIDA_ARCA"?"#166534":"#be123c"}}>{datos.carta_porte_estado==="EMITIDA_ARCA"?"EMITIDA":"PENDIENTE"}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:10,alignItems:"end"}}>
          <div>{campo("Número de Carta de Porte emitida por ARCA","carta_porte_numero")}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button type="button" onClick={abrirARCA} disabled={guardando} style={{height:42,padding:"0 13px",border:0,borderRadius:9,background:"#2563eb",color:"#fff",fontWeight:700,cursor:"pointer"}}>Abrir ARCA ↗</button>
            <button type="button" onClick={registrarCartaPorteARCA} disabled={guardando} style={{height:42,padding:"0 13px",border:0,borderRadius:9,background:"#078b58",color:"#fff",fontWeight:700,cursor:"pointer"}}>{guardando?"Guardando…":"Registrar CPE"}</button>
          </div>
        </div>
      </section>

      <section style={{display:"grid",gap:12,padding:16,border:"1px solid #dbe3ed",borderRadius:12,background:"#fff"}}>
        <div><h4 style={{margin:0,fontSize:15}}>🚛 Transporte y carga</h4><p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>Identificación del transportista, chofer y unidad.</p></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
          {campo("Transportista","transportista")}
          {campo("CUIT del transportista","transportista_cuit")}
          {campo("Nombre del chofer","chofer_nombre")}
          {campo("Documento del chofer","chofer_documento")}
          {campo("Patente del camión","patente_camion")}
          {campo("Patente del acoplado","patente_acoplado")}
          {campo("Fecha de carga","fecha_carga","date")}
          {campo("Hora de carga","hora_carga","time")}
        </div>
      </section>

      <section style={{display:"grid",gap:12,padding:16,border:"1px solid #dbe3ed",borderRadius:12,background:"#fff"}}>
        <div><h4 style={{margin:0,fontSize:15}}>📍 Entrega y recepción</h4><p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>Registrá destino, turno, volumen recibido y observaciones.</p></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
          {campo("Destino","destino")}
          {campo("Número de turno","numero_turno")}
          {campo("Fecha estimada de entrega","fecha_estimada_entrega","date")}
          {campo("Kilos entregados","kilos_entregados","number")}
          {campo("Fecha y hora efectiva de entrega","fecha_entrega","datetime-local")}
        </div>
        <label style={{display:"grid",gap:6,fontSize:13,fontWeight:700,color:"#334155"}}>Observaciones de entrega
          <textarea value={datos.observaciones_entrega||""} onChange={e=>cambiar("observaciones_entrega",e.target.value)} rows={3} style={{width:"100%",boxSizing:"border-box",resize:"vertical",padding:11,borderRadius:9,border:"1px solid #cbd5e1",fontSize:14,color:"#0f172a"}}/>
        </label>
      </section>

      {error&&<div role="alert" style={{padding:12,borderRadius:9,background:"#fff1f2",border:"1px solid #fecdd3",color:"#9f1239",fontSize:13,fontWeight:600}}>{error}</div>}
      {mensaje&&<div role="status" style={{padding:12,borderRadius:9,background:"#ecfdf5",border:"1px solid #a7f3d0",color:"#166534",fontSize:13,fontWeight:600}}>{mensaje}</div>}

      <div style={{position:"sticky",bottom:0,zIndex:2,display:"flex",justifyContent:"flex-end",gap:9,flexWrap:"wrap",padding:"12px 0 2px",background:"linear-gradient(180deg,rgba(255,255,255,0),#fff 22%)"}}>
        <button type="button" disabled={guardando} onClick={()=>guardar()} style={{height:42,padding:"0 15px",border:"1px solid #cbd5e1",borderRadius:9,background:"#fff",color:"#334155",fontWeight:700,cursor:"pointer"}}>Guardar cambios</button>
        <button type="button" disabled={guardando} onClick={()=>guardar("PROGRAMADA")} style={{height:42,padding:"0 15px",border:0,borderRadius:9,background:"#2563eb",color:"#fff",fontWeight:700,cursor:"pointer"}}>Programar carga</button>
        <button type="button" disabled={guardando||datos.carta_porte_estado!=="EMITIDA_ARCA"} onClick={()=>guardar("EN_TRANSITO")} style={{height:42,padding:"0 15px",border:0,borderRadius:9,background:"#d97706",color:"#fff",fontWeight:700,cursor:guardando?"wait":"pointer",opacity:datos.carta_porte_estado!=="EMITIDA_ARCA" ? 0.55 : 1}}>Iniciar traslado</button>
        <button type="button" disabled={guardando} onClick={async()=>{
          const faltantes:string[]=[];
          if(datos.carta_porte_estado!=="EMITIDA_ARCA"||!datos.carta_porte_numero.trim())faltantes.push("Carta de Porte emitida y registrada en ARCA");
          if(!datos.transportista.trim())faltantes.push("Transportista");
          if(!datos.chofer_nombre.trim())faltantes.push("Chofer");
          if(!datos.patente_camion.trim())faltantes.push("Patente del camión");
          if(!datos.fecha_carga)faltantes.push("Fecha de carga");
          if(!datos.destino.trim())faltantes.push("Destino");
          if(datos.kilos_entregados===""||Number(datos.kilos_entregados)<=0)faltantes.push("Kilos entregados");
          if(faltantes.length){setError("No se puede confirmar la entrega. Completá: "+faltantes.join(", ")+".");setMensaje("");return;}
          const ahora=new Date().toISOString();setGuardando(true);setError("");setMensaje("");
          const payload={...datos,operacion_id:operacionId,estado:"ENTREGADA",kilos_entregados:Number(datos.kilos_entregados),fecha_entrega:datos.fecha_entrega||ahora,updated_at:ahora};
          const resultado=await supabase.rpc("guardar_operacion_logistica",{p_operacion_id:operacionId,p_datos:{id:datos.id||null,...payload}});
          if(resultado.error){setError("No se pudo confirmar la entrega: "+resultado.error.message);setGuardando(false);return;}
          setDatos({...datos,...resultado.data,estado:"ENTREGADA",kilos_entregados:resultado.data.kilos_entregados!=null?String(resultado.data.kilos_entregados):datos.kilos_entregados});
          setMensaje("Entrega confirmada correctamente.");setGuardando(false);
          if(onEntregaConfirmada)await onEntregaConfirmada();
        }} style={{height:42,padding:"0 16px",border:0,borderRadius:9,background:"#078b58",color:"#fff",fontWeight:800,cursor:"pointer"}}>{guardando?"Procesando…":"Confirmar entrega"}</button>
        <button type="button" disabled={guardando} onClick={()=>guardar("OBSERVADA")} style={{height:42,padding:"0 14px",border:"1px solid #fecaca",borderRadius:9,background:"#fff7f7",color:"#b91c1c",fontWeight:700,cursor:"pointer"}}>Observar</button>
      </div>
    </div>
  );}
