"use client";

import Link from "next/link";

const menu = [
  { nombre: "🏠 Dashboard", ruta: "/dashboard" },
  { nombre: "🌽 Marketplace", ruta: "/marketplace" },
  { nombre: "🤖 Inteligencia IA", ruta: "/ia" },
  { nombre: "🚢 Logística", ruta: "/logistica" },
  { nombre: "💬 Mensajes", ruta: "/mensajes" },
  { nombre: "📄 Operaciones", ruta: "/operaciones" },
  { nombre: "👤 Perfil", ruta: "/perfil" },
  { nombre: "⚙ Administración", ruta: "/administracion" },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 260,
        background: "#111827",
        color: "white",
        minHeight: "100vh",
        padding: 20,
      }}
    >
      <h2 style={{ marginBottom: 30, color: "#22c55e" }}>
        AgroBroker IA
      </h2>

      {menu.map((item) => (
        <Link
          key={item.ruta}
          href={item.ruta}
          style={{
            display: "block",
            color: "white",
            textDecoration: "none",
            padding: "12px 0",
          }}
        >
          {item.nombre}
        </Link>
      ))}
    </aside>
  );
}