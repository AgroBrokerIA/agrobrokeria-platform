"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "./landing.module.css";

type Quote = { name:string; price:string; detail:string; icon:string };
type Stats = { quotes:number; publications:number; commodities:number; updated:string; source:string };

const fallback:Quote[] = [
  {name:"Soja",price:"Sin cotización",detail:"",icon:"🫛"},
  {name:"Maíz",price:"Sin cotización",detail:"",icon:"🌽"},
  {name:"Trigo",price:"Sin cotización",detail:"",icon:"🌾"},
  {name:"Girasol",price:"Sin cotización",detail:"",icon:"🌻"},
];

const fmt=(v:number)=>v.toLocaleString("es-AR");

export default function Home(){
 const [quotes,setQuotes]=useState<Quote[]>(fallback);
 const [stats,setStats]=useState<Stats>({quotes:0,publications:0,commodities:0,updated:"—",source:"BCR"});

 useEffect(()=>{
   let mounted=true;
   (async()=>{
     const { data: market, error: marketError } = await supabase
       .from("market_public_summary")
       .select("commodity,precio_promedio,moneda,publicaciones,actualizado_at")
       .order("publicaciones",{ascending:false})
       .limit(12);
     if(!mounted)return;
     if(marketError) return;
     const rows=(market||[]) as any[];
     if(rows.length){
       const icons:Record<string,string>={Soja:"🫛","Maíz":"🌽",Trigo:"🌾",Girasol:"🌻"};
       setQuotes(rows.slice(0,4).map((x:any)=>({
         name:x.commodity,
         price:x.precio_promedio==null?"Sin cotización":(x.moneda||"USD")+" "+Number(x.precio_promedio).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2}),
         detail:x.publicaciones?fmt(Number(x.publicaciones))+" publicaciones":"",
         icon:icons[x.commodity]||"🌾"
       })));
       const publicationCount=rows.reduce((sum,row)=>sum+Number(row.publicaciones||0),0);
       const latest=rows.map(row=>row.actualizado_at).filter(Boolean).sort().at(-1);
       setStats({
         quotes:rows.length,
         publications:publicationCount,
         commodities:new Set(rows.map(row=>row.commodity).filter(Boolean)).size,
         updated:latest?new Date(latest).toLocaleDateString("es-AR"):"—",
         source:"BCR",
       });
     }
   })();
   return()=>{mounted=false};
 },[]);

 const cards=[
  ["🛒","Comprar granos","Accedé a ofertas verificadas de productores y acopios.","/marketplace"],
  ["🏷","Vender granos","Publicá tus ofertas y llegá a compradores globales.","/nueva-publicacion"],
  ["◎","Mercado internacional","Conectá con empresas de todo el mundo.","/marketplace"],
  ["▤","Contratos y documentación","Generá, firmá y gestioná toda la documentación en un solo lugar.","/contratos"],
  ["🚚","Logística integrada","Coordiná transporte, cartas de porte y entrega.","/logistica"],
  ["✦","Oportunidades con IA","La Inteligencia Artificial encuentra oportunidades a partir de tus publicaciones y demandas.","/ia-matching"]
 ];
 const statItems=[
  ["📊",fmt(stats.quotes),"Cotizaciones públicas"],
  ["▤",fmt(stats.publications),"Publicaciones visibles"],
  ["🌾",fmt(stats.commodities),"Productos cotizados"],
  ["◷",stats.updated,"Última actualización"],
  ["✓",stats.source,"Fuente de mercado"]
 ];

 return <main className={styles.landing}>
  <nav className={styles.nav}>
   <Link href="/" className={styles.brand}><i className={styles.logo}/><span><b className={styles.brandName}>AgroBroker<em>IA</em></b><small className={styles.tagline}>Conectando el mundo agro</small></span></Link>
   <div className={styles.navLinks}>
    <Link href="/">Inicio</Link><Link href="/marketplace">Mercado</Link><Link href="/ofertas-recibidas">Ofertas</Link><Link href="/demandas">Demandas</Link><Link href="/empresas">Empresas</Link><Link href="/mercado">Precios</Link><Link href="/ia-matching">IA Matching</Link><Link href="/recursos">Recursos⌄</Link>
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
    <div className={styles.heroActions}><Link href="/register" className={styles.primary}>Crear cuenta gratis&nbsp; →</Link><Link href="/marketplace" className={styles.secondary}>Conocer más&nbsp; ▶</Link></div>
   </div>
   <aside className={styles.quote}>
    <div className={styles.quoteHead}><strong>Cotizaciones del día</strong><a href="https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-1" target="_blank" rel="noreferrer">BCR - Rosario&nbsp; →</a></div>
    <div className={styles.quoteRows}>{quotes.map(q=><div className={styles.quoteRow} key={q.name}><span className={styles.qIcon}>{q.icon}</span><strong>{q.name}</strong><span className={styles.quotePrice}>{q.price}</span><span className={styles.up}>{q.detail}</span></div>)}</div>
    <Link href="/pizarra" className={styles.quoteButton}>▥ &nbsp; Ver pizarra completa &nbsp; →</Link>
   </aside>
   <div className={styles.marketStrip}>{statItems.map(([icon,title,label])=><div className={styles.stat} key={label}><i className={styles.statIcon}>{icon}</i><div><strong>{title}</strong><small>{label}</small></div></div>)}</div>
  </section>

  <section className={styles.cardsSection}><div className={styles.cardsGrid}>{cards.map(([icon,title,desc,href])=><Link href={href} className={styles.card} key={title}><div className={styles.cardImage}><span className={styles.cardIcon}>{icon}</span></div><div className={styles.cardBody}><h3>{title}</h3><p>{desc}</p><span className={styles.cardArrow}>→</span></div></Link>)}</div></section>

  <section className={styles.frontier}><div className={styles.world} aria-label="Mapa de mercados globales"/><div className={styles.frontierText}><h2>Un mercado sin fronteras</h2><p>Conectamos productores, acopios, traders y compradores de todo el mundo, facilitando negocios transparentes, eficientes y seguros.</p><div className={styles.badges}><span className={styles.badge}><i>◒</i> Granos y subproductos</span><span className={styles.badge}><i>◎</i> Mercado global</span><span className={styles.badge}><i>✓</i> Verificación y cumplimiento</span><span className={styles.badge}><i>▤</i> Documentación integrada</span><span className={styles.badge}><i>♟</i> Soporte multilingüe</span></div><Link href="/mercado" className={styles.insight}><i className={styles.insightIcon}>▥</i><div><strong>Inteligencia de mercado</strong><span>Accedé a análisis, precios históricos y tendencias.</span></div><b>→</b></Link></div></section>
  <footer className={styles.footer}><div><strong>AgroBrokerIA</strong><span>Mercado · IA · Negociación · Operaciones · Finanzas</span></div><Link href="/register">Crear cuenta →</Link></footer>
 </main>
}
