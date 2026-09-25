"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function recuperarPassword() {
    setError("");
    if (!email) { setError("Ingresá tu correo electrónico."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setError(error ? error.message : "Te enviamos un correo para restablecer tu contraseña. Revisá tu bandeja de entrada.");
    } catch { setError("Ocurrió un error al solicitar la recuperación."); }
    finally { setLoading(false); }
  }

  async function iniciarSesion() {
    setError("");
    if (!email || !password) { setError("Ingresá tu correo electrónico y contraseña."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      if (!data.session || !data.user) { setError("No se pudo crear la sesión."); return; }
      const {data:legal}=await supabase.from("documentos_legales").select("id,version").eq("estado","VIGENTE");
      const {data:accepted}=await supabase.from("aceptaciones_legales").select("documento_legal_id,version").eq("profile_id",data.user.id);
      const ok=(legal||[]).every((d:any)=> (accepted||[]).some((a:any)=>a.documento_legal_id===d.id&&a.version===d.version));
      const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      router.push(ok ? (next.startsWith("/") ? next : "/dashboard") : "/legal/aceptar"); router.refresh();
    } catch { setError("Ocurrió un error al iniciar sesión."); }
    finally { setLoading(false); }
  }

  return (
    <main className="auth-page">
      <div className="auth-art">
        <Link href="/" className="auth-brand"><span>↗</span><strong>AgroBroker IA</strong></Link>
        <div className="auth-art-copy"><span>RED AGROCOMERCIAL</span><h1>Conectá tu negocio<br />con el mercado.</h1><p>Publicá, negociá y gestioná tus operaciones de commodities desde un solo lugar.</p></div>
        <div className="auth-art-grain" aria-hidden="true" />
      </div>
      <section className="auth-panel">
        <Link href="/" className="auth-mobile-brand">AgroBroker IA</Link>
        <div className="auth-card">
          <div className="auth-logo">↗</div><h1>Iniciar sesión</h1><p>Ingresá a tu cuenta</p>
          <form onSubmit={(e) => { e.preventDefault(); void iniciarSesion(); }}>
            <label>Correo electrónico<input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Contraseña<input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            <div className="auth-row"><label className="remember"><input type="checkbox" /> Recordarme</label><button type="button" onClick={recuperarPassword} disabled={loading} className="auth-link-button">¿Olvidaste tu contraseña?</button></div>
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</button>
          </form>
          <div className="auth-divider"><span>o continuá con</span></div>
          <div className="social-auth"><button type="button" disabled>Google</button><button type="button" disabled>Microsoft</button></div>
          <p className="auth-switch">¿No tenés cuenta? <Link href="/register">Registrate</Link></p>
        </div>
      </section>
    </main>
  );
}
