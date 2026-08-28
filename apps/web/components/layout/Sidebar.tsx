import Link from "next/link";

export default function Sidebar() {
  const menu = [
    { nombre: "🏠 Dashboard", ruta: "/dashboard" },
    { nombre: "🌾 Marketplace", ruta: "/marketplace" },
    { nombre: "📢 Mis Publicaciones", ruta: "/mis-publicaciones" },
    { nombre: "🤝 Operaciones", ruta: "/operaciones" },
    { nombre: "💬 Mensajes", ruta: "/mensajes" },
    { nombre: "🏢 Empresas", ruta: "/empresas" },
    { nombre: "📄 Documentos", ruta: "/documentos" },
    { nombre: "⚙️ Configuración", ruta: "/configuracion" },
  ];

  return (
    <aside
      style={{
        width: "250px",
        background: "#1e293b",
        color: "white",
        padding: "20px",
        minHeight: "calc(100vh - 70px)",
      }}
    >
      <h3 style={{ marginBottom: "20px" }}>Menú</h3>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {menu.map((item) => (
          <Link
            key={item.ruta}
            href={item.ruta}
            style={{
              color: "white",
              textDecoration: "none",
              padding: "10px",
              borderRadius: "8px",
            }}
          >
            {item.nombre}
          </Link>
        ))}
      </nav>
    </aside>
  );
}