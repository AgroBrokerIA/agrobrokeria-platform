"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Profile = { nombre:string|null; empresa:string|null; tipo_usuario:string|null };
type Publication = { id:string; tipo:string; cantidad_tn:number; precio_tn:number; creada_en:string|null; productos?:{nombre:string}|{nombre:string}[]|null; provincia?:string|null };
type Activity = { id:string; titulo?:string|null; mensaje?:string|null; creada_en?:string|null; leida?:boolean };

export default function Dashboard(){
  const [profile,setProfile]=useState<Profile|null>(null);
  const [email,setEmail]=useState("");
  const [loading,setLoading]=useState(true);
  const [activePublications,setActivePublications]=useState(0);
  const [demands,setDemands]=useState(0);
  const [operations,setOperations]=useState(0);
  const [closedOperations,setClosedOperations]=useState(0);
  const [prices,setPrices]=useState<Publication[]>([]);
  const [activities,setActivities]=useState<Activity[]>([]);

  useEffect(()=>{
    async function load(){
      const {data:auth}=await supabase.auth.getUser();
      if(!auth.user){window.location.href="/login";return}
      setEmail(auth.user.email??"");
      const {data:profileData}=await supabase.from("profiles").select("nombre,empresa,tipo_usuario").eq("id",auth.user.id).maybeSingle();
      setProfile(profileData);

      const [{count:activeCount},{count:demandCount},{count:operationCount},{count:closedCount}] = await Promise.all([
        supabase.from("publicaciones").select("id",{count:"exact",head:true}).eq("estado","PUBLICADA"),
        supabase.from("publicaciones").select("id",{count:"exact",head:true}).eq("estado","PUBLICADA").eq("tipo","DEMANDA"),
        supabase.from("operaciones").select("id",{count:"exact",head:true}).neq("estado","CERRADA"),
        supabase.from("operaciones").select("id",{count:"exact",head:true}).eq("estado","CERRADA"),
      ]);
      setActivePublications(activeCount||0); setDemands(demandCount||0); setOperations(operationCount||0); setClosedOperations(closedCount||0);

      const {data:latestPublications} = await supabase.from("publicaciones").select("id,tipo,cantidad_tn,precio_tn,creada_en,provincia,productos(nombre)").eq("estado","PUBLICADA").order("creada_en",{ascending:false}).limit(4);
      setPrices((latestPublications as Publication[])||[]);

      const {data:latestActivities} = await supabase.from("notificaciones").select("id,titulo,mensaje,creada_en,leida").or(`profile_id.eq.${auth.user.id},cuenta_id.eq.${auth.user.id}`).order("creada_en",{ascending:false}).limit(5);
      setActivities((latestActivities as Activity[])||[]);
      setLoading(false);
    }
    void load();
  },[]);

  if(loading)return <main className="dashboard-page"><div className="loading-card">Cargando centro de operaciones...</div></main>;

  return <main className="dashboard-page">
    <section className="dashboard-hero">
      <div><span className="eyebrow">CENTRO DE OPERACIONES</span><h1>Hola, {profile?.nombre||email||"usuario"} 👋</h1><p>{profile?.empresa||"Configurá tu empresa para comenzar a operar."}</p></div>
      <Link href="/nueva-publicacion" className="primary-action">+ Nueva publicación</Link>
    </section>

    <section className="dashboard-stats">
      <div className="stat-card"><span>Ofertas activas</span><strong>{activePublications}</strong><small>Publicaciones disponibles en el mercado</small></div>
      <div className="stat-card"><span>Demandas</span><strong>{demands}</strong><small>Necesidades de compra publicadas</small></div>
      <div className="stat-card"><span>Operaciones</span><strong>{operations}</strong><small>En proceso de gestión</small></div>
      <div className="stat-card"><span>Cerradas</span><strong>{closedOperations}</strong><small>Operaciones finalizadas</small></div>
    </section>

    <section className="dashboard-market-grid">
      <div className="dashboard-panel dashboard-price-panel">
        <div className="panel-heading"><div><span className="eyebrow">MERCADO</span><h2>Últimas referencias publicadas</h2></div><Link href="/marketplace">Ver mercado →</Link></div>
        {prices.length===0 ? <div className="dashboard-empty-line">Todavía no hay publicaciones activas.</div> : <div className="price-list">
          {prices.map((item)=><div key={item.id} className="price-row"><span className="price-product">{(Array.isArray(item.productos) ? item.productos[0]?.nombre : item.productos?.nombre)||"Commodity"}</span><span>{item.tipo}</span><strong>USD {Number(item.precio_tn||0).toLocaleString("es-AR")} /tn</strong><small>{Number(item.cantidad_tn||0).toLocaleString("es-AR")} tn · {item.provincia||"Sin provincia"}</small></div>)}
        </div>}
      </div>

      <aside className="dashboard-panel activity-panel">
        <div className="panel-heading"><div><span className="eyebrow">ACTIVIDAD</span><h2>Últimas novedades</h2></div></div>
        {activities.length===0 ? <div className="dashboard-empty-line">No hay novedades pendientes.</div> : <div className="activity-list">
          {activities.map((item)=><div key={item.id} className="activity-row"><span className={item.leida?"activity-dot":"activity-dot active"}></span><div><strong>{item.titulo||"Actividad comercial"}</strong><p>{item.mensaje||"Nueva actualización en AgroBroker IA."}</p></div></div>)}
        </div>}
      </aside>
    </section>

    <section className="dashboard-lower-grid">
      <div className="dashboard-panel">
        <div className="panel-heading"><div><span className="eyebrow">ACCESOS RÁPIDOS</span><h2>Gestioná tu operación</h2></div></div>
        <div className="quick-grid">
          <Link href="/marketplace" className="quick-card"><b>🌾</b><div><strong>Marketplace</strong><span>Explorar soja, maíz y otros commodities.</span></div><i>→</i></Link>
          <Link href="/oportunidades" className="quick-card"><b>✦</b><div><strong>Oportunidades IA</strong><span>Revisar coincidencias comerciales.</span></div><i>→</i></Link>
          <Link href="/ofertas-recibidas" className="quick-card"><b>↗</b><div><strong>Ofertas recibidas</strong><span>Gestionar propuestas.</span></div><i>→</i></Link>
          <Link href="/operaciones" className="quick-card"><b>⇄</b><div><strong>Operaciones</strong><span>Seguir las 10 etapas del workflow.</span></div><i>→</i></Link>
        </div>
      </div>
      <aside className="dashboard-panel account-panel"><span className="eyebrow">CUENTA</span><h2>Perfil comercial</h2><div className="account-row"><span>Correo</span><strong>{email}</strong></div><div className="account-row"><span>Tipo de usuario</span><strong>{profile?.tipo_usuario||"Sin definir"}</strong></div><div className="account-row"><span>Comisión AgroBroker IA</span><strong>USD 1 / TN · automática</strong></div><Link href="/configuracion" className="secondary-action">Configurar empresa →</Link></aside>
    </section>
  </main>;
}