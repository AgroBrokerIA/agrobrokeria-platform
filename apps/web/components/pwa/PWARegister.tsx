"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PWARegister() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.error("No se pudo registrar el service worker de AgroBrokerIA", error);
      });
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  if (installed || !installEvent) return null;

  return (
    <button
      type="button"
      onClick={() => void install()}
      aria-label="Instalar AgroBrokerIA en este dispositivo"
      style={{
        position: "fixed",
        right: 16,
        bottom: "max(18px, env(safe-area-inset-bottom))",
        zIndex: 1000,
        border: 0,
        borderRadius: 999,
        padding: "12px 16px",
        color: "#fff",
        background: "#173f2b",
        boxShadow: "0 8px 24px rgba(0,0,0,.22)",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      ↓ Instalar AgroBrokerIA
    </button>
  );
}
