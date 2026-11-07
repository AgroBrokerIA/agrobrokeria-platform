"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  pais_id: number;
  representado_razon_social: string;
  representado_cuit: string;
  representado_sisa_categoria: string;
  base_precio_cbot: boolean;
  premium_cbot: string;
  humedad_maxima: string;
  materia_extrana_maxima: string;
  aflatoxinas_max_ppb: string;
  proteina_minima: string;
  granos_danados_maximos: string;
  granos_quebrados_maximos: string;
  instrumentos_pago_internacional: string[];
  tipo_buque: string;
  cantidad_envios: string;
  toneladas_por_envio: string;
  puerto_origen_destino: string;
  pais_destino: string;
};

type Puerto = {
  codigo: string;
  nombre: string;
  pais: string;
  provincia: string | null;
  localidad: string | null;
  tipo: string;
  source?: string;
};

type LugarRecepcion = {
  codigo: string;
  nombre: string;
  descripcion: string | null;
};

type GeoPais = { id: number; codigo_iso: string; nombre: string; region?: string | null };

async function obtenerEmpresaDelUsuario(): Promise<string | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("No hay un usuario autenticado.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_company_id,tipo_usuario")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw new Error(`No se pudo obtener el perfil: ${profileError.message}`);

  // El rol intermediario publica con su identidad personal, aunque exista
  // un contexto interno de plataforma asociado al perfil.
  const rol = String(profile?.tipo_usuario ?? "").trim().toLowerCase();
  if (rol.includes("comisionista") || rol.includes("intermediario")) return null;

  if (profile?.active_company_id) {
    // El perfil guarda el ID del directorio global (companies), mientras que
    // las publicaciones referencian el catálogo comercial legado (empresas).
    const { data: mapping, error: mappingError } = await supabase
      .from("company_empresa_map")
      .select("empresa_id")
      .eq("company_id", profile.active_company_id)
      .maybeSingle();

    if (mappingError) throw new Error(`No se pudo validar la empresa activa: ${mappingError.message}`);
    if (mapping?.empresa_id) {
      const { data: activeCompany, error: activeCompanyError } = await supabase
        .from("empresas")
        .select("id")
        .eq("id", mapping.empresa_id)
        .eq("activa", true)
        .maybeSingle();

      if (activeCompanyError) throw new Error(`No se pudo validar el contexto comercial: ${activeCompanyError.message}`);
      if (activeCompany?.id) return activeCompany.id;
    }
  }

  // Compatibilidad para perfiles antiguos cuyo active_company_id ya apunte
  // directamente a empresas.
  if (profile?.active_company_id) {
    const { data: legacyCompany } = await supabase
      .from("empresas")
      .select("id")
      .eq("id", profile.active_company_id)
      .eq("activa", true)
      .maybeSingle();
    if (legacyCompany?.id) return legacyCompany.id;
  }

  const { data: account } = await supabase
    .from("cuentas")
    .select("id")
    .eq("email", user.email ?? "")
    .maybeSingle();

  if (account?.id) {
    const { data, error } = await supabase
      .from("empresas")
      .select("id")
      .eq("cuenta_id", account.id)
      .eq("activa", true)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`No se pudo obtener la empresa: ${error.message}`);
    if (data?.id) return data.id;
  }

  throw new Error("Tu usuario no tiene una empresa activa vinculada.");
}

export default function NuevaPublicacionForm() {
  const router = useRouter();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [incoterms, setIncoterms] = useState<Incoterm[]>([]);
  const [puertos, setPuertos] = useState<Puerto[]>([]);
  const [lugares, setLugares] = useState<LugarRecepcion[]>([]);
  const [paises, setPaises] = useState<GeoPais[]>([]);
  const paisesPorRegion = useMemo(() => paises.reduce<Record<string, GeoPais[]>>((grupos, pais) => {
    const region = pais.region || "Otros territorios";
    (grupos[region] ||= []).push(pais);
    return grupos;
  }, {}), [paises]);

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
    pais_id: 1,
    representado_razon_social: "",
    representado_cuit: "",
    representado_sisa_categoria: "",
    base_precio_cbot: false,
    premium_cbot: "",
    humedad_maxima: "",
    materia_extrana_maxima: "",
    aflatoxinas_max_ppb: "",
    proteina_minima: "",
    granos_danados_maximos: "",
    granos_quebrados_maximos: "",
    instrumentos_pago_internacional: [],
    tipo_buque: "",
    cantidad_envios: "",
    toneladas_por_envio: "",
    puerto_origen_destino: "",
    pais_destino: "",
  });

  const [puertosSeleccionados, setPuertosSeleccionados] = useState<string[]>([]);
  const puertosSeleccionadosRef = useRef<string[]>([]);
  useEffect(() => { puertosSeleccionadosRef.current = puertosSeleccionados; }, [puertosSeleccionados]);
  const [lugaresSeleccionados, setLugaresSeleccionados] = useState<string[]>([]);
  const [busquedaPuerto, setBusquedaPuerto] = useState("");
  const [nuevoPuertoNombre, setNuevoPuertoNombre] = useState("");
  const [nuevoPuertoCiudad, setNuevoPuertoCiudad] = useState("");
  const [cargandoPuertos, setCargandoPuertos] = useState(false);
  const [lugarTemporal, setLugarTemporal] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [esIntermediario, setEsIntermediario] = useState(false);
  const [publicacionId, setPublicacionId] = useState<string | null>(null);

  useEffect(() => {
    void cargarDatos();
    void cargarPaises();
  }, []);

  async function cargarPaises() {
    const { data, error } = await supabase.from("paises").select("id,codigo_iso,nombre,region").eq("activo", true).order("nombre");
    if (error) { setError("No se pudo cargar el catálogo mundial: " + error.message); return; }
    const rows = (data ?? []) as GeoPais[];
    setPaises(rows);
    const argentina = rows.find((x) => x.codigo_iso === "AR");
    if (argentina) setForm((prev) => ({ ...prev, pais_id: argentina.id }));
  }

  useEffect(() => {
    const pais = paises.find((item) => item.id === Number(form.pais_id));
    if (!pais) { setPuertos([]); return; }
    let activo = true;
    const controller = new AbortController();
    setCargandoPuertos(true);
    const params = new URLSearchParams({ country: pais.codigo_iso });
    if (busquedaPuerto.trim().length >= 2) params.set("q", busquedaPuerto.trim());
    const timer = setTimeout(() => {
      fetch("/api/ports?" + params.toString(), { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "No se pudo consultar el catálogo de puertos.");
          return data;
        })
        .then((data) => { if (activo) setPuertos((actuales) => { const seleccionados = actuales.filter((puerto) => puertosSeleccionadosRef.current.includes(puerto.codigo)); return [...seleccionados, ...(Array.isArray(data.ports) ? data.ports.filter((puerto: Puerto) => !seleccionados.some((item) => item.codigo === puerto.codigo)) : [])]; }); })
        .catch((e) => { if (e.name !== "AbortError") { console.error("No se pudieron cargar los puertos:", e); if (activo) setPuertos([]); } })
        .finally(() => { if (activo) setCargandoPuertos(false); });
    }, busquedaPuerto.trim().length >= 2 ? 300 : 0);
    return () => { activo = false; clearTimeout(timer); controller.abort(); };
  }, [form.pais_id, paises, busquedaPuerto]);



  async function cargarDatos() {
    try {
      setCargando(true);
      setError("");

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase.from("profiles").select("tipo_usuario").eq("id", user.id).maybeSingle();
        const rol = String(perfil?.tipo_usuario ?? "").toLowerCase();
        setEsIntermediario(rol.includes("intermediario") || rol.includes("comisionista") || rol.includes("corredor"));
      }

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

      const [p, m, i, lugaresResult] = await Promise.all([
        obtenerProductos(),
        obtenerMonedas(),
        obtenerIncoterms(),
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
      setLugares((lugaresResult.data as LugarRecepcion[]) ?? []);

      if (!id) {
        setCargando(false);
        return;
      }

      const { data: publicacion, error: errorPublicacion } = await supabase
        .from("publicaciones")
        .select("id,tipo,producto_id,cantidad_tn,precio_tn,moneda_id,incoterm_id,pais_id,provincia,localidad,puerto,puertos,lugares_recepcion,calidad,humedad,proteina,observaciones,representado_razon_social,representado_cuit,representado_sisa_categoria,base_precio_cbot,premium_cbot,humedad_maxima,materia_extrana_maxima,aflatoxinas_max_ppb,proteina_minima,granos_danados_maximos,granos_quebrados_maximos,instrumentos_pago_internacional,tipo_buque,cantidad_envios,toneladas_por_envio,puerto_origen_destino,pais_destino")
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
        : publicacion.puerto ? [publicacion.puerto] : [];

      const lugaresGuardados = Array.isArray(publicacion.lugares_recepcion)
        ? publicacion.lugares_recepcion.filter(Boolean)
        : [];

      setPuertosSeleccionados(puertosGuardados);
      const puertosManualesGuardados = puertosGuardados.filter((codigo: string) => codigo.startsWith("MANUAL:")).map((codigo: string) => {
        const [, nombre = "", ciudad = "", pais = ""] = codigo.split(":");
        return { codigo, nombre: decodeURIComponent(nombre), localidad: decodeURIComponent(ciudad), pais: decodeURIComponent(pais), provincia: null, tipo: "Puerto ingresado manualmente", source: "Ingreso manual" } as Puerto;
      });
      if (puertosManualesGuardados.length) setPuertos((actuales) => [...actuales.filter((item) => !puertosManualesGuardados.some((manual) => manual.codigo === item.codigo)), ...puertosManualesGuardados]);
      setLugaresSeleccionados(lugaresGuardados);
      setForm({
        tipo: publicacion.tipo === "COMPRA" ? "COMPRA" : "VENTA",
        producto_id: Number(publicacion.producto_id),
        cantidad_tn: String(publicacion.cantidad_tn ?? ""),
        precio_tn: String(publicacion.precio_tn ?? ""),
        moneda_id: Number(publicacion.moneda_id),
        incoterm_id: Number(publicacion.incoterm_id),
        pais_id: Number(publicacion.pais_id ?? 1),
        representado_razon_social: (publicacion as any).representado_razon_social ?? "",
        representado_cuit: (publicacion as any).representado_cuit ?? "",
        representado_sisa_categoria: (publicacion as any).representado_sisa_categoria ?? "",
        base_precio_cbot: Boolean((publicacion as any).base_precio_cbot),
        premium_cbot: (publicacion as any).premium_cbot != null ? String((publicacion as any).premium_cbot) : "",
        humedad_maxima: (publicacion as any).humedad_maxima != null ? String((publicacion as any).humedad_maxima) : "",
        materia_extrana_maxima: (publicacion as any).materia_extrana_maxima != null ? String((publicacion as any).materia_extrana_maxima) : "",
        aflatoxinas_max_ppb: (publicacion as any).aflatoxinas_max_ppb != null ? String((publicacion as any).aflatoxinas_max_ppb) : "",
        proteina_minima: (publicacion as any).proteina_minima != null ? String((publicacion as any).proteina_minima) : "",
        granos_danados_maximos: (publicacion as any).granos_danados_maximos != null ? String((publicacion as any).granos_danados_maximos) : "",
        granos_quebrados_maximos: (publicacion as any).granos_quebrados_maximos != null ? String((publicacion as any).granos_quebrados_maximos) : "",
        instrumentos_pago_internacional: Array.isArray((publicacion as any).instrumentos_pago_internacional) ? (publicacion as any).instrumentos_pago_internacional : [],
        tipo_buque: (publicacion as any).tipo_buque ?? "",
        cantidad_envios: (publicacion as any).cantidad_envios != null ? String((publicacion as any).cantidad_envios) : "",
        toneladas_por_envio: (publicacion as any).toneladas_por_envio != null ? String((publicacion as any).toneladas_por_envio) : "",
        puerto_origen_destino: (publicacion as any).puerto_origen_destino ?? "",
        pais_destino: (publicacion as any).pais_destino ?? "",
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

  function actualizarCampo(campo: keyof Formulario, valor: string | number | boolean | string[]) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function alternarPuerto(codigo: string) {
    setPuertosSeleccionados((actuales) => {
      const nuevos = actuales.includes(codigo)
        ? actuales.filter((item) => item !== codigo)
        : [...actuales, codigo];
      setForm((anterior) => ({ ...anterior, puerto: nuevos[0] ?? "" }));
      return nuevos;
    });
  }

  function agregarPuertoManual() {
    const nombre = nuevoPuertoNombre.trim();
    if (!nombre) {
      setError("Escribí el nombre del puerto para agregarlo.");
      return;
    }
    const pais = paises.find((item) => item.id === Number(form.pais_id))?.nombre ?? "País no especificado";
    const ciudad = nuevoPuertoCiudad.trim();
    const codigo = "MANUAL:" + encodeURIComponent(nombre) + ":" + encodeURIComponent(ciudad) + ":" + encodeURIComponent(pais);
    const nuevo: Puerto = { codigo, nombre, pais, provincia: null, localidad: ciudad || null, tipo: "Puerto ingresado manualmente", source: "Ingreso manual" };
    setPuertos((actuales) => actuales.some((item) => item.codigo === codigo) ? actuales : [...actuales, nuevo]);
    setPuertosSeleccionados((actuales) => actuales.includes(codigo) ? actuales : [...actuales, codigo]);
    setForm((actual) => ({ ...actual, puerto: actual.puerto || codigo }));
    setNuevoPuertoNombre("");
    setNuevoPuertoCiudad("");
    setBusquedaPuerto("");
    setError("");
  }

  function obtenerPuertoSeleccionado(codigo: string): Puerto | undefined {
    const existente = puertos.find((item) => item.codigo === codigo);
    if (existente) return existente;
    if (!codigo.startsWith("MANUAL:")) return undefined;
    const [, nombre = "", ciudad = "", pais = ""] = codigo.split(":");
    try {
      return { codigo, nombre: decodeURIComponent(nombre), localidad: decodeURIComponent(ciudad) || null, pais: decodeURIComponent(pais), provincia: null, tipo: "Puerto ingresado manualmente", source: "Ingreso manual" };
    } catch {
      return { codigo, nombre: codigo, localidad: null, pais: "", provincia: null, tipo: "Puerto ingresado manualmente", source: "Ingreso manual" };
    }
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!form.producto_id) return setError("Seleccioná un producto.");
    if (esIntermediario && !form.representado_razon_social.trim()) return setError("Ingresá la razón social del productor o cliente representado.");
    if (esIntermediario && !/^[0-9]{11}$/.test(form.representado_cuit.replace(/\D/g, ""))) return setError("Ingresá un CUIT válido de 11 dígitos, sin puntos ni guiones.");
    if (!form.cantidad_tn || Number(form.cantidad_tn) <= 0) return setError("Ingresá una cantidad válida en toneladas.");
    if (form.precio_tn.trim() && Number(form.precio_tn) <= 0) return setError("El precio debe ser mayor que cero o quedar vacío.");

    try {
      setGuardando(true);

      const datos: Partial<Publicacion> = {
        tipo: form.tipo,
        producto_id: form.producto_id,
        cantidad_tn: Number(form.cantidad_tn),
        precio_tn: form.precio_tn.trim() ? Number(form.precio_tn) : null,
        moneda_id: form.moneda_id || null,
        incoterm_id: form.incoterm_id || null,
        provincia: form.provincia.trim() || null,
        localidad: form.localidad.trim() || null,
        puerto: form.puerto.trim() || puertosSeleccionados[0] || null,
        puertos: puertosSeleccionados,
        lugares_recepcion: lugaresSeleccionados,
        calidad: form.calidad.trim(),
        humedad: form.humedad ? Number(form.humedad) : null,
        proteina: form.proteina ? Number(form.proteina) : null,
        observaciones: form.observaciones.trim(),
        pais_id: form.pais_id || null,
        representado_razon_social: esIntermediario ? form.representado_razon_social.trim() : null,
        representado_cuit: esIntermediario ? form.representado_cuit.replace(/\D/g, "") : null,
        representado_sisa_categoria: esIntermediario ? form.representado_sisa_categoria.trim() || null : null,
        base_precio_cbot: form.base_precio_cbot,
        premium_cbot: form.premium_cbot.trim() ? Number(form.premium_cbot) : null,
        humedad_maxima: form.humedad_maxima.trim() ? Number(form.humedad_maxima) : null,
        materia_extrana_maxima: form.materia_extrana_maxima.trim() ? Number(form.materia_extrana_maxima) : null,
        aflatoxinas_max_ppb: form.aflatoxinas_max_ppb.trim() ? Number(form.aflatoxinas_max_ppb) : null,
        proteina_minima: form.proteina_minima.trim() ? Number(form.proteina_minima) : null,
        granos_danados_maximos: form.granos_danados_maximos.trim() ? Number(form.granos_danados_maximos) : null,
        granos_quebrados_maximos: form.granos_quebrados_maximos.trim() ? Number(form.granos_quebrados_maximos) : null,
        instrumentos_pago_internacional: form.instrumentos_pago_internacional,
        tipo_buque: form.tipo_buque.trim() || null,
        cantidad_envios: form.cantidad_envios.trim() ? Number(form.cantidad_envios) : null,
        toneladas_por_envio: form.toneladas_por_envio.trim() ? Number(form.toneladas_por_envio) : null,
        puerto_origen_destino: form.puerto_origen_destino.trim() || null,
        pais_destino: form.pais_destino.trim() || null,
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
        pais_id: paises.find((x) => x.codigo_iso === "AR")?.id ?? 1,
        representado_razon_social: "",
        representado_cuit: "",
        representado_sisa_categoria: "",
        base_precio_cbot: false,
        premium_cbot: "",
        humedad_maxima: "",
        materia_extrana_maxima: "",
        aflatoxinas_max_ppb: "",
        proteina_minima: "",
        granos_danados_maximos: "",
        granos_quebrados_maximos: "",
        instrumentos_pago_internacional: [],
        tipo_buque: "",
        cantidad_envios: "",
        toneladas_por_envio: "",
        puerto_origen_destino: "",
        pais_destino: "",
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
    <form onSubmit={guardar} className="publication-form">
      <h1>Nueva publicación</h1>

      {mensaje && <div style={{ padding: 12, borderRadius: 8, background: "#dcfce7", color: "#166534" }}>{mensaje}</div>}
      {error && <div style={{ padding: 12, borderRadius: 8, background: "#fee2e2", color: "#991b1b" }}>{error}</div>}

      {esIntermediario && <section className="publication-observations" aria-label="Datos del representado">
        <div className="publication-section-heading"><div><span className="publication-kicker">REPRESENTACIÓN COMERCIAL</span><h2>Datos del productor o cliente representado</h2><p>Como intermediario, indicá a nombre de quién publicás. Estos datos se validan y quedan asociados a la publicación.</p></div></div>
        <div className="publication-basic-grid">
          <label>Razón social del representado<input required value={form.representado_razon_social} onChange={(e) => actualizarCampo("representado_razon_social", e.target.value)} placeholder="Razón social completa" /></label>
          <label>CUIT del representado<input required inputMode="numeric" maxLength={13} value={form.representado_cuit} onChange={(e) => actualizarCampo("representado_cuit", e.target.value)} placeholder="30-12345678-9" /></label>
          <label>Categoría SISA (opcional)<input value={form.representado_sisa_categoria} onChange={(e) => actualizarCampo("representado_sisa_categoria", e.target.value)} placeholder="Categoría, si corresponde" /></label>
        </div>
      </section>}

      <div className="publication-basic-grid">
        <label>Tipo<select value={form.tipo} onChange={(e) => actualizarCampo("tipo", e.target.value as "VENTA" | "COMPRA")}><option value="VENTA">Venta</option><option value="COMPRA">Compra</option></select></label>
        <label>Producto<select required value={form.producto_id} onChange={(e) => actualizarCampo("producto_id", Number(e.target.value))}><option value={0} disabled>Seleccionar producto...</option>{productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}</select></label>
        <label>Cantidad (TN)<input type="number" min="0.01" step="0.01" value={form.cantidad_tn} onChange={(e) => actualizarCampo("cantidad_tn", e.target.value)} /></label>
        <label>Precio por TN (opcional)<input type="number" min="0.01" step="0.01" placeholder="Podés definirlo durante la negociación" value={form.precio_tn} onChange={(e) => actualizarCampo("precio_tn", e.target.value)} /></label>
        <label>Moneda<select value={form.moneda_id} onChange={(e) => actualizarCampo("moneda_id", Number(e.target.value))}>{monedas.map((moneda) => <option key={moneda.id} value={moneda.id}>{moneda.codigo} - {moneda.nombre}</option>)}</select></label>
        <label>Incoterm (opcional)<select value={form.incoterm_id} onChange={(e) => actualizarCampo("incoterm_id", Number(e.target.value))}><option value={0}>Sin definir por ahora</option>{incoterms.map((incoterm) => <option key={incoterm.id} value={incoterm.id}>{incoterm.codigo} - {incoterm.descripcion}</option>)}</select></label>
        <label>País de origen / ubicación
          <select value={form.pais_id} onChange={(e) => { actualizarCampo("pais_id", Number(e.target.value)); actualizarCampo("provincia", ""); actualizarCampo("localidad", ""); }}>
            <option value={0}>Seleccionar país...</option>
            {Object.entries(paisesPorRegion).sort(([a], [b]) => a.localeCompare(b)).map(([region, items]) => <optgroup key={region} label={region}>{items.map((pais) => <option key={pais.id} value={pais.id}>{pais.nombre}</option>)}</optgroup>)}
          </select>
        </label>
        <label>Provincia / Estado / Región (opcional)
          <input value={form.provincia} onChange={(e) => actualizarCampo("provincia", e.target.value)} placeholder="Escribir provincia, estado o región..." />
        </label>
        <label>Ciudad / localidad (opcional)
          <input value={form.localidad} onChange={(e) => actualizarCampo("localidad", e.target.value)} placeholder="Ingresar ciudad o localidad..." />
        </label>
      </div>

      <section className="publication-logistics">
        <div className="publication-section-heading">
          <div>
            <span className="publication-kicker">LOGÍSTICA INTERNACIONAL</span>
            <h2>Puertos de recepción / entrega</h2>
            <p>Buscá por nombre de puerto, ciudad, país o código UN/LOCODE. Podés seleccionar más de uno.</p>
          </div>
          <span className="publication-count">{puertosSeleccionados.length} seleccionados</span>
        </div>
        <div className="publication-search-wrap">
          <span aria-hidden="true">⌕</span>
          <input value={busquedaPuerto} onChange={(e) => setBusquedaPuerto(e.target.value)} placeholder="Ej.: Rotterdam, Santos, Shanghái, Buenos Aires..." aria-label="Buscar puerto en todo el mundo" />
          {busquedaPuerto && <button type="button" onClick={() => setBusquedaPuerto("")}>Limpiar búsqueda</button>}
        </div>
        <div className="publication-manual-port">
          <div className="publication-manual-port-heading">
            <strong>Agregar puerto manualmente</strong>
            <span>Si no aparece en el buscador, escribí sus datos y agregalo.</span>
          </div>
          <div className="publication-manual-port-fields">
            <label>Nombre del puerto
              <input value={nuevoPuertoNombre} onChange={(e) => setNuevoPuertoNombre(e.target.value)} placeholder="Ej.: Puerto de Guayaquil" />
            </label>
            <label>Ciudad / localidad (opcional)
              <input value={nuevoPuertoCiudad} onChange={(e) => setNuevoPuertoCiudad(e.target.value)} placeholder="Ej.: Guayaquil" />
            </label>
            <button type="button" onClick={agregarPuertoManual} disabled={!nuevoPuertoNombre.trim()}>＋ Agregar puerto</button>
          </div>
          <small>País asociado: {paises.find((item) => item.id === Number(form.pais_id))?.nombre ?? "Seleccioná un país arriba"}.</small>
        </div>
        <div className="publication-port-results">
          {cargandoPuertos ? <p className="publication-empty">Buscando puertos...</p> :
            puertos.length ? puertos.map((puerto) => {
              const checked = puertosSeleccionados.includes(puerto.codigo);
              return (
                <button type="button" key={puerto.codigo} onClick={() => alternarPuerto(puerto.codigo)} className={"publication-port-option" + (checked ? " selected" : "")} aria-pressed={checked}>
                  <span className="publication-check">{checked ? "✓" : "+"}</span>
                  <span className="publication-port-copy">
                    <strong>{puerto.nombre}</strong>
                    <small>{[puerto.localidad, puerto.provincia, puerto.pais].filter(Boolean).join(" · ")}</small>
                    <small className="publication-port-code">{puerto.codigo} · {puerto.source ?? "Catálogo"}</small>
                  </span>
                </button>
              );
            }) : <p className="publication-empty">{busquedaPuerto.trim().length < 2 ? "No hay puertos cargados para este país. Escribí al menos dos letras para buscar en el catálogo mundial." : "No encontramos puertos con ese nombre. Probá con otra escritura o con el nombre en inglés."}</p>}
        </div>
        {puertosSeleccionados.length > 0 && <div className="publication-chips publication-port-chips">
          {puertosSeleccionados.map((codigo) => {
            const puerto = obtenerPuertoSeleccionado(codigo);
            const nombre = puerto ? puerto.nombre + (puerto.pais ? " · " + puerto.pais : "") : codigo;
            return <span key={codigo}>{nombre}<button type="button" aria-label={"Quitar " + nombre} onClick={() => {
              setPuertosSeleccionados((actuales) => actuales.filter((item) => item !== codigo));
              if (form.puerto === codigo) actualizarCampo("puerto", puertosSeleccionados.find((item) => item !== codigo) ?? "");
            }}>×</button></span>;
          })}
        </div>}
        <div className="publication-selected-row">
          <label htmlFor="puerto-principal">Puerto principal</label>
          <select id="puerto-principal" value={form.puerto} onChange={(e) => actualizarCampo("puerto", e.target.value)}>
            <option value="">Seleccionar entre los puertos elegidos...</option>
            {puertosSeleccionados.map((codigo) => {
              const puerto = obtenerPuertoSeleccionado(codigo);
              return <option key={codigo} value={codigo}>{puerto ? puerto.nombre + (puerto.pais ? " · " + puerto.pais : "") : codigo}</option>;
            })}
          </select>
          <button type="button" onClick={() => { setPuertosSeleccionados([]); actualizarCampo("puerto", ""); }}>Quitar todos</button>
        </div>
      </section>

      <section className="publication-logistics publication-delivery">
        <div className="publication-section-heading">
          <div>
            <span className="publication-kicker">PUNTO DE OPERACIÓN</span>
            <h2>Lugar de recepción / entrega</h2>
            <p>Elegí las modalidades que correspondan. Podés agregar más de una.</p>
          </div>
          <span className="publication-count">{lugaresSeleccionados.length} opciones</span>
        </div>
        <div className="publication-delivery-picker">
          <select value={lugarTemporal} onChange={(e) => {
            const codigo = e.target.value;
            if (codigo && !lugaresSeleccionados.includes(codigo)) setLugaresSeleccionados((actuales) => [...actuales, codigo]);
            setLugarTemporal("");
          }}>
            <option value="">＋ Agregar lugar de recepción / entrega...</option>
            {lugares.filter((lugar) => !lugaresSeleccionados.includes(lugar.codigo)).map((lugar) => (
              <option key={lugar.codigo} value={lugar.codigo}>{lugar.nombre}</option>
            ))}
          </select>
        </div>
        {lugaresSeleccionados.length > 0 && <div className="publication-chips">
          {lugaresSeleccionados.map((codigo) => {
            const lugar = lugares.find((item) => item.codigo === codigo);
            return <span key={codigo}>{lugar?.nombre ?? codigo}<button type="button" aria-label={"Quitar " + (lugar?.nombre ?? codigo)} onClick={() => setLugaresSeleccionados((actuales) => actuales.filter((item) => item !== codigo))}>×</button></span>;
          })}
        </div>}
      </section>

      <details className="publication-optional-comex">
        <summary><span><strong>Condiciones internacionales (opcional)</strong><small>CBOT, calidad, instrumentos de pago y embarques. Completá solo lo que corresponda.</small></span><b>＋</b></summary>
        <div className="publication-optional-comex-body">
        <div className="publication-basic-grid">
          <label className="publication-checkbox"><input type="checkbox" checked={form.base_precio_cbot} onChange={(e) => actualizarCampo("base_precio_cbot", e.target.checked)} /> Precio de referencia CBOT</label>
          <label>Premium / diferencial CBOT<input type="number" step="0.01" value={form.premium_cbot} onChange={(e) => actualizarCampo("premium_cbot", e.target.value)} placeholder="Sin valor predeterminado" /></label>
          <label>Humedad máxima (%)<input type="number" step="0.01" value={form.humedad_maxima} onChange={(e) => actualizarCampo("humedad_maxima", e.target.value)} /></label>
          <label>Materia extraña máxima (%)<input type="number" step="0.01" value={form.materia_extrana_maxima} onChange={(e) => actualizarCampo("materia_extrana_maxima", e.target.value)} /></label>
          <label>Aflatoxinas máximas (ppb)<input type="number" step="0.01" value={form.aflatoxinas_max_ppb} onChange={(e) => actualizarCampo("aflatoxinas_max_ppb", e.target.value)} /></label>
          <label>Proteína mínima (%)<input type="number" step="0.01" value={form.proteina_minima} onChange={(e) => actualizarCampo("proteina_minima", e.target.value)} /></label>
          <label>Granos dañados máximos (%)<input type="number" step="0.01" value={form.granos_danados_maximos} onChange={(e) => actualizarCampo("granos_danados_maximos", e.target.value)} /></label>
          <label>Granos quebrados máximos (%)<input type="number" step="0.01" value={form.granos_quebrados_maximos} onChange={(e) => actualizarCampo("granos_quebrados_maximos", e.target.value)} /></label>
        </div>
        <div className="publication-basic-grid" style={{marginTop:16}}>
          <fieldset><legend>Instrumentos de pago internacional</legend>
            {["DLC","SBLC","TT"].map((instrumento) => <label key={instrumento} style={{display:"inline-flex",gap:8,marginRight:18,alignItems:"center"}}><input type="checkbox" checked={form.instrumentos_pago_internacional.includes(instrumento)} onChange={(e) => setForm((prev) => ({...prev,instrumentos_pago_internacional:e.target.checked?[...prev.instrumentos_pago_internacional,instrumento]:prev.instrumentos_pago_internacional.filter((x)=>x!==instrumento)}))}/>{instrumento}</label>)}
          </fieldset>
          <label>País de destino<input value={form.pais_destino} onChange={(e)=>actualizarCampo("pais_destino",e.target.value)} placeholder="País de destino comercial"/></label>
          <label>Puerto de origen / destino<input value={form.puerto_origen_destino} onChange={(e)=>actualizarCampo("puerto_origen_destino",e.target.value)} placeholder="Puerto y terminal, si corresponde"/></label>
          <label>Tipo de buque<input value={form.tipo_buque} onChange={(e)=>actualizarCampo("tipo_buque",e.target.value)} placeholder="Tipo de buque, si corresponde"/></label>
          <label>Cantidad de embarques<input type="number" min="1" step="1" value={form.cantidad_envios} onChange={(e)=>actualizarCampo("cantidad_envios",e.target.value)}/></label>
          <label>Toneladas por embarque<input type="number" min="0.01" step="0.01" value={form.toneladas_por_envio} onChange={(e)=>actualizarCampo("toneladas_por_envio",e.target.value)}/></label>
        </div>
        </div>
      </details>

      <section className="publication-quality">
        <label>Calidad<input value={form.calidad} onChange={(e) => actualizarCampo("calidad", e.target.value)} placeholder="Especificación comercial" /></label>
        <label>Humedad (%)<input type="number" step="0.01" value={form.humedad} onChange={(e) => actualizarCampo("humedad", e.target.value)} placeholder="0,00" /></label>
        <label>Proteína (%)<input type="number" step="0.01" value={form.proteina} onChange={(e) => actualizarCampo("proteina", e.target.value)} placeholder="0,00" /></label>
      </section>

      <section className="publication-observations">
        <div className="publication-section-heading">
          <div>
            <span className="publication-kicker">DETALLE DE LA OPERACIÓN</span>
            <h2>Observaciones y condiciones comerciales</h2>
            <p>Completá todos los datos que falten para que el comprador o vendedor conozca exactamente las condiciones.</p>
          </div>
          <button type="button" className="publication-template-button" onClick={() => actualizarCampo("observaciones", [
            "PUERTO / LUGAR DE ENTREGA:",
            "PAÍS, CIUDAD, TERMINAL Y DIRECCIÓN EXACTA:",
            "MODALIDAD DE ENTREGA (FOB, CIF, FCA, EN PLANTA, ETC.):",
            "CANTIDAD TOTAL Y TOLERANCIA:",
            "CRONOGRAMA: CANTIDAD POR ENTREGA, NÚMERO DE CAMIONES/BARCOS Y FRECUENCIA:",
            "FECHAS O VENTANA DE CARGA / DESCARGA:",
            "MODALIDAD DE PAGO (TRANSFERENCIA, CARTA DE CRÉDITO U OTRA):",
            "PLAZO DE PAGO Y CONDICIÓN QUE LO ACTIVA (FACTURA, CARGA, DESCARGA, DOCUMENTOS):",
            "MONEDA Y REFERENCIA DE PRECIO / AJUSTES:",
            "FLETE, SEGURO, CARGA, DESCARGA Y QUIÉN ASUME CADA COSTO:",
            "GASTOS PORTUARIOS, ALMACENAJE, DEMORAS Y RESPONSABLE:",
            "DOCUMENTACIÓN REQUERIDA (CONTRATO, FACTURA, CERTIFICADOS, ETC.):",
            "CALIDAD, HUMEDAD, PROTEÍNA, MUESTREO Y ANÁLISIS:",
            "TOLERANCIAS, MERMAS, RECHAZOS O PENALIDADES:",
            "VIGENCIA DE LA OFERTA Y PLAZO PARA ACEPTAR:",
            "OTRAS CONDICIONES COMERCIALES, LOGÍSTICAS O LEGALES:"
          ].join("\n"))}>Insertar guía de detalle</button>
        </div>
        <textarea className="publication-observations-input" value={form.observaciones} onChange={(e) => actualizarCampo("observaciones", e.target.value)} rows={9}
          placeholder={[
            "Detallá aquí todas las condiciones de la operación. Por ejemplo:",
            "",
            "• Puerto y terminal exacta de entrega.",
            "• Modalidad y plazo de pago (transferencia, días desde descarga, etc.).",
            "• Si la entrega será en una sola vez o en varias cargas; indicar cantidades y fechas.",
            "• Quién asume flete, carga, descarga y gastos portuarios.",
            "• Documentación, calidad, tolerancias y requisitos adicionales.",
            "• Cualquier condición comercial o logística que deba conocer la contraparte."
          ].join("\n")} />
        <small>Cuanto más completas sean las observaciones, menos dudas habrá durante la negociación y la formalización del contrato.</small>
      </section>

      <button type="submit" disabled={guardando} style={{ padding: 14, borderRadius: 8, border: "none", cursor: guardando ? "wait" : "pointer", background: "#16a34a", color: "white", fontSize: 16 }}>
        {guardando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Publicar"}
      </button>
    </form>
  );
}
