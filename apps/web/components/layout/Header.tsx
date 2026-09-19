"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function Header() {
  const [usuario, setUsuario] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!activo) return;

      setUsuario(
        user?.user_metadata?.nombre ||
          user?.user_metadata?.full_name ||
          user?.email ||
          null
      );
    }

    cargarUsuario();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!activo) return;

      setUsuario(
        session?.user?.user_metadata?.nombre ||
          session?.user?.user_metadata?.full_name ||
          session?.user?.email ||
          null
      );
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header
      style={{
        height: "70px",
        background: "#0f172a",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 30px",
        borderBottom: "1px solid #1e293b",
      }}
    >
      <Link
        href="/"
        style={{
          color: "#22c55e",
          textDecoration: "none",
          fontSize: "24px",
          fontWeight: 700,
        }}
      >
        AgroBroker IA
      </Link>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
        }}
      >
        <Link
          href="/notificaciones"
          aria-label="Notificaciones"
          style={{ color: "white", textDecoration: "none", fontSize: "20px" }}
        >
          🔔
        </Link>

        <Link
          href="/mensajes"
          aria-label="Mensajes"
          style={{ color: "white", textDecoration: "none", fontSize: "20px" }}
        >
          💬
        </Link>

        {usuario ? (
          <>
            <span style={{ fontSize: "16px" }}>👤 {usuario}</span>
            <button
              type="button"
              onClick={cerrarSesion}
              style={{
                padding: "8px 12px",
                border: "1px solid #475569",
                borderRadius: "8px",
                background: "transparent",
                color: "white",
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              style={{
                color: "white",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              style={{
                color: "white",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Registrarse
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
