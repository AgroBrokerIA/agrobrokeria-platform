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

    const resultado = datos.id
      ? await supabase
          .from("operacion_logistica")
          .update(cambios)
          .eq("id", datos.id)
          .select()
          .single()
      : await supabase
          .from("operacion_logistica")
          .insert({
            ...datos,
            ...cambios,
            operacion_id: operacionId,
          })
          .select()
          .single();

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

    const { data, error } = datos.id
      ? await supabase
          .from("operacion_logistica")
          .update(payload)
          .eq("id", datos.id)
          .select()
          .single()
      : await supabase
          .from("operacion_logistica")
          .insert(payload)
          .select()
          .single();

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

  const campo = (
    label: string,
    nombre: keyof Logistica,
    tipo = "text"
  ) => (
    <div>
      <label
        style={{
          display: "block",
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {label}
      </label>

      <input
        type={tipo}
        value={String(datos[nombre] || "")}
        onChange={(e) => cambiar(nombre, e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 11,
          borderRadius: 8,
          border: "1px solid #cbd5e1",
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        background: "white",
        border: "2px solid #93c5fd",
        borderRadius: 14,
        padding: 25,
        marginBottom: 30,
      }}
    >
      <h3 style={{ marginTop: 0 }}>
        🚚 Logística / Entrega
      </h3>

      <div
        style={{
          padding: 12,
          borderRadius: 8,
          background: "#eff6ff",
          fontWeight: 700,
          marginBottom: 20,
        }}
      >
        Estado logístico: {datos.estado}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            gridColumn: "1 / -1",
            border: "2px solid #cbd5e1",
            borderRadius: 12,
            padding: 16,
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 17,
              marginBottom: 8,
            }}
          >
            🧾 Carta de Porte Electrónica ARCA
          </div>

          <div
            style={{
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
              background:
                datos.carta_porte_estado === "EMITIDA_ARCA"
                  ? "#dcfce7"
                  : "#fee2e2",
              color:
                datos.carta_porte_estado === "EMITIDA_ARCA"
                  ? "#166534"
                  : "#991b1b",
              fontWeight: 800,
            }}
          >
            {datos.carta_porte_estado === "EMITIDA_ARCA"
              ? "🟢 CARTA DE PORTE EMITIDA EN ARCA"
              : "🔴 CARTA DE PORTE PENDIENTE DE EMISIÓN EN ARCA"}
          </div>

          <p style={{ marginTop: 0 }}>
            La Carta de Porte debe ser emitida mediante ARCA antes de
            iniciar el traslado.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={abrirARCA}
              disabled={guardando}
              style={{
                padding: "11px 16px",
                border: 0,
                borderRadius: 8,
                background: "#2563eb",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              🧾 EMITIR CARTA DE PORTE EN ARCA
            </button>

            <button
              type="button"
              onClick={registrarCartaPorteARCA}
              disabled={guardando}
              style={{
                padding: "11px 16px",
                border: 0,
                borderRadius: 8,
                background: "#16a34a",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ✅ REGISTRAR CPE EMITIDA
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            {campo(
              "Número de Carta de Porte emitida por ARCA",
              "carta_porte_numero"
            )}
          </div>
        </div>

        {campo("Transportista", "transportista")}
        {campo("CUIT transportista", "transportista_cuit")}
        {campo("Chofer", "chofer_nombre")}
        {campo("Documento chofer", "chofer_documento")}
        {campo("Patente camión", "patente_camion")}
        {campo("Patente acoplado", "patente_acoplado")}
        {campo("Fecha de carga", "fecha_carga", "date")}
        {campo("Hora de carga", "hora_carga", "time")}
        {campo(
          "Fecha estimada de entrega",
          "fecha_estimada_entrega",
          "date"
        )}
        {campo("Destino", "destino")}
        {campo("Número de turno", "numero_turno")}
        {campo(
          "Kilos entregados",
          "kilos_entregados",
          "number"
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        {campo(
          "Fecha / hora de entrega",
          "fecha_entrega",
          "datetime-local"
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <label
          style={{
            display: "block",
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Observaciones de entrega
        </label>

        <textarea
          value={datos.observaciones_entrega || ""}
          onChange={(e) =>
            cambiar("observaciones_entrega", e.target.value)
          }
          rows={4}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 11,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            marginTop: 15,
            padding: 12,
            borderRadius: 8,
            background: "#fee2e2",
            color: "#991b1b",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {mensaje && (
        <div
          style={{
            marginTop: 15,
            padding: 12,
            borderRadius: 8,
            background: "#dcfce7",
            color: "#166534",
            fontWeight: 700,
          }}
        >
          {mensaje}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 20,
        }}
      >
        <button
          type="button"
          disabled={guardando}
          onClick={() => guardar("PROGRAMADA")}
          style={{
            padding: "11px 16px",
            border: 0,
            borderRadius: 8,
            background: "#2563eb",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          📅 PROGRAMAR
        </button>

        <button
          type="button"
          disabled={
            guardando ||
            datos.carta_porte_estado !== "EMITIDA_ARCA"
          }
          onClick={() => guardar("EN_TRANSITO")}
          style={{
            padding: "11px 16px",
            border: 0,
            borderRadius: 8,
            background: "#f59e0b",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🚛 EN TRÁNSITO
        </button>

        <button
          type="button"
          disabled={guardando}
          onClick={async () => {
            const camposFaltantes: string[] = [];

            if (
              datos.carta_porte_estado !== "EMITIDA_ARCA" ||
              !datos.carta_porte_numero.trim()
            ) {
              camposFaltantes.push(
                "Carta de Porte Electrónica emitida por ARCA"
              );
            }

            if (!datos.transportista.trim()) {
              camposFaltantes.push("Transportista");
            }

            if (!datos.chofer_nombre.trim()) {
              camposFaltantes.push("Chofer");
            }

            if (!datos.patente_camion.trim()) {
              camposFaltantes.push("Patente del camión");
            }

            if (!datos.fecha_carga) {
              camposFaltantes.push("Fecha de carga");
            }

            if (!datos.destino.trim()) {
              camposFaltantes.push("Destino");
            }

            if (
              datos.kilos_entregados === "" ||
              Number(datos.kilos_entregados) <= 0
            ) {
              camposFaltantes.push("Kilos entregados");
            }

            if (camposFaltantes.length > 0) {
              setError(
                `⚠️ No se puede confirmar la entrega. Faltan: ${camposFaltantes.join(", ")}.`
              );
              setMensaje("");
              return;
            }

            const ahora = new Date().toISOString();

            const datosActualizados = {
              ...datos,
              fecha_entrega: ahora,
            };

            setDatos(datosActualizados);

            setGuardando(true);
            setMensaje("");
            setError("");

            const payload = {
              ...datosActualizados,
              operacion_id: operacionId,
              estado: "ENTREGADA",
              kilos_entregados:
                datosActualizados.kilos_entregados === ""
                  ? null
                  : Number(datosActualizados.kilos_entregados),
              fecha_entrega: ahora,
              updated_at: ahora,
            };

            const resultado = datosActualizados.id
              ? await supabase
                  .from("operacion_logistica")
                  .update(payload)
                  .eq("id", datosActualizados.id)
                  .select()
                  .single()
              : await supabase
                  .from("operacion_logistica")
                  .insert(payload)
                  .select()
                  .single();

            if (resultado.error) {
              setError(
                `No se pudo confirmar la entrega: ${resultado.error.message}`
              );
              setGuardando(false);
              return;
            }

            setDatos({
              ...datosActualizados,
              ...resultado.data,
              estado: "ENTREGADA",
              kilos_entregados:
                resultado.data.kilos_entregados != null
                  ? String(resultado.data.kilos_entregados)
                  : "",
            });

            setMensaje("✅ Entrega confirmada correctamente.");
            setGuardando(false);

            if (onEntregaConfirmada) {
              await onEntregaConfirmada();
            }
          }}
          style={{
            padding: "11px 16px",
            border: 0,
            borderRadius: 8,
            background: "#16a34a",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✅ CONFIRMAR ENTREGA
        </button>

        <button
          type="button"
          disabled={guardando}
          onClick={() => guardar("OBSERVADA")}
          style={{
            padding: "11px 16px",
            border: 0,
            borderRadius: 8,
            background: "#dc2626",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ⚠️ OBSERVAR ENTREGA
        </button>

        <button
          type="button"
          disabled={guardando}
          onClick={() => guardar()}
          style={{
            padding: "11px 16px",
            borderRadius: 8,
            border: "1px solid #94a3b8",
            background: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          💾 GUARDAR
        </button>
      </div>
    </div>
  );
}
