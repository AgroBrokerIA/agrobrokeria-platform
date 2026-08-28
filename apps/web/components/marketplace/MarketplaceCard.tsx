"use client";

import { useState } from "react";

import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

import { supabase } from "@/lib/supabase/client";

type Props = {
  publicacion: any;
};

export default function MarketplaceCard({
  publicacion,
}: Props) {
  const [enviando, setEnviando] =
    useState(false);

  const [enviado, setEnviado] =
    useState(false);

  const [error, setError] =
    useState("");

  async function mostrarInteres() {
    setError("");

    const confirmar =
      window.confirm(
        `¿Querés manifestar interés en esta publicación de ${publicacion.productos?.nombre ?? "producto"}?`
      );

    if (!confirmar) {
      return;
    }

    try {
      setEnviando(true);

      /*
       * Por ahora obtenemos el usuario
       * autenticado.
       */

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          "Necesitás iniciar sesión para manifestar interés."
        );

        return;
      }

      /*
       * PRIMERA VERSIÓN:
       *
       * Intentamos registrar el interés
       * en la tabla intereses_publicacion.
       */

      const { error: errorInsertar } =
        await supabase
          .from(
            "intereses_publicacion"
          )
          .insert({
            publicacion_id:
              publicacion.id,

            usuario_id:
              user.id,

            empresa_id:
              publicacion.empresa_id,
          });

      if (errorInsertar) {
        console.error(
          "Error registrando interés:",
          errorInsertar
        );

        setError(
          `No se pudo registrar el interés: ${errorInsertar.message}`
        );

        return;
      }

      setEnviado(true);
    } catch (e) {
      console.error(e);

      setError(
        "Ocurrió un error al registrar el interés."
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
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
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
            Cantidad
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
            Precio
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
          ✅ Interés enviado correctamente.
        </div>
      )}

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
          {enviando
            ? "Enviando..."
            : enviado
            ? "Interés enviado"
            : "Me interesa"}
        </Button>
      </div>
    </Card>
  );
}