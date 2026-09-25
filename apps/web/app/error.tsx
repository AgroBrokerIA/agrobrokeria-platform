"use client";

import { useEffect } from "react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("AgroBrokerIA UI error", error); }, [error]);
  return <main className="app-error-page"><section className="app-error-card"><span className="eyebrow">AGROBROKER IA</span><h1>Ocurrió un inconveniente</h1><p>La operación no se perdió. Podés intentar cargar esta pantalla nuevamente.</p><button onClick={() => reset()}>Reintentar</button><a href="/dashboard">Volver al inicio</a></section></main>;
}
