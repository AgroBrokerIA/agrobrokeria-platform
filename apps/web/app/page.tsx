"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const defaultCommodities = [
  { name: "Soja", price: "Sin cotización", change: "", tone: "", icon: "🌱" },
  { name: "Maíz", price: "Sin cotización", change: "", tone: "", icon: "🌽" },
  { name: "Trigo", price: "Sin cotización", change: "", tone: "", icon: "🌾" },
  { name: "Girasol", price: "Sin cotización", change: "", tone: "", icon: "🌻" },
];

export default function Home() {
  const [commodities, setCommodities] = useState(defaultCommodities);
  useEffect(() => {
    supabase.from("market_public_summary").select("commodity,precio_promedio,moneda,publicaciones").order("publicaciones",{ascending:false}).limit(4).then(({ data }) => {
      if (!data?.length) return;
      const icons: Record<string,string> = { Soja:"🌱", Maíz:"🌽", Trigo:"🌾", Girasol:"🌻" };
      setCommodities(data.map((x:any) => ({
        name: x.commodity,
        price: `${x.moneda || "USD"} ${Number(x.precio_promedio).toLocaleString("es-AR")} /tn`,
        change: `${x.publicaciones} publicaciones`,
        tone: "",
        icon: icons[x.commodity] || "🌾"
      })));
    });
  }, []);
  return (
    <main className="public-home">
      <nav className="public-nav">
        <Link href="/" className="public-brand">
          <span className="public-brand-mark">↗</span>
          <span><strong>AgroBroker IA</strong><small>CONECTANDO EL AGRO AL MUNDO</small></span>
        </Link>
        <div className="public-nav-links">
          <a href="#inicio">Inicio</a><a href="#como-funciona">Cómo funciona</a><a href="#commodities">Commodities</a><a href="#nosotros">Nosotros</a>
        </div>
        <div className="public-nav-actions">
          <Link href="/login" className="public-login">Ingresar</Link>
          <Link href="/register" className="public-register">Registrarse</Link>
        </div>
      </nav>

      <section id="inicio" className="public-hero">
        <div className="hero-backdrop" />
        <div className="hero-copy">
          <span className="hero-kicker">PLATAFORMA AGROCOMERCIAL INTELIGENTE</span>
          <h1>Negocios agropecuarios<br />más simples, seguros<br />y <em>rentables</em></h1>
          <p>Conectamos productores, acopios, cooperativas e intermediarios con compradores nacionales e internacionales.</p>
          <ul>
            <li><span>⌁</span> Publicá ofertas y demandas</li><li><span>◈</span> Negociá en tiempo real</li><li><span>✓</span> Verificá empresas</li><li><span>▣</span> Gestioná contratos y comisiones</li>
          </ul>
          <div className="hero-actions"><Link href="/register" className="hero-primary">Comenzar ahora</Link><a href="#como-funciona" className="hero-secondary">Ver cómo funciona</a></div>
        </div>
        <div className="hero-field" aria-hidden="true">
          <div className="field-sky" /><div className="field-sun" /><div className="field-horizon" />
          <div className="field-silo silo-one" /><div className="field-silo silo-two" /><div className="field-silo silo-three" />
          <div className="grain-stream" /><div className="grain-bed" /><div className="field-lines" />
        </div>
        <div className="hero-market-strip" id="commodities">
          {commodities.map((item) => <div key={item.name} className="hero-commodity"><span className="commodity-image">{item.icon}</span><div><strong>{item.name}</strong><small>{item.price}</small><span className={item.tone}>{item.change} ↗</span></div></div>)}
        </div>
      </section>

      <section id="como-funciona" className="public-features">
        <div><span className="hero-kicker">UN SOLO ECOSISTEMA</span><h2>Del primer contacto a la operación cerrada.</h2></div>
        <div className="feature-grid">
          <article><b>01</b><h3>Mercado</h3><p>Publicaciones de compra y venta, filtros y oportunidades activas.</p></article>
          <article><b>02</b><h3>Inteligencia IA</h3><p>Smart Match y detección de oportunidades comerciales.</p></article>
          <article><b>03</b><h3>Negociación</h3><p>Ofertas, contraofertas y conversaciones vinculadas al negocio.</p></article>
          <article><b>04</b><h3>Operación</h3><p>Acuerdo, contrato, firmas, fondos, logística y liquidación.</p></article>
        </div>
      </section>

      <section id="nosotros" className="public-footer"><div><strong>AgroBroker IA</strong><span>Mercado · IA · Negociación · Operaciones · Finanzas</span></div><Link href="/register">Crear cuenta →</Link></section>
    </main>
  );
}
