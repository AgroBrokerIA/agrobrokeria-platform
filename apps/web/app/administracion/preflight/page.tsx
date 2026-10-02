"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Check = { ok: boolean; detail?: string };
type Result = {
  ok: boolean;
  status: string;
  core?: boolean;
  arca?: boolean;
  integrations?: boolean;
  latency_ms?: number;
  checked_at?: string;
  checks?: Record<string, Check>;
  error?: string;
};

export default function LaunchPreflightPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setResult({ ok: false, status: "error", error: "No hay una sesión activa. Ingresá nuevamente al sistema." });
        return;
      }

      const response = await fetch("/api/health/launch", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      setResult(body);
    } catch (error) {
      setResult({
        ok: false,
        status: "error",
        error: error instanceof Error ? error.message : "No se pudo ejecutar el preflight.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run();
  }, []);

  const checks = Object.entries(result?.checks ?? {});

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Preflight de lanzamiento</h1>
          <p className="mt-1 text-sm text-slate-600">
            Verificación real de producción: base de datos, ARCA e integraciones externas.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={`text-lg font-semibold ${result?.ok ? "text-emerald-700" : "text-amber-700"}`}>
                {loading ? "Verificando..." : result?.ok ? "LISTO PARA LANZAMIENTO" : "LANZAMIENTO BLOQUEADO"}
              </div>
              {result?.latency_ms != null && (
                <div className="mt-1 text-xs text-slate-500">{result.latency_ms} ms · {result.checked_at}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void run()}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Volver a verificar"}
            </button>
          </div>

          {result?.error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {result.error}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Core", result?.core],
              ["ARCA", result?.arca],
              ["Integraciones", result?.integrations],
            ].map(([label, ok]) => (
              <div key={String(label)} className="rounded-lg border p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                <div className={`mt-1 text-lg font-semibold ${ok ? "text-emerald-700" : "text-red-700"}`}>
                  {ok ? "OK" : "PENDIENTE"}
                </div>
              </div>
            ))}
          </div>

          {checks.length > 0 && (
            <div className="mt-6 divide-y rounded-lg border">
              {checks.map(([name, check]) => (
                <div key={name} className="flex items-start justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800">{name}</div>
                    {check.detail && <div className="mt-1 text-xs text-slate-500">{check.detail}</div>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${check.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {check.ok ? "OK" : "ERROR"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
