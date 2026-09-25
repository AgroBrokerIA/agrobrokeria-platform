import Link from "next/link";

export default function NotFound() {
  return <main className="app-error-page"><section className="app-error-card"><span className="eyebrow">AGROBROKER IA</span><h1>Página no encontrada</h1><p>La ruta solicitada no existe o ya no está disponible.</p><Link href="/dashboard">Volver al inicio</Link></section></main>;
}
