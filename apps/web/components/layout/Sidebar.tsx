"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const menu=[["Inicio","/dashboard","⌂"],["Mercado","/marketplace","🌾"],["Oportunidades IA","/oportunidades","✦"],["Publicaciones","/mis-publicaciones","▤"],["Ofertas recibidas","/ofertas-recibidas","↗"],["Documentos","/documentos","▧"],["Operaciones","/operaciones","⇄"],["Comisiones","/comisiones","$"],["Medios de cobro","/medios-cobro","▣"],["Retiros","/retiros-comisiones","↘"],["Mensajes","/mensajes","◌"],["Notificaciones","/notificaciones","♢"],["Empresas","/empresas","▦"],["Configuración","/configuracion","⚙"]] as const;

export default function Sidebar(){
 const pathname=usePathname(); const [mensajes,setMensajes]=useState(0); const [notificaciones,setNotificaciones]=useState(0);
 useEffect(()=>{async function cargar(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const [{count:m},{count:n}]=await Promise.all([supabase.from("mensajes_comerciales").select("id",{count:"exact",head:true}).eq("destinatario_profile_id",user.id).is("leido_at",null),supabase.from("notificaciones").select("id",{count:"exact",head:true}).or(`profile_id.eq.${user.id},cuenta_id.eq.${user.id}`).eq("leida",false)]);setMensajes(m||0);setNotificaciones(n||0)}void cargar()},[]);
 return <aside className="app-sidebar"><div className="sidebar-section-label">PLATAFORMA</div><nav className="sidebar-nav">{menu.map(([nombre,ruta,icono])=>{const activo=pathname===ruta||(ruta!=="/dashboard"&&pathname.startsWith(ruta+"/"));const contador=ruta==="/mensajes"?mensajes:ruta==="/notificaciones"?notificaciones:0;return <Link key={ruta} href={ruta} className={`sidebar-link ${activo?"active":""}`}><span className="sidebar-icon">{icono}</span><span className="sidebar-label">{nombre}</span>{contador>0&&<span className="sidebar-badge">{contador>99?"99+":contador}</span>}</Link>})}</nav><div className="sidebar-status"><span className="status-dot"/><div><strong>AgroBroker IA</strong><small>Mercado operativo</small></div></div></aside>;
}