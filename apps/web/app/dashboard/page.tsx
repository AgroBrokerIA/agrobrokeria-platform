"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Profile={nombre:string|null;empresa:string|null;tipo_usuario:string|null};

export default function Dashboard(){
 const [profile,setProfile]=useState<Profile|null>(null); const [email,setEmail]=useState(""); const [loading,setLoading]=useState(true);
 useEffect(()=>{async function load(){const {data:auth}=await supabase.auth.getUser();if(!auth.user){window.location.href="/login";return}setEmail(auth.user.email??"");const {data}=await supabase.from("profiles").select("nombre,empresa,tipo_usuario").eq("id",auth.user.id).maybeSingle();setProfile(data);setLoading(false)}void load()},[]);
 if(loading)return <main className="dashboard-page"><div className="loading-card">Cargando panel...</div></main>;
 return <main className="dashboard-page">
  <section className="dashboard-hero">
   <div><span className="eyebrow">CENTRO DE OPERACIONES</span><h1>Hola, {profile?.nombre||email||"usuario"}</h1><p>{profile?.empresa||"Configurá tu empresa para comenzar a operar."}</p></div>
   <Link href="/mis-publicaciones" className="primary-action">+ Nueva publicación</Link>
  </section>
  <section className="dashboard-stats">
   <div className="stat-card"><span>Mercado</span><strong>Marketplace</strong><small>Publicaciones activas y oportunidades</small></div>
   <div className="stat-card"><span>Operaciones</span><strong>Seguimiento</strong><small>Del acuerdo a la liquidación</small></div>
   <div className="stat-card"><span>Inteligencia</span><strong>IA Match</strong><small>Detección de oportunidades comerciales</small></div>
   <div className="stat-card"><span>Finanzas</span><strong>USD 1 / TN</strong><small>Comisión fija AgroBroker IA</small></div>
  </section>
  <div className="dashboard-grid">
   <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">MERCADO</span><h2>Accesos rápidos</h2></div></div>
    <div className="quick-grid">
     <Link href="/marketplace" className="quick-card"><b>🌾</b><div><strong>Marketplace</strong><span>Explorar soja, maíz y otros commodities.</span></div><i>→</i></Link>
     <Link href="/oportunidades" className="quick-card"><b>✦</b><div><strong>Oportunidades IA</strong><span>Revisar coincidencias comerciales.</span></div><i>→</i></Link>
     <Link href="/ofertas-recibidas" className="quick-card"><b>↗</b><div><strong>Ofertas recibidas</strong><span>Gestionar propuestas de compradores.</span></div><i>→</i></Link>
     <Link href="/operaciones" className="quick-card"><b>⇄</b><div><strong>Operaciones</strong><span>Ver el estado de cada negocio.</span></div><i>→</i></Link>
    </div>
   </section>
   <aside className="dashboard-panel account-panel"><span className="eyebrow">CUENTA</span><h2>Perfil comercial</h2><div className="account-row"><span>Correo</span><strong>{email}</strong></div><div className="account-row"><span>Tipo de usuario</span><strong>{profile?.tipo_usuario||"Sin definir"}</strong></div><Link href="/configuracion" className="secondary-action">Configurar empresa →</Link></aside>
  </div>
 </main>;
}