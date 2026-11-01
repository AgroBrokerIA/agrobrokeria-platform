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
  const [mfaChallenge, setMfaChallenge] = useState<{factorId:string;challengeId:string;userId:string;factorType:"totp"|"phone";destination?:string}|null>(null);
  const [mfaCode, setMfaCode] = useState("");

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

  async function iniciarConPasskey() {
    setError("");setLoading(true);
    try {
      const {data,error}=await supabase.auth.signInWithPasskey();
      if(error)throw error;
      if(!data?.user)throw new Error("No se pudo iniciar sesión con la llave de acceso.");
      await completarIngreso(data.user.id);
    } catch(e) {
      setError(e instanceof Error?e.message:"No se pudo autenticar con huella, rostro o llave de seguridad. Verificá que Passkeys esté habilitado en Supabase.");
    } finally {setLoading(false);}
  }

  async function iniciarConGoogle() {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function completarIngreso(userId:string) {
    const [{ data: legal, error: legalError }, { data: accepted, error: acceptedError }] = await Promise.all([
      supabase.from("documentos_legales").select("id,version").eq("estado","VIGENTE"),
      supabase.from("aceptaciones_legales").select("documento_legal_id,version").eq("profile_id",userId),
    ]);
    if (legalError || acceptedError) { setError("No se pudo verificar la documentación legal. Intentá nuevamente."); return; }
    const ok=(legal||[]).every((d:any)=> (accepted||[]).some((a:any)=>a.documento_legal_id===d.id&&a.version===d.version));
    const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    router.push(ok ? safeNext : "/legal/aceptar"); router.refresh();
  }

  async function iniciarSesion() {
    setError("");
    if (!email || !password) { setError("Ingresá tu correo electrónico y contraseña."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      if (!data.session || !data.user) { setError("No se pudo crear la sesión."); return; }
      const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const phoneFactor = (factors?.phone || []).find((item:any)=>item.status==="verified");
        const totpFactor = (factors?.totp || []).find((item:any)=>item.status==="verified");
        const factor = phoneFactor || totpFactor;
        if (!factor) { setError("Tu cuenta requiere un segundo factor, pero no encontramos un teléfono o autenticador verificado."); return; }
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (challengeError) throw challengeError;
        if (!challenge?.id) throw new Error("No se pudo iniciar el desafío del segundo factor.");
        setMfaChallenge({factorId:factor.id,challengeId:challenge.id,userId:data.user.id,factorType:phoneFactor?"phone":"totp",destination:phoneFactor?.phone});
        return;
      }
      await completarIngreso(data.user.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error al iniciar sesión."); }
    finally { setLoading(false); }
  }

  async function verificarSegundoFactor() {
    if (!mfaChallenge || mfaCode.trim().length !== 6) return;
    setLoading(true); setError("");
    try {
      const { error } = await supabase.auth.mfa.verify({factorId:mfaChallenge.factorId,challengeId:mfaChallenge.challengeId,code:mfaCode.trim()});
      if (error) throw error;
      const userId=mfaChallenge.userId;
      setMfaChallenge(null); setMfaCode("");
      await completarIngreso(userId);
    } catch(e) { setError(e instanceof Error ? e.message : "No se pudo verificar el segundo factor."); }
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
          <form onSubmit={(e) => { e.preventDefault(); void (mfaChallenge ? verificarSegundoFactor() : iniciarSesion()); }}>
            <label>Correo electrónico<input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            {!mfaChallenge && <label>Contraseña<input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>}
            {mfaChallenge && <label>{mfaChallenge.factorType==="phone"?"Código enviado por SMS":"Código del autenticador"}{mfaChallenge.destination&&<small> Enviado a {mfaChallenge.destination}</small>}<input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))} required /></label>}
            {!mfaChallenge && <div className="auth-row"><label className="remember"><input type="checkbox" /> Recordarme</label><button type="button" onClick={recuperarPassword} disabled={loading} className="auth-link-button">¿Olvidaste tu contraseña?</button></div>}
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Verificando..." : mfaChallenge ? "Verificar código" : "Ingresar"}</button>
            {!mfaChallenge && <><div className="auth-divider"><span>o</span></div>
            <button className="auth-submit" type="button" onClick={iniciarConGoogle} disabled={loading}>Continuar con Google</button>
            <button className="auth-submit" type="button" onClick={iniciarConPasskey} disabled={loading}>Ingresar con huella, rostro o llave de acceso</button></>}
          </form>
          <p className="auth-switch">¿No tenés cuenta? <Link href="/register">Registrate</Link></p>
        </div>
      </section>
    </main>
  );
}
