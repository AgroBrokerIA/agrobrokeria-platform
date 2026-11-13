"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type TipoDestino = "puerto_exportacion" | "molino_industrial" | "acopio_cooperativa" | "consumo_feedlot";
type Destino = {
  id_destino: number;
  tipo: TipoDestino;
  nombre_establecimiento: string;
  localidad: string;
  provincia: string;
  cuit_operador: string | null;
  verificado: boolean;
  activo: boolean;
  fuente_datos: string;
  direccion: string | null;
  creado_en: string;
  actualizado_en: string;
};
type FormState = {
  tipo: TipoDestino;
  nombre_establecimiento: string;
  localidad: string;
  provincia: string;
  cuit_operador: string;
  direccion: string;
  fuente_datos: string;
  activo: boolean;
};

const EMPTY: FormState = {
  tipo: "acopio_cooperativa",
  nombre_establecimiento: "",
  localidad: "",
  provincia: "Santa Fe",
  cuit_operador: "",
  direccion: "",
  fuente_datos: "",
  activo: true,
};
const TYPES: { value: TipoDestino; label: string }[] = [
  { value: "puerto_exportacion", label: "Puerto de exportación" },
  { value: "molino_industrial", label: "Molino industrial" },
  { value: "acopio_cooperativa", label: "Acopio / cooperativa" },
  { value: "consumo_feedlot", label: "Establecimiento de consumo / feedlot" },
];

export default function DestinosAdminPage() {
  const [rows, setRows] = useState<Destino[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("pendientes");
  const [editing, setEditing] = useState<Destino | null>(null);\n  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: admin, error: adminError } = await supabase.rpc("es_administrador_plataforma");
    if (adminError || admin !== true) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);
    const { data, error: loadError } = await supabase
      .from("destinos_homologados")
      .select("id_destino,tipo,nombre_establecimiento,localidad,provincia,cuit_operador,verificado,activo,fuente_datos,direccion,creado_en,actualizado_en")
      .order("provincia", { ascending: true })
      .order("localidad", { ascending: true })
      .order("nombre_establecimiento", { ascending: true });
    if (loadError) setError("No se pudo cargar el catálogo: " + loadError.message);
    setRows((data || []) as Destino[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es-AR");
    return rows.filter((r) => {
      const matchesText = !q || [r.nombre_establecimiento, r.cuit_operador, r.localidad, r.provincia, r.direccion]
        .some((v) => (v || "").toLocaleLowerCase("es-AR").includes(q));
      const matchesType = typeFilter === "todos" || r.tipo === typeFilter;
      const matchesStatus = statusFilter === "todos" || (statusFilter === "pendientes" ? !r.verificado : r.verificado);
      return matchesText && matchesType && matchesStatus;
    });
  }, [rows, query, typeFilter, statusFilter]);

  function startEdit(row: Destino) {
    setEditing(row);
    setForm({
      tipo: row.tipo,
      nombre_establecimiento: row.nombre_establecimiento,
      localidad: row.localidad,
      provincia: row.provincia,
      cuit_operador: row.cuit_operador || "",
      direccion: row.direccion || "",
      fuente_datos: row.fuente_datos || "",
      activo: row.activo,
    });
    setReviewNote("");
    setError("");
    setNotice("");
  }

  function startNew() {
    setEditing(null);
    setForm(EMPTY);
    setReviewNote("");
    setError("");
    setNotice("");
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      tipo: form.tipo,
      nombre_establecimiento: form.nombre_establecimiento.trim(),
      localidad: form.localidad.trim(),
      provincia: form.provincia.trim(),
      cuit_operador: form.cuit_operador.trim() || null,
      direccion: form.direccion.trim() || null,
      fuente_datos: form.fuente_datos.trim() || "Carga administrativa; documentación pendiente de revisión.",
      activo: form.activo,
      actualizado_en: new Date().toISOString(),
    };
    const result = editing
      ? await supabase.from("destinos_homologados").update(payload).eq("id_destino", editing.id_destino)
      : await supabase.from("destinos_homologados").insert({ ...payload, verificado: false });
    if (result.error) {
      setError("No se pudo guardar: " + result.error.message);
    } else {
      setNotice(editing ? "Datos del establecimiento actualizados." : "Destino incorporado al catálogo como pendiente de verificación.");
      setEditing(null);
      setForm(EMPTY);
      await load();
    }
    setSaving(false);
  }

  async function changeVerification(row: Destino, verified: boolean) {
    setError("");
    setNotice("");
    if (verified) {
      if (!row.cuit_operador?.trim() || !row.direccion?.trim() || !reviewNote.trim()) {
        setError("Para homologar, completá CUIT, dirección y la constancia de la verificación documental.");
        startEdit(row);
        return;
      }
      const accepted = window.confirm(
        "Confirmá que verificaste por una fuente documental oficial la razón social, CUIT, domicilio y establecimiento ACA. La plataforma no consulta ACA automáticamente."
      );
      if (!accepted) return;
    } else if (!window.confirm("¿Querés retirar la homologación de este destino? Los contratos nuevos no podrán seleccionarlo como destino homologado.")) {
      return;
    }
    const stamp = new Date().toLocaleString("es-AR");
    const auditLine = `\n[${stamp}] ${verified ? "HOMOLOGADO" : "HOMOLOGACIÓN RETIRADA"} por administrador. Constancia: ${reviewNote.trim() || "Sin observación adicional"}`;
    const { error: updateError } = await supabase
      .from("destinos_homologados")
      .update({
        verificado: verified,
        fuente_datos: (row.fuente_datos || "") + auditLine,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id_destino", row.id_destino);
    if (updateError) setError("No se pudo actualizar la homologación: " + updateError.message);
    else {
      setNotice(verified ? "Destino marcado como verificado. Revisá igualmente que la constancia quede archivada en el legajo." : "Homologación retirada.");
      setReviewNote("");
      await load();
    }
  }

  const label = (value: TipoDestino) => TYPES.find((t) => t.value === value)?.label || value;
  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "white", color: "#0f172a", marginTop: 5 };

  if (loading) return <main style={{ maxWidth: 1180, margin: "0 auto", padding: 28 }}>Cargando catálogo de destinos…</main>;
  if (!isAdmin) return <main style={{ maxWidth: 900, margin: "0 auto", padding: 28 }}><h1>Acceso restringido</h1><p>Esta sección está disponible únicamente para Administración.</p><Link href="/admin">Volver a Administración</Link></main>;

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: 24, color: "#0f172a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div><p style={{ color: "#0f766e", fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>ADMINISTRACIÓN · CATÁLOGO OPERATIVO</p><h1 style={{ fontSize: 28, fontWeight: 850 }}>Homologación de destinos de descarga</h1><p style={{ color: "#475569", marginTop: 6 }}>Revisá identidad fiscal, domicilio y establecimiento real antes de habilitarlo para contratos F1.</p></div>
        <Link href="/admin" style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 9 }}>← Administración</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, margin: "20px 0" }}>
        <Metric title="Destinos en catálogo" value={rows.length} />
        <Metric title="Pendientes de verificación" value={rows.filter((r) => !r.verificado).length} />
        <Metric title="Homologados" value={rows.filter((r) => r.verificado).length} />
        <Metric title="Activos" value={rows.filter((r) => r.activo).length} />
      </div>

      {error && <p role="alert" style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 12 }}>{error}</p>}
      {notice && <p role="status" style={{ background: "#dcfce7", color: "#166534", padding: 12, borderRadius: 8, marginBottom: 12 }}>{notice}</p>}

      <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Catálogo de establecimientos</h2>
          <button onClick={startNew} style={{ background: "#047857", color: "white", padding: "10px 14px", borderRadius: 8, fontWeight: 750 }}>+ Agregar destino</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginTop: 14 }}>
          <input aria-label="Buscar destino" placeholder="Buscar nombre, CUIT, localidad…" value={query} onChange={(e) => setQuery(e.target.value)} style={inputStyle} />
          <select aria-label="Filtrar por tipo" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}><option value="todos">Todos los tipos</option>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          <select aria-label="Filtrar por estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}><option value="pendientes">Pendientes de verificación</option><option value="verificados">Homologados</option><option value="todos">Todos los estados</option></select>
        </div>
        {filtered.length === 0 ? <p style={{ padding: 24, color: "#64748b" }}>No hay destinos que coincidan con los filtros.</p> : <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850, fontSize: 13 }}>
            <thead><tr style={{ textAlign: "left", background: "#f8fafc" }}>{["Establecimiento","Tipo","Localidad / Provincia","CUIT","Estado","Acciones"].map((x) => <th key={x} style={{ padding: 11, borderBottom: "1px solid #e2e8f0" }}>{x}</th>)}</tr></thead>
            <tbody>{filtered.map((r) => <tr key={r.id_destino}>
              <td style={{ padding: 11, borderBottom: "1px solid #e2e8f0" }}><strong>{r.nombre_establecimiento}</strong><div style={{ color: "#64748b", marginTop: 3 }}>{r.direccion || "Domicilio pendiente"}</div></td>
              <td style={{ padding: 11, borderBottom: "1px solid #e2e8f0" }}>{label(r.tipo)}</td>
              <td style={{ padding: 11, borderBottom: "1px solid #e2e8f0" }}>{r.localidad}, {r.provincia}</td>
              <td style={{ padding: 11, borderBottom: "1px solid #e2e8f0" }}>{r.cuit_operador || "Pendiente"}</td>
              <td style={{ padding: 11, borderBottom: "1px solid #e2e8f0" }}><span style={{ color: r.verificado ? "#166534" : "#92400e", background: r.verificado ? "#dcfce7" : "#fef3c7", borderRadius: 20, padding: "4px 8px", fontWeight: 700 }}>{r.verificado ? "Homologado" : "Pendiente"}</span><div style={{ color: "#64748b", marginTop: 5 }}>{r.activo ? "Activo" : "Inactivo"}</div></td>
              <td style={{ padding: 11, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}><button onClick={() => startEdit(r)} style={{ padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 7, marginRight: 6 }}>Editar</button><button onClick={() => startEdit(r)} style={{ padding: "7px 10px", border: "1px solid #0f766e", color: "#0f766e", borderRadius: 7 }}>{r.verificado ? "Revisar estado" : "Homologar"}</button></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>

      {formOpen && <section style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 14, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><h2 style={{ fontSize: 18, fontWeight: 800 }}>{editing ? "Editar / revisar establecimiento" : "Nuevo destino"}</h2><button onClick={() => { setEditing(null); setFormOpen(false); }} aria-label="Cerrar">✕</button></div>
        <form onSubmit={save}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 12 }}>
            <label>Tipo<select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoDestino })} style={inputStyle}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
            <label>Razón social / nombre<input required value={form.nombre_establecimiento} onChange={(e) => setForm({ ...form, nombre_establecimiento: e.target.value })} style={inputStyle} /></label>
            <label>CUIT operador<input value={form.cuit_operador} onChange={(e) => setForm({ ...form, cuit_operador: e.target.value })} placeholder="XX-XXXXXXXX-X" style={inputStyle} /></label>
            <label>Dirección del establecimiento<input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} style={inputStyle} /></label>
            <label>Localidad<input required value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })} style={inputStyle} /></label>
            <label>Provincia<input required value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} style={inputStyle} /></label>
            <label style={{ gridColumn: "1 / -1" }}>Fuente / constancia consultada<textarea required rows={3} value={form.fuente_datos} onChange={(e) => setForm({ ...form, fuente_datos: e.target.value })} placeholder="Indicar fuente oficial, fecha de consulta y referencia del documento revisado." style={inputStyle} /></label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Destino activo en el catálogo</label>
          <button disabled={saving} style={{ marginTop: 14, padding: "10px 16px", borderRadius: 8, background: "#047857", color: "white", fontWeight: 750 }}>{saving ? "Guardando…" : "Guardar datos"}</button>
        </form>
        {editing && <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 18, paddingTop: 16 }}>
          <h3 style={{ fontWeight: 800 }}>Control de homologación</h3>
          <p style={{ color: "#64748b", fontSize: 13, margin: "6px 0 10px" }}>La aprobación es manual. Antes de marcar como verificado, contrastá razón social, CUIT, domicilio y planta con documentación oficial. No existe una validación automática de ACA en esta pantalla.</p>
          <label>Constancia de revisión administrativa<textarea rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Ej.: constancia oficial consultada, fecha, organismo o documento y resultado." style={inputStyle} /></label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {!editing.verificado && <button onClick={() => void changeVerification(editing, true)} style={{ padding: "10px 14px", borderRadius: 8, background: "#047857", color: "white", fontWeight: 750 }}>Marcar como homologado</button>}
            {editing.verificado && <button onClick={() => void changeVerification(editing, false)} style={{ padding: "10px 14px", borderRadius: 8, background: "#b91c1c", color: "white", fontWeight: 750 }}>Retirar homologación</button>}
          </div>
        </div>}
      </section>}

      <p style={{ color: "#64748b", fontSize: 12 }}>El catálogo actual contiene registros iniciales pendientes de documentación. La marca «Homologado» representa una revisión administrativa manual; no implica integración automática con ACA, ARCA ni otros organismos.</p>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}><div style={{ color: "#64748b", fontSize: 12 }}>{title}</div><strong style={{ display: "block", fontSize: 26, marginTop: 5 }}>{value}</strong></div>;
}
