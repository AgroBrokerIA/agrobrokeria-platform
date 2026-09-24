"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Comision = {
  id: string;
  operacion_id: string;
  empresa_id: string | null;
  profile_id: string | null;
  tipo_comision: string;
  origen_comision: string | null;
  tipo_ganancia: string;
  concepto: string;
  modalidad_calculo: string;
  cantidad_tn: number;
  valor_unitario: number;
  porcentaje: number;
  valor_base: number;
  subtotal: number;
  moneda_id: number;
  iva_porcentaje: number;
  iva_importe: number;
  total: number;
  estado: string;
  factura_estado: string;
  saldo_pendiente: number;
  saldo_pagado: number;
  medio_pago: string | null;
  fecha_pago: string | null;
  referencia_pago: string | null;
  observaciones: string | null;
  creado_at: string;
};

type Operacion = {
  id: string;
  codigo: string;
  modalidad_comercial: string | null;
};

type MovimientoEconomico = {
  id: string;
  operacion_id: string;
  comision_id: string | null;
  empresa_id: string | null;
  profile_id: string | null;
  tipo_movimiento: string;
  concepto: string;
  moneda_id: number;
  importe: number;
  signo: number;
  estado: string;
  referencia: string | null;
  fecha_movimiento: string;
};

const monedaNombre: Record<number, string> = {
  1: "ARS",
  2: "USD",
  3: "EUR",
  4: "BRL",
};

function numero(valor: number | null | undefined) {
  return Number(valor || 0);
}

function formatoNumero(valor: number, moneda = "") {
  return `${moneda ? moneda + " " : ""}${numero(valor).toLocaleString(
    "es-AR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function etiquetaGanancia(tipo: string) {
  switch (tipo) {
    case "USD_TN":
      return "USD / TN";
    case "ARS_TN":
      return "ARS / TN";
    case "PORCENTAJE":
      return "%";
    case "DIFERENCIAL":
      return "Diferencial";
    case "FIJA":
      return "Importe fijo";
    default:
      return tipo || "—";
  }
}

function colorEstado(estado: string) {
  switch (estado) {
    case "ABONADA":
      return {
        background: "#dcfce7",
        color: "#166534",
      };

    case "A_PAGAR":
      return {
        background: "#fef3c7",
        color: "#92400e",
      };

    case "ANULADA":
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };

    default:
      return {
        background: "#e2e8f0",
        color: "#475569",
      };
  }
}

export default function ComisionesPage() {
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [movimientos, setMovimientos] = useState<MovimientoEconomico[]>([]);
  const [mostrarMovimientos, setMostrarMovimientos] = useState(false);
  const [comisionPago, setComisionPago] = useState<Comision | null>(null);
  const [importePago, setImportePago] = useState("");
  const [medioPago, setMedioPago] = useState("");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroMoneda, setFiltroMoneda] = useState("TODAS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");

  async function cargarDatos() {
    setCargando(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Necesitás iniciar sesión para consultar las comisiones.");
      setCargando(false);
      return;
    }

    const { data: comisionesDB, error: errorComisiones } = await supabase
      .from("operacion_comisiones")
      .select("*")
      .order("creado_at", { ascending: false });

    if (errorComisiones) {
      setError(
        `No se pudieron cargar las comisiones: ${errorComisiones.message}`
      );
      setCargando(false);
      return;
    }

    const comisionesNormalizadas = (comisionesDB || []) as Comision[];

    setComisiones(comisionesNormalizadas);
const { data: movimientosDB, error: errorMovimientos } = await supabase
  .from("operacion_movimientos_economicos")
  .select("*")
  .order("fecha_movimiento", { ascending: false });

if (errorMovimientos) {
  console.error(
    "No se pudieron cargar los movimientos económicos:",
    errorMovimientos.message
  );
} else {
  setMovimientos((movimientosDB || []) as MovimientoEconomico[]);
}

    const idsOperaciones = [
      ...new Set(
        comisionesNormalizadas
          .map((comision) => comision.operacion_id)
          .filter(Boolean)
      ),
    ];

    if (idsOperaciones.length > 0) {
      const { data: operacionesDB, error: errorOperaciones } =
        await supabase
          .from("operaciones")
          .select("id, codigo, modalidad_comercial")
          .in("id", idsOperaciones);

      if (!errorOperaciones) {
        setOperaciones((operacionesDB || []) as Operacion[]);
      }
    } else {
      setOperaciones([]);
    }

    setCargando(false);
  }

  async function registrarPago() {
    if (!comisionPago) {
      setError("Seleccioná una comisión.");
      return;
    }

    const importe = Number(importePago);
    const saldoPendienteActual = numero(comisionPago.saldo_pendiente);

    if (!Number.isFinite(importe) || importe <= 0) {
      setError("Ingresá un importe de pago válido.");
      return;
    }

    if (importe > saldoPendienteActual) {
      setError(
        `El pago no puede superar el saldo pendiente de ${formatoNumero(
          saldoPendienteActual,
          monedaNombre[comisionPago.moneda_id] || ""
        )}.`
      );
      return;
    }

    if (!medioPago.trim()) {
      setError("Seleccioná el medio de pago.");
      return;
    }

    setGuardandoPago(true);
    setError("");

    try {
      const { error: errorPago } = await supabase.rpc(
        "registrar_pago_comision",
        {
          p_comision_id: comisionPago.id,
          p_importe: importe,
          p_medio_pago: medioPago.trim(),
          p_referencia_pago: referenciaPago.trim() || null,
        }
      );

      if (errorPago) {
        throw new Error(
          `No se pudo registrar el pago de la comisión: ${errorPago.message}`
        );
      }

      setComisionPago(null);
      setImportePago("");
      setMedioPago("");
      setReferenciaPago("");

      await cargarDatos();
    } catch (errorPago) {
      setError(
        errorPago instanceof Error
          ? errorPago.message
          : "No se pudo registrar el pago."
      );
    } finally {
      setGuardandoPago(false);
    }
  }

  useEffect(() => {
    cargarDatos();

    const canal = supabase
      .channel("comisiones-panel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operacion_comisiones",
        },
        () => {
          cargarDatos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const operacionesMap = useMemo(() => {
    return new Map(
      operaciones.map((operacion) => [operacion.id, operacion])
    );
  }, [operaciones]);

  const comisionesFiltradas = useMemo(() => {
    return comisiones.filter((comision) => {
      const coincideEstado =
        filtroEstado === "TODOS" || comision.estado === filtroEstado;

      const coincideMoneda =
        filtroMoneda === "TODAS" ||
        String(comision.moneda_id) === filtroMoneda;

      const coincideTipo =
        filtroTipo === "TODOS" ||
        comision.tipo_ganancia === filtroTipo;

      return coincideEstado && coincideMoneda && coincideTipo;
    });
  }, [comisiones, filtroEstado, filtroMoneda, filtroTipo]);

  const resumen = useMemo(() => {
    const resultado: Record<
      string,
      {
        generado: number;
        pendiente: number;
        abonado: number;
      }
    > = {};

    for (const comision of comisionesFiltradas) {
      const moneda = monedaNombre[comision.moneda_id] || "OTRA";

      if (!resultado[moneda]) {
        resultado[moneda] = {
          generado: 0,
          pendiente: 0,
          abonado: 0,
        };
      }

      resultado[moneda].generado += numero(comision.total);
      resultado[moneda].pendiente += numero(comision.saldo_pendiente);
      resultado[moneda].abonado += numero(comision.saldo_pagado);
    }

    return resultado;
  }, [comisionesFiltradas]);

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 1500,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            💵 Comisiones y Movimientos
          </h1>

          <p
            style={{
              marginTop: 6,
              color: "#64748b",
            }}
          >
            Control económico de las comisiones generadas por AgroBrokerIA.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/retiros-comisiones"
            style={{
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "#fff",
              borderRadius: 9,
              padding: "10px 16px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            💸 Retirar comisión
          </a>

          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              borderRadius: 9,
              padding: "10px 16px",
              cursor: cargando ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            borderRadius: 10,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {Object.entries(resumen).length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: 20,
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#fff",
              color: "#64748b",
            }}
          >
            No hay comisiones registradas todavía.
          </div>
        ) : (
          Object.entries(resumen).map(([moneda, datos]) => (
            <div
              key={moneda}
              style={{
                padding: 18,
                borderRadius: 14,
                background: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15,23,42,.06)",
              }}
            >
              <div
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                COMISIONES {moneda}
              </div>

              <div
                style={{
                  fontSize: 25,
                  fontWeight: 800,
                  marginTop: 8,
                }}
              >
                {formatoNumero(datos.generado, moneda)}
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                Pendiente:{" "}
                <strong>
                  {formatoNumero(datos.pendiente, moneda)}
                </strong>
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                Abonado:{" "}
                <strong>
                  {formatoNumero(datos.abonado, moneda)}
                </strong>
              </div>
            </div>
          ))
        )}
      </section>

      <section
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 18,
          padding: 14,
          borderRadius: 12,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
        }}
      >
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{
            padding: 9,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="A_PAGAR">A pagar</option>
          <option value="ABONADA">Abonada</option>
          <option value="ANULADA">Anulada</option>
        </select>

        <select
          value={filtroMoneda}
          onChange={(e) => setFiltroMoneda(e.target.value)}
          style={{
            padding: 9,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="TODAS">Todas las monedas</option>
          <option value="1">ARS</option>
          <option value="2">USD</option>
          <option value="3">EUR</option>
          <option value="4">BRL</option>
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{
            padding: 9,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="TODOS">Todas las modalidades</option>
          <option value="USD_TN">USD / TN</option>
          <option value="ARS_TN">ARS / TN</option>
          <option value="PORCENTAJE">Porcentaje</option>
          <option value="DIFERENCIAL">Diferencial</option>
          <option value="FIJA">Importe fijo</option>
        </select>
      </section>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
          padding: 14,
          borderRadius: 12,
          background: "#fff",
          border: "1px solid #e2e8f0",
        }}
      >
        <div>
          <strong style={{ fontSize: 15 }}>
            📒 Movimientos económicos
          </strong>

          <div
            style={{
              marginTop: 4,
              color: "#64748b",
              fontSize: 12,
            }}
          >
            Registro de comisiones generadas y movimientos asociados.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMostrarMovimientos((actual) => !actual)}
          style={{
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            borderRadius: 9,
            padding: "9px 14px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {mostrarMovimientos
            ? "Ocultar movimientos"
            : `Ver movimientos (${movimientos.length})`}
        </button>
      </div>

      {mostrarMovimientos && (
        <section
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            overflowX: "auto",
            marginBottom: 18,
          }}
        >
          {movimientos.length === 0 ? (
            <div
              style={{
                padding: 30,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              No hay movimientos económicos registrados.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1000,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {[
                    "Fecha",
                    "Operación",
                    "Tipo",
                    "Concepto",
                    "Importe",
                    "Estado",
                    "Acciones",
                    "Referencia",
                  ].map((titulo) => (
                    <th
                      key={titulo}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        fontSize: 12,
                        color: "#475569",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {movimientos.map((movimiento) => {
                  const operacion = operacionesMap.get(
                    movimiento.operacion_id
                  );

                  const moneda =
                    monedaNombre[movimiento.moneda_id] || "—";

                  const importe =
                    numero(movimiento.importe) *
                    (movimiento.signo === -1 ? -1 : 1);

                  return (
                    <tr
                      key={movimiento.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <td style={{ padding: 12 }}>
                        {movimiento.fecha_movimiento
                          ? new Date(
                              movimiento.fecha_movimiento
                            ).toLocaleString("es-AR")
                          : "—"}
                      </td>

                      <td style={{ padding: 12 }}>
                        <strong>
                          {operacion?.codigo ||
                            movimiento.operacion_id.slice(0, 8)}
                        </strong>
                      </td>

                      <td style={{ padding: 12 }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: "#f1f5f9",
                            color: "#334155",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {movimiento.tipo_movimiento}
                        </span>
                      </td>

                      <td style={{ padding: 12 }}>
                        {movimiento.concepto || "—"}
                      </td>

                      <td style={{ padding: 12 }}>
                        <strong>
                          {formatoNumero(importe, moneda)}
                        </strong>
                      </td>

                      <td style={{ padding: 12 }}>
                        {movimiento.estado || "—"}
                      </td>

                      <td style={{ padding: 12 }}>
                        {movimiento.referencia || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {comisionPago && (
        <div
          style={{
            marginBottom: 18,
            padding: 20,
            borderRadius: 14,
            background: "#fff",
            border: "1px solid #cbd5e1",
            boxShadow: "0 4px 15px rgba(15,23,42,.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <strong style={{ fontSize: 17 }}>
                💰 Registrar pago
              </strong>

              <div
                style={{
                  marginTop: 4,
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                {comisionPago.concepto}
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                Saldo pendiente:{" "}
                <strong>
                  {formatoNumero(
                    comisionPago.saldo_pendiente,
                    monedaNombre[comisionPago.moneda_id] || ""
                  )}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setComisionPago(null)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <label>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                Importe
              </div>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={importePago}
                onChange={(e) => setImportePago(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 5,
                  padding: 9,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                Medio de pago
              </div>

              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 5,
                  padding: 9,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                }}
              >
                <option value="">Seleccionar...</option>
                <option value="TRANSFERENCIA">
                  Transferencia
                </option>
                <option value="ECHEQ">eCheq</option>
                <option value="FINANCIERA">
                  Financiera
                </option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>

            <label>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                Referencia
              </div>

              <input
                type="text"
                value={referenciaPago}
                onChange={(e) =>
                  setReferenciaPago(e.target.value)
                }
                placeholder="N.º de transferencia, comprobante..."
                style={{
                  width: "100%",
                  marginTop: 5,
                  padding: 9,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setComisionPago(null)}
              disabled={guardandoPago}
              style={{
                border: "1px solid #cbd5e1",
                background: "#fff",
                borderRadius: 8,
                padding: "9px 14px",
                cursor: guardandoPago
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={registrarPago}
              disabled={guardandoPago}
              style={{
                border: "none",
                background: "#0f172a",
                color: "#fff",
                borderRadius: 8,
                padding: "9px 16px",
                cursor: guardandoPago
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 700,
              }}
            >
              {guardandoPago
                ? "Guardando..."
                : "Confirmar pago"}
            </button>
          </div>
        </div>
      )}

      <section
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          overflowX: "auto",
        }}
      >
        {cargando ? (
          <div
            style={{
              padding: 30,
              color: "#64748b",
            }}
          >
            Cargando comisiones...
          </div>
        ) : comisionesFiltradas.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#64748b",
            }}
          >
            No hay comisiones que coincidan con los filtros.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1100,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {[
                  "Operación",
                  "Modalidad",
                  "Concepto",
                  "Cálculo",
                  "TN",
                  "Subtotal",
                  "IVA",
                  "Total",
                  "Fiscal",
                  "Saldo",
                  "Estado",
                ].map((titulo) => (
                  <th
                    key={titulo}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      fontSize: 12,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {comisionesFiltradas.map((comision) => {
                const operacion = operacionesMap.get(
                  comision.operacion_id
                );

                const moneda =
                  monedaNombre[comision.moneda_id] || "—";

                const estado = colorEstado(comision.estado);

                return (
                  <tr
                    key={comision.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <td style={{ padding: 12 }}>
                      <strong>
                        {operacion?.codigo ||
                          comision.operacion_id.slice(0, 8)}
                      </strong>
                    </td>

                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          background:
                            operacion?.modalidad_comercial === "F2"
                              ? "#fef3c7"
                              : "#dcfce7",
                          color:
                            operacion?.modalidad_comercial === "F2"
                              ? "#92400e"
                              : "#166534",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {operacion?.modalidad_comercial || "—"}
                      </span>
                    </td>

                    <td style={{ padding: 12 }}>
                      {comision.concepto}
                    </td>

                    <td style={{ padding: 12 }}>
                      {etiquetaGanancia(comision.tipo_ganancia)}
                    </td>

                    <td style={{ padding: 12 }}>
                      {numero(comision.cantidad_tn).toLocaleString(
                        "es-AR",
                        {
                          maximumFractionDigits: 3,
                        }
                      )}
                    </td>

                    <td style={{ padding: 12 }}>
                      {formatoNumero(
                        comision.subtotal,
                        moneda
                      )}
                    </td>

                    <td style={{ padding: 12 }}>
                      {comision.iva_porcentaje
                        ? `${comision.iva_porcentaje}% · ${formatoNumero(
                            comision.iva_importe,
                            moneda
                          )}`
                        : "—"}
                    </td>

                    <td style={{ padding: 12 }}>
                      <strong>
                        {formatoNumero(
                          comision.total,
                          moneda
                        )}
                      </strong>
                    </td>

                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {comision.factura_estado ||
                          "NO_CORRESPONDE"}
                      </span>
                    </td>

                    <td style={{ padding: 12 }}>
                      {formatoNumero(
                        comision.saldo_pendiente,
                        moneda
                      )}
                    </td>

                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: estado.background,
                          color: estado.color,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {comision.estado}
                      </span>
                    </td>

                    <td style={{ padding: 12 }}>
                      {numero(comision.saldo_pendiente) > 0 &&
                      comision.estado !== "ANULADA" &&
                      !(comision.origen_comision === "AGROBROKER_IA" &&
                        !comision.empresa_id) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setComisionPago(comision);
                            setImportePago(
                              numero(comision.saldo_pendiente).toFixed(2)
                            );
                            setMedioPago("");
                            setReferenciaPago("");
                          }}
                          style={{
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            borderRadius: 8,
                            padding: "7px 10px",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          💰 Registrar pago
                        </button>
                      ) : (
                        <span
                          style={{
                            color: "#64748b",
                            fontSize: 12,
                          }}
                        >
                          {comision.estado === "ABONADA"
                            ? "✓ Pagada"
                            : comision.origen_comision === "AGROBROKER_IA" &&
                                !comision.empresa_id
                              ? "Conciliación administrativa"
                              : "—"}
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 10,
          background: "#f8fafc",
          color: "#64748b",
          fontSize: 12,
        }}
      >
        ℹ️ La modalidad F1/F2 se muestra como modalidad comercial.
        El estado fiscal se mantiene separado y los comprobantes que
        correspondan deberán quedar vinculados al módulo ARCA.
      </div>
    </main>
  );
}
