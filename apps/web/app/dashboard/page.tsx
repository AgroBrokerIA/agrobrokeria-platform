"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Profile = { nombre: string | null; empresa: string | null; tipo_usuario: string | null };

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { window.location.href = "/login"; return; }
      setEmail(auth.user.email ?? "");
      const { data } = await supabase.from("profiles").select("nombre,empresa,tipo_usuario").eq("id", auth.user.id).maybeSingle();
      setProfile(data);
      setLoading(false);
    }
    void load();
  }, []);

  if (loading) return <main style={{ padding: 32 }}>Cargando panel...</main>;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 28 }}>
        <p style={{ color: "#64748b", margin: 0 }}>AgroBroker IA</p>
        <h1 style={{ margin: "4px 0", fontSize: 32 }}>Hola, {profile?.nombre || email || "usuario"} 👋</h1>
        <p style={{ color: "#64748b" }}>{profile?.empresa || "Configurá tu empresa para comenzar a operar."}</p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
        <Link href="/marketplace" style={card}><strong>🌾 Marketplace</strong><span>Consultá publicaciones y enviá ofertas.</span></Link>
        <Link href="/operaciones" style={card}><strong>📋 Operaciones</strong><span>Seguimiento de acuerdos, firmas, fondos, logística y liquidación.</span></Link>
        <Link href="/configuracion" style={card}><strong>⚙️ Configuración</strong><span>Empresas y medios de cobro.</span></Link>
        <Link href="/empresas" style={card}><strong>🏢 Empresas</strong><span>Revisá las empresas vinculadas a tu cuenta.</span></Link>
        <Link href="/medios-cobro" style={card}><strong>🏦 Medios de cobro</strong><span>Administrá cómo recibir tus comisiones.</span></Link>
      </section>

      <section style={{ marginTop: 28, padding: 20, border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff" }}>
        <h2 style={{ marginTop: 0 }}>Estado de la cuenta</h2>
        <p style={{ marginBottom: 6 }}><strong>Correo:</strong> {email}</p>
        <p style={{ margin: 0 }}><strong>Perfil comercial:</strong> {profile?.tipo_usuario || "Sin definir"}</p>
      </section>
    </main>
  );
}

const card = {
  textDecoration: "none",
  color: "#0f172a",
  padding: 20,
  borderRadius: 14,
  background: "#fff",
  border: "1px solid #e2e8f0",
  display: "grid",
  gap: 8,
};
