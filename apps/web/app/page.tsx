"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "./landing.module.css";

type Quote = { name:string; price:string; detail:string; icon:string };
type Stats = { quotes:number; publications:number; commodities:number; updated:string; source:string };

const fallback:Quote[] = [
  {name:"Soja",price:"ARS 552.500 / TN",detail:"01/10/2026 · BCR Rosario",icon:"🫛"},
  {name:"Maíz",price:"ARS 287.900 / TN",detail:"01/10/2026 · BCR Rosario",icon:"🌽"},
  {name:"Trigo",price:"ARS 333.000 / TN",detail:"01/10/2026 · BCR Rosario",icon:"🌾"},
  {name:"Sorgo",price:"ARS 295.523 / TN",detail:"01/10/2026 · BCR Rosario",icon:"🌾"},
];

const fmt=(v:number)=>v.toLocaleString("es-AR");

export default function Home(){
 const [quotes,setQuotes]=useState<Quote[]>(fallback);
 const [stats,setStats]=useState<Stats>({quotes:4,publications:0,commodities:4,updated:"01/10/2026",source:"BCR Rosario"});
 const [publicCounts,setPublicCounts]=useState({offers:0,demands:0,companies:0});

 useEffect(()=>{
   let mounted=true;
   (async()=>{
     const { data: market, error: marketError } = await supabase
       .from("market_quotes")
       .select("commodity_id,price,currency,market_date,source,variation")
       .eq("market","ROSARIO")
       .eq("price_type","PIZARRA_CAC")
       .eq("status","ACTIVE")
       .not("price","is",null)
       .order("market_date",{ascending:false})
       .order("created_at",{ascending:false})
       .limit(40);
     if(!mounted)return;
     if(marketError) return;
     const icons:Record<string,string>={Soja:"🫛","Maíz":"🌽",Trigo:"🌾",Sorgo:"🌾"};
     const names:Record<string,string>={"290206c3-0400-47e2-bfcd-16d6b93b6fde":"Soja","d119de42-8ddc-43cf-a307-c540d3bb6d34":"Maíz","fd74acb3-0c2c-43e4-861c-538539cb9c71":"Trigo","61f4942b-260f-4f94-86b3-5c8858dc8231":"Sorgo"};
     const seen=new Set<string>(); const rows=(market||[]).filter((x:any)=>{const n=names[x.commodity_id];if(!n||seen.has(n))return false;seen.add(n);return true;});
     if(rows.length){
       setQuotes(rows.slice(0,4).map((x:any)=>{const name=names[x.commodity_id];return {
         name, price:(x.currency||"ARS")+" "+Number(x.price).toLocaleString("es-AR",{minimumFractionDigits:0,maximumFractionDigits:2})+" / TN",
         detail:new Date(x.market_date+"T12:00:00").toLocaleDateString("es-AR")+" · "+(x.source||"BCR/CAC"),
         icon:icons[name]||"🌾"
       }}));
       const latest=rows.map((x:any)=>x.market_date).sort().at(-1);
       setStats({quotes:rows.length,publications:0,commodities:rows.length,updated:latest?new Date(latest+"T12:00:00").toLocaleDateString("es-AR"):"—",source:"BCR Rosario"});
     }
     const [{count:companiesCount},{data:publications}] = await Promise.all([
       supabase.from("companies").select("id",{count:"exact",head:true}),
       supabase.from("publicaciones").select("tipo,estado").in("estado",["PUBLICADA","ACTIVA","ABIERTA"])
     ]);
     if(mounted) setPublicCounts({
       offers:(publications||[]).filter((x:any)=>String(x.tipo||"").toUpperCase().includes("OFERTA")||String(x.tipo||"").toUpperCase().includes("VENTA")).length,
       demands:(publications||[]).filter((x:any)=>String(x.tipo||"").toUpperCase().includes("DEMANDA")||String(x.tipo||"").toUpperCase().includes("COMPRA")).length,
       companies:Number(companiesCount||0)
     });
   })();
   return()=>{mounted=false};
 },[]);

 const cards=[
  ["🛒","Comprar granos","Accedé a ofertas verificadas de productores y acopios.","/marketplace"],
  ["🏷","Vender granos","Publicá tus ofertas y llegá a compradores globales.","/nueva-publicacion"],
  ["◎","Mercado internacional","Conectá con empresas de todo el mundo.","/marketplace"],
  ["▤","Contratos y documentación","Generá, firmá y gestioná toda la documentación en un solo lugar.","/contratos"],
  ["🚚","Logística integrada","Coordiná transporte, cartas de porte y entrega.","/logistica"],
  ["✦","Oportunidades con IA","La Inteligencia Artificial encuentra las mejores oportunidades para vos.","/oportunidades"]
 ];
 const statItems=[
  ["▦",fmt(stats.quotes),"Cotizaciones del mercado"],
  ["🤝",fmt(stats.publications),"Publicaciones activas"],
  ["◎",fmt(stats.commodities),"Productos disponibles"],
  ["▣",stats.updated,"Actualización"],
  ["✓",stats.source,"Fuente de mercado"]
 ];

 return <main className={styles.landing}>
  <nav className={styles.nav}>
   <Link href="/" className={styles.brand}><i className={styles.logo}/><span><b className={styles.brandName}>AgroBroker<em>IA</em></b><small className={styles.tagline}>Conectando el mundo agro</small></span></Link>
   <div className={styles.navLinks}>
    <Link href="#inicio">Inicio</Link><Link href="#mercado">Mercado</Link><Link href="#ofertas">Ofertas</Link><Link href="#demandas">Demandas</Link><Link href="#empresas">Empresas</Link><Link href="#precios">Precios</Link><Link href="#ia-matching">IA Matching</Link><Link href="#recursos">Recursos⌄</Link>
   </div>
   <div className={styles.navRight}><Link href="/configuracion?tab=idioma" className={styles.language}>◎ ES⌄</Link><Link href="/login" className={styles.login}>Iniciar sesión</Link><Link href="/register" className={styles.register}>Crear cuenta</Link></div>
  </nav>

  <section className={styles.hero}>
   <div className={styles.heroCopy}>
    <h1 className={styles.heroTitle}><span>AgroBroker<em>IA</em></span><span>Conectando el mundo agro</span></h1>
    <p>La plataforma global para comprar, vender y negociar granos de forma segura, inteligente y sin fronteras.</p>
    <ul className={styles.checks}>
      <li><i className={styles.check}>✓</i>Empresas verificadas</li><li><i className={styles.check}>✓</i>Precios de mercado conectados</li>
      <li><i className={styles.check}>✓</i>Negociaciones seguras</li><li><i className={styles.check}>▣</i>Documentación integrada</li>
      <li><i className={styles.check}>✓</i>Soporte en múltiples idiomas</li><li><i className={styles.check}>✦</i>Inteligencia Artificial para oportunidades</li>
    </ul>
    <div className={styles.heroActions}><Link href="/register" className={styles.primary}>Crear cuenta gratis&nbsp; →</Link><Link href="#mercado" className={styles.secondary}>Conocer más&nbsp; ▶</Link></div>
   </div>
   <aside className={styles.quote}>
    <div className={styles.quoteHead}><strong>Cotizaciones del día</strong><a href="https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-1" target="_blank" rel="noreferrer">BCR - Rosario&nbsp; →</a></div>
    <div className={styles.quoteRows}>{quotes.map(q=><div className={styles.quoteRow} key={q.name}><span className={styles.qIcon}>{q.icon}</span><strong>{q.name}</strong><span className={styles.quotePrice}>{q.price}</span><span className={q.detail.startsWith("▼")?styles.down:styles.up}>{q.detail}</span></div>)}</div>
    <Link href="#precios" className={styles.quoteButton}>▥ &nbsp; Ver precios y pizarra &nbsp; →</Link>
   </aside>
   <div className={styles.marketStrip}>{statItems.map(([icon,title,label])=><div className={styles.stat} key={label}><i className={styles.statIcon}>{icon}</i><div><strong>{title}</strong><small>{label}</small></div></div>)}</div>
  </section>

  <section id="inicio" className={styles.cardsSection}><div className={styles.sectionIntro}><span>ASÍ FUNCIONA AGROBROKERIA</span><h2>Todo el ecosistema agro en un solo lugar</h2><p>La información pública se puede consultar sin registrarse. Para publicar, negociar, contactar, cerrar operaciones o acceder a datos privados es necesario crear una cuenta.</p></div><div className={styles.cardsGrid}>{cards.map(([icon,title,desc])=><div className={styles.card} key={title}><div className={styles.cardImage}><span className={styles.cardIcon}>{icon}</span></div><div className={styles.cardBody}><h3>{title}</h3><p>{desc}</p><span className={styles.cardArrow}>→</span></div></div>)}</div></section>

  <section id="mercado" className={styles.publicSection}>
   <div className={styles.sectionTitle}><span>VISTA PÚBLICA</span><h2>Mercado</h2><p>Consultá el movimiento del mercado sin registrarte. La información operativa se habilita únicamente para usuarios registrados.</p></div>
   <div className={styles.publicGrid}>
    <article className={styles.publicPanel}><div className={styles.panelTop}><h3>Cotizaciones del día</h3><span>Fuente: BCR Rosario</span></div><div className={styles.quoteMini}>{quotes.map(q=><div key={q.name}><b>{q.name}</b><strong>{q.price}</strong><small>{q.detail}</small></div>)}</div><a href="https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-0" target="_blank" rel="noreferrer" className={styles.textLink}>Consultar fuente oficial BCR →</a></article>
    <article className={styles.publicPanel}><div className={styles.panelTop}><h3>Qué se puede hacer al registrarse</h3><span>Operación protegida</span></div><ul className={styles.featureList}><li>Publicar ofertas y demandas</li><li>Comparar referencias y condiciones</li><li>Negociar y recibir contraofertas</li><li>Generar acuerdos y contratos</li><li>Coordinar documentación y logística</li></ul><Link href="/register" className={styles.panelCta}>Registrarme para operar →</Link></article>
   </div>
  </section>
  <section id="ofertas" className={styles.publicSection alt}>
   <div className={styles.sectionTitle}><span>OFERTAS</span><h2>Lo que se ofrece en el sistema</h2><p>Las publicaciones públicas se muestran como referencia. Hoy no hay ofertas activas públicas registradas.</p></div>
   <div className={styles.publicEmpty}><strong>{publicCounts.offers}</strong><span>ofertas activas públicas</span><small>Cuando existan publicaciones activas, aparecerán aquí con producto, volumen, ubicación y condiciones. La negociación requiere registro.</small><Link href="/register" className={styles.panelCta}>Publicar o recibir ofertas →</Link></div>
  </section>
  <section id="demandas" className={styles.publicSection}>
   <div className={styles.sectionTitle}><span>DEMANDAS</span><h2>Lo que están buscando los compradores</h2><p>La vista pública muestra únicamente demandas realmente activas del sistema, sin datos privados de las empresas.</p></div>
   <div className={styles.publicEmpty}><strong>{publicCounts.demands}</strong><span>demandas activas públicas</span><small>Las demandas reales aparecerán aquí cuando estén publicadas. El contacto y la negociación se habilitan después del registro.</small><Link href="/register" className={styles.panelCta}>Quiero encontrar oportunidades →</Link></div>
  </section>
  <section id="empresas" className={styles.publicSection alt}>
   <div className={styles.sectionTitle}><span>EMPRESAS</span><h2>Una red de empresas verificables</h2><p>Productores, acopios, compradores, traders, intermediarios, corredores, transportistas y prestadores pueden formar parte de la red.</p></div>
   <div className={styles.companyIntro}><div className={styles.companyNumber}><strong>{publicCounts.companies}</strong><span>empresa registrada actualmente</span></div><div><h3>Verificación antes de confiar</h3><p>AgroBrokerIA permite consultar la existencia y estado de los participantes registrados y centraliza procesos de verificación, documentación, cumplimiento y trazabilidad.</p><Link href="/register" className={styles.panelCta}>Crear cuenta y verificar empresas →</Link></div></div>
  </section>
  <section id="precios" className={styles.publicSection}>
   <div className={styles.sectionTitle}><span>PRECIOS</span><h2>Cotizaciones reales, no precios inventados</h2><p>Las referencias de granos se conectan con fuentes de mercado. La última referencia pública disponible de Rosario se identifica con fecha y fuente.</p></div>
   <div className={styles.priceBoard}>{quotes.map(q=><div key={q.name}><span>{q.icon}</span><b>{q.name}</b><strong>{q.price}</strong><small>{q.detail}</small></div>)}</div>
   <div className={styles.sourceNote}>Fuente oficial: Bolsa de Comercio de Rosario / Cámara Arbitral de Cereales. La cotización local publicada para 01/10/2026 informa Soja $552.500, Maíz $287.900, Trigo $333.000 y Sorgo $295.523 por tonelada. <a href="https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-0" target="_blank" rel="noreferrer">Ver BCR →</a></div>
  </section>
  <section id="ia-matching" className={styles.publicSection alt}>
   <div className={styles.sectionTitle}><span>IA MATCHING</span><h2>La IA encuentra coincidencias que de otra forma llevarían horas</h2><p>El motor relaciona producto, cantidad, calidad, ubicación, precio, modalidad, fechas y preferencias para detectar oportunidades compatibles.</p></div>
   <div className={styles.aiGrid}><article><b>01</b><h3>Entiende lo que buscás</h3><p>Analiza ofertas, demandas y condiciones comerciales en lugar de limitarse a palabras clave.</p></article><article><b>02</b><h3>Encuentra coincidencias</h3><p>Prioriza oportunidades compatibles y ayuda a reducir búsquedas, mensajes y tiempo perdido.</p></article><article><b>03</b><h3>Favorece a todos</h3><p>El productor encuentra compradores, el comprador encuentra mercadería y los intermediarios pueden detectar negocios con mejor contexto.</p></article><article><b>04</b><h3>La decisión sigue siendo humana</h3><p>La IA recomienda; la negociación, aceptación y contratación quedan bajo control de los participantes.</p></article></div>
  </section>
  <section id="recursos" className={styles.publicSection}>
   <div className={styles.sectionTitle}><span>RECURSOS</span><h2>Todo lo que AgroBrokerIA pone a disposición</h2><p>Una infraestructura pensada para acompañar el negocio desde la oportunidad hasta la liquidación.</p></div>
   <div className={styles.resourcesGrid}>{[
    ["Mercado y Pizarra","Cotizaciones, referencias internacionales, históricos y seguimiento de mercado."],
    ["Ofertas y Demandas","Publicación y búsqueda estructurada de mercadería y necesidades reales."],
    ["IA Matching","Cruce inteligente de oportunidades, preferencias y condiciones."],
    ["Empresas y Verificación","Identidad empresarial, KYC, cumplimiento y trazabilidad."],
    ["Negociación","Ofertas, contraofertas, aceptación y registro de cada etapa."],
    ["Contratos","Modelos F1/F2, condiciones comerciales, documentos y evidencia firmada."],
    ["Documentación","Gestión centralizada de archivos, versiones, evidencias y estados."],
    ["Logística","Transporte, entregas, cartas de porte y coordinación operativa."],
    ["Facturación y ARCA","Preparación y conexión con los procesos fiscales cuando las credenciales estén habilitadas."],
    ["Pagos y cuentas","Medios de cobro, cuentas, transacciones, liquidaciones y trazabilidad financiera."],
    ["Comisiones","Cálculo y seguimiento de comisiones de AgroBrokerIA e intermediarios."],
    ["Reportes y auditoría","Historial, trazabilidad, controles y reportes para tomar decisiones."],
    ["Multidioma y global","Países, provincias, ciudades y operación internacional."],
    ["Seguridad","RLS, controles de acceso, auditoría y protección de información sensible."]
   ].map(([t,d])=><article key={t}><h3>{t}</h3><p>{d}</p></article>)}</div>
   <div className={styles.registerBanner}><div><strong>La información pública te muestra cómo funciona.</strong><span>El registro abre la parte operativa: publicar, negociar, verificar, contratar y cerrar negocios.</span></div><Link href="/register">Crear cuenta gratis →</Link></div>
  </section>
  <footer className={styles.footer}><div><strong>AgroBrokerIA</strong><span>Mercado · IA · Negociación · Operaciones · Finanzas</span></div><Link href="/register">Crear cuenta →</Link></footer>
 </main>
}
