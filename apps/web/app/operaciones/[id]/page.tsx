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

const WORKFLOW_ID = "02771a76-52e3-44bb-ad74-134001e2fdee";

export default function DetalleOperacion() {
  const params = useParams();
  const id = params.id as string;

  const [operacion, setOperacion] = useState<Operacion | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

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
        etapa_actual_id,
        estado,
        workflow_etapas!inner (
          orden,
          nombre
        )
      `)
      .eq("operacion_id", id)
      .single();

    if (wfError) {
      setMensaje(`Error cargando workflow: ${wfError.message}`);
      setCargando(false);
      return;
    }

    const etapaActual = Array.isArray(wf.workflow_etapas)
      ? wf.workflow_etapas[0]
      : wf.workflow_etapas;

    const { data: etapasData, error: etapasError } = await supabase
      .from("workflow_etapas")
      .select("id, orden, nombre, descripcion")
      .eq("workflow_id", WORKFLOW_ID)
      .order("orden", { ascending: true });

    if (etapasError) {
      setMensaje(`Error cargando etapas: ${etapasError.message}`);
      setCargando(false);
      return;
    }

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

    setOperacion(op);

    setWorkflow({
      id: wf.id,
      etapa_actual_id: wf.etapa_actual_id,
      estado: wf.estado,
      orden: etapaActual?.orden ?? 1,
      etapa_actual: etapaActual?.nombre ?? "Sin etapa",
    });

    setEtapas(etapasData ?? []);

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
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 30,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Operación {operacion.codigo}</h1>

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
          <strong>Precio:</strong> U$S {operacion.precio_tn} / tn
        </p>

        <p>
          <strong>Importe total:</strong> U$S {operacion.importe_total}
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
