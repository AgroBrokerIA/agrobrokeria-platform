"use client";

import Link from "next/link";

export default function ConfiguracionPage() {
  return (
    <main
      style={{
        padding: 24,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
          ⚙️ Configuración
        </h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Administrá la configuración de tu cuenta y de tu operación comercial.
        </p>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: 16,
        }}
      >
        <Link
          href="/medios-cobro"
          style={{
            textDecoration: "none",
            color: "#0f172a",
            padding: 20,
            borderRadius: 14,
            background: "#fff",
            border: "1px solid #e2e8f0",
            display: "block",
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 10 }}>🏦</div>
          <h2 style={{ margin: "0 0 8px" }}>Medios de cobro</h2>
          <p style={{ margin: 0, color: "#64748b" }}>
            Configurá cuentas bancarias o medios financieros para recibir tus
            comisiones.
          </p>
        </Link>

        <Link
          href="/empresas"
          style={{
            textDecoration: "none",
            color: "#0f172a",
            padding: 20,
            borderRadius: 14,
            background: "#fff",
            border: "1px solid #e2e8f0",
            display: "block",
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 10 }}>🏢</div>
          <h2 style={{ margin: "0 0 8px" }}>Empresas</h2>
          <p style={{ margin: 0, color: "#64748b" }}>
            Consultá y administrá las empresas vinculadas a tu cuenta.
          </p>
        </Link>
      </section>
    </main>
  );
}
