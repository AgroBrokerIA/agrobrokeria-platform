"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCompanyBadge } from "@/lib/company-badges";

type Oferta = {
  oferta_id: string;
  empresa_id: string;
  precio_tn: number;
  moneda_id?: number | null;
  cantidad_tn: number;
  observaciones: string | null;
  estado: string;
  codigo_operacion: string;
  publicacion_id: string;
  tipo: string;
  cantidad_publicada: number;
  precio_publicado: number;
  moneda_publicado_id?: number | null;
  provincia: string | null;
  localidad: string | null;
  puerto: string | null;
  empresa_publicante: string | null;
  cuit_publicante: string | null;
  operacion_id: string;
  empresa_ofertante?: Empresa | null;
};

type PerfilEmpresa = {
  company_id: string;
};

type Empresa = {
  id: string;
  razon_social: string | null;
  nombre_comercial: string | null;
  cuit: string | null;
  tipo_empresa?: string | null;
  verificada?: boolean | null;
  reputacion_score?: number | null;
  operaciones_realizadas?: number | null;
  toneladas_operadas?: number | null;
};

type OfertaDB = {
  id: string;
  empresa_id: string;
  precio_tn: number | string;
  moneda_id?: number | null;
  cantidad_tn: number | string;
  observaciones: string | null;
  estado: string;
  operacion_id: string;
  operaciones:
    | {
        codigo: string | null;
        publicacion_venta_id: string | null;
        publicacion_compra_id: string | null;
      }
    | {
        codigo: string | null;
        publicacion_venta_id: string | null;
        publicacion_compra_id: string | null;
      }[]
    | null;
};

function estadoTexto(estado: string) {
  const estados: Record<string, string> = {
    PENDIENTE: "Pendiente",
    ACEPTADA: "Aceptada",
    RECHAZADA: "Rechazada",
    CANCELADA: "Cancelada",
    NEGOCIACION: "En negociación",
  };
  return estados[estado] ?? estado;
}

function formatoNumero(valor: number | string | null | undefined) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("es-AR", { maximumFractionDigits: 2 })
    : "0";
}

type PublicacionDB = {
  id: string;
  empresa_id: string;
  tipo: string;
  cantidad_tn: number | string;
  precio_tn: number | string;
  moneda_id?: number | null;
  provincia: string | null;
  localidad: string | null;
  puerto: string | null;
  empresas:
    | Empresa
    | Empresa[]
    | null;
};

export default function OfertasRecibidasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monedas, setMonedas] = useState<Record<number,string>>({});

  useEffect(() => {
    cargarOfertas();
  }, []);

  async function cargarOfertas() {
    try {
      setLoading(true);
      setError("");
      const { data: monedaData } = await supabase.from("monedas").select("id,codigo");
      setMonedas(Object.fromEntries((monedaData || []).map((m: {id:number;codigo:string}) => [m.id, m.codigo])));

      // =====================================================
      // 1. USUARIO AUTENTICADO
      // =====================================================

      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) {
        console.error(errorUsuario);

        setError(
          `No se pudo obtener el usuario: ${errorUsuario.message}`
        );

        return;
      }

      if (!user) {
        setError(
          "Necesitás iniciar sesión para ver las ofertas recibidas."
        );

        return;
      }

      // =====================================================
      // 2. OBTENER COMPANY_ID DEL USUARIO
      // =====================================================

      const { data: companyUsers, error: errorCompanyUser } = await supabase
        .from("company_users").select("company_id")
        .eq("profile_id", user.id).eq("activo", true);
      if (errorCompanyUser) {
        setError(`No se pudieron obtener las empresas del usuario: ${errorCompanyUser.message}`);
        return;
      }
      const companyIds = [...new Set((companyUsers || []).map((item: {company_id:string}) => item.company_id).filter(Boolean))];
      if (!companyIds.length) { setError("Tu usuario no tiene una empresa asociada."); return; }
      const { data: empresasUsuario, error: errorEmpresas } = await supabase
        .from("empresas").select("id").in("id", companyIds);
      if (errorEmpresas) { setError(`No se pudieron obtener tus empresas operativas: ${errorEmpresas.message}`); return; }
      const empresaIds = (empresasUsuario || []).map((item: {id:string}) => item.id);
      if (!empresaIds.length) { setError("No encontramos empresas operativas asociadas a tu usuario."); return; }
      const { data: publicaciones, error: errorPublicaciones } = await supabase
        .from("publicaciones")
        .select("id, empresa_id, tipo, cantidad_tn, precio_tn, moneda_id, provincia, localidad, puerto, empresas(id, razon_social, nombre_comercial, cuit)")
        .in("empresa_id", empresaIds);
      if (errorPublicaciones) { setError(`No se pudieron cargar tus publicaciones: ${errorPublicaciones.message}`); return; }
      if (!publicaciones?.length) { setOfertas([]); return; }

      // =====================================================
      // 6. OBTENER OFERTAS
      // =====================================================

      const {
        data: ofertasDB,
        error: errorOfertas,
      } = await supabase
        .from("ofertas_negociacion")
        .select(
          `
          id,
          empresa_id,
          precio_tn,
          moneda_id,
          cantidad_tn,
          observaciones,
          estado,
          operacion_id,
          operaciones(
            codigo,
            publicacion_venta_id,
            publicacion_compra_id
          )
        `
        )
        .order("creada_en", {
          ascending: false,
        });

      if (errorOfertas) {
        console.error(errorOfertas);

        setError(
          `No se pudieron cargar las ofertas: ${errorOfertas.message}`
        );

        return;
      }

      console.log(
        "OFERTAS ENCONTRADAS:",
        ofertasDB
      );

      const ofertanteIds = [...new Set((ofertasDB || []).map((o: any) => o.empresa_id).filter(Boolean))];
      let ofertantes: Empresa[] = [];
      if (ofertanteIds.length) { const { data } = await supabase.from("empresas").select("id, razon_social, nombre_comercial, cuit, tipo_empresa, verificada, reputacion_score, operaciones_realizadas, toneladas_operadas").in("id", ofertanteIds); ofertantes = (data || []) as Empresa[]; }
      const mapaOfertantes = new Map(ofertantes.map((e) => [e.id, e]));

      // =====================================================
      // 7. ARMAR RESULTADO
      // =====================================================

      const resultado: Oferta[] = [];

      for (const ofertaDB of (ofertasDB || []) as OfertaDB[]) {
        const operacion = Array.isArray(
          ofertaDB.operaciones
        )
          ? ofertaDB.operaciones[0]
          : ofertaDB.operaciones;

        if (!operacion) {
          continue;
        }

        // La publicación propia puede ser de compra o de venta.
        const publicacion = (publicaciones as PublicacionDB[]).find(
          (item) => item.id === operacion.publicacion_venta_id || item.id === operacion.publicacion_compra_id
        );
        const publicacionId = publicacion?.id;
        if (!publicacionId) continue;

        if (!publicacion) {
          continue;
        }

        const empresaPublicacion =
          Array.isArray(publicacion.empresas)
            ? publicacion.empresas[0]
            : publicacion.empresas;

        resultado.push({
          oferta_id: ofertaDB.id,

          empresa_id: ofertaDB.empresa_id,

          precio_tn: Number(
            ofertaDB.precio_tn
          ),

          moneda_id: ofertaDB.moneda_id ?? null,

          cantidad_tn: Number(
            ofertaDB.cantidad_tn
          ),

          observaciones:
            ofertaDB.observaciones ?? null,
          empresa_ofertante: mapaOfertantes.get(ofertaDB.empresa_id) || null,

          estado:
            ofertaDB.estado ?? "PENDIENTE",

          codigo_operacion:
            operacion.codigo ?? "",

          publicacion_id:
            publicacion.id,

          tipo:
            publicacion.tipo,

          cantidad_publicada:
            Number(
              publicacion.cantidad_tn
            ),

          precio_publicado:
            Number(
              publicacion.precio_tn
            ),

          moneda_publicado_id: publicacion.moneda_id ?? null,

          provincia:
            publicacion.provincia,

          localidad:
            publicacion.localidad,

          puerto:
            publicacion.puerto,

          empresa_publicante:
            empresaPublicacion?.nombre_comercial ||
            empresaPublicacion?.razon_social ||
            null,

          cuit_publicante:
            empresaPublicacion?.cuit ||
            null,

          operacion_id:
            ofertaDB.operacion_id,
        });
      }

      console.log(
        "RESULTADO FINAL:",
        resultado
      );

      setOfertas(resultado);
    } catch (e) {
      console.error(e);

      setError(
        "Ocurrió un error al cargar las ofertas recibidas."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // OBTENER EMPRESA DE UNA OFERTA
  // =====================================================

  // =====================================================
  // CAMBIAR ESTADO DE OFERTA
  // =====================================================

  async function cambiarEstado(oferta: Oferta, nuevoEstado: string) {
    const mensaje =
      nuevoEstado === "ACEPTADA"
        ? "¿Querés aceptar esta oferta?"
        : "¿Querés rechazar esta oferta?";
    if (!window.confirm(mensaje)) return;

    if (nuevoEstado === "ACEPTADA") {
      const { error } = await supabase.rpc("procesar_aceptacion_oferta", {
        p_oferta_id: oferta.oferta_id,
      });
      if (error) {
        console.error("ERROR PROCESANDO ACEPTACIÓN:", error);
        alert(`No se pudo aceptar la oferta: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.rpc("cambiar_estado_oferta", {
        p_oferta_id: oferta.oferta_id,
        p_nuevo_estado: nuevoEstado,
      });
      if (error) {
        alert(`No se pudo actualizar la oferta: ${error.message}`);
        return;
      }
    }

    await cargarOfertas();
  }

  return (
    <main className="module-page"><div className="module-hero"><div><span className="eyebrow">NEGOCIACIÓN</span><h1>Ofertas recibidas</h1><p>Gestioná propuestas comerciales sobre tus publicaciones.</p></div><div className="module-pill">Negociación segura</div></div>
      {loading && (
        <div
          style={{
            background: "white",
            padding: 30,
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          Cargando ofertas...
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 20,
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        ofertas.length === 0 && (
          <div
            style={{
              background: "white",
              padding: 50,
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 50,
                marginBottom: 15,
              }}
            >
              📭
            </div>

            <h2>
              No tenés ofertas recibidas.
            </h2>

            <p
              style={{
                color: "#666",
              }}
            >
              Cuando otro usuario haga una oferta
              sobre una de tus publicaciones,
              aparecerá aquí.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        ofertas.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {ofertas.map((oferta) => (
              <div
                key={oferta.oferta_id}
                className="received-offer-card"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "flex-start",
                    gap: 20,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        marginBottom: 8,
                      }}
                    >
                      🌾 Oferta recibida
                    </h2>

                    <div
                      style={{
                        color: "#666",
                      }}
                    >
                      Operación:{" "}
                      <strong>
                        {oferta.codigo_operacion}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      padding:
                        "8px 14px",
                      borderRadius: 20,
                      background:
                        oferta.estado ===
                        "ACEPTADA"
                          ? "#dcfce7"
                          : oferta.estado ===
                            "RECHAZADA"
                          ? "#fee2e2"
                          : "#fef3c7",
                      color:
                        oferta.estado ===
                        "ACEPTADA"
                          ? "#166534"
                          : oferta.estado ===
                            "RECHAZADA"
                          ? "#991b1b"
                          : "#92400e",
                      fontWeight: 600,
                    }}
                  >
                    {estadoTexto(
                      oferta.estado
                    )}
                  </div>
                </div>

                <hr
                  style={{
                    margin:
                      "20px 0",
                    border: 0,
                    borderTop:
                      "1px solid #eee",
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 15,
                  }}
                >
                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Producto
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {oferta.tipo}
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Cantidad ofrecida
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {formatoNumero(
                        oferta.cantidad_tn
                      )}{" "}
                      TN
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Precio ofrecido
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {monedas[oferta.moneda_id ?? 0] ?? "—"}{" "}
                      {formatoNumero(
                        oferta.precio_tn
                      )}{" "}
                      / TN
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Precio publicado
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {monedas[oferta.moneda_id ?? 0] ?? "—"}{" "}
                      {formatoNumero(
                        oferta.precio_publicado
                      )}{" "}
                      / TN
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Publicado
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {formatoNumero(
                        oferta.cantidad_publicada
                      )}{" "}
                      TN
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Ubicación
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {oferta.localidad ||
                        "-"}
                      {oferta.provincia
                        ? `, ${oferta.provincia}`
                        : ""}
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Puerto
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {oferta.puerto ||
                        "-"}
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Empresa
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {oferta.empresa_publicante ||
                        "-"}
                    </div>

                    {oferta.empresa_ofertante && (() => { const badge = getCompanyBadge(oferta.empresa_ofertante.tipo_empresa, Boolean(oferta.empresa_ofertante.verificada)); return <div className="company-badge-stack" style={{alignItems:"flex-start",marginTop:8}}><span className="company-role-badge" style={{color:badge.color,background:badge.background,borderColor:badge.border}}><i />{badge.label}{badge.verified ? " · Verificada" : ""}</span><div className="company-reputation"><div><strong>{oferta.empresa_ofertante.operaciones_realizadas ?? 0}</strong><span>negocios</span></div><div><strong>{oferta.empresa_ofertante.toneladas_operadas ?? 0} TN</strong><span>operadas</span></div><div><strong>{oferta.empresa_ofertante.reputacion_score ?? 0}%</strong><span>cumplimiento</span></div></div></div>; })()}                  </div>
                </div>

                {oferta.observaciones && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: 15,
                      background:
                        "#f8fafc",
                      borderRadius: 10,
                    }}
                  >
                    <strong>
                      Observaciones:
                    </strong>

                    <div
                      style={{
                        marginTop: 5,
                        color: "#555",
                      }}
                    >
                      {
                        oferta.observaciones
                      }
                    </div>
                  </div>
                )}

                {oferta.estado === "ACEPTADA" && (
                  <section style={{marginTop:22,padding:18,border:"1px solid #86efac",borderRadius:12,background:"#f0fdf4"}}>
                    <strong style={{display:"block",color:"#166534",marginBottom:6}}>✓ Oferta aceptada</strong>
                    <p style={{margin:"0 0 12px",color:"#14532d"}}>La aceptación genera o vincula la operación comercial. Para continuar con el acuerdo, visado, contrato, firmas, fondos y entrega, ingresá al módulo Operaciones.</p>
                    <a href="/operaciones" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"11px 16px",borderRadius:8,background:"#078b58",color:"#fff",fontWeight:700,textDecoration:"none"}}>Continuar con la operación →</a>
                  </section>
                )}
                {oferta.estado ===
                  "PENDIENTE" && (
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 25,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() =>
                        cambiarEstado(
                          oferta,
                          "ACEPTADA"
                        )
                      }
                      style={{
                        padding:
                          "12px 20px",
                        border: 0,
                        borderRadius: 8,
                        background:
                          "#16a34a",
                        color: "white",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ✓ Aceptar oferta
                    </button>

                    <button
                      onClick={() =>
                        cambiarEstado(
                          oferta,
                          "RECHAZADA"
                        )
                      }
                      style={{
                        padding:
                          "12px 20px",
                        border: 0,
                        borderRadius: 8,
                        background:
                          "#dc2626",
                        color: "white",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ✕ Rechazar oferta
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </main>
  );
}
