"use client";

import Link from "next/link";

const cards = [
  { href: "/medios-cobro", icon: "🏦", title: "Medios de cobro", text: "Configurá cuentas bancarias o medios financieros para recibir tus comisiones." },
  { href: "/empresas", icon: "🏢", title: "Empresas", text: "Consultá y administrá las empresas vinculadas a tu cuenta." },
];

export default function ConfiguracionPage() {
  return (
    <main className="module-page">
      <div className="module-hero">
        <div>
          <span className="eyebrow">CUENTA</span>
          <h1>Configuración</h1>
          <p>Administrá la configuración de tu cuenta y de tu operación comercial.</p>
        </div>
        <div className="module-pill">Cuenta y operación</div>
      </div>
      <section className="settings-grid">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="settings-card">
            <div className="settings-icon">{card.icon}</div>
            <div><h2>{card.title}</h2><p>{card.text}</p></div>
            <span className="settings-arrow">→</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
