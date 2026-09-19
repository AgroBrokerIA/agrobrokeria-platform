"use client";

type Control = {
  comision_monto?: number | null;
  comision_moneda?: string | null;
  comision_estado: string;
  comision_medio_pago?: string | null;
  comision_referencia_pago?: string | null;
  comision_fecha_pago?: string | null;
  comision_fecha_retencion?: string | null;
  comision_fecha_devolucion?: string | null;

  fondos_estado: string;
  fondos_fecha_habilitacion?: string | null;
  fondos_fecha_liberacion?: string | null;
  fondos_referencia?: string | null;

  visado_estado: string;

  vendedor_firma_estado: string;
  comprador_firma_estado: string;
  intermediario_firma_estado: string;

  datos_operativos_estado: string;
  no_elusion_aceptada: boolean;
  no_elusion_aceptada_at?: string | null;
};

type Props = {
  control?: Control;
  cantidadTn?: number;

  onActualizarComision: (
    cambios: Partial<Control>
  ) => Promise<boolean>;

  onActualizarControl: (
    cambios: Partial<Control>
  ) => Promise<boolean>;
};

function estadoVisual(estado: string) {
  if (
    estado === "ABONADA" ||
    estado === "LIBERADOS" ||
    estado === "APROBADO" ||
    estado === "FIRMADO"
  ) {
    return "🟢";
  }

  if (
    estado === "RECHAZADO" ||
    estado === "DEVUELTA" ||
    estado === "CANCELADO"
  ) {
    return "🔴";
  }

  if (
    estado === "PROTEGIDOS" ||
    estado === "NO_CORRESPONDE"
  ) {
    return "🔒";
  }

  return "🟡";
}

export default function ControlComercial({
  control,
  cantidadTn,
  onActualizarComision,
  onActualizarControl,
}: Props) {
  const comisionEstado =
    control?.comision_estado || "PENDIENTE";

  const comisionCalculada =
    Number(cantidadTn || 0) * 1;

  const comisionMostrar =
    Number(control?.comision_monto || 0) > 0
      ? Number(control?.comision_monto)
      : comisionCalculada;

  const fondosEstado =
    control?.fondos_estado || "PENDIENTES";

  const visadoEstado =
    control?.visado_estado || "PENDIENTE";

  const vendedorFirma =
    control?.vendedor_firma_estado || "PENDIENTE";

  const compradorFirma =
    control?.comprador_firma_estado || "PENDIENTE";

  const intermediarioFirma =
    control?.intermediario_firma_estado ||
    "NO_CORRESPONDE";

  const datosOperativos =
    control?.datos_operativos_estado ||
    "PROTEGIDOS";

  const noElusion =
    control?.no_elusion_aceptada || false;

  return (
    <section
      style={{
        background: "#eff6ff",
        border: "2px solid #93c5fd",
        borderRadius: 14,
        padding: 22,
        marginBottom: 25,
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: 8,
          fontSize: 22,
        }}
      >
        🔐 Control comercial
      </h3>

      <p style={{ color: "#475569" }}>
        Control y trazabilidad de la operación dentro de
        AgroBroker IA.
      </p>

      {/* =====================================================
          COMISIÓN AGROBROKER IA
          ===================================================== */}

      <div
        style={{
          background: "white",
          border: "1px solid #bfdbfe",
          borderRadius: 12,
          padding: 20,
          marginTop: 18,
        }}
      >
        <h4 style={{ marginTop: 0 }}>
          💰 Comisión AgroBroker IA
        </h4>

        <div
          style={{
            background: "#f8fafc",
            borderRadius: 10,
            padding: 18,
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            Comisión automática
          </div>

          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            USD {comisionMostrar.toLocaleString(
              "es-AR",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#475569",
            }}
          >
            Calculada automáticamente a razón de{" "}
            <strong>USD 1 por tonelada</strong>.
          </div>

          <div
            style={{
              marginTop: 5,
              color: "#64748b",
              fontSize: 14,
            }}
          >
            El monto no puede ser modificado manualmente.
          </div>

          <div
            style={{
              marginTop: 15,
              padding: 12,
              background: "#fef3c7",
              borderRadius: 8,
              color: "#92400e",
              fontWeight: 700,
            }}
          >
            {estadoVisual(comisionEstado)} Estado:{" "}
            {comisionEstado}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 15,
          }}
        >
          <button
            onClick={() =>
              onActualizarComision({
                comision_estado: "RETENIDA",
                comision_fecha_retencion:
                  new Date().toISOString(),
              })
            }
            disabled={
              comisionEstado === "RETENIDA" ||
              comisionEstado === "ABONADA"
            }
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
            🔒 RETENER COMISIÓN
          </button>

          <button
            onClick={() =>
              onActualizarComision({
                comision_estado: "ABONADA",
                comision_fecha_pago:
                  new Date().toISOString(),
              })
            }
            disabled={
              comisionEstado === "ABONADA" ||
              comisionEstado === "DEVUELTA"
            }
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
            💰 MARCAR ABONADA
          </button>

          <button
            onClick={() =>
              onActualizarComision({
                comision_estado: "DEVUELTA",
                comision_fecha_devolucion:
                  new Date().toISOString(),
              })
            }
            disabled={comisionEstado !== "RETENIDA"}
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
            ↩️ DEVOLVER
          </button>
        </div>
      </div>

      {/* =====================================================
          CONTROL DE FONDOS
          ===================================================== */}

      <div
        style={{
          background: "white",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          padding: 20,
          marginTop: 18,
        }}
      >
        <h4
          style={{
            marginTop: 0,
            marginBottom: 8,
            fontSize: 18,
          }}
        >
          🏦 Control de fondos
        </h4>

        <p
          style={{
            color: "#475569",
            marginTop: 0,
            marginBottom: 18,
          }}
        >
          Registro y control de los fondos correspondientes a
          la operación. Los datos operativos continúan
          protegidos mientras no se cumplan las condiciones
          de liberación.
        </p>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            Estado actual de los fondos
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            {estadoVisual(fondosEstado)} {fondosEstado}
          </div>

          {control?.fondos_fecha_habilitacion && (
            <div
              style={{
                marginTop: 10,
                color: "#475569",
                fontSize: 14,
              }}
            >
              Fecha de habilitación:{" "}
              {new Date(
                control.fondos_fecha_habilitacion
              ).toLocaleString("es-AR")}
            </div>
          )}

          {control?.fondos_fecha_liberacion && (
            <div
              style={{
                marginTop: 5,
                color: "#475569",
                fontSize: 14,
              }}
            >
              Fecha de liberación:{" "}
              {new Date(
                control.fondos_fecha_liberacion
              ).toLocaleString("es-AR")}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label
            style={{
              display: "block",
              fontWeight: 700,
              marginBottom: 7,
            }}
          >
            Referencia / comprobante de fondos
          </label>

          <input
            type="text"
            value={control?.fondos_referencia || ""}
            onChange={(e) =>
              onActualizarControl({
                fondos_referencia:
                  e.target.value || null,
              })
            }
            placeholder="Ingrese referencia, comprobante o identificación..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() =>
              onActualizarControl({
                fondos_estado: "RETENIDOS",
              })
            }
            disabled={
              fondosEstado === "RETENIDOS" ||
              fondosEstado === "LIBERADOS"
            }
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
            🔒 RETENER FONDOS
          </button>

          <button
            type="button"
            onClick={() =>
              onActualizarControl({
                fondos_estado: "HABILITADOS",
                fondos_fecha_habilitacion:
                  new Date().toISOString(),
              })
            }
            disabled={
              fondosEstado === "LIBERADOS" ||
              fondosEstado === "DEVUELTOS"
            }
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
            💳 HABILITAR FONDOS
          </button>

          <button
            type="button"
            onClick={() =>
              onActualizarControl({
                fondos_estado: "LIBERADOS",
                fondos_fecha_liberacion:
                  new Date().toISOString(),
              })
            }
            disabled={
              fondosEstado !== "HABILITADOS"
            }
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
            💰 LIBERAR FONDOS
          </button>

          <button
            type="button"
            onClick={() =>
              onActualizarControl({
                fondos_estado: "DEVUELTOS",
              })
            }
            disabled={
              fondosEstado !== "RETENIDOS" &&
              fondosEstado !== "HABILITADOS"
            }
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
            ↩️ DEVOLVER FONDOS
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 12,
            background: "#fef3c7",
            borderRadius: 8,
            color: "#92400e",
            fontWeight: 700,
          }}
        >
          🔐 Los datos operativos permanecen protegidos.
          Liberar fondos no libera automáticamente los datos
          operativos en esta etapa.
        </div>
      </div>

      {/* =====================================================
          FIRMAS DEL CONTRATO DEFINITIVO
          ===================================================== */}

      <div
        style={{
          background: "white",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          padding: 20,
          marginTop: 18,
        }}
      >
        <h4
          style={{
            marginTop: 0,
            marginBottom: 8,
            fontSize: 18,
          }}
        >
          ✍️ Firmas del contrato definitivo
        </h4>

        <p
          style={{
            color: "#475569",
            marginTop: 0,
            marginBottom: 18,
          }}
        >
          El contrato definitivo debe quedar firmado por
          todas las partes requeridas antes de avanzar a
          Fondos.
        </p>

        {[
          {
            titulo: "Vendedor",
            estado: vendedorFirma,
            campo: "vendedor_firma_estado",
            fecha: "fecha_firma_vendedor",
            requerido: true,
          },
          {
            titulo: "Comprador",
            estado: compradorFirma,
            campo: "comprador_firma_estado",
            fecha: "fecha_firma_comprador",
            requerido: true,
          },
          {
            titulo: "Intermediario",
            estado: intermediarioFirma,
            campo: "intermediario_firma_estado",
            fecha: "fecha_firma_intermediario",
            requerido: intermediarioFirma !== "NO_CORRESPONDE",
          },
        ].map((firma) => (
          <div
            key={firma.titulo}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: 15,
              marginBottom: 12,
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>
                  {firma.titulo}
                </strong>

                <div
                  style={{
                    marginTop: 5,
                    fontWeight: 700,
                  }}
                >
                  {estadoVisual(firma.estado)}{" "}
                  {firma.estado}
                </div>
              </div>

              {firma.estado === "PENDIENTE" &&
                firma.requerido && (
                  <button
                    type="button"
                    onClick={() =>
                      onActualizarControl({
                        [firma.campo]:
                          "FIRMADO",
                        [firma.fecha]:
                          new Date().toISOString(),
                      })
                    }
                    style={{
                      padding: "10px 15px",
                      border: 0,
                      borderRadius: 8,
                      background: "#16a34a",
                      color: "white",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✓ MARCAR FIRMADO
                  </button>
                )}

              {firma.estado === "NO_CORRESPONDE" && (
                <span
                  style={{
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  No requiere firma
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* =====================================================
          NO ELUSIÓN
          ===================================================== */}

      <div
        style={{
          background: "white",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          padding: 20,
          marginTop: 18,
        }}
      >
        <h4
          style={{
            marginTop: 0,
            marginBottom: 8,
            fontSize: 18,
          }}
        >
          🛡️ Cláusula de no elusión
        </h4>

        <p
          style={{
            color: "#475569",
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          La aceptación de esta cláusula es requisito para habilitar
          los datos operativos de la operación.
        </p>

        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: noElusion ? "#dcfce7" : "#fef3c7",
            color: noElusion ? "#166534" : "#92400e",
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          {noElusion
            ? "✅ NO ELUSIÓN ACEPTADA"
            : "⏳ NO ELUSIÓN PENDIENTE"}
        </div>

        {!noElusion && (
          <button
            type="button"
            onClick={() =>
              onActualizarControl({
                no_elusion_aceptada: true,
                no_elusion_aceptada_at:
                  new Date().toISOString(),
              })
            }
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
            🛡️ ACEPTAR NO ELUSIÓN
          </button>
        )}
      </div>

      {/* =====================================================
          ESTADOS GENERALES
          ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 18,
        }}
      >
        {[
          ["🏦 Fondos", fondosEstado],
          ["🔎 Visado", visadoEstado],
          ["✍️ Vendedor", vendedorFirma],
          ["✍️ Comprador", compradorFirma],
          ["🤝 Intermediario", intermediarioFirma],
          ["🔒 Datos operativos", datosOperativos],
          [
            "🛡️ No elusión",
            noElusion ? "ACEPTADA" : "PENDIENTE",
          ],
        ].map(([titulo, estado]) => (
          <div
            key={titulo}
            style={{
              background: "white",
              padding: 15,
              borderRadius: 10,
              border: "1px solid #dbeafe",
            }}
          >
            <strong>{titulo}</strong>

            <div
              style={{
                marginTop: 8,
                fontWeight: 700,
              }}
            >
              {estadoVisual(estado)} {estado}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 18,
          background: "#fef3c7",
          border: "1px solid #f59e0b",
          borderRadius: 10,
          padding: 15,
          color: "#92400e",
        }}
      >
        ⚠️ La comisión debe quedar registrada dentro de
        AgroBroker IA. Los datos operativos permanecen
        protegidos mientras la operación no cumpla las
        condiciones correspondientes.
      </div>
    </section>
  );
}
