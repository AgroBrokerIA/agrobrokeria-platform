"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type LegalDocument = { id: string; version: string };
type LegalAcceptance = { documento_legal_id: string; version: string };

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<{factorId:string;challengeId:string;userId:string}|null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaPending, setMfaPending] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError("No se pudo completar el acceso con Google.");
          return;
        }
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (active) setError("No se pudo crear la sesión.");
        return;
      }

      const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) { if (active) setError("No se pudo comprobar el segundo factor."); return; }
      if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) { if (active) setError(factorsError.message); return; }
        const factor = (factors?.totp || []).find((item:any)=>item.status==="verified");
        if (!factor) { if (active) setError("La cuenta requiere un segundo factor verificado."); return; }
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (challengeError) { if (active) setError(challengeError.message); return; }
        if (active) { setMfaChallenge({factorId:factor.id,challengeId:challenge.id,userId:user.id}); setMfaPending(true); }
        return;
      }

      await finalizarAcceso(user.id);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  async function finalizarAcceso(userId:string) {
      const [{ data: legal, error: legalError }, { data: accepted, error: acceptedError }] =
        await Promise.all([
          supabase
            .from("documentos_legales")
            .select("id,version")
            .eq("estado", "VIGENTE"),
          supabase
            .from("aceptaciones_legales")
            .select("documento_legal_id,version")
            .eq("profile_id", userId),
        ]);

      if (legalError || acceptedError) {
        setError("No se pudo verificar la documentación legal.");
        return;
      }

      const legalDocuments = (legal ?? []) as LegalDocument[];
      const acceptedDocuments = (accepted ?? []) as LegalAcceptance[];
      const allCurrentLegalAccepted = legalDocuments.every((document) =>
        acceptedDocuments.some(
          (acceptance) =>
            acceptance.documento_legal_id === document.id &&
            acceptance.version === document.version,
        ),
      );

      router.replace(allCurrentLegalAccepted ? "/dashboard" : "/legal/aceptar");
      router.refresh();
  }

  async function verificarSegundoFactor() {
    if (!mfaChallenge || mfaCode.trim().length !== 6) return;
    setMfaPending(true); setError("");
    try {
      const { error } = await supabase.auth.mfa.verify({factorId:mfaChallenge.factorId,challengeId:mfaChallenge.challengeId,code:mfaCode.trim()});
      if (error) throw error;
      await finalizarAcceso(mfaChallenge.userId);
    } catch(e) { setError(e instanceof Error ? e.message : "No se pudo verificar el segundo factor."); }
    finally { setMfaPending(false); }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-logo">↗</div>
          <h1>Verificando acceso</h1>
          <p>{error || (mfaChallenge ? "Ingresá el código de tu aplicación autenticadora." : "Completando el inicio de sesión...")}</p>
          {mfaChallenge && <form onSubmit={(e)=>{e.preventDefault();void verificarSegundoFactor();}}>
            <input aria-label="Código de autenticación" inputMode="numeric" maxLength={6} placeholder="000000" value={mfaCode} onChange={(e)=>setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))}/>
            <button className="auth-submit" type="submit" disabled={mfaPending||mfaCode.length!==6}>{mfaPending?"Verificando…":"Verificar código"}</button>
          </form>}
          {error && (
            <a className="auth-submit" href="/login">
              Volver a iniciar sesión
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
