"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError("No se pudo completar el acceso con Google.");
          return;
        }
      }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        if (active) setError("No se pudo crear la sesión.");
        return;
      }
      const [{ data: legal, error: legalError }, { data: accepted, error: acceptedError }] = await Promise.all([
        supabase.from("documentos_legales").select("id,version").eq("estado","VIGENTE"),
        supabase.from("aceptaciones_legales").select("documento_legal_id,version").eq("profile_id",user.id),
      ]);
      if (legalError || acceptedError) {
        if (active) setError("No se pudo verificar la documentación legal.");
        return;
      }
      const ok=(legal||[]).every((d:any)=>(accepted||[]).some((a:any)=>a.documento_legal_id===d.id&&a.version===d.version));
      router.replace(ok ? "/dashboard" : "/legal/aceptar");
      router.refresh();
    })();
    return () => { active=false; };
  }, [params,router]);

  return <main className="auth-page"><section className="auth-panel"><div className="auth-card"><div className="auth-logo">↗</div><h1>Verificando acceso</h1><p>{error || "Completando el inicio de sesión..."}</p>{error && <a className="auth-submit" href="/login">Volver a iniciar sesión</a>}</div></section></main>;
}
