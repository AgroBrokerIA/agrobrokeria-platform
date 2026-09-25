"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

const roles = [["Comprador","comprador"],["Vendedor","vendedor"],["Corredor","corredor"],["Exportador","exportador"],["Acopio","acopio"],["Industria","industria"],["Intermediario","intermediario"]];

export default function RegisterPage() {
  const [form, setForm] = useState({ nombre:"", empresa:"", cuit:"", telefono:"", provincia:"", tipoUsuario:"comprador", email:"", password:"", confirmPassword:"" });
  const [loading, setLoading] = useState(false);
  const [acepto, setAcepto] = useState(false);
  function update(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function registrarse() {
    if (!acepto) { alert("Debés aceptar los Términos y Condiciones y la Política de Privacidad."); return; }
    if (!form.nombre.trim() || !form.email.trim() || form.password.length < 8) { alert("Completá nombre, correo y una contraseña de al menos 8 caracteres."); return; } if (form.password !== form.confirmPassword) { alert("Las contraseñas no coinciden."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { data: { nombre:form.nombre.trim(), empresa:form.empresa.trim(), cuit:form.cuit.trim(), telefono:form.telefono.trim(), provincia:form.provincia.trim(), tipo_usuario:form.tipoUsuario } }});
    setLoading(false);
    if (error) { alert(error.message); return; }
    alert("Cuenta creada correctamente. Revisá tu correo para confirmar la cuenta.");
    window.location.href = "/login";
  }

  return (
    <main className="auth-page auth-register">
      <div className="auth-art"><Link href="/" className="auth-brand"><span>↗</span><strong>AgroBroker IA</strong></Link><div className="auth-art-copy"><span>CREÁ TU CUENTA</span><h1>Entrá al mercado<br />agrocomercial.</h1><p>Unificá publicaciones, negociación, contratos, logística y comisiones.</p></div><div className="auth-art-grain" aria-hidden="true" /></div>
      <section className="auth-panel">
        <div className="auth-card auth-register-card">
          <div className="auth-logo">↗</div><h1>Crear cuenta</h1><p>Unite a la red de negocios agropecuarios</p>
          <form onSubmit={(e) => { e.preventDefault(); void registrarse(); }}>
            <div className="auth-two-col"><label>Nombre completo<input type="text" placeholder="Nombre y apellido" value={form.nombre} onChange={(e)=>update("nombre",e.target.value)} required /></label><label>Empresa<input type="text" placeholder="Razón social" value={form.empresa} onChange={(e)=>update("empresa",e.target.value)} /></label></div>
            <div className="auth-two-col"><label>CUIT<input type="text" placeholder="20-12345678-9" value={form.cuit} onChange={(e)=>update("cuit",e.target.value)} /></label><label>Teléfono<input type="tel" placeholder="+54 9 ..." value={form.telefono} onChange={(e)=>update("telefono",e.target.value)} /></label></div>
            <div className="auth-two-col"><label>Provincia<input type="text" placeholder="Santa Fe" value={form.provincia} onChange={(e)=>update("provincia",e.target.value)} /></label><label>Tipo de usuario<select value={form.tipoUsuario} onChange={(e)=>update("tipoUsuario",e.target.value)}>{roles.map(([label,value])=><option key={value} value={value}>{label}</option>)}</select></label></div>
            <label>Correo electrónico<input type="email" placeholder="tu@email.com" value={form.email} onChange={(e)=>update("email",e.target.value)} required /></label>
            <div className="auth-two-col"><label>Contraseña<input type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e)=>update("password",e.target.value)} minLength={8} required /></label><label>Confirmar contraseña<input type="password" placeholder="Repetí la contraseña" value={form.confirmPassword} onChange={(e)=>update("confirmPassword",e.target.value)} minLength={8} required /></label></div>
            <label className="auth-legal-check"><input type="checkbox" checked={acepto} onChange={(e)=>setAcepto(e.target.checked)} /> Acepto la <Link href="/terminos">documentación legal vigente</Link>.</label><button className="auth-submit" type="submit" disabled={loading||!acepto}>{loading ? "Creando cuenta..." : "Crear cuenta"}</button>
          </form>
          <p className="auth-legal">Al registrarte aceptás nuestros Términos y Condiciones y Política de Privacidad.</p><p className="auth-switch">¿Ya tenés cuenta? <Link href="/login">Ingresá aquí</Link></p>
        </div>
      </section>
    </main>
  );
}
