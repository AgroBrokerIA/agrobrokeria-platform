"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function Header() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<string | null>(null);
  const [condicion, setCondicion] = useState("Usuario");
  const [idioma, setIdioma] = useState("ES");
  const [mensajes, setMensajes] = useState(0);
  const [notificaciones, setNotificaciones] = useState(0);
  const [empresaVerificada, setEmpresaVerificada] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("nombre,tipo_usuario").eq("id", user.id).maybeSingle();
    const nombre = String(profile?.nombre || user.user_metadata?.nombre || user.user_metadata?.full_name || "Usuario").trim();
    setUsuario(nombre || "Usuario");
    const tipo = String(profile?.tipo_usuario || user.user_metadata?.tipo_usuario || "USUARIO").toUpperCase();
    const labels: Record<string,string> = { BROKER: "Corredor", CORREDOR: "Corredor", INTERMEDIARIO: "Intermediario", COMISIONISTA: "Comisionista", PRODUCTOR: "Productor", COMPRADOR: "Comprador", ACOPIO: "Acopio", COOPERATIVA: "Cooperativa", EXPORTADOR: "Exportador", LOGISTICA: "Logística", LABORATORIO: "Laboratorio", INDUSTRIA: "Industria", ADMIN: "Administrador" };
    setCondicion(labels[tipo] || "Usuario");
    setIdioma((localStorage.getItem("agrobrokeria.language") || "es").toUpperCase());
    const [{ count: m }, { count: n }, { data: memberships }] = await Promise.all([
      supabase.from("mensajes_comerciales").select("id", { count: "exact", head: true }).eq("destinatario_profile_id", user.id).is("leido_at", null),
      supabase.from("notificaciones").select("id", { count: "exact", head: true }).or(`profile_id.eq.${user.id},cuenta_id.eq.${user.id}`).eq("leida", false),
      supabase.from("company_users").select("company_id").eq("profile_id", user.id).eq("activo", true),
    ]);
    setMensajes(m || 0); setNotificaciones(n || 0);
    const companyIds = (memberships || []).map((x: any) => x.company_id).filter(Boolean);
    if (companyIds.length) {
      const { data: verifications } = await supabase.from("empresas_verificaciones").select("empresa_id,estado,consultado_at").in("empresa_id", companyIds).order("consultado_at", { ascending: false }).limit(companyIds.length * 2);
      const latest = new Map<string, string>();
      for (const row of verifications || []) if (!latest.has(row.empresa_id)) latest.set(row.empresa_id, row.estado);
      setEmpresaVerificada(companyIds.some((id: string) => latest.get(id) === "VERIFICADA"));
    }
  }

  useEffect(() => {
    const cerrar = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false); };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  useEffect(() => {
    let activo = true; void cargar();
    const onLanguage = () => setIdioma((localStorage.getItem("agrobrokeria.language") || "es").toUpperCase());
    window.addEventListener("agrobrokeria:language-changed", onLanguage);
    const onProfile = () => { if (activo) void cargar(); };
    window.addEventListener("agrobrokeria:profile-changed", onProfile);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { if (activo) void cargar(); });
    return () => { activo = false; subscription.unsubscribe(); window.removeEventListener("agrobrokeria:language-changed", onLanguage); window.removeEventListener("agrobrokeria:profile-changed", onProfile); };
  }, []);

  async function cerrarSesion() { await supabase.auth.signOut(); setMenuAbierto(false); router.replace("/login"); }

  function ejecutarBusqueda(e: React.FormEvent) {
    e.preventDefault();
    const q = busqueda.trim();
    router.push(q ? `/marketplace?search=${encodeURIComponent(q)}` : "/marketplace");
  }

  return <header className="app-header">
    <Link href="/dashboard" className="app-header-brand" aria-label="AgroBrokerIA">
      <span className="header-leaf">◒</span><span><strong>AgroBroker<span>IA</span></strong><small>Conectando el mundo agro</small></span>
    </Link>
    <form className="header-search" role="search" onSubmit={ejecutarBusqueda}>
      <span>⌕</span><input aria-label="Buscar productos, empresas, ofertas, demandas..." value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar productos, empresas, ofertas, demandas..." />
    </form>
    <button type="button" className="header-country" onClick={() => router.push("/idioma")} aria-label="País"><span>🌐</span> Todos los países <b>⌄</b></button>
    <div className="app-header-actions">
      <button type="button" className="header-language" onClick={() => router.push("/idioma")} aria-label="Idioma">🇪🇸 <strong>{idioma}</strong>⌄</button>
      <Link href="/notificaciones" className="header-icon header-notify" aria-label="Notificaciones">♧{notificaciones > 0 && <i>{notificaciones > 99 ? "99+" : notificaciones}</i>}</Link>
      <Link href="/mensajes" className="header-icon header-message" aria-label="Mensajes">✉{mensajes > 0 && <i>{mensajes}</i>}</Link>
      {usuario ? <div className="user-menu-wrap" ref={menuRef}>
        <button type="button" className="user-menu user-menu-button" onClick={() => setMenuAbierto(v => !v)} aria-expanded={menuAbierto} aria-haspopup="menu">
          <span className="user-avatar">{usuario.charAt(0).toUpperCase()}</span><div className="user-meta"><strong>{usuario}</strong><small>{condicion} | AgroBrokerIA</small></div><span className="user-chevron">{menuAbierto ? "⌃" : "⌄"}</span>
        </button>
        {menuAbierto && <div className="user-dropdown" role="menu">
          <Link href="/perfil#seguridad" onClick={() => setMenuAbierto(false)} role="menuitem">🔑 <span>Cambiar contraseña</span></Link>
          <Link href="/configuracion" onClick={() => setMenuAbierto(false)} role="menuitem">⚙ <span>Configuración</span></Link>
          <Link href="/ayuda" onClick={() => setMenuAbierto(false)} role="menuitem">❓ <span>Ayuda</span></Link>
          <button type="button" onClick={cerrarSesion} role="menuitem">↪ <span>Cerrar sesión</span></button>
        </div>}
      </div> : <Link href="/login" className="header-login">Iniciar sesión</Link>}
    </div>
  </header>;
}