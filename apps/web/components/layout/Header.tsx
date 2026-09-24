"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function Header() {
  const [usuario, setUsuario] = useState<string | null>(null);
  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (activo) setUsuario(user?.user_metadata?.nombre || user?.user_metadata?.full_name || user?.email || null);
    }
    void cargar();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (activo) setUsuario(session?.user?.user_metadata?.nombre || session?.user?.user_metadata?.full_name || session?.user?.email || null);
    });
    return () => { activo = false; subscription.unsubscribe(); };
  }, []);
  async function cerrarSesion() { await supabase.auth.signOut(); window.location.href = "/login"; }
  return <header className="app-header">
    <Link href="/" className="brand-mark"><span className="brand-icon">A</span><span><strong>AgroBroker</strong><small>IA · Commodities</small></span></Link>
    <div className="app-header-actions">
      <Link href="/marketplace" className="header-link">Mercado</Link>
      <Link href="/mensajes" className="header-icon" aria-label="Mensajes">💬</Link>
      <Link href="/notificaciones" className="header-icon" aria-label="Notificaciones">🔔</Link>
      {usuario ? <div className="user-menu"><span className="user-avatar">{usuario.charAt(0).toUpperCase()}</span><span className="user-name">{usuario}</span><button type="button" onClick={cerrarSesion} className="logout-button">Salir</button></div> : <Link href="/login" className="header-login">Iniciar sesión</Link>}
    </div>
  </header>;
}