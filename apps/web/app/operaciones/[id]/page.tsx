"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Operacion = {
  id: string;
  codigo: string;
  estado: string;
  precio_tn: number;
  cantidad_tn: number;
  importe_total: number;
};

type Workflow = {
  id: string;
  etapa_actual_id: string;
  estado: string;
  orden: number;
  etapa_actual: string;
};

type Etapa = {
  id: string;
  orden: number;
  nombre: string;
  descripcion: string;
};

type Historial = {
  id: string;
  etapa_id: string;
  orden: number;
  etapa: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  observaciones: string | null;
};

export default function DetalleOperacion() {
  const params = useParams();
  const id = params.id as string;

  const [operacion, setOperacion] = useState<Operacion | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [expediente, setExpediente] = useState<any>(null);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [comexDocs, setComexDocs] = useState<any[]>([]);
  const [comexLanguage, setComexLanguage] = useState("en");
  const [comexLetterhead, setComexLetterhead] = useState("empresa");
  const [comexBusy, setComexBusy] = useState(false);
  const [comexMessage, setComexMessage] = useState("");

  async function cargarDatos() {
    setCargando(true);
    setMensaje("");

    const { data: op, error: opError } = await supabase
      .from("operaciones")
      .select(
        "id, codigo, estado, precio_tn, cantidad_tn, importe_total"
      )
      .eq("id", id)
      .single();

    if (opError) {
      setMensaje(`Error cargando operación: ${opError.message}`);
      setCargando(false);
      return;
    }

    const { data: wf, error: wfError } = await supabase
      .from("operacion_workflow")
      .select(`
        id,
        workflow_id,
        etapa_actual_id,
        estado,
        workflow_etapas!inner (
          orden,
          nombre
        )
      `)
      .eq("operacion_id", id)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (wfError) {
      setMensaje(`Error cargando workflow: ${wfError.message}`);
      setCargando(false);
      return;
    }

    if (!wf) {
      setOperacion({ ...op, estado: op.estado ?? "PENDIENTE", importe_total: op.importe_total ?? 0 });
      setWorkflow({ id: "", etapa_actual_id: "", estado: "SIN_WORKFLOW", orden: 0, etapa_actual: "Workflow pendiente de configuración" });
      setEtapas([]);
      setHistorial([]);
      setMensaje("La operación existe, pero todavía no tiene un workflow asociado. Se muestran los datos disponibles del expediente.");
      setCargando(false);
      return;
    }

    const workflowId = (wf as any).workflow_id as string | undefined;

    if (!workflowId) {
      setMensaje("La operación no tiene un workflow asociado.");
      setCargando(false);
      return;
    }

    const etapaActual = Array.isArray(wf.workflow_etapas)
      ? wf.workflow_etapas[0]
      : wf.workflow_etapas;

    const { data: etapasData, error: etapasError } = await supabase
      .from("workflow_etapas")
      .select("id, orden, nombre, descripcion")
      .eq("workflow_id", workflowId)
      .order("orden", { ascending: true });

    if (etapasError) {
      setMensaje(`Error cargando etapas: ${etapasError.message}`);
      setCargando(false);
      return;
    }

    const [expedienteRes, facturasRes, contratosRes, documentosRes, pricingRes, comexRes] = await Promise.all([
      supabase.rpc("obtener_expediente_operacion", { p_operacion_id: id }),
      supabase.from("facturas").select("id,estado,numero_comprobante,cae,importe_total,fecha_emision").eq("operacion_id", id).order("fecha_emision", { ascending:false }),
      supabase.from("contratos").select("id,numero_contrato,estado,fecha_firma").eq("operacion_id", id).order("creado_en", { ascending:false }),
      supabase.from("documentos_operacion").select("id,nombre_archivo,tipo_documento,aprobado,obligatorio,observaciones,creado_en").eq("operacion_id", id).order("creado_en", { ascending:false }).limit(20),
      supabase.from("pricing_calculations").select("id,base_price,premium,discount,freight,taxes,commission,other_costs,final_price,currency,unit,price_type,formula,created_at").eq("operation_id", id).order("created_at",{ascending:false}).limit(10),
      supabase.from("documentos_comex").select("id,tipo_documento,idioma_generado,estado,hash_sha256,creado_en").eq("operacion_id",id).order("creado_en",{ascending:false}).limit(10)
    ]);
    setExpediente(expedienteRes.data);
    setFacturas(facturasRes.data || []);
    setContratos(contratosRes.data || []);
    setDocumentos(documentosRes.data || []);
    setPricing((pricingRes.data || []));
    setComexDocs(comexRes.data || []);

    const { data: historialData, error: historialError } = await supabase
      .from("workflow_historial")
      .select(`
        id,
        etapa_id,
        fecha_inicio,
        fecha_fin,
        observaciones,
        workflow_etapas!inner (
          orden,
          nombre
        )
      `)
      .eq("operacion_workflow_id", wf.id)
      .order("fecha_inicio", { ascending: true });

    if (historialError) {
      setMensaje(`Error cargando historial: ${historialError.message}`);
      setCargando(false);
      return;
    }

    setOperacion({ ...op, estado: op.estado ?? "PENDIENTE", importe_total: op.importe_total ?? 0 });

    setWorkflow({
      id: wf.id,
      etapa_actual_id: wf.etapa_actual_id ?? "",
      estado: wf.estado ?? "PENDIENTE",
      orden: etapaActual?.orden ?? 1,
      etapa_actual: etapaActual?.nombre ?? "Sin etapa",
    });

    setEtapas((etapasData ?? []).map((etapa) => ({ ...etapa, descripcion: etapa.descripcion ?? "" })));

    setHistorial(
      (historialData ?? []).map((item: any) => ({
        id: item.id,
        etapa_id: item.etapa_id,
        orden: item.workflow_etapas?.orden ?? 0,
        etapa: item.workflow_etapas?.nombre ?? "",
        fecha_inicio: item.fecha_inicio,
        fecha_fin: item.fecha_fin,
        observaciones: item.observaciones,
      }))
    );

    setCargando(false);
  }

  useEffect(() => {
    if (id) {
      cargarDatos();
    }
  }, [id]);

  if (cargando) {
    return (
      <main style={{ padding: 30 }}>
        <h1>Detalle de operación</h1>
          <div className="operation-participant-note"><span>Identidad comercial</span><small>Los datos sensibles permanecen protegidos hasta la etapa autorizada del workflow.</small></div>
        <p>Cargando...</p>
      </main>
    );
  }

  if (!operacion || !workflow) {
    return (
      <main style={{ padding: 30 }}>
        <h1>Operación no encontrada</h1>
        <p>{mensaje}</p>
      </main>
    );
  }

  return (
    <main className="module-page operation-detail-page">
      <div className="module-hero">
        <div><span className="eyebrow">EXPEDIENTE OPERATIVO</span><h1>Operación {operacion.codigo}</h1><p>Seguimiento comercial, documental, financiero y logístico en un único expediente.</p></div>
        <span className="module-pill">{operacion.estado}</span>
      </div>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 20,
          marginTop: 20,
        }}
      >
        <h2>Datos de la operación</h2>

        <p>
          <strong>Código:</strong> {operacion.codigo}
        </p>

        <p>
          <strong>Estado:</strong> {operacion.estado}
        </p>

        <p>
          <strong>Cantidad:</strong> {operacion.cantidad_tn} tn
        </p>

        <p>
          <strong>Precio:</strong> {Number(operacion.precio_tn).toLocaleString("es-AR")} / tn
        </p>

        <p>
          <strong>Importe total:</strong> {Number(operacion.importe_total).toLocaleString("es-AR")}
        </p>
      </section>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 20,
          marginTop: 20,
        }}
      >
        <h2>Workflow comercial</h2>

        <p>
          <strong>Etapa actual:</strong> {workflow.etapa_actual}
        </p>

        <div
          style={{
            display: "grid",
            gap: 10,
            marginTop: 20,
          }}
        >
          {etapas.map((etapa) => {
            const actual = etapa.id === workflow.etapa_actual_id;
            const completada = etapa.orden < workflow.orden;

            return (
              <div
                key={etapa.id}
                style={{
                  padding: 15,
                  borderRadius: 10,
                  border: "1px solid #ccc",
                  background: actual
                    ? "#e8f5e9"
                    : completada
                    ? "#f5f5f5"
                    : "white",
                }}
              >
                <strong>
                  {completada ? "✓ " : actual ? "▶ " : "○ "}
                  {etapa.orden}. {etapa.nombre}
                </strong>

                <div style={{ marginTop: 5, color: "#666" }}>
                  {etapa.descripcion}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 25,
            padding: 15,
            borderRadius: 10,
            background: "#f5f5f5",
            border: "1px solid #ddd",
          }}
        >
          <strong>Flujo controlado</strong>
          <div style={{ marginTop: 6, color: "#666" }}>
            Las etapas no pueden avanzarse manualmente desde esta pantalla.
            Cada transición se habilita únicamente cuando se cumplen las
            condiciones correspondientes de la operación.
          </div>
        </div>

        {mensaje && (
          <p style={{ marginTop: 15 }}>
            <strong>{mensaje}</strong>
          </p>
        )}
      </section>


      <section style={{ border: "1px solid #d8e6dc", borderRadius: 12, padding: 20, marginTop: 20, background: "#fbfefb" }}>
        <div><span className="eyebrow">COMERCIO EXTERIOR · LOI / KYC</span><h2>Documentación internacional</h2><p style={{color:"#64748b",marginTop:4}}>Generá documentos desde el snapshot de la operación, seleccioná idioma y membrete, y descargá el PDF con hash SHA-256.</p></div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"end",marginTop:14}}>
          <label style={{display:"grid",gap:5,fontSize:13}}>Idioma del documento
            <select value={comexLanguage} onChange={e=>setComexLanguage(e.target.value)} style={{padding:10,border:"1px solid #cbd5e1",borderRadius:8}}>
              <option value="es">Español (ES)</option><option value="en">English (EN)</option><option value="pt">Português (PT)</option><option value="zh">中文 (ZH)</option><option value="fr">Français (FR)</option><option value="it">Italiano (IT)</option><option value="ru">Русский (RU)</option><option value="hi">हिन्दी (HI)</option>
            </select>
          </label>
          <label style={{display:"grid",gap:5,fontSize:13}}>Membrete
            <select value={comexLetterhead} onChange={e=>setComexLetterhead(e.target.value)} style={{padding:10,border:"1px solid #cbd5e1",borderRadius:8}}>
              <option value="empresa">Membrete de mi empresa</option><option value="neutro">Membrete neutro de AgroBrokerIA</option>
            </select>
          </label>
          <button type="button" disabled={comexBusy} onClick={async()=>{
            setComexBusy(true);setComexMessage("");
            try{
              const {data:docId,error:createError}=await supabase.rpc("crear_documento_comex_borrador",{p_operacion_id:id,p_tipo_documento:"LOI",p_idioma:comexLanguage,p_membrete:comexLetterhead});
              if(createError||!docId)throw createError||new Error("No se pudo crear el borrador COMEX.");
              const {data:exported,error:exportError}=await supabase.functions.invoke("exportar-documento-comex",{body:{document_id:docId,language:comexLanguage,letterhead:comexLetterhead}});
              if(exportError)throw exportError;
              if(!exported?.download_url)throw new Error(exported?.error||"El PDF no devolvió un enlace de descarga.");
              setComexMessage("Documento generado. Se inicia la descarga del PDF.");
              window.location.assign(exported.download_url);
              const {data:rows}=await supabase.from("documentos_comex").select("id,tipo_documento,idioma_generado,estado,hash_sha256,creado_en").eq("operacion_id",id).order("creado_en",{ascending:false}).limit(10);
              setComexDocs(rows||[]);
            }catch(e){setComexMessage(e instanceof Error?e.message:"No se pudo generar el documento.");}
            finally{setComexBusy(false);}
          }} style={{padding:"11px 16px",border:0,borderRadius:8,background:comexBusy?"#94a3b8":"#176b3a",color:"#fff",fontWeight:700,cursor:comexBusy?"wait":"pointer"}}>
            {comexBusy?"Generando PDF…":"Crear y descargar LOI oficial"}
          </button>
        </div>
        {comexMessage&&<p role="status" style={{marginTop:12,color:"#334155"}}>{comexMessage}</p>}
        {comexDocs.length>0&&<div style={{marginTop:16}}><strong>Documentos COMEX de esta operación</strong>{comexDocs.map(d=><div key={d.id} style={{padding:"8px 0",borderBottom:"1px solid #e2e8f0",fontSize:13}}>{d.tipo_documento} · {String(d.idioma_generado||"es").toUpperCase()} · {d.estado}{d.hash_sha256?" · SHA-256 "+String(d.hash_sha256).slice(0,16)+"…":""}</div>)}</div>}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20, marginTop: 20 }}>
        <h2>Expediente documental</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginTop:15}}>
          <div><strong>Contratos</strong><div>{contratos.length}</div></div>
          <div><strong>Facturas</strong><div>{facturas.length}</div></div>
          <div><strong>Documentos</strong><div>{documentos.length}</div></div>
          <div><strong>Expediente</strong><div>{expediente ? "Disponible" : "No disponible"}</div></div>
        </div>
        {facturas.length>0 && <div style={{marginTop:16}}><strong>Facturación</strong>{facturas.map(f=><div key={f.id} style={{padding:"8px 0",borderBottom:"1px solid #eee"}}>{f.numero_comprobante || "Pendiente de ARCA"} · {f.estado} · {f.cae ? "CAE "+f.cae : "sin CAE"}</div>)}</div>}
        {contratos.length>0 && <div style={{marginTop:16}}><strong>Contratos</strong>{contratos.map(x=><div key={x.id} style={{padding:"8px 0",borderBottom:"1px solid #eee"}}>{x.numero_contrato} · {x.estado} {x.fecha_firma ? "· Firmado" : ""}</div>)}</div>}
        {documentos.length===0 && <p style={{color:"#666"}}>Todavía no hay documentos cargados en este expediente.</p>} {documentos.length>0 && <div className="document-grid">{documentos.map(d=><article className="document-card" key={d.id}><div><strong>{d.nombre_archivo||d.tipo_documento}</strong><small>{d.tipo_documento} · {d.aprobado?"Aprobado":"Pendiente"}{d.obligatorio?" · Obligatorio":""}</small></div><span className={"document-status "+(d.aprobado?"ok":"pending")}>{d.aprobado?"APROBADO":"PENDIENTE"}</span></article>)}</div>}
        {pricing.length>0 && <div style={{marginTop:24}}><div className="panel-heading"><div><span className="eyebrow">PRICING ENGINE</span><h3>Últimos cálculos trazables</h3></div></div><div className="document-grid">{pricing.map(p=><article className="document-card" key={p.id}><div><strong>{p.currency} {Number(p.final_price??0).toLocaleString("es-AR")} / {p.unit}</strong><small>{p.price_type} · {p.formula} · {new Date(p.created_at).toLocaleString("es-AR")}</small></div></article>)}</div></div>}
      </section>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 20,
          marginTop: 20,
        }}
      >
        <h2>Historial del workflow</h2>

        {historial.length === 0 ? (
          <p>No hay historial.</p>
        ) : (
          historial.map((item) => (
            <div
              key={item.id}
              style={{
                padding: 12,
                borderBottom: "1px solid #eee",
              }}
            >
              <strong>
                {item.orden}. {item.etapa}
              </strong>

              <div>
                Inicio:{" "}
                {new Date(item.fecha_inicio).toLocaleString("es-AR")}
              </div>

              <div>
                Fin:{" "}
                {item.fecha_fin
                  ? new Date(item.fecha_fin).toLocaleString("es-AR")
                  : "En curso"}
              </div>

              {item.observaciones && (
                <div>{item.observaciones}</div>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
