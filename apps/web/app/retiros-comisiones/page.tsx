"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type MedioCobro = {
  id: string;
  tipo: string;
  nombre: string;
  titular: string | null;
  banco: string | null;
  cbu: string | null;
  alias: string | null;
  moneda_id: number | null;
  es_predeterminado: boolean;
  estado: string;
};

type Retiro = {
  id: string;
  medio_cobro_id: string;
  moneda_id: number;
  importe: number;
  estado: string;
  referencia: string | null;
  fecha_solicitud: string;
  fecha_pago: string | null;
  motivo_rechazo: string | null;
};

const monedaNombre: Record<number, string> = {
  1: "ARS",
  2: "USD",
  3: "EUR",
  4: "BRL",
};

function numero(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function formato(valor: number, moneda: string) {
  return `${moneda} ${valor.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function RetirosComisionesPage() {
  const [medios, setMedios] = useState<MedioCobro[]>([]);
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [saldo, setSaldo] = useState<Record<number, number>>({});

  const [monedaSeleccionada, setMonedaSeleccionada] = useState(2);
  const [medioSeleccionado, setMedioSeleccionado] = useState("");
  const [importe, setImporte] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Necesitás iniciar sesión.");
      setCargando(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.active_company_id) {
      setError("No se pudo determinar la empresa activa.");
      setCargando(false);
      return;
    }

    const empresaId = profile.active_company_id;

    const { data: mediosDB, error: mediosError } = await supabase
      .from("medios_cobro")
      .select(
        "id,tipo,nombre,titular,banco,cbu,alias,moneda_id,es_predeterminado,estado"
      )
      .eq("empresa_id", empresaId)
      .neq("estado", "INACTIVO")
      .order("es_predeterminado", { ascending: false })
      .order("creado_at", { ascending: false });

    if (mediosError) {
      setError(`No se pudieron cargar los medios de cobro: ${mediosError.message}`);
    } else {
      setMedios((mediosDB || []) as MedioCobro[]);
    }

    const { data: comisionesDB, error: comisionesError } = await supabase
      .from("operacion_comisiones")
      .select("moneda_id,saldo_pagado,saldo_reservado,estado")
      .eq("empresa_id", empresaId);

    if (comisionesError) {
      setError(
        `No se pudo calcular el saldo disponible: ${comisionesError.message}`
      );
    } else {
      const saldos: Record<number, number> = {};

      for (const comision of comisionesDB || []) {
        const moneda = Number(comision.moneda_id);
        const estado = String(comision.estado || "").toUpperCase();

        const saldoPagado = numero(comision.saldo_pagado);
        const saldoReservado = numero(comision.saldo_reservado);

        if (estado === "ABONADA" || saldoPagado > 0) {
          saldos[moneda] =
            (saldos[moneda] || 0) +
            Math.max(saldoPagado - saldoReservado, 0);
        }
      }

      setSaldo(saldos);
    }

    const { data: retirosDB, error: retirosError } = await supabase
      .from("retiros_comisiones")
      .select(
        "id,medio_cobro_id,moneda_id,importe,estado,referencia,fecha_solicitud,fecha_pago,motivo_rechazo"
      )
      .eq("empresa_id", empresaId)
      .order("fecha_solicitud", { ascending: false });

    if (retirosError) {
      setError(`No se pudieron cargar los retiros: ${retirosError.message}`);
    } else {
      setRetiros((retirosDB || []) as Retiro[]);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const mediosDisponibles = useMemo(
    () =>
      medios.filter(
        (medio) =>
          medio.estado === "VALIDADO" &&
          (!medio.moneda_id ||
            Number(medio.moneda_id) === monedaSeleccionada)
      ),
    [medios, monedaSeleccionada]
  );

  const saldoDisponible = Math.max(
    0,
    numero(saldo[monedaSeleccionada])
  );

  useEffect(() => {
    const predeterminado = mediosDisponibles.find(
      (medio) => medio.es_predeterminado
    );

    setMedioSeleccionado(predeterminado?.id || mediosDisponibles[0]?.id || "");
  }, [mediosDisponibles]);

  async function solicitarRetiro() {
    setError("");
    setMensaje("");

    const monto = numero(importe);

    if (monto <= 0) {
      setError("Ingresá un importe válido.");
      return;
    }

    if (monto > saldoDisponible) {
      setError(
        `El importe supera el saldo disponible de ${formato(
          saldoDisponible,
          monedaNombre[monedaSeleccionada]
        )}.`
      );
      return;
    }

    if (!medioSeleccionado) {
      setError("Seleccioná un medio de cobro validado.");
      return;
    }

    const medio = mediosDisponibles.find(
      (item) => item.id === medioSeleccionado
    );

    if (!medio) {
      setError("El medio de cobro seleccionado no está disponible.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Necesitás iniciar sesión.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.active_company_id) {
      setError("No se pudo determinar la empresa activa.");
      return;
    }

    setGuardando(true);

    const { data: retiroId, error: retiroError } = await supabase.rpc(
      "solicitar_retiro_comision",
      {
        p_empresa_id: profile.active_company_id,
        p_profile_id: user.id,
        p_medio_cobro_id: medio.id,
        p_moneda_id: monedaSeleccionada,
        p_importe: monto,
      }
    );

    if (retiroError) {
      setError(`No se pudo solicitar el retiro: ${retiroError.message}`);
      setGuardando(false);
      return;
    }

    setImporte("");
    setMensaje(
      `Solicitud registrada por ${formato(
        monto,
        monedaNombre[monedaSeleccionada]
      )}.`
    );

    await cargar();
    setGuardando(false);
  }

  function mascaraCBU(cbu: string | null) {
    if (!cbu) return "—";
    if (cbu.length <= 8) return cbu;
    return `${cbu.slice(0, 4)}••••••••${cbu.slice(-4)}`;
  }

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 1300,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
          💸 Retiros de comisiones
        </h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Solicitá el retiro de tus comisiones hacia un medio de cobro validado.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 18,
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

      {mensaje && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 10,
            background: "#f0fdf4",
            color: "#166534",
            border: "1px solid #bbf7d0",
          }}
        >
          {mensaje}
        </div>
      )}

      <section
        style={{
          padding: 20,
          borderRadius: 14,
          background: "#fff",
          border: "1px solid #e2e8f0",
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Solicitar retiro</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 14,
          }}
        >
          <label>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Moneda
            </div>
            <select
              value={monedaSeleccionada}
              onChange={(e) => setMonedaSeleccionada(Number(e.target.value))}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            >
              <option value={1}>ARS</option>
              <option value={2}>USD</option>
              <option value={3}>EUR</option>
              <option value={4}>BRL</option>
            </select>
          </label>

          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Saldo disponible
            </div>
            <strong style={{ fontSize: 20 }}>
              {formato(
                saldoDisponible,
                monedaNombre[monedaSeleccionada]
              )}
            </strong>
          </div>

          <label>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Medio de cobro
            </div>
            <select
              value={medioSeleccionado}
              onChange={(e) => setMedioSeleccionado(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="">Seleccionar medio</option>
              {mediosDisponibles.map((medio) => (
                <option key={medio.id} value={medio.id}>
                  {medio.nombre}
                  {medio.es_predeterminado ? " — Predeterminado" : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Importe a retirar
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              placeholder="0.00"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={solicitarRetiro}
          disabled={
            guardando ||
            cargando ||
            !medioSeleccionado ||
            saldoDisponible <= 0
          }
          style={{
            marginTop: 18,
            padding: "11px 18px",
            borderRadius: 9,
            border: "none",
            background:
              guardando || !medioSeleccionado || saldoDisponible <= 0
                ? "#94a3b8"
                : "#0f172a",
            color: "#fff",
            cursor:
              guardando || !medioSeleccionado || saldoDisponible <= 0
                ? "not-allowed"
                : "pointer",
            fontWeight: 800,
          }}
        >
          {guardando ? "Registrando..." : "Solicitar retiro"}
        </button>

        {mediosDisponibles.length === 0 && (
          <p style={{ color: "#b45309", marginBottom: 0 }}>
            No tenés un medio de cobro <strong>validado</strong> para esta
            moneda. Configuralo en Medios de cobro antes de solicitar un retiro.
          </p>
        )}
      </section>

      <section
        style={{
          padding: 20,
          borderRadius: 14,
          background: "#fff",
          border: "1px solid #e2e8f0",
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Medios de cobro disponibles</h2>

        {medios.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            Todavía no hay medios de cobro configurados.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {medios.map((medio) => (
              <div
                key={medio.id}
                style={{
                  padding: 14,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 15,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>{medio.nombre}</strong>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    {medio.tipo} · {medio.titular || "Sin titular"}
                  </div>
                  {medio.banco && (
                    <div style={{ fontSize: 13 }}>
                      Banco: {medio.banco}
                    </div>
                  )}
                  {medio.cbu && (
                    <div style={{ fontSize: 13 }}>
                      CBU: {mascaraCBU(medio.cbu)}
                    </div>
                  )}
                  {medio.alias && (
                    <div style={{ fontSize: 13 }}>
                      Alias: {medio.alias}
                    </div>
                  )}
                </div>

                <div>
                  <span
                    style={{
                      padding: "5px 9px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      background:
                        medio.estado === "VALIDADO"
                          ? "#dcfce7"
                          : medio.estado === "RECHAZADO"
                            ? "#fee2e2"
                            : "#fef3c7",
                      color:
                        medio.estado === "VALIDADO"
                          ? "#166534"
                          : medio.estado === "RECHAZADO"
                            ? "#991b1b"
                            : "#92400e",
                    }}
                  >
                    {medio.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        style={{
          padding: 20,
          borderRadius: 14,
          background: "#fff",
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Historial de retiros</h2>

        {retiros.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            Todavía no hay solicitudes de retiro.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 850,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: 10 }}>Fecha</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Importe</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Medio</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Estado</th>
                  <th style={{ textAlign: "left", padding: 10 }}>
                    Referencia
                  </th>
                  <th style={{ textAlign: "left", padding: 10 }}>
                    Fecha pago
                  </th>
                </tr>
              </thead>

              <tbody>
                {retiros.map((retiro) => {
                  const medio = medios.find(
                    (item) => item.id === retiro.medio_cobro_id
                  );

                  return (
                    <tr
                      key={retiro.id}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: 10 }}>
                        {new Date(retiro.fecha_solicitud).toLocaleString(
                          "es-AR"
                        )}
                      </td>
                      <td style={{ padding: 10, fontWeight: 700 }}>
                        {formato(
                          numero(retiro.importe),
                          monedaNombre[retiro.moneda_id] || "—"
                        )}
                      </td>
                      <td style={{ padding: 10 }}>
                        {medio?.nombre || "—"}
                      </td>
                      <td style={{ padding: 10 }}>{retiro.estado}</td>
                      <td style={{ padding: 10 }}>
                        {retiro.referencia || "—"}
                      </td>
                      <td style={{ padding: 10 }}>
                        {retiro.fecha_pago
                          ? new Date(retiro.fecha_pago).toLocaleString("es-AR")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
