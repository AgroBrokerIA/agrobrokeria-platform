"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function Header() {
  const [usuario, setUsuario] = useState<string | null>(null);
  const [idioma, setIdioma] = useState("ES");
  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (activo) setUsuario(user?.user_metadata?.nombre || user?.user_metadata?.full_name || user?.email || null);
      const lang = localStorage.getItem("agrobrokeria.language") || "es";
      if (activo) setIdioma(lang.toUpperCase());
    }
    void cargar();
    const onLanguage = () => setIdioma((localStorage.getItem("agrobrokeria.language") || "es").toUpperCase());
    window.addEventListener("agrobrokeria:language-changed", onLanguage);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (activo) setUsuario(session?.user?.user_metadata?.nombre || session?.user?.user_metadata?.full_name || session?.user?.email || null);
    });
    return () => { activo = false; subscription.unsubscribe(); window.removeEventListener("agrobrokeria:language-changed", onLanguage); };
  }, []);
  async function cerrarSesion() { await supabase.auth.signOut(); window.location.href = "/login"; }
  return <header className="app-header">
    <div className="header-search" role="search">
      <span>⌕</span>
      <input aria-label="Buscar" placeholder="Buscar productos, empresas, ofertas, demandas..." />
      <kbd>⌘ K</kbd>
    </div>
    <div className="app-header-actions">
      <button type="button" className="header-language" onClick={() => window.location.href="/idioma"} aria-label="Idioma">◎ <strong>{idioma}</strong>⌄</button>
      <Link href="/notificaciones" className="header-icon header-notify" aria-label="Notificaciones">♧<i>3</i></Link>
      <Link href="/mensajes" className="header-icon header-message" aria-label="Mensajes">▰<i>5</i></Link>
      {usuario ? <div className="user-menu"><span className="user-avatar">{usuario.charAt(0).toUpperCase()}</span><div className="user-meta"><strong>{usuario}</strong><small>● Empresa verificada</small></div><span className="user-chevron">⌄</span><button type="button" onClick={cerrarSesion} className="logout-button" aria-label="Cerrar sesión">Salir</button></div> : <Link href="/login" className="header-login">Iniciar sesión</Link>}
    </div>
  </header>;
}