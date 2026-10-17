import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AgroBrokerIA",
    short_name: "AgroBrokerIA",
    description: "Plataforma inteligente de comercialización de commodities agrícolas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f8f5",
    theme_color: "#173f2b",
    lang: "es-AR",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/icons/agrobrokeria.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/agrobrokeria.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
