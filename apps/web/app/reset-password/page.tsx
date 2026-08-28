"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function verificarSesion() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setError(
          "El enlace de recuperación no es válido o ya venció."
        );
      }

      setChecking(false);
    }

    verificarSesion();
  }, []);

  async function cambiarPassword() {
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("Error al cambiar contraseña:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Contraseña actualizada correctamente. Ya podés ingresar a AgroBroker IA."
    );

    setLoading(false);

    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Verificando enlace de recuperación...
      </main>
    );
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
          boxShadow: "0 5px 20px rgba(0,0,0,.08)",
        }}
      >
        <h1
          style={{
            fontSize: 28,
            marginBottom: 10,
          }}
        >
          🔐 Nueva contraseña
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: 25,
          }}
        >
          Elegí una nueva contraseña para tu cuenta de AgroBroker IA.
        </p>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: 12,
              borderRadius: 8,
              marginBottom: 15,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: 12,
              borderRadius: 8,
              marginBottom: 15,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 15,
          }}
        >
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 8,
              boxSizing: "border-box",
            }}
          />

          <input
            type="password"
            placeholder="Repetir contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 8,
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={cambiarPassword}
            disabled={loading}
            style={{
              padding: 12,
              border: "none",
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
              background: "#111827",
              color: "white",
              fontWeight: 600,
            }}
          >
            {loading
              ? "Actualizando..."
              : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </main>
  );
}
