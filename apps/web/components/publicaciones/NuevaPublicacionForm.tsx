"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  obtenerProductos,
  obtenerMonedas,
  obtenerIncoterms,
} from "@/app/nueva-publicacion/services/publicaciones";
import { supabase } from "@/lib/supabase/client";
import {
  crearPublicacion,
  actualizarPublicacion,
} from "@/app/nueva-publicacion/services/publicaciones";
import { Publicacion } from "@/types/publicacion";
import { Producto } from "@/types/producto";
import { Moneda } from "@/types/moneda";
import { Incoterm } from "@/types/incoterm";

type Formulario = {
  tipo: "VENTA" | "COMPRA";
  producto_id: number;
  cantidad_tn: string;
  precio_tn: string;
  moneda_id: number;
  incoterm_id: number;
  provincia: string;
  localidad: string;
  puerto: string;
  calidad: string;
  humedad: string;
  proteina: string;
  observaciones: string;
};

type Puerto = {
  codigo: string;
  nombre: string;
  pais: string;
  provincia: string | null;
  localidad: string | null;
  tipo: string;
};

type LugarRecepcion = {
  codigo: string;
  nombre: string;
  descripcion: string | null;
};

async function obtenerEmpresaDelUsuario() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("No hay un usuario autenticado.");
  }

  const { data, error } = await supabase
    .from("empresas")
    .select("id")
    .eq("cuenta_id", user.id)
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`No se pudo obtener la empresa: ${error.message}`);
  if (!data?.id) throw new Error("Tu usuario no tiene una empresa activa vinculada.");

  return data.id;
}

export default function NuevaPublicacionForm() {
  const router = useRouter();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [incoterms, setIncoterms] = useState<Incoterm[]>([]);
  const [puertos, setPuertos] = useState<Puerto[]>([]);
  const [lugares, setLugares] = useState<LugarRecepcion[]>([]);

  const [form, setForm] = useState<Formulario>({
    tipo: "VENTA",
    producto_id: 0,
    cantidad_tn: "",
    precio_tn: "",
    moneda_id: 0,
    incoterm_id: 0,
    provincia: "",
    localidad: "",
    puerto: "",
    calidad: "",
    humedad: "",
    proteina: "",
    observaciones: "",
  });

  const [puertosSeleccionados, setPuertosSeleccionados] = useState<string[]>([]);
  const [lugaresSeleccionados, setLugaresSeleccionados] = useState<string[]>([]);
  const [busquedaPuerto, setBusquedaPuerto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [publicacionId, setPublicacionId] = useState<string | null>(null);

  useEffect(() => {
    void cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setCargando(true);
      setError("");

      const parametros = new URLSearchParams(window.location.search);
      const id = parametros.get("id");
      const tipoQuery = parametros.get("tipo")?.toUpperCase();
      if (tipoQuery === "DEMANDA" || tipoQuery === "COMPRA") {
        setForm((anterior) => ({ ...anterior, tipo: "COMPRA" }));
      } else if (tipoQuery === "OFERTA" || tipoQuery === "VENTA") {
        setForm((anterior) => ({ ...anterior, tipo: "VENTA" }));
      }
      if (id) {
        setModoEdicion(true);
        setPublicacionId(id);
      }

      const [p, m, i, puertosResult, lugaresResult] = await Promise.all([
        obtenerProductos(),
        obtenerMonedas(),
        obtenerIncoterms(),
        supabase
          .from("catalogo_puertos")
          .select("codigo,nombre,pais,provincia,localidad,tipo")
          .eq("activo", true)
          .order("pais")
          .order("provincia")
          .order("nombre"),
        supabase
          .from("catalogo_lugares_recepcion")
          .select("codigo,nombre,descripcion")
          .eq("activo", true)
          .order("orden")
          .order("nombre"),
      ]);

      const productosData = (p.data as Producto[]) ?? [];
      const monedasData = (m.data as Moneda[]) ?? [];
      const incotermsData = (i.data as Incoterm[]) ?? [];

      setProductos(productosData);
      setMonedas(monedasData);
      setIncoterms(incotermsData);
      setPuertos((puertosResult.data as Puerto[]) ?? []);
      setLugares((lugaresResult.data as LugarRecepcion[]) ?? []);

      if (!id) {
        setCargando(false);
        return;
      }

      const { data: publicacion, error: errorPublicacion } = await supabase
        .from("publicaciones")
        .select("id,tipo,producto_id,cantidad_tn,precio_tn,moneda_id,incoterm_id,provincia,localidad,puerto,puertos,lugares_recepcion,calidad,humedad,proteina,observaciones")
        .eq("id", id)
        .single();

      if (errorPublicacion) {
        setError(`No se pudo cargar la publicación: ${errorPublicacion.message}`);
        return;
      }

      if (!publicacion) {
        setError("No se encontró la publicación.");
        return;
      }

      const puertosGuardados = Array.isArray(publicacion.puertos)
        ? publicacion.puertos.filter(Boolean)
        : publicacion.puerto
          ? [publicacion.puerto]
          : [];
      const lugaresGuardados = Array.isArray(publicacion.lugares_recepcion)
        ? publicacion.lugares_recepcion.filter(Boolean)
        : [];

      setPuertosSeleccionados(puertosGuardados);
      setLugaresSeleccionados(lugaresGuardados);
      setForm({
        tipo: publicacion.tipo === "COMPRA" ? "COMPRA" : "VENTA",
        producto_id: Number(publicacion.producto_id),
        cantidad_tn: String(publicacion.cantidad_tn ?? ""),
        precio_tn: String(publicacion.precio_tn ?? ""),
        moneda_id: Number(publicacion.moneda_id),
        incoterm_id: Number(publicacion.incoterm_id),
        provincia: publicacion.provincia ?? "",
        localidad: publicacion.localidad ?? "",
        puerto: puertosGuardados[0] ?? publicacion.puerto ?? "",
        calidad: publicacion.calidad ?? "",
        humedad: publicacion.humedad != null ? String(publicacion.humedad) : "",
        proteina: publicacion.proteina != null ? String(publicacion.proteina) : "",
        observaciones: publicacion.observaciones ?? "",
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
  }

  function actualizarCampo(campo: keyof Formulario, valor: string | number) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function alternarPuerto(codigo: string) {
    setPuertosSeleccionados((actuales) => {
      const nuevos = actuales.includes(codigo)
        ? actuales.filter((item) => item !== codigo)
        : [...actuales, codigo];
      const primerPuerto = nuevos[0] ?? "";
      setForm((anterior) => ({ ...anterior, puerto: primerPuerto }));
      return nuevos;
    });
  }

  function alternarLugar(codigo: string) {
    setLugaresSeleccionados((actuales) =>
      actuales.includes(codigo)
        ? actuales.filter((item) => item !== codigo)
        : [...actuales, codigo]
    );
  }

  const puertosFiltrados = useMemo(() => {
    const q = busquedaPuerto.trim().toLowerCase();
    if (!q) return puertos;
    return puertos.filter((p) =>
      [p.nombre, p.pais, p.provincia, p.localidad, p.tipo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [puertos, busquedaPuerto]);

  function seleccionarTodosLosPuertos() {
    const codigos = puertosFiltrados.map((p) => p.nombre);
    setPuertosSeleccionados((actuales) => {
      const nuevos = Array.from(new Set([...actuales, ...codigos]));
      setForm((anterior) => ({ ...anterior, puerto: nuevos[0] ?? "" }));
      return nuevos;
    });
  }

  function limpiarPuertos() {
    setPuertosSeleccionados([]);
    setForm((anterior) => ({ ...anterior, puerto: "" }));
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!form.producto_id) return setError("Seleccioná un producto.");
    if (!form.cantidad_tn || Number(form.cantidad_tn) <= 0) return setError("Ingresá una cantidad válida en toneladas.");
    if (!form.precio_tn || Number(form.precio_tn) <= 0) return setError("Ingresá un precio válido por tonelada.");
    if (!form.provincia.trim()) return setError("Ingresá la provincia.");
    if (!form.localidad.trim()) return setError("Ingresá la localidad.");
    if (puertosSeleccionados.length === 0) return setError("Seleccioná al menos un puerto de recepción o entrega.");
    if (lugaresSeleccionados.length === 0) return setError("Seleccioná al menos un tipo de lugar de recepción.");

    try {
      setGuardando(true);

      const datos: Partial<Publicacion> = {
        tipo: form.tipo,
        producto_id: form.producto_id,
        cantidad_tn: Number(form.cantidad_tn),
        precio_tn: Number(form.precio_tn),
        moneda_id: form.moneda_id,
        incoterm_id: form.incoterm_id,
        provincia: form.provincia.trim(),
        localidad: form.localidad.trim(),
        puerto: form.puerto.trim() || puertosSeleccionados[0],
        puertos: puertosSeleccionados,
        lugares_recepcion: lugaresSeleccionados,
        calidad: form.calidad.trim(),
        humedad: form.humedad ? Number(form.humedad) : null,
        proteina: form.proteina ? Number(form.proteina) : null,
        observaciones: form.observaciones.trim(),
      };

      if (modoEdicion && publicacionId) {
        const { error: errorActualizacion } = await actualizarPublicacion(publicacionId, datos);
        if (errorActualizacion) {
          setError(`No se pudieron guardar los cambios: ${errorActualizacion.message}`);
          return;
        }
        setMensaje("✅ Publicación actualizada correctamente.");
        setTimeout(() => router.push("/mis-publicaciones"), 700);
        return;
      }

      const empresaId = await obtenerEmpresaDelUsuario();
      const nuevaPublicacion: Publicacion = {
        empresa_id: empresaId,
        ...(datos as Omit<Publicacion, "empresa_id">),
        estado: "PUBLICADA",
      };

      const { data, error: errorInsertar } = await crearPublicacion(nuevaPublicacion);

      if (errorInsertar) {
        setError(`No se pudo publicar: ${errorInsertar.message}`);
        return;
      }

      console.log("Publicación creada:", data);
      setMensaje("✅ Publicación creada correctamente.");

      setForm({
        tipo: "VENTA",
        producto_id: 0,
        cantidad_tn: "",
        precio_tn: "",
        moneda_id: 0,
        incoterm_id: 0,
        provincia: "",
        localidad: "",
        puerto: "",
        calidad: "",
        humedad: "",
        proteina: "",
        observaciones: "",
      });
      setPuertosSeleccionados([]);
      setLugaresSeleccionados([]);

      setTimeout(() => router.push("/mis-publicaciones"), 700);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Ocurrió un error al publicar.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <div style={{ padding: 20 }}>Cargando formulario...</div>;

  return (
    <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1>Nueva publicación</h1>

      {mensaje && <div style={{ padding: 12, borderRadius: 8, background: "#dcfce7", color: "#166534" }}>{mensaje}</div>}
      {error && <div style={{ padding: 12, borderRadius: 8, background: "#fee2e2", color: "#991b1b" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <label>Tipo<select value={form.tipo} onChange={(e) => actualizarCampo("tipo", e.target.value as "VENTA" | "COMPRA")}><option value="VENTA">Venta</option><option value="COMPRA">Compra</option></select></label>
        <label>Producto<select value={form.producto_id} onChange={(e) => actualizarCampo("producto_id", Number(e.target.value))}>{productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}</select></label>
        <label>Cantidad (TN)<input type="number" min="0.01" step="0.01" value={form.cantidad_tn} onChange={(e) => actualizarCampo("cantidad_tn", e.target.value)} /></label>
        <label>Precio por TN<input type="number" min="0.01" step="0.01" value={form.precio_tn} onChange={(e) => actualizarCampo("precio_tn", e.target.value)} /></label>
        <label>Moneda<select value={form.moneda_id} onChange={(e) => actualizarCampo("moneda_id", Number(e.target.value))}>{monedas.map((moneda) => <option key={moneda.id} value={moneda.id}>{moneda.codigo} - {moneda.nombre}</option>)}</select></label>
        <label>Incoterm<select value={form.incoterm_id} onChange={(e) => actualizarCampo("incoterm_id", Number(e.target.value))}>{incoterms.map((incoterm) => <option key={incoterm.id} value={incoterm.id}>{incoterm.codigo} - {incoterm.descripcion}</option>)}</select></label>
        <label>Provincia<input value={form.provincia} onChange={(e) => actualizarCampo("provincia", e.target.value)} /></label>
        <label>Localidad<input value={form.localidad} onChange={(e) => actualizarCampo("localidad", e.target.value)} /></label>
      </div>

      <section style={{ border: "1px solid #dbe5e0", borderRadius: 14, padding: 18, background: "#f8fffb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Puertos de recepción / entrega</h2>
            <p style={{ margin: "5px 0 0", color: "#64748b" }}>Podés elegir uno, varios o todos los puertos que correspondan a esta publicación.</p>
          </div>
          <strong style={{ color: "#047857" }}>{puertosSeleccionados.length} seleccionados</strong>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <input value={busquedaPuerto} onChange={(e) => setBusquedaPuerto(e.target.value)} placeholder="Buscar puerto, provincia o localidad..." style={{ flex: "1 1 280px" }} />
          <button type="button" onClick={seleccionarTodosLosPuertos} style={{ padding: "9px 12px" }}>☑ Seleccionar visibles</button>
          <button type="button" onClick={limpiarPuertos} style={{ padding: "9px 12px" }}>Limpiar</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 8, marginTop: 14, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
          {puertosFiltrados.map((puerto) => {
            const checked = puertosSeleccionados.includes(puerto.nombre);
            return (
              <label key={puerto.codigo} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 11, borderRadius: 10, border: checked ? "1px solid #10b981" : "1px solid #e2e8f0", background: checked ? "#ecfdf5" : "#fff", cursor: "pointer" }}>
                <input type="checkbox" checked={checked} onChange={() => alternarPuerto(puerto.nombre)} style={{ marginTop: 3 }} />
                <span>
                  <strong style={{ display: "block" }}>{puerto.nombre}</strong>
                  <small style={{ color: "#64748b" }}>{[puerto.localidad, puerto.provincia, puerto.pais].filter(Boolean).join(" · ")}</small>
                </span>
              </label>
            );
          })}
        </div>

        <label style={{ display: "block", marginTop: 14 }}>
          Puerto principal
          <select value={form.puerto} onChange={(e) => actualizarCampo("puerto", e.target.value)}>
            <option value="">Seleccionar puerto principal...</option>
            {puertos.filter((p) => puertosSeleccionados.includes(p.nombre)).map((p) => <option key={p.codigo} value={p.nombre}>{p.nombre}</option>)}
          </select>
        </label>
      </section>

      <section style={{ border: "1px solid #dbe5e0", borderRadius: 14, padding: 18, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Lugares donde recibir / entregar</h2>
            <p style={{ margin: "5px 0 0", color: "#64748b" }}>Marcá todas las modalidades de recepción que acepta la operación.</p>
          </div>
          <strong style={{ color: "#047857" }}>{lugaresSeleccionados.length} opciones</strong>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10, marginTop: 14 }}>
          {lugares.map((lugar) => {
            const checked = lugaresSeleccionados.includes(lugar.codigo);
            return (
              <label key={lugar.codigo} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 10, border: checked ? "1px solid #10b981" : "1px solid #e2e8f0", background: checked ? "#ecfdf5" : "#fff", cursor: "pointer" }}>
                <input type="checkbox" checked={checked} onChange={() => alternarLugar(lugar.codigo)} style={{ marginTop: 3 }} />
                <span><strong style={{ display: "block" }}>{lugar.nombre}</strong><small style={{ color: "#64748b" }}>{lugar.descripcion}</small></span>
              </label>
            );
          })}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <label>Calidad<input value={form.calidad} onChange={(e) => actualizarCampo("calidad", e.target.value)} /></label>
        <label>Humedad (%)<input type="number" step="0.01" value={form.humedad} onChange={(e) => actualizarCampo("humedad", e.target.value)} /></label>
        <label>Proteína (%)<input type="number" step="0.01" value={form.proteina} onChange={(e) => actualizarCampo("proteina", e.target.value)} /></label>
      </div>

      <label>Observaciones<textarea value={form.observaciones} onChange={(e) => actualizarCampo("observaciones", e.target.value)} rows={4} /></label>

      <button type="submit" disabled={guardando} style={{ padding: 14, borderRadius: 8, border: "none", cursor: guardando ? "wait" : "pointer", background: "#16a34a", color: "white", fontSize: 16 }}>
        {guardando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Publicar"}
      </button>
    </form>
  );
}
