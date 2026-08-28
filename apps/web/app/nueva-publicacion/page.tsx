"use client";

import NuevaPublicacionForm from "@/components/publicaciones/NuevaPublicacionForm";

export default function NuevaPublicacionPage() {
  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <NuevaPublicacionForm />
    </main>
  );
}