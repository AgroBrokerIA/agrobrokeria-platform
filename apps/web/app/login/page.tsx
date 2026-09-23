"use client";

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setError("Te enviamos un correo para restablecer tu contraseña. Revisá tu bandeja de entrada.");
    } catch {
      setError("Ocurrió un error al solicitar la recuperación.");
    } finally { setLoading(false); }
  }

  async function iniciarSesion() {
    setError("");
    if (!email || !password) { setError("Ingresá tu correo electrónico y contraseña."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      if (!data.session || !data.user) { setError("No se pudo crear la sesión."); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { setError("La sesión no pudo guardarse correctamente."); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Ocurrió un error al iniciar sesión.");
    } finally { setLoading(false); }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <form onSubmit={(e) => { e.preventDefault(); void iniciarSesion(); }}
        style={{ width: "100%", maxWidth: 400, background: "white", padding: 30, borderRadius: 12, boxShadow: "0 5px 20px rgba(0,0,0,.08)" }}>
        <h1 style={{ fontSize: 32, marginBottom: 10 }}>🔐 Iniciar sesión</h1>
        <p style={{ color: "#666", marginBottom: 25 }}>Ingresá a tu cuenta de AgroBroker IA.</p>
        <div style={{ display: "grid", gap: 15 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Correo electrónico</label>
            <input type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: "100%", padding: 12, border: "1px solid #ccc", borderRadius: 8, boxSizing: "border-box" }} />
            <button type="button" onClick={recuperarPassword} disabled={loading}
              style={{ marginTop: 8, padding: 0, border: "none", background: "transparent", color: "#2563eb", cursor: loading ? "not-allowed" : "pointer", textDecoration: "underline", fontSize: 14 }}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Contraseña</label>
            <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: "100%", padding: 12, border: "1px solid #ccc", borderRadius: 8, boxSizing: "border-box" }} />
          </div>
          {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ background: loading ? "#86efac" : "#16a34a", color: "white", border: 0, padding: "13px 20px", borderRadius: 8, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontSize: 16 }}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </form>
    </main>
  );
}
