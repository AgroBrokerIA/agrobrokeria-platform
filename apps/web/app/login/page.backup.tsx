"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function iniciarSesion() {
    setError("");

    if (!email || !password) {
      setError(
        "Ingresá tu correo electrónico y contraseña."
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        console.error(
          "Error de inicio de sesión:",
          error
        );

        setError(error.message);
        return;
      }

      if (!data.session || !data.user) {
        setError(
          "No se pudo crear la sesión."
        );
        return;
      }

      console.log(
        "Usuario autenticado:",
        data.user.id
      );

      console.log(
        "Sesión creada correctamente."
      );

      /*
       * Verificamos que Supabase pueda
       * recuperar la sesión recién creada.
       */

      const {
        data: sessionData,
      } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setError(
          "La sesión no pudo guardarse correctamente."
        );
        return;
      }

      /*
       * Todo correcto.
       * Vamos al Marketplace.
       */

      router.push("/marketplace");

      router.refresh();
    } catch (e) {
      console.error(e);

      setError(
        "Ocurrió un error al iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "white",
          padding: 30,
          borderRadius: 12,
          boxShadow:
            "0 5px 20px rgba(0,0,0,.08)",
        }}
      >
        <h1
          style={{
            fontSize: 32,
            marginBottom: 10,
          }}
        >
          🔐 Iniciar sesión
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: 25,
          }}
        >
          Ingresá a tu cuenta de AgroBroker IA.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 15,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
              }}
            >
              Correo electrónico
            </label>

            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #ccc",
                borderRadius: 8,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
              }}
            >
              Contraseña
            </label>

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  iniciarSesion();
                }
              }}
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #ccc",
                borderRadius: 8,
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: 12,
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={iniciarSesion}
            disabled={loading}
            style={{
              background: loading
                ? "#86efac"
                : "#16a34a",
              color: "white",
              border: 0,
              padding: "13px 20px",
              borderRadius: 8,
              fontWeight: 600,
              cursor: loading
                ? "not-allowed"
                : "pointer",
              fontSize: 16,
            }}
          >
            {loading
              ? "Ingresando..."
              : "Ingresar"}
          </button>
        </div>
      </div>
    </main>
  );
}