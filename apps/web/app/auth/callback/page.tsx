"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type LegalDocument = { id: string; version: string };
type LegalAcceptance = { documento_legal_id: string; version: string };

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

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

      const [{ data: legal, error: legalError }, { data: accepted, error: acceptedError }] =
        await Promise.all([
          supabase
            .from("documentos_legales")
            .select("id,version")
            .eq("estado", "VIGENTE"),
          supabase
            .from("aceptaciones_legales")
            .select("documento_legal_id,version")
            .eq("profile_id", user.id),
        ]);

      if (legalError || acceptedError) {
        if (active) setError("No se pudo verificar la documentación legal.");
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
    })();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-logo">↗</div>
          <h1>Verificando acceso</h1>
          <p>{error || "Completando el inicio de sesión..."}</p>
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
