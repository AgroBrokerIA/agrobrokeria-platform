"use client";

import Link from "next/link";

const cards = [
  ["🚀","Preflight de lanzamiento","Verificación real de Core, ARCA e integraciones antes de publicar.","/administracion/preflight"],
  ["⚙️","Administración","Gestión administrativa y configuración operativa de la plataforma.","/admin"],
  ["🛡️","Seguridad","Revisar controles y estado de seguridad de la plataforma.","/seguridad"],
  ["📊","Reportes","Consultar indicadores, operaciones e información histórica.","/reportes"],
  ["🏢","Empresas","Gestionar empresas, relaciones y verificación de terceros.","/empresas"],
  ["🌐","Configuración","Idioma, preferencias y configuración general.","/configuracion"],
];

export default function AdministracionPage(){
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Administración de AgroBrokerIA</h1>
          <p className="mt-1 text-sm text-slate-600">Centro operativo para controlar el estado de la plataforma y acceder a sus módulos administrativos.</p>
        </div>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([icon,title,description,href]) => (
            <Link key={href} href={href} className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-2xl">{icon}</div>
              <h2 className="mt-3 text-base font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
              <span className="mt-4 inline-block text-sm font-medium text-slate-900">Ingresar →</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
