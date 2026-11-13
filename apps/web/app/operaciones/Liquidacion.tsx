"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type LiquidacionData = {
  id?: string;
  operacion_id: string;
  estado: string;
  cantidad_contractual_tn: number;
  kilos_entregados: number;
  cantidad_entregada_tn: number;
  diferencia_tn: number;
  precio_tn: number;
  importe_bruto_usd: number;
  ajustes_usd: number;
  deducciones_usd: number;
  comision_agrobroker_usd: number;
  importe_neto_usd: number;
  fecha_liquidacion: string;
  referencia_comprobante: string;
  observaciones: string;
};

export default function Liquidacion({
  operacionId,
  cantidadContractualTn,
  precioTn,
  onLiquidacionConfirmada,
}: {
  operacionId: string;
  cantidadContractualTn: number;
  precioTn: number;
  onLiquidacionConfirmada?: () => Promise<boolean>;
}) {
  const [datos, setDatos] = useState<LiquidacionData>({
    operacion_id: operacionId,
    estado: "PENDIENTE",
    cantidad_contractual_tn: cantidadContractualTn || 0,
    kilos_entregados: 0,
    cantidad_entregada_tn: 0,
    diferencia_tn: 0,
    precio_tn: precioTn || 0,
    importe_bruto_usd: 0,
    ajustes_usd: 0,
    deducciones_usd: 0,
    comision_agrobroker_usd: 0,
    importe_neto_usd: 0,
    fecha_liquidacion: "",
    referencia_comprobante: "",
    observaciones: "",
  });

  const [currencyCode, setCurrencyCode] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const calculos = useMemo(() => {
    const entregadaTn = Number(datos.kilos_entregados || 0) / 1000;
    const diferencia =
      Number(datos.cantidad_contractual_tn || 0) - entregadaTn;

    const bruto = entregadaTn * Number(datos.precio_tn || 0);

    const neto =
      bruto -
      Number(datos.ajustes_usd || 0) -
      Number(datos.deducciones_usd || 0) -
      entregadaTn;

    return {
      entregadaTn,
      diferencia,
      bruto,
      neto,
    };
  }, [
    datos.kilos_entregados,
    datos.cantidad_contractual_tn,
    datos.precio_tn,
    datos.ajustes_usd,
    datos.deducciones_usd,
  ]);

  useEffect(() => {
    cargar();
    cargarMoneda();
  }, [operacionId]);

  async function cargarMoneda() {
    const { data, error } = await supabase
      .from("operaciones")
      .select("monedas(codigo)")
      .eq("id", operacionId)
      .maybeSingle();
    if (!error) setCurrencyCode(String((data as { monedas?: { codigo?: string } | null } | null)?.monedas?.codigo ?? ""));
  }

  async function cargar() {
    setError("");

    const { data, error } = await supabase
      .from("operacion_liquidacion")
      .select("*")
      .eq("operacion_id", operacionId)
      .order("creado_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setError(`No se pudo cargar la liquidación: ${error.message}`);
      return;
    }

    if (data) {
      setDatos((actual) => ({
        ...actual,
        ...data,
        cantidad_contractual_tn: Number(data.cantidad_contractual_tn) || 0,
        kilos_entregados: Number(data.kilos_entregados) || 0,
        cantidad_entregada_tn: Number(data.cantidad_entregada_tn) || 0,
        diferencia_tn: Number(data.diferencia_tn) || 0,
        precio_tn: Number(data.precio_tn) || 0,
        importe_bruto_usd: Number(data.importe_bruto_usd) || 0,
        ajustes_usd: Number(data.ajustes_usd) || 0,
        deducciones_usd: Number(data.deducciones_usd) || 0,
        comision_agrobroker_usd:
          Number(data.cantidad_entregada_tn) || 0,
        importe_neto_usd: Number(data.importe_neto_usd) || 0,
        fecha_liquidacion: data.fecha_liquidacion || "",
        referencia_comprobante: data.referencia_comprobante || "",
        observaciones: data.observaciones || "",
      }));
      return;
    }

    // La fuente operativa de kilos es viajes: el RPC de liquidación calcula
    // la cantidad desde estos mismos registros y no desde operacion_logistica.
    const { data: viajes, error: errorViajes } = await supabase
      .from("viajes")
      .select("kilos_entregados,transportista_kilos_entregados,productor_kilos_recibidos,transportista_entrega_confirmada_at,productor_recepcion_confirmada_at,estado,productor_recepcion_observada_at")
      .eq("operacion_id", operacionId);

    if (errorViajes) {
      setError(`No se pudieron cargar los kilos de los viajes: ${errorViajes.message}`);
      return;
    }

    const viajesConfirmados = (viajes || []).filter((viaje) =>
      viaje.estado === "ENTREGADO_CONFIRMADO" &&
      viaje.transportista_entrega_confirmada_at &&
      viaje.productor_recepcion_confirmada_at &&
      !viaje.productor_recepcion_observada_at &&
      Number(viaje.transportista_kilos_entregados) === Number(viaje.productor_kilos_recibidos)
    );
    // Mantener exactamente la misma fuente y filtro que usa
    // guardar_liquidacion_operacion en PostgreSQL.
    const kilos = viajesConfirmados.reduce(
      (total, viaje) => total + Number(viaje.kilos_entregados || 0),
      0
    );
    const entregadaTn = kilos / 1000;
    const bruto = entregadaTn * (precioTn || 0);

    setDatos((actual) => ({
      ...actual,
      kilos_entregados: kilos,
      cantidad_entregada_tn: entregadaTn,
      diferencia_tn: (cantidadContractualTn || 0) - entregadaTn,
      importe_bruto_usd: bruto,
      importe_neto_usd: bruto - entregadaTn,
      comision_agrobroker_usd: entregadaTn,
      fecha_liquidacion: actual.fecha_liquidacion || "",
    }));
  }

  function cambiar(
    campo: keyof LiquidacionData,
    valor: string | number
  ) {
    setDatos((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  async function guardar(estado: "PRELIQUIDADA" | "CONFIRMADA") {
    setGuardando(true);
    setMensaje("");
    setError("");

    const payload = {
      operacion_id: operacionId,
      estado,
      cantidad_contractual_tn: Number(datos.cantidad_contractual_tn) || 0,
      kilos_entregados: Number(datos.kilos_entregados) || 0,
      cantidad_entregada_tn: calculos.entregadaTn,
      diferencia_tn: calculos.diferencia,
      precio_tn: Number(datos.precio_tn) || 0,
      importe_bruto_usd: calculos.bruto,
      ajustes_usd: Number(datos.ajustes_usd) || 0,
      deducciones_usd: Number(datos.deducciones_usd) || 0,
      comision_agrobroker_usd: calculos.entregadaTn,
      importe_neto_usd: calculos.neto,
      fecha_liquidacion:
        datos.fecha_liquidacion || new Date().toISOString(),
      referencia_comprobante:
        datos.referencia_comprobante.trim(),
      observaciones: datos.observaciones.trim(),
      updated_at: new Date().toISOString(),
    };

    const resultado = await supabase.rpc(
      "guardar_liquidacion_operacion",
      {
        p_operacion_id: operacionId,
        p_datos: {
          id: datos.id || null,
          ...payload,
        },
      }
    );

    if (resultado.error) {
      setError(
        `No se pudo guardar la liquidación: ${resultado.error.message}`
      );
      setGuardando(false);
      return;
    }

    const nueva = resultado.data;
    if (!nueva || typeof nueva !== "object" || Array.isArray(nueva)) {
      setError("La respuesta de la liquidación no tiene el formato esperado.");
      setGuardando(false);
      return;
    }
    const liquidacionGuardada = nueva as Record<string, unknown>;

    setDatos((actual) => ({
      ...actual,
      ...liquidacionGuardada,
      cantidad_contractual_tn:
        Number(liquidacionGuardada.cantidad_contractual_tn) || 0,
      kilos_entregados:
        Number(liquidacionGuardada.kilos_entregados) || 0,
      cantidad_entregada_tn:
        Number(liquidacionGuardada.cantidad_entregada_tn) || 0,
      diferencia_tn:
        Number(liquidacionGuardada.diferencia_tn) || 0,
      precio_tn:
        Number(liquidacionGuardada.precio_tn) || 0,
      importe_bruto_usd:
        Number(liquidacionGuardada.importe_bruto_usd) || 0,
      ajustes_usd:
        Number(liquidacionGuardada.ajustes_usd) || 0,
      deducciones_usd:
        Number(liquidacionGuardada.deducciones_usd) || 0,
      comision_agrobroker_usd:
        calculos.entregadaTn,
      importe_neto_usd:
        Number(liquidacionGuardada.importe_neto_usd) || 0,
    }));

    if (estado === "PRELIQUIDADA") {
      setMensaje("✅ Preliquidación guardada.");
      setGuardando(false);
      return;
    }

    if (onLiquidacionConfirmada) {
      const avanzada = await onLiquidacionConfirmada();

      if (!avanzada) {
        setError(
          "La liquidación fue registrada, pero no se pudo cerrar la operación."
        );
        setGuardando(false);
        return;
      }
    }

    setMensaje(
      "✅ Liquidación confirmada. La comisión queda sujeta a la conciliación y liberación administrativa correspondiente."
    );
    setGuardando(false);
  }

  async function preliquidar() {
    if (Number(datos.kilos_entregados) <= 0) {
      setError(
        "⚠️ La liquidación requiere kilos entregados mayores a cero."
      );
      return;
    }

    await guardar("PRELIQUIDADA");
  }

  async function confirmar() {
    if (!["PRELIQUIDADA","CONFIRMADA"].includes(String(datos.estado || "").toUpperCase())) {
      setError("Primero debe guardarse la preliquidación.");
      return;
    }

    if (Number(datos.kilos_entregados) <= 0) {
      setError(
        "⚠️ Los kilos entregados deben ser mayores a cero."
      );
      return;
    }

    await guardar("CONFIRMADA");
  }

  return (
    <div
      style={{
        background: "#fffbeb",
        border: "2px solid #fbbf24",
        borderRadius: 14,
        padding: 25,
        marginBottom: 30,
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: 24 }}>
        💰 Liquidación de la operación
      </h3>

      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <strong>Estado:</strong>{" "}
        {datos.estado === "CONFIRMADA"
          ? "✅ CONFIRMADA"
          : datos.estado === "PRELIQUIDADA"
            ? "🟡 PRELIQUIDADA"
            : "⏳ PENDIENTE"}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 15,
        }}
      >
        <Campo
          label="Cantidad contractual (TN)"
          value={datos.cantidad_contractual_tn}
          readOnly
        />

        <Campo
          label="Kilos entregados (viajes con doble conformidad)"
          value={datos.kilos_entregados}
          readOnly
        />

        <Campo
          label="TN entregadas"
          value={calculos.entregadaTn.toFixed(3)}
          readOnly
        />

        <Campo
          label="Diferencia contractual (TN)"
          value={calculos.diferencia.toFixed(3)}
          readOnly
        />

        <Campo
          label={`Precio (${currencyCode || "moneda de operación"}/TN)`}
          value={datos.precio_tn}
          readOnly
        />

        <Campo
          label={`Importe bruto (${currencyCode || "moneda de operación"})`}
          value={calculos.bruto.toFixed(2)}
          readOnly
        />

        <Campo
          label="Ajustes (USD)"
          value={datos.ajustes_usd}
          type="number"
          onChange={(v) =>
            cambiar("ajustes_usd", Number(v) || 0)
          }
        />

        <Campo
          label="Deducciones (USD)"
          value={datos.deducciones_usd}
          type="number"
          onChange={(v) =>
            cambiar("deducciones_usd", Number(v) || 0)
          }
        />

        <Campo
          label="Comisión AgroBroker IA (USD)"
          value={(calculos.entregadaTn || 0).toFixed(2)}
          readOnly
        />

        <Campo
          label="Importe neto a liquidar (USD)"
          value={calculos.neto.toFixed(2)}
          readOnly
        />

        <Campo
          label="Referencia / comprobante"
          value={datos.referencia_comprobante}
          onChange={(v) =>
            cambiar("referencia_comprobante", v)
          }
        />
      </div>

      <div style={{ marginTop: 18 }}>
        <label
          style={{
            display: "block",
            fontWeight: 700,
            marginBottom: 7,
          }}
        >
          Observaciones
        </label>

        <textarea
          value={datos.observaciones}
          onChange={(e) =>
            cambiar("observaciones", e.target.value)
          }
          rows={3}
          placeholder="Observaciones de la liquidación..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            resize: "vertical",
          }}
        />
      </div>

      {Math.abs(calculos.diferencia) > 0.0001 && (
        <div
          style={{
            marginTop: 18,
            background: "#fff7ed",
            color: "#9a3412",
            padding: 14,
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          ⚠️ La cantidad entregada no coincide con la cantidad
          contractual. La diferencia debe quedar justificada.
        </div>
      )}

      <div
        style={{
          marginTop: 18,
          background: "#eff6ff",
          color: "#1e3a8a",
          padding: 15,
          borderRadius: 10,
        }}
      >
        <strong>AgroBrokerIA — liquidación y comisión:</strong>{" "}
        USD {(calculos.entregadaTn || 0).toFixed(2)}
        <br />
        Comisión propia de AgroBrokerIA: USD 1 por tonelada efectivamente entregada. Los pagos entre vendedor, comprador y demás intermediarios se acuerdan y realizan fuera de la plataforma.
      </div>

      {mensaje && (
        <div
          style={{
            marginTop: 18,
            background: "#dcfce7",
            color: "#166534",
            padding: 14,
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          {mensaje}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 18,
            background: "#fee2e2",
            color: "#991b1b",
            padding: 14,
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          {error}
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
          onClick={preliquidar}
          disabled={
            guardando || datos.estado === "CONFIRMADA"
          }
          style={{
            padding: "13px 18px",
            border: 0,
            borderRadius: 9,
            background: "#2563eb",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          🧾 PRELIQUIDAR
        </button>

        <button
          type="button"
          onClick={confirmar}
          disabled={
            guardando || datos.estado !== "PRELIQUIDADA"
          }
          style={{
            padding: "13px 18px",
            border: 0,
            borderRadius: 9,
            background:
              datos.estado === "PRELIQUIDADA"
                ? "#16a34a"
                : "#94a3b8",
            color: "white",
            fontWeight: 800,
            cursor:
              datos.estado === "PRELIQUIDADA"
                ? "pointer"
                : "not-allowed",
          }}
        >
          Confirmar liquidación
        </button>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  type = "text",
  readOnly = false,
  onChange,
}: {
  label: string;
  value: string | number;
  type?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontWeight: 700,
          marginBottom: 7,
        }}
      >
        {label}
      </label>

      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) =>
          onChange?.(e.target.value)
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: readOnly ? "#f1f5f9" : "white",
        }}
      />
    </div>
  );
}
