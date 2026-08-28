"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        background: "#0f172a",
        color: "white",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "900px",
          padding: "20px",
        }}
      >
        <h1
          style={{
            color: "#22c55e",
            fontSize: "60px",
            marginBottom: "20px",
          }}
        >
          AgroBroker IA
        </h1>

        <h2 style={{ marginBottom: "25px" }}>
          Plataforma Inteligente de Comercialización de Granos
        </h2>

        <p
          style={{
            fontSize: "22px",
            lineHeight: "1.8",
          }}
        >
          Bienvenido a AgroBroker IA. Una plataforma que conecta compradores y
          vendedores mediante inteligencia artificial para operar maíz, soja,
          trigo, cebada, harina de soja y otros commodities agrícolas.
        </p>

        <div
          style={{
            marginTop: "50px",
            display: "flex",
            justifyContent: "center",
            gap: "20px",
          }}
        >
          <Link href="/login">
            <button
              style={{
                padding: "15px 30px",
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              Iniciar sesión
            </button>
          </Link>

          <button
            style={{
              padding: "15px 30px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            Registrarse
          </button>
        </div>
      </div>
    </main>
  );
}