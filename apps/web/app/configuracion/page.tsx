"use client";
import Link from "next/link";
const cards=[
{href:"/idioma",icon:"🌐",title:"Idioma y traducción",text:"Idioma del usuario, preferencias de traducción y formato regional."},
{href:"/empresas",icon:"🏢",title:"Empresa",text:"Empresas vinculadas, usuarios y datos comerciales."},
{href:"/verificaciones",icon:"🛡️",title:"Verificaciones",text:"Estado, fuente y trazabilidad de comprobaciones oficiales."},
{href:"/videollamadas",icon:"🎥",title:"Videollamadas",text:"Reuniones comerciales vinculadas a operaciones."},
{href:"/mensajes",icon:"💬",title:"Mensajería comercial",text:"Canal restringido a comunicaciones de negocio."},
{href:"/documentos",icon:"📄",title:"Documentos",text:"Expedientes y documentos comerciales."},
{href:"/terminos",icon:"⚖️",title:"Legal",text:"Términos, privacidad y políticas por versión."},
{href:"/ayuda",icon:"❓",title:"Centro de ayuda",text:"Preguntas frecuentes y guías de uso."},
{href:"/medios-cobro",icon:"🏦",title:"Medios de cobro",text:"Cuentas y medios financieros para tus operaciones."}
];
export default function ConfiguracionPage(){return <main className="module-page"><div className="module-hero"><div><span className="eyebrow">CUENTA</span><h1>Configuración</h1><p>Centro de control de cuenta, empresa, comunicación, idioma, seguridad y legal.</p></div><div className="module-pill">Centro de control</div></div><section className="settings-grid">{cards.map(c=><Link key={c.href} href={c.href} className="settings-card"><div className="settings-icon">{c.icon}</div><div><h2>{c.title}</h2><p>{c.text}</p></div><span className="settings-arrow">→</span></Link>)}</section></main>}