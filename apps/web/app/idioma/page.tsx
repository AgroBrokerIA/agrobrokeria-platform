"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const langs = [
  ["es", "Español"],
  ["en", "English"],
  ["pt", "Português"],
  ["it", "Italiano"],
  ["fr", "Français"],
  ["de", "Deutsch"],
] as const;

export default function Idioma() {
  const [language, setLanguage] = useState("es");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("idioma")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.idioma) {
        setLanguage(data.idioma);
      }
    })();
  }, []);

  async function save() {
    localStorage.setItem("agrobrokeria.language", language);
    document.documentElement.lang = language;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("profiles")
        .update({ idioma: language })
        .eq("id", user.id);
    }

    setMessage("Idioma guardado.");
  }

  return (
    <main className="module-page">
      <div className="module-hero">
        <div>
          <span className="eyebrow">IDIOMA</span>
          <h1>Idioma y traducción</h1>
          <p>
            Preferencia del usuario para interfaz y comunicaciones. El original
            de mensajes y documentos siempre se conserva.
          </p>
        </div>
      </div>

      <section className="company-card">
        <label htmlFor="language">Idioma principal</label>
        <select
          id="language"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          style={{
            display: "block",
            marginTop: 8,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #dbe3ea",
          }}
        >
          {langs.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>

        <button
          className="module-pill"
          style={{ marginTop: 16 }}
          onClick={save}
          type="button"
        >
          Guardar idioma
        </button>

        {message && <p>{message}</p>}

        <h2 style={{ marginTop: 28 }}>Traducción automática</h2>
        <p>
          La arquitectura conserva idioma original, idioma destino, versión,
          proveedor y estado. Si el proveedor no está configurado, no se
          inventa ninguna traducción.
        </p>
      </section>
    </main>
  );
}
