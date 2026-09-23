"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

const roles = [
  ["Comprador", "comprador"],
  ["Vendedor", "vendedor"],
  ["Corredor", "corredor"],
  ["Exportador", "exportador"],
  ["Acopio", "acopio"],
  ["Industria", "industria"],
  ["Intermediario", "intermediario"],
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    nombre: "", empresa: "", cuit: "", telefono: "", provincia: "",
    tipoUsuario: "comprador", email: "", password: "",
  });
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function registrarse() {
    if (!form.nombre.trim() || !form.email.trim() || form.password.length < 8) {
      alert("Completá nombre, correo y una contraseña de al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: {
        nombre: form.nombre.trim(), empresa: form.empresa.trim(), cuit: form.cuit.trim(),
        telefono: form.telefono.trim(), provincia: form.provincia.trim(),
        tipo_usuario: form.tipoUsuario,
      }},
    });
    setLoading(false);
    if (error) { alert(error.message); return; }
    alert("Cuenta creada correctamente. Revisá tu correo para confirmar la cuenta.");
    window.location.href = "/login";
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0f172a", color: "white" }}>
      <form onSubmit={(event) => { event.preventDefault(); void registrarse(); }}
        style={{ width: "100%", maxWidth: 460, display: "grid", gap: 12 }}>
        <h1 style={{ textAlign: "center", margin: "0 0 8px" }}>Registro AgroBroker IA</h1>
        <p style={{ textAlign: "center", color: "#cbd5e1", margin: "0 0 12px" }}>
          Creá tu cuenta para acceder al mercado agrocomercial.
        </p>
        {[
          ["nombre", "Nombre y apellido", "text"],
          ["empresa", "Empresa", "text"],
          ["cuit", "CUIT", "text"],
          ["telefono", "Teléfono", "tel"],
          ["provincia", "Provincia", "text"],
          ["email", "Correo electrónico", "email"],
          ["password", "Contraseña (mínimo 8 caracteres)", "password"],
        ].map(([field, placeholder, type]) => (
          <input key={field} type={type} placeholder={placeholder}
            value={form[field as keyof typeof form]}
            onChange={(e) => update(field as keyof typeof form, e.target.value)}
            required={field === "nombre" || field === "email" || field === "password"}
            minLength={field === "password" ? 8 : undefined}
            style={{ padding: 13, borderRadius: 8, border: "1px solid #334155", background: "#fff", color: "#0f172a" }} />
        ))}
        <select value={form.tipoUsuario} onChange={(e) => update("tipoUsuario", e.target.value)}
          style={{ padding: 13, borderRadius: 8 }}>
          {roles.map(([label, value]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" disabled={loading}
          style={{ padding: 14, background: loading ? "#64748b" : "#22c55e", color: "white", border: 0, borderRadius: 8, fontSize: 16, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </main>
  );
}
