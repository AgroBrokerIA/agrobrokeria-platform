"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

const SUPPORTED = ["es","en","pt","zh","fr","it","ru","hi"];

export default function LanguageBootstrap() {
  useEffect(() => {
    let active = true;
    const apply = (value: string) => {
      const language = SUPPORTED.includes(value) ? value : "es";
      document.documentElement.lang = language;
      localStorage.setItem("agrobrokeria.language", language);
      window.dispatchEvent(new Event("agrobrokeria:language-changed"));
    };

    const initialize = async () => {
      const local = localStorage.getItem("agrobrokeria.language");
      const browser = navigator.language?.split("-")[0] || "es";
      const fallback = local || (SUPPORTED.includes(browser) ? browser : "es");
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("idioma_preferido")
          .eq("id", user.id)
          .maybeSingle();
        if (!active) return;
        if (!error && profile?.idioma_preferido && SUPPORTED.includes(profile.idioma_preferido)) {
          apply(profile.idioma_preferido);
          return;
        }
      }
      apply(fallback);
    };

    void initialize();
    return () => { active = false; };
  }, []);
  return null;
}
