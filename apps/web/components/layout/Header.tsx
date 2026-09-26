"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function Header() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<string | null>(null);
  const [idioma, setIdioma] = useState("ES");
  const [mensajes, setMensajes] = useState(0);
  const [notificaciones, setNotificaciones] = useState(0);
  const [empresaVerificada, setEmpresaVerificada] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUsuario(user.user_metadata?.nombre || user.user_metadata?.full_name || user.email || null);
    const lang = localStorage.getItem("agrobrokeria.language") || "es";
    setIdioma(lang.toUpperCase());

    const [{ count: m }, { count: n }, { data: memberships }] = await Promise.all([
      supabase.from("mensajes_comerciales").select("id", { count: "exact", head: true })
        .eq("destinatario_profile_id", user.id).is("leido_at", null),
      supabase.from("notificaciones").select("id", { count: "exact", head: true })
        .or(`profile_id.eq.${user.id},cuenta_id.eq.${user.id}`).eq("leida", false),
      supabase.from("company_users").select("company_id").eq("profile_id", user.id).eq("activo", true),
    ]);
    setMensajes(m || 0);
    setNotificaciones(n || 0);

    const companyIds = (memberships || []).map((x: any) => x.company_id).filter(Boolean);
    if (companyIds.length) {
      const { data: verifications } = await supabase.from("empresas_verificaciones")
        .select("empresa_id,estado,consultado_at")
        .in("empresa_id", companyIds)
        .order("consultado_at", { ascending: false })
        .limit(companyIds.length * 2);
      const latest = new Map<string, string>();
      for (const row of verifications || []) if (!latest.has(row.empresa_id)) latest.set(row.empresa_id, row.estado);
      setEmpresaVerificada(companyIds.some((id: string) => latest.get(id) === "VERIFICADA"));
    }
  }

  useEffect(() => {
    let activo = true;
    void cargar();
    const onLanguage = () => setIdioma((localStorage.getItem("agrobrokeria.language") || "es").toUpperCase());
    window.addEventListener("agrobrokeria:language-changed", onLanguage);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { if (activo) void cargar(); });
    return () => { activo = false; subscription.unsubscribe(); window.removeEventListener("agrobrokeria:language-changed", onLanguage); };
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function ejecutarBusqueda(e: React.FormEvent) {
    e.preventDefault();
    const q = busqueda.trim();
    router.push(q ? `/marketplace?search=${encodeURIComponent(q)}` : "/marketplace");
  }

  return <header className="app-header">
    <form className="header-search" role="search" onSubmit={ejecutarBusqueda}>
      <span>⌕</span>
      <input aria-label="Buscar productos, empresas, ofertas, demandas..." value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar productos, empresas, ofertas, demandas..." />
      <kbd>⌘ K</kbd>
    </form>
    <div className="app-header-actions">
      <button type="button" className="header-language" onClick={() => router.push("/idioma")} aria-label="Idioma">◎ <strong>{idioma}</strong>⌄</button>
      <Link href="/notificaciones" className="header-icon header-notify" aria-label="Notificaciones">♧{notificaciones > 0 && <i>{notificaciones > 99 ? "99+" : notificaciones}</i>}</Link>
      <Link href="/mensajes" className="header-icon header-message" aria-label="Mensajes">▰{mensajes > 0 && <i>{mensajes > 99 ? "99+" : mensajes}</i>}</Link>
      {usuario ? <div className="user-menu"><span className="user-avatar">{usuario.charAt(0).toUpperCase()}</span><div className="user-meta"><strong>{usuario}</strong><small>{empresaVerificada ? "● Empresa verificada" : "● Verificación pendiente"}</small></div><span className="user-chevron">⌄</span><button type="button" onClick={cerrarSesion} className="logout-button" aria-label="Cerrar sesión">Salir</button></div> : <Link href="/login" className="header-login">Iniciar sesión</Link>}
    </div>
  </header>;
}
