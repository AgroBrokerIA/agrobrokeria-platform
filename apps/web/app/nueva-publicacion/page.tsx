"use client";

import NuevaPublicacionForm from "@/components/publicaciones/NuevaPublicacionForm";

export default function NuevaPublicacionPage() {
  return (
    <main className="module-page publication-page">
      <div className="module-hero">
        <div>
          <span className="eyebrow">MERCADO</span>
          <h1>Nueva publicación</h1>
          <p>Publicá una oferta de compra o venta y activá la inteligencia comercial de AgroBroker IA.</p>
        </div>
        <div className="module-pill">Mercado · IA activa</div>
      </div>
      <section className="publication-form-shell">
        <NuevaPublicacionForm />
      </section>
    </main>
  );
}
