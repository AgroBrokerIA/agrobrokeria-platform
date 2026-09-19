"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Retiro = {
  id: string;
  empresa_id: string;
  profile_id: string | null;
  medio_cobro_id: string;
  moneda_id: number;
  importe: number;
  estado: string;
  referencia: string | null;
  comprobante_url: string | null;
  fecha_solicitud: string;
  fecha_aprobacion: string | null;
  fecha_pago: string | null;
  fecha_rechazo: string | null;
  motivo_rechazo: string | null;
  aprobado_por: string | null;
  pagado_por: string | null;
  observaciones: string | null;
};

type MedioCobro = {
  id: string;
  tipo: string;
  nombre: string;
  titular: string | null;
  cuit_cuil: string | null;
  banco: string | null;
  tipo_cuenta: string | null;
  cbu: string | null;
  alias: string | null;
  moneda_id: number | null;
  estado: string;
};

type Empresa = {
  id: string;
  razon_social: string;
  cuit: string | null;
};

const monedaNombre: Record<number, string> = {
  1: "ARS",
  2: "USD",
  3: "EUR",
  4: "BRL",
};

const estados = [
  "TODOS",
  "SOLICITADO",
  "EN_REVISION",
  "APROBADO",
  "PAGADO",
  "RECHAZADO",
  "CANCELADO",
];

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

export default function AdminRetirosPage() {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [medios, setMedios] = useState<MedioCobro[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [retiroSeleccionado, setRetiroSeleccionado] =
    useState<Retiro | null>(null);

  const [referencia, setReferencia] = useState("");
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAutorizado(false);
      setError("Necesitás iniciar sesión.");
      setCargando(false);
      return;
    }

    const { data: membresias, error: membresiaError } = await supabase
      .from("company_users")
      .select("rol, activo")
      .eq("profile_id", user.id)
      .eq("activo", true);

    const esAdmin = (membresias || []).some(
      (membresia) => String(membresia.rol).toLowerCase() === "admin"
    );

    if (membresiaError || !esAdmin) {
      setAutorizado(false);
      setError("No tenés permisos para administrar retiros.");
      setCargando(false);
      return;
    }

    setAutorizado(true);

    const [
      { data: retirosDB, error: retirosError },
      { data: mediosDB, error: mediosError },
      { data: empresasDB, error: empresasError },
    ] = await Promise.all([
      supabase
        .from("retiros_comisiones")
        .select(
          "id,empresa_id,profile_id,medio_cobro_id,moneda_id,importe,estado,referencia,comprobante_url,fecha_solicitud,fecha_aprobacion,fecha_pago,fecha_rechazo,motivo_rechazo,aprobado_por,pagado_por,observaciones"
        )
        .order("fecha_solicitud", { ascending: false }),

      supabase
        .from("medios_cobro")
        .select(
          "id,tipo,nombre,titular,cuit_cuil,banco,tipo_cuenta,cbu,alias,moneda_id,estado"
        ),

      supabase
        .from("companies")
        .select("id,razon_social,cuit"),
    ]);

    if (retirosError) {
      setError(`No se pudieron cargar los retiros: ${retirosError.message}`);
    }

    if (mediosError) {
      setError(`No se pudieron cargar los medios: ${mediosError.message}`);
    }

    if (empresasError) {
      setError(`No se pudieron cargar las empresas: ${empresasError.message}`);
    }

    setRetiros((retirosDB || []) as Retiro[]);
    setMedios((mediosDB || []) as MedioCobro[]);
    setEmpresas((empresasDB || []) as Empresa[]);

    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const retirosFiltrados =
    filtroEstado === "TODOS"
      ? retiros
      : retiros.filter((retiro) => retiro.estado === filtroEstado);

  function abrirRetiro(retiro: Retiro) {
    setRetiroSeleccionado(retiro);
    setReferencia(retiro.referencia || "");
    setComprobanteUrl(retiro.comprobante_url || "");
    setObservaciones(retiro.observaciones || "");
    setMotivoRechazo(retiro.motivo_rechazo || "");
    setMensaje("");
    setError("");
  }

  async function actualizarEstado(nuevoEstado: string) {
    if (!retiroSeleccionado) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Necesitás iniciar sesión.");
      setGuardando(false);
      return;
    }

    if (
      nuevoEstado === "RECHAZADO" &&
      !motivoRechazo.trim()
    ) {
      setError("Ingresá el motivo del rechazo.");
      setGuardando(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc(
      "finalizar_retiro_comision",
      {
        p_retiro_id: retiroSeleccionado.id,
        p_nuevo_estado: nuevoEstado,
        p_profile_id: user.id,
        p_referencia: referencia || null,
        p_comprobante_url: comprobanteUrl || null,
        p_observaciones: observaciones || null,
        p_motivo_rechazo: motivoRechazo.trim() || null,
      }
    );

    if (rpcError) {
      setError(
        `No se pudo actualizar el retiro: ${rpcError.message}`
      );
      setGuardando(false);
      return;
    }

    setMensaje(`Retiro actualizado a ${nuevoEstado}.`);
    setRetiroSeleccionado(null);

    await cargar();
    setGuardando(false);
  }

  function obtenerMedio(id: string) {
    return medios.find((medio) => medio.id === id);
  }

  function obtenerEmpresa(id: string) {
    return empresas.find((empresa) => empresa.id === id);
  }

  function mascaraCBU(cbu: string | null) {
    if (!cbu) return "—";
    if (cbu.length <= 8) return cbu;
    return `${cbu.slice(0, 4)}••••••••${cbu.slice(-4)}`;
  }

  if (autorizado === false) {
    return (
      <main
        style={{
          padding: 40,
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            padding: 24,
            borderRadius: 14,
            background: "#fff",
            border: "1px solid #fecaca",
          }}
        >
          <h1 style={{ marginTop: 0 }}>
            🔒 Acceso restringido
          </h1>

          <p style={{ color: "#64748b" }}>
            Esta sección está disponible únicamente para usuarios
            con rol administrador.
          </p>
        </section>
      </main>
    );
  }

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
          gap: 15,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
            🛡️ Administración de retiros
          </h1>

          <p style={{ color: "#64748b", marginTop: 6 }}>
            Revisión y gestión de solicitudes de retiro de comisiones.
          </p>
        </div>

        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          style={{
            padding: "10px 16px",
            borderRadius: 9,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 700,
          }}
        >
          🔄 Actualizar
        </button>
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
        {estados.map((estado) => (
          <button
            key={estado}
            type="button"
            onClick={() => setFiltroEstado(estado)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background:
                filtroEstado === estado ? "#0f172a" : "#fff",
              color:
                filtroEstado === estado ? "#fff" : "#0f172a",
              fontWeight: 700,
            }}
          >
            {estado.replace("_", " ")}
          </button>
        ))}
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          overflowX: "auto",
        }}
      >
        {retirosFiltrados.length === 0 ? (
          <div
            style={{
              padding: 35,
              textAlign: "center",
              color: "#64748b",
            }}
          >
            {cargando
              ? "Cargando retiros..."
              : "No hay retiros para este estado."}
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
                  "Fecha",
                  "Empresa",
                  "Importe",
                  "Medio",
                  "Estado",
                  "Referencia",
                  "Acción",
                ].map((titulo) => (
                  <th
                    key={titulo}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      fontSize: 12,
                      color: "#475569",
                    }}
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {retirosFiltrados.map((retiro) => {
                const medio = obtenerMedio(retiro.medio_cobro_id);
                const empresa = obtenerEmpresa(retiro.empresa_id);

                return (
                  <tr
                    key={retiro.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <td style={{ padding: 12 }}>
                      {new Date(
                        retiro.fecha_solicitud
                      ).toLocaleString("es-AR")}
                    </td>

                    <td style={{ padding: 12 }}>
                      <strong>
                        {empresa?.razon_social ||
                          retiro.empresa_id.slice(0, 8)}
                      </strong>
                      {empresa?.cuit && (
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: 12,
                          }}
                        >
                          CUIT: {empresa.cuit}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: 12, fontWeight: 800 }}>
                      {formato(
                        numero(retiro.importe),
                        monedaNombre[retiro.moneda_id] || "—"
                      )}
                    </td>

                    <td style={{ padding: 12 }}>
                      {medio?.nombre || "—"}
                    </td>

                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: "#f1f5f9",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {retiro.estado}
                      </span>
                    </td>

                    <td style={{ padding: 12 }}>
                      {retiro.referencia || "—"}
                    </td>

                    <td style={{ padding: 12 }}>
                      <button
                        type="button"
                        onClick={() => abrirRetiro(retiro)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        Ver / gestionar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {retiroSeleccionado && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: 700,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 15,
              }}
            >
              <div>
                <h2 style={{ marginTop: 0 }}>
                  Gestionar retiro
                </h2>

                <p style={{ color: "#64748b" }}>
                  ID: {retiroSeleccionado.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRetiroSeleccionado(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 22,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {(() => {
              const medio = obtenerMedio(
                retiroSeleccionado.medio_cobro_id
              );
              const empresa = obtenerEmpresa(
                retiroSeleccionado.empresa_id
              );

              return (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <strong>Empresa:</strong>{" "}
                    {empresa?.razon_social || "—"}
                  </div>

                  <div>
                    <strong>Importe:</strong>{" "}
                    {formato(
                      numero(retiroSeleccionado.importe),
                      monedaNombre[
                        retiroSeleccionado.moneda_id
                      ] || "—"
                    )}
                  </div>

                  <div>
                    <strong>Medio:</strong>{" "}
                    {medio?.nombre || "—"}
                  </div>

                  <div>
                    <strong>Titular:</strong>{" "}
                    {medio?.titular || "—"}
                  </div>

                  <div>
                    <strong>CUIT/CUIL:</strong>{" "}
                    {medio?.cuit_cuil || "—"}
                  </div>

                  {medio?.banco && (
                    <div>
                      <strong>Banco:</strong> {medio.banco}
                    </div>
                  )}

                  {medio?.tipo_cuenta && (
                    <div>
                      <strong>Cuenta:</strong>{" "}
                      {medio.tipo_cuenta}
                    </div>
                  )}

                  <div>
                    <strong>CBU:</strong>{" "}
                    {mascaraCBU(medio?.cbu || null)}
                  </div>

                  <div>
                    <strong>Alias:</strong>{" "}
                    {medio?.alias || "—"}
                  </div>

                  <div>
                    <strong>Estado actual:</strong>{" "}
                    {retiroSeleccionado.estado}
                  </div>
                </div>
              );
            })()}

            <label style={{ display: "block", marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Referencia de pago
              </div>
              <input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="N° de transferencia / referencia"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Comprobante
              </div>
              <input
                value={comprobanteUrl}
                onChange={(e) =>
                  setComprobanteUrl(e.target.value)
                }
                placeholder="URL del comprobante"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Observaciones
              </div>
              <textarea
                value={observaciones}
                onChange={(e) =>
                  setObservaciones(e.target.value)
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 15 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Motivo de rechazo
              </div>
              <textarea
                value={motivoRechazo}
                onChange={(e) =>
                  setMotivoRechazo(e.target.value)
                }
                rows={2}
                placeholder="Obligatorio solamente al rechazar"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {retiroSeleccionado.estado === "SOLICITADO" && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() =>
                    actualizarEstado("EN_REVISION")
                  }
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#334155",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  🔎 Pasar a revisión
                </button>
              )}

              {retiroSeleccionado.estado === "EN_REVISION" && (
                <>
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() =>
                      actualizarEstado("APROBADO")
                    }
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#166534",
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    ✅ Aprobar
                  </button>

                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() =>
                      actualizarEstado("RECHAZADO")
                    }
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#991b1b",
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    ❌ Rechazar
                  </button>
                </>
              )}

              {retiroSeleccionado.estado === "APROBADO" && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() =>
                    actualizarEstado("PAGADO")
                  }
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#0369a1",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  💰 Marcar como pagado
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
