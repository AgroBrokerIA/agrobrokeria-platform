// i18n sidebar pending
"use client";

import Link from "next/link";

const menu = [
  { nombre: "🏠 Dashboard", ruta: "/dashboard" },
  { nombre: "📊 Mercado", ruta: "/mercado" },
  { nombre: "🏷️ Marketplace", ruta: "/marketplace" },
  { nombre: "➕ Nueva publicación", ruta: "/nueva-publicacion" },
  { nombre: "📋 Mis publicaciones", ruta: "/mis-publicaciones" },
  { nombre: "📈 Pizarra", ruta: "/pizarra" },
  { nombre: "🤖 Oportunidades IA", ruta: "/oportunidades" },
  { nombre: "🔎 Buscar", ruta: "/buscar" },
  { nombre: "📨 Ofertas recibidas", ruta: "/ofertas-recibidas" },
  { nombre: "💬 Mensajes", ruta: "/mensajes" },
  { nombre: "🔔 Notificaciones", ruta: "/notificaciones" },
  { nombre: "📹 Videollamadas", ruta: "/videollamadas" },
  { nombre: "📄 Operaciones", ruta: "/operaciones" },
  { nombre: "📝 Contratos", ruta: "/contratos" },
  { nombre: "💰 Facturación", ruta: "/facturas" },
  { nombre: "💳 Pagos", ruta: "/pagos" },
  { nombre: "🏦 Cuentas bancarias", ruta: "/cuentas-bancarias" },
  { nombre: "💵 Medios de cobro", ruta: "/medios-cobro" },
  { nombre: "📁 Documentación", ruta: "/documentos" },
  { nombre: "🚢 Logística", ruta: "/logistica" },
  { nombre: "💼 Comisiones", ruta: "/comisiones" },
  { nombre: "↗️ Retiros de comisiones", ruta: "/retiros-comisiones" },
  { nombre: "🏢 Empresas", ruta: "/empresas" },
  { nombre: "🔐 Verificaciones", ruta: "/verificaciones" },
  { nombre: "🛡️ Seguridad", ruta: "/seguridad" },
  { nombre: "📊 Reportes", ruta: "/reportes" },
  { nombre: "👤 Perfil", ruta: "/perfil" },
  { nombre: "⚙️ Administración", ruta: "/administracion" },
];

export default function Sidebar() {
  return (
    <aside style={{width:260,background:"#111827",color:"white",minHeight:"100vh",padding:20,overflowY:"auto"}}>
      <h2 style={{marginBottom:30,color:"#22c55e"}}>AgroBroker IA</h2>
      {menu.map((item)=><Link key={item.ruta} href={item.ruta} style={{display:"block",color:"white",textDecoration:"none",padding:"10px 0"}}>{item.nombre}</Link>)}
    </aside>
  );
}
