"use client";

import { useState } from "react";

import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

import { supabase } from "@/lib/supabase/client";

type Props = {
  publicacion: any;
};

/**
 * Obtiene la EMPRESA ACTIVA del usuario.
 *
 * El usuario puede pertenecer a varias empresas,
 * pero para operar utilizamos únicamente
 * profiles.active_company_id.
 */
async function obtenerEmpresaActivaDelUsuario() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "Necesitás iniciar sesión para realizar una oferta."
    );
  }

  /**
   * Obtener la empresa activa del perfil.
   */
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("active_company_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(
      `No se pudo obtener el perfil del usuario: ${profileError.message}`
    );
  }

  if (!profile?.active_company_id) {
    throw new Error(
      "No tenés una empresa activa seleccionada."
    );
  }

  /**
   * Verificar que la empresa activa
   * realmente esté vinculada al usuario.
   */
  const {
    data: companyUser,
    error: companyUserError,
  } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("profile_id", user.id)
    .eq("company_id", profile.active_company_id)
    .eq("activo", true)
    .maybeSingle();

  if (companyUserError) {
    throw new Error(
      `No se pudo verificar la empresa activa: ${companyUserError.message}`
    );
  }

  if (!companyUser?.company_id) {
    throw new Error(
      "La empresa activa no está vinculada a tu usuario."
    );
  }

  /**
   * Obtener la empresa operativa.
   */
  const {
    data: company,
    error: companyError,
  } = await supabase
    .from("companies")
    .select("id, cuit")
    .eq("id", companyUser.company_id)
    .single();

  if (companyError) {
    throw new Error(
      `No se pudo obtener la empresa: ${companyError.message}`
    );
  }

  if (!company?.cuit) {
    throw new Error(
      "La empresa activa no tiene CUIT registrado."
    );
  }

  /**
   * Buscar la empresa operativa correspondiente
   * en la tabla empresas.
   */
  const {
    data: empresa,
    error: empresaError,
  } = await supabase
    .from("empresas")
    .select(
      "id, nombre_comercial, razon_social, cuit"
    )
    .eq("cuit", company.cuit)
    .eq("activa", true)
    .single();

  if (empresaError) {
    throw new Error(
      `No se pudo encontrar la empresa operativa: ${empresaError.message}`
    );
  }

  if (!empresa?.id) {
    throw new Error(
      "No se encontró una empresa operativa asociada al CUIT."
    );
  }

  return empresa.id;
}

export default function MarketplaceCard({
  publicacion,
}: Props) {
  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [enviando, setEnviando] =
    useState(false);

  const [enviado, setEnviado] =
    useState(false);

  const [error, setError] =
    useState("");

  const [cantidadOferta, setCantidadOferta] =
    useState(
      String(publicacion.cantidad_tn ?? "")
    );

  const [precioOferta, setPrecioOferta] =
    useState(
      String(publicacion.precio_tn ?? "")
    );

  const [monedaOferta, setMonedaOferta] =
    useState(
      publicacion.moneda_id ?? ""
    );

  const [observaciones, setObservaciones] =
    useState("");

  /**
   * Abrir formulario de oferta.
   */
  async function mostrarInteres() {
    setError("");

    try {
      const empresaId =
        await obtenerEmpresaActivaDelUsuario();

      /**
       * No permitir ofertar sobre publicaciones
       * de la propia empresa.
       */
      if (
        empresaId ===
        publicacion.empresa_id
      ) {
        setError(
          "No podés hacer una oferta sobre una publicación de tu propia empresa."
        );

        return;
      }

      setMostrarFormulario(true);
    } catch (e) {
      console.error(e);

      setError(
        e instanceof Error
          ? e.message
          : "Ocurrió un error al verificar la empresa."
      );
    }
  }

  /**
   * Enviar oferta real.
   */
  async function enviarOferta() {
    setError("");

    const cantidad = Number(cantidadOferta);
    const precio = Number(precioOferta);

    /**
     * Validaciones.
     */
    if (
      !cantidadOferta ||
      !Number.isFinite(cantidad) ||
      cantidad <= 0
    ) {
      setError(
        "Ingresá una cantidad válida de toneladas."
      );

      return;
    }

    if (
      !precioOferta ||
      !Number.isFinite(precio) ||
      precio <= 0
    ) {
      setError(
        "Ingresá un precio válido por tonelada."
      );

      return;
    }

    if (cantidad > Number(publicacion.cantidad_tn)) {
      setError(
        `La cantidad ofertada no puede superar las ${publicacion.cantidad_tn} TN publicadas.`
      );

      return;
    }

    if (!monedaOferta) {
      setError(
        "Seleccioná una moneda para la oferta."
      );

      return;
    }

    try {
      setEnviando(true);

      /**
       * Obtener empresa activa.
       */
      const empresaId =
        await obtenerEmpresaActivaDelUsuario();

      /**
       * Segunda validación contra publicación propia.
       */
      if (
        empresaId ===
        publicacion.empresa_id
      ) {
        setError(
          "No podés hacer una oferta sobre una publicación de tu propia empresa."
        );

        return;
      }

      /**
       * Determinar si la publicación
       * es VENTA o COMPRA.
       */
      const esVenta =
        publicacion.tipo === "VENTA";

      /**
       * Crear operación con los valores
       * REALMENTE OFERTADOS.
       */
      const operacionData = {
        codigo: `OP-${Date.now()}`,

        publicacion_compra_id:
          esVenta
            ? null
            : publicacion.id,

        publicacion_venta_id:
          esVenta
            ? publicacion.id
            : null,

        estado: "NEGOCIACION",

        precio_tn: precio,

        cantidad_tn: cantidad,

        moneda_id:
          monedaOferta,

        importe_total:
          precio * cantidad,
      };

      const {
        data: operacion,
        error: errorOperacion,
      } = await supabase
        .from("operaciones")
        .insert(operacionData)
        .select()
        .single();

      if (errorOperacion) {
        console.error(
          "Error creando operación:",
          errorOperacion
        );

        setError(
          `No se pudo crear la operación: ${errorOperacion.message}`
        );

        return;
      }

      /**
       * Crear oferta de negociación.
       */
const oferta = {
  operacion_id:
    operacion.id,

  empresa_id:
    empresaId,

  precio_tn:
    precio,

  cantidad_tn:
    cantidad,

  moneda_id:
    Number(monedaOferta),

  observaciones:
    observaciones.trim(),

  estado: "PENDIENTE",
};

      const {
        data: ofertaCreada,
        error: errorOferta,
      } = await supabase
        .from("ofertas_negociacion")
        .insert(oferta)
        .select()
        .single();

      if (errorOferta) {
        console.error(
          "Error registrando oferta:",
          errorOferta
        );

        /**
         * Si la oferta falla,
         * eliminamos la operación recién creada.
         */
        await supabase
          .from("operaciones")
          .delete()
          .eq(
            "id",
            operacion.id
          );

        setError(
          `No se pudo enviar la oferta: ${errorOferta.message}`
        );

        return;
      }

      console.log(
        "Oferta creada correctamente:",
        ofertaCreada
      );

      console.log(
        "Operación creada:",
        operacion
      );

      setEnviado(true);
      setMostrarFormulario(false);
    } catch (e) {
      console.error(e);

      setError(
        e instanceof Error
          ? e.message
          : "Ocurrió un error al enviar la oferta."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Badge>
          {publicacion.tipo}
        </Badge>

        <div
          style={{
            fontSize: 28,
          }}
        >
          ⭐
        </div>
      </div>

      <h2
        style={{
          marginTop: 15,
          marginBottom: 5,
          fontSize: 34,
        }}
      >
        🌽{" "}
        {publicacion.productos
          ?.nombre ??
          "Producto"}
      </h2>

      <p
        style={{
          color: "#666",
          marginBottom: 30,
        }}
      >
        {publicacion.empresas
          ?.razon_social ??
          "Empresa"}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 30,
        }}
      >
        <div>
          <p
            style={{
              color: "#666",
            }}
          >
            Cantidad publicada
          </p>

          <h3>
            {publicacion.cantidad_tn} TN
          </h3>

          <br />

          <p
            style={{
              color: "#666",
            }}
          >
            Provincia
          </p>

          <h3>
            {publicacion.provincia}
          </h3>
        </div>

        <div>
          <p
            style={{
              color: "#666",
            }}
          >
            Precio publicado
          </p>

          <h3>
            USD{" "}
            {publicacion.precio_tn}
          </h3>

          <br />

          <p
            style={{
              color: "#666",
            }}
          >
            Puerto
          </p>

          <h3>
            {publicacion.puerto}
          </h3>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 20,
            background: "#fee2e2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {enviado && (
        <div
          style={{
            marginTop: 20,
            background: "#dcfce7",
            color: "#166534",
            padding: 12,
            borderRadius: 8,
          }}
        >
          ✅ Oferta enviada correctamente.
        </div>
      )}

      {mostrarFormulario && (
        <div
          style={{
            marginTop: 25,
            padding: 20,
            border: "1px solid #ddd",
            borderRadius: 10,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 20,
            }}
          >
            Hacer oferta
          </h3>

          <p
            style={{
              color: "#666",
              marginBottom: 20,
            }}
          >
            Publicación:
            {" "}
            {publicacion.cantidad_tn} TN a USD{" "}
            {publicacion.precio_tn}/TN
          </p>

          <div
            style={{
              display: "grid",
              gap: 15,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Cantidad ofertada (TN)
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={cantidadOferta}
                onChange={(e) =>
                  setCantidadOferta(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Precio ofertado por TN
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={precioOferta}
                onChange={(e) =>
                  setPrecioOferta(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Moneda
              </label>

              <select
                value={monedaOferta}
                onChange={(e) =>
                  setMonedaOferta(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  background: "white",
                }}
              >
                <option value="">
  Seleccionar moneda
</option>

<option value="2">
  USD - Dólares
</option>

<option value="1">
  ARS - Pesos argentinos
</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Observaciones / condiciones
              </label>

              <textarea
                value={observaciones}
                onChange={(e) =>
                  setObservaciones(
                    e.target.value
                  )
                }
                placeholder="Ej.: pago contado, condición de entrega, calidad, plazo, etc."
                rows={4}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 12,
              background: "#f5f5f5",
              borderRadius: 8,
            }}
          >
            <strong>
              Importe estimado de la oferta:
            </strong>

            <div
              style={{
                marginTop: 5,
                fontSize: 20,
              }}
            >
              {monedaOferta || "—"}{" "}
              {Number.isFinite(
                Number(cantidadOferta) *
                  Number(precioOferta)
              )
                ? (
                    Number(cantidadOferta) *
                    Number(precioOferta)
                  ).toLocaleString(
                    "es-AR",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )
                : "0,00"}
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="secondary"
              onClick={() => {
                setMostrarFormulario(false);
                setError("");
              }}
            >
              Cancelar
            </Button>

            <Button
              onClick={enviarOferta}
            >
              {enviando
                ? "Enviando..."
                : "Enviar oferta"}
            </Button>
          </div>
        </div>
      )}

      {!mostrarFormulario && (
        <div
          style={{
            marginTop: 30,
            display: "flex",
            gap: 15,
          }}
        >
          <Button>
            Ver publicación
          </Button>

          <Button
            variant="secondary"
            onClick={mostrarInteres}
          >
            {enviado
              ? "Oferta enviada"
              : "Hacer oferta"}
          </Button>
        </div>
      )}
    </Card>
  );
}