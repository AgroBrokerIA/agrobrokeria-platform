"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { supabase } from "../../lib/supabase";

function asJsonRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

type Viaje = {
  id: string;
  operacion_id: string;
  estado: string;
  transportista_profile_id: string | null;
  origen: string | null;
  destino: string | null;
  origen_nombre: string | null;
  destino_nombre: string | null;
  patente_camion: string | null;
  patente_acoplado: string | null;
  kilos_cargados: number | null;
  kilos_entregados: number | null;
  carta_porte_ctg?: string | null;
  carta_porte_tn?: number | null;
  entregado_confirmado_at: string | null;
  transportista_entrega_confirmada_por?: string | null;
  transportista_entrega_confirmada_at?: string | null;
  transportista_kilos_entregados?: number | null;
  productor_recepcion_confirmada_por?: string | null;
  productor_recepcion_confirmada_at?: string | null;
  productor_kilos_recibidos?: number | null;
  productor_recepcion_observaciones?: string | null;
  productor_recepcion_observada_at?: string | null;
  transportista_entrega_evidencia_path?: string | null;
  productor_recepcion_evidencia_path?: string | null;
};

type Transportista = {
  profile_id: string;
  nombre_completo: string;
  empresa_transporte: string | null;
  telefono: string | null;
  foto_perfil_path: string | null;
};
type VehiculoRegistrado={id:string;patente:string;tipo:string;capacidad_tn:number|null;habilitado:boolean};

type CartaPorte = {
  id: string;
  viaje_id: string;
  numero_carta_porte: string;
  archivo_path: string;
  nombre_archivo: string;
  kilos_declarados: number | null;
  toneladas_declaradas: number | null;
  estado_verificacion: string;
  observaciones: string | null;
};

type Evento = {
  id: string;
  viaje_id: string;
  estado: string;
  lugar: string | null;
  empresa_nombre: string | null;
  toneladas: number | null;
  observaciones: string | null;
  registrado_at: string;
};

const COMISION_PLATAFORMA_USD_POR_TN=1;

type ComisionViaje = {
  viaje_id: string;
  toneladas_entregadas: number;
  valor_por_tn?: number | null;
  importe_asignado?: number | null;
  importe_liberado: number;
  estado: string;
};
type Corredor = { profile_id: string; nombre: string | null; email: string | null };
type Autorizacion = { id: string; corredor_profile_id: string; autorizado_at: string; revocado_at: string | null; motivo: string | null };

const ETAPAS = [
  ["CAMION_ASIGNADO", "Camión asignado"],
  ["ARRIBO_ORIGEN", "Arribo a planta de origen"],
  ["INICIO_CARGA", "Inicio de carga"],
  ["CARGA_FINALIZADA", "Carga finalizada"],
  ["SALIDA_ORIGEN", "Salida de origen"],
  ["EN_TRANSITO", "En tránsito"],
  ["ARRIBO_DESTINO", "Arribo a destino"],
  ["INICIO_DESCARGA", "Inicio de descarga"],
  ["DESCARGA_FINALIZADA", "Descarga finalizada"],
] as const;

const estadoLabel = (estado: string) =>
  ({
    ASIGNADO: "Camión asignado",
    CAMION_ASIGNADO: "Camión asignado",
    ARRIBO_ORIGEN: "Arribo a planta de origen",
    INICIO_CARGA: "Inicio de carga",
    CARGA_FINALIZADA: "Carga finalizada",
    SALIDA_ORIGEN: "Salida de origen",
    EN_TRANSITO: "En tránsito",
    ARRIBO_DESTINO: "Arribo a destino",
    INICIO_DESCARGA: "Inicio de descarga",
    DESCARGA_FINALIZADA: "Descarga finalizada",
    ESPERANDO_RECEPCION_PRODUCTOR: "Pendiente de recepción del productor",
    ENTREGADO_CONFIRMADO: "Recepción confirmada por productor",
    ENTREGA_CONFIRMADA: "Entrega confirmada",
    ENTREGA_TRANSPORTISTA_CONFIRMADA: "Entrega confirmada por transportista",
    RECEPCION_PRODUCTOR_CONFIRMADA: "Recepción confirmada por productor",
    OBSERVADO: "Incidencia de recepción",
  })[estado] || estado.replaceAll("_", " ");

const fecha = (value?: string | null) =>
  value ? new Date(value).toLocaleString("es-AR") : "—";

const panel: CSSProperties = {
  border: "1px solid #dbe3ed",
  borderRadius: 13,
  background: "#fff",
  padding: 15,
  display: "grid",
  gap: 12,
};
const input: CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: 41,
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "8px 10px",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
};
const primary: CSSProperties = {
  minHeight: 39,
  border: 0,
  borderRadius: 9,
  padding: "8px 13px",
  background: "#078b58",
  color: "#fff",
  fontWeight: 750,
  cursor: "pointer",
};
const secondary: CSSProperties = {
  minHeight: 38,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "7px 12px",
  background: "#fff",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
};

export default function LogisticaEntrega({
  operacionId,
  onEntregaConfirmada,
}: {
  operacionId: string;
  onEntregaConfirmada?: () => Promise<boolean>;
}) {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [transportistas, setTransportistas] = useState<Transportista[]>([]);
  const [vehiculosDisponibles,setVehiculosDisponibles]=useState<VehiculoRegistrado[]>([]);
  const [vehiculoCamionId,setVehiculoCamionId]=useState("");
  const [vehiculoAcopladoId,setVehiculoAcopladoId]=useState("");
  const [cartas, setCartas] = useState<CartaPorte[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [comisiones, setComisiones] = useState<ComisionViaje[]>([]);
  const [corredores, setCorredores] = useState<Corredor[]>([]);
  const [autorizaciones, setAutorizaciones] = useState<Autorizacion[]>([]);
  const [busquedaCorredor, setBusquedaCorredor] = useState("");
  const [corredorSeleccionado, setCorredorSeleccionado] = useState("");
  const [loading, setLoading] = useState(true);
  const [esTransportista, setEsTransportista] = useState(false);
  const [esProductor, setEsProductor] = useState(false);
  const [esAdminPlataforma, setEsAdminPlataforma] = useState(false);
  const evidenceCounter = useRef(0);
  const [profileId, setProfileId] = useState("");
  const [evidenciasTransportista, setEvidenciasTransportista] = useState<Record<string, File | null>>({});
  const [evidenciasProductor, setEvidenciasProductor] = useState<Record<string, File | null>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [transportistaId, setTransportistaId] = useState("");
  const [origenNombre, setOrigenNombre] = useState("");
  const [origenDireccion, setOrigenDireccion] = useState("");
  const [destinoNombre, setDestinoNombre] = useState("");
  const [destinoDireccion, setDestinoDireccion] = useState("");
  const [patente, setPatente] = useState("");
  const [acoplado, setAcoplado] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    const [v, t, c, e, m, a] = await Promise.all([
      supabase.from("viajes").select("*").eq("operacion_id", operacionId).order("creado_en", { ascending: true }),
      supabase.rpc("listar_transportistas_verificados", { p_operacion_id: operacionId }),
      supabase.from("viaje_cartas_porte").select("*").eq("operacion_id", operacionId).order("creada_at", { ascending: false }),
      supabase.from("viaje_eventos").select("*").eq("operacion_id", operacionId).order("registrado_at", { ascending: true }),
      supabase.from("operacion_comision_viajes").select("*").eq("operacion_id", operacionId),
      supabase.from("operacion_carta_porte_autorizaciones").select("*").eq("operacion_id", operacionId).order("autorizado_at", { ascending: false }),
    ]);
    if (v.error) setError("No se pudieron cargar los viajes: " + v.error.message);
    else setViajes((v.data || []) as Viaje[]);
    if (t.error && !String(t.error.message).includes("listar_transportistas_verificados")) {
      setError((actual) => actual || "No se pudieron cargar los transportistas: " + t.error.message);
    } else setTransportistas((t.data || []) as Transportista[]);
    if (c.error) setError((actual) => actual || "No se pudieron cargar las cartas de porte: " + c.error.message);
    else setCartas((c.data || []) as CartaPorte[]);
    if (e.error) setError((actual) => actual || "No se pudo cargar el seguimiento: " + e.error.message);
    else setEventos((e.data || []) as Evento[]);
    if (m.error) setError((actual) => actual || "No se pudieron cargar las comisiones por viaje: " + m.error.message);
    else setComisiones((m.data || []) as ComisionViaje[]);
    if (a.error) setError((actual) => actual || "No se pudieron cargar las autorizaciones: " + a.error.message);
    else setAutorizaciones((a.data || []) as Autorizacion[]);
    setLoading(false);
  }, [operacionId]);

  useEffect(() => {
    void cargar();
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setProfileId(auth.user.id);
      const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle();
      setEsAdminPlataforma(Boolean(admin));
      const { data } = await supabase.from("profiles").select("tipo_usuario,active_company_id").eq("id", auth.user.id).maybeSingle();
      setEsTransportista(String(data?.tipo_usuario || "").toLowerCase().includes("transportista"));
      if (data?.active_company_id) {
        const { data: mappedCompanies } = await supabase.from("company_empresa_map")
          .select("empresa_id").eq("company_id", data.active_company_id).eq("verified", true);
        const empresaIds = [...new Set([data.active_company_id, ...(mappedCompanies || []).map((item: any) => item.empresa_id)])];
        const { data: participant } = await supabase.from("operacion_participantes")
          .select("rol").eq("operacion_id", operacionId).in("empresa_id", empresaIds);
        setEsProductor((participant || []).some((p: any) => ["vendedor", "productor", "seller"].includes(String(p.rol || "").toLowerCase())));
      }
    })();
  }, [cargar]);

  const resumen = useMemo(() => ({
    viajes: viajes.length,
    entregados: viajes.filter((v) => v.estado === "ENTREGADO_CONFIRMADO").length,
    toneladas: comisiones.reduce((n, x) => n + Number(x.toneladas_entregadas || 0), 0),
    comision: comisiones.reduce((n, x) => n + Number(x.importe_liberado || 0), 0),
    comisionPendiente: viajes.reduce((n,v)=>{
      const c=comisiones.find(x=>x.viaje_id===v.id);
      if(c)return n+Math.max(Number(c.importe_asignado||0)-Number(c.importe_liberado||0),0);
      return n+(v.carta_porte_ctg?Number(v.carta_porte_tn||0)*COMISION_PLATAFORMA_USD_POR_TN:0);
    },0),
  }), [viajes, comisiones]);

  async function buscarCorredores() {
    const { data, error: rpcError } = await supabase.rpc("buscar_corredores_para_autorizar", { p_operacion_id: operacionId, p_texto: busquedaCorredor || undefined });
    if (rpcError) setError("No se pudieron buscar corredores: " + rpcError.message);
    else setCorredores((data || []) as Corredor[]);
  }

  async function autorizarCorredor() {
    if (!corredorSeleccionado) return;
    setGuardando(true);
    const { error: rpcError } = await supabase.rpc("autorizar_corredor_cartas_porte", { p_operacion_id: operacionId, p_corredor_profile_id: corredorSeleccionado, p_motivo: "Acceso documental autorizado para esta operación." });
    if (rpcError) setError("No se pudo autorizar al corredor: " + rpcError.message);
    else { setMensaje("Acceso a las Cartas de Porte autorizado."); setCorredorSeleccionado(""); await cargar(); }
    setGuardando(false);
  }

  async function revocarCorredor(id: string) {
    setGuardando(true);
    const { error: rpcError } = await supabase.rpc("revocar_corredor_cartas_porte", { p_autorizacion_id: id });
    if (rpcError) setError("No se pudo revocar el acceso: " + rpcError.message);
    else { setMensaje("Acceso del corredor revocado."); await cargar(); }
    setGuardando(false);
  }

  async function verFotoTransportista(path: string | null) {
    if (!path) { setError("El transportista todavía no cargó su fotografía."); return; }
    const { data, error: signedError } = await supabase.storage.from("agrobroker-private").createSignedUrl(path, 90);
    if (signedError || !data?.signedUrl) { setError("No se pudo abrir la fotografía: " + (signedError?.message || "sin enlace")); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function seleccionarTransportista(id:string){
    setTransportistaId(id);setVehiculosDisponibles([]);setVehiculoCamionId("");setVehiculoAcopladoId("");setPatente("");setAcoplado("");
    if(!id)return;
    const {data,error:vehicleError}=await supabase.rpc("listar_vehiculos_transportista",{p_operacion_id:operacionId,p_transportista_profile_id:id});
    if(vehicleError){setError("No se pudieron cargar los dominios registrados: "+vehicleError.message);return;}
    const rows=(data||[]) as VehiculoRegistrado[];setVehiculosDisponibles(rows);
    const truck=rows.find(x=>String(x.tipo).toUpperCase()==="CAMION");
    const trailer=rows.find(x=>String(x.tipo).toUpperCase()==="ACOPLADO");
    if(truck){setVehiculoCamionId(truck.id);setPatente(truck.patente);}
    if(trailer){setVehiculoAcopladoId(trailer.id);setAcoplado(trailer.patente);}
  }

  async function crearViaje() {
    setError("");
    setMensaje("");
    if (!transportistaId || !vehiculoCamionId || !origenNombre.trim() || !destinoNombre.trim()) {
      setError("Seleccioná transportista, camión registrado, origen y destino.");
      return;
    }
    setGuardando(true);
    const { data, error: rpcError } = await supabase.rpc("crear_viaje_operacion_con_vehiculos", {
      p_operacion_id: operacionId,
      p_transportista_profile_id: transportistaId,
      p_vehiculo_id: vehiculoCamionId || "",
      p_acoplado_vehiculo_id: vehiculoAcopladoId || "",
      p_origen: origenDireccion || origenNombre,
      p_destino: destinoDireccion || destinoNombre,
      p_origen_nombre: origenNombre,
      p_destino_nombre: destinoNombre,
    });
    if (rpcError) setError("No se pudo crear el viaje: " + rpcError.message);
    else {
      setMensaje("Viaje creado y transportista asignado correctamente.");
      setTransportistaId("");
      setVehiculosDisponibles([]);
      setVehiculoCamionId("");
      setVehiculoAcopladoId("");
      setPatente("");
      setAcoplado("");
      await cargar();
    }
    setGuardando(false);
  }

  async function subirCartas(viaje: Viaje, files: FileList | null) {
    if (!files?.length) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Solo se permiten archivos PDF de Cartas de Porte.");
        continue;
      }
      const numero = viaje.carta_porte_ctg || window.prompt("Número de Carta de Porte que figura en " + file.name);
      if(viaje.carta_porte_ctg && numero) setMensaje("Se vinculará el PDF al CTG oficial "+viaje.carta_porte_ctg+".");
      if (!numero?.trim()) continue;
      const kilosText = window.prompt("Confirmá los kilos netos declarados en el PDF. Se revisarán antes de liberar comisión.",String(viaje.kilos_cargados||""));
      if (!kilosText?.trim() || !Number.isFinite(Number(kilosText)) || Number(kilosText) <= 0) {
        setError("No se cargó " + file.name + ": los kilos declarados deben ser un número mayor a cero.");
        continue;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = "cpe/" + operacionId + "/" + viaje.id + "/" + file.lastModified + "-" + file.size + "-" + (++evidenceCounter.current) + "-" + safeName;
      const upload = await supabase.storage.from("agrobroker-private").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upload.error) {
        setError("No se pudo subir " + file.name + ": " + upload.error.message);
        continue;
      }
      const { error: insertError } = await supabase.from("viaje_cartas_porte").insert({
        viaje_id: viaje.id,
        operacion_id: operacionId,
        numero_carta_porte: numero.trim(),
        archivo_path: path,
        nombre_archivo: file.name,
        kilos_declarados: Number(kilosText),
        toneladas_declaradas: Number(kilosText) / 1000,
        estado_verificacion: "PENDIENTE_REVISION",
      });
      if (insertError) {
        await supabase.storage.from("agrobroker-private").remove([path]);
        setError("El PDF " + file.name + " se subió pero no se pudo registrar: " + insertError.message);
      }
    }
    await cargar();
    setMensaje("Carga de documentos finalizada. Las cartas quedan pendientes de revisión; todavía no habilitan comisiones.");
    setGuardando(false);
  }

  async function abrirCarta(path: string) {
    const { data, error: signedError } = await supabase.storage.from("agrobroker-private").createSignedUrl(path, 90);
    if (signedError || !data?.signedUrl) {
      setError("No se pudo abrir el PDF: " + (signedError?.message || "enlace no disponible"));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function validarCarta(carta: CartaPorte) {
    const kilos = window.prompt("Revisá el PDF y confirmá los kilos exactos declarados en la Carta de Porte:", String(carta.kilos_declarados || ""));
    if (!kilos || !Number.isFinite(Number(kilos)) || Number(kilos) <= 0) return;
    setGuardando(true);
    const { error: rpcError } = await supabase.rpc("validar_carta_porte_viaje", {
      p_carta_porte_id: carta.id,
      p_kilos_declarados: Number(kilos),
      p_observaciones: "Cantidad revisada contra el PDF cargado.",
    });
    if (rpcError) setError("No se pudo validar la carta: " + rpcError.message);
    else setMensaje("Carta de Porte validada. La comisión se liberará cuando el comprador confirme la entrega.");
    await cargar();
    setGuardando(false);
  }

  async function registrarEtapa(viaje: Viaje, estado: string) {
    const lugar = estado === "ARRIBO_ORIGEN" || estado === "INICIO_CARGA" || estado === "CARGA_FINALIZADA" || estado === "SALIDA_ORIGEN"
      ? (viaje.origen || viaje.origen_nombre || "")
      : (viaje.destino || viaje.destino_nombre || "");
    const empresa = estado === "ARRIBO_ORIGEN" || estado === "INICIO_CARGA" || estado === "CARGA_FINALIZADA" || estado === "SALIDA_ORIGEN"
      ? (viaje.origen_nombre || "")
      : (viaje.destino_nombre || "");
    setGuardando(true);
    const { error: rpcError } = await supabase.rpc("registrar_evento_viaje", {
      p_viaje_id: viaje.id,
      p_estado: estado,
      p_lugar: lugar,
      p_empresa_nombre: empresa,
    });
    if (rpcError) setError("No se pudo actualizar el seguimiento: " + rpcError.message);
    else setMensaje("Seguimiento actualizado: " + estadoLabel(estado));
    await cargar();
    setGuardando(false);
  }

  async function abrirEvidenciaEntrega(path?: string | null) {
    if (!esAdminPlataforma) { setError("Solo Administración puede abrir evidencias de entrega."); return; }
    if (!path) return;
    const { data, error: urlError } = await supabase.storage.from("documentos-operacion").createSignedUrl(path, 300);
    if (urlError || !data?.signedUrl) { setError(urlError?.message || "No se pudo abrir la evidencia."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function resolverIncidenciaRecepcion(viaje: Viaje) {
    if (!esAdminPlataforma) { setError("Solo Administración puede resolver incidencias."); return; }
    const motivo = window.prompt("Describí la resolución administrativa y el motivo para reabrir la confirmación del productor:")?.trim();
    if (!motivo) return;
    setGuardando(true); setError(""); setMensaje("");
    const { error: rpcError } = await supabase.rpc("resolver_incidencia_recepcion_viaje", {
      p_viaje_id: viaje.id, p_observaciones: motivo
    });
    if (rpcError) setError("No se pudo resolver la incidencia: " + rpcError.message);
    else setMensaje("Incidencia revisada por Administración. Se reabrió la recepción; el productor debe confirmar nuevamente con evidencia.");
    await cargar(); setGuardando(false);
  }

  async function confirmarEntregaTransportista(viaje: Viaje) {
    const cartaValidada = cartas.find((c) => c.viaje_id === viaje.id && c.estado_verificacion === "VALIDADA");
    if (!cartaValidada) { setError("Primero debe validarse la Carta de Porte de este camión."); return; }
    const kilos = window.prompt("Ingresá los kilos que descargaste y entregaste en destino:", String(cartaValidada.kilos_declarados || ""));
    if (!kilos || !Number.isFinite(Number(kilos)) || Number(kilos) <= 0) return;
    if (Number(kilos) > Number(cartaValidada.kilos_declarados)) { setError("Los kilos entregados no pueden superar los validados en la Carta de Porte."); return; }
    if (!window.confirm("¿Confirmás que entregaste " + (Number(kilos) / 1000).toLocaleString("es-AR") + " toneladas? El productor deberá confirmar la recepción.")) return;
    const evidencia = evidenciasTransportista[viaje.id];
    if (!evidencia) { setError("Adjuntá evidencia de entrega (PDF, JPG o PNG) antes de confirmar."); return; }
    if (!["application/pdf","image/jpeg","image/png"].includes(evidencia.type) || evidencia.size<=0 || evidencia.size>10*1024*1024) {
      setError("La evidencia debe ser PDF, JPG o PNG y no superar 10 MB."); return;
    }
    setGuardando(true); setError(""); setMensaje("");
    let evidencePath: string | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Iniciá sesión nuevamente.");
      const safeName = evidencia.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100);
      evidencePath = `${operacionId}/logistica/${viaje.id}/entrega/${auth.user.id}-${evidencia.lastModified}-${evidencia.size}-${++evidenceCounter.current}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("documentos-operacion")
        .upload(evidencePath,evidencia,{contentType:evidencia.type,upsert:false});
      if (uploadError) throw uploadError;
      const { error: rpcError } = await supabase.rpc("confirmar_entrega_transportista", {
        p_viaje_id: viaje.id, p_kilos_entregados: Number(kilos),
        p_observaciones: "Entrega declarada por el transportista.", p_evidencia_path: evidencePath
      });
      if (rpcError) throw rpcError;
      setEvidenciasTransportista((current)=>({...current,[viaje.id]:null}));
      setMensaje("Entrega registrada con evidencia. Ya enviamos una notificación al receptor. Si no responde, recibirá recordatorios automáticos a las 2, 12, 24 y 48 horas. La comisión permanece retenida hasta validar la recepción.");
    } catch (e) {
      if (evidencePath) await supabase.storage.from("documentos-operacion").remove([evidencePath]);
      setError(e instanceof Error ? e.message : "No se pudo registrar la entrega del transportista.");
    }
    await cargar(); setGuardando(false);
  }

  async function confirmarRecepcionProductor(viaje: Viaje, aceptar: boolean) {
    const kilosReferencia = Number(viaje.transportista_kilos_entregados || 0);
    const kilos = window.prompt(
      aceptar ? "Confirmá los kilos efectivamente recibidos:" : "Ingresá los kilos que recibiste para registrar la diferencia:",
      String(kilosReferencia || "")
    );
    if (!kilos || !Number.isFinite(Number(kilos)) || Number(kilos) <= 0) return;
    let observaciones = "";
    if (!aceptar) {
      observaciones = window.prompt("Describí la diferencia, faltante, daño o motivo de observación:") || "";
      if (!observaciones.trim()) { setError("Para reportar una incidencia es obligatorio describirla."); return; }
    }
    if (aceptar && Number(kilos) !== kilosReferencia) {
      setError("Los kilos recibidos no coinciden con los informados por el transportista. Usá «Reportar diferencia o incidencia» para dejar constancia y mantener la operación bloqueada.");
      return;
    }
    if (aceptar && !window.confirm("¿Confirmás la recepción conforme de " + (Number(kilos) / 1000).toLocaleString("es-AR") + " toneladas? La comisión seguirá sujeta a conciliación y cierre.")) return;
    const evidencia = evidenciasProductor[viaje.id];
    if (!evidencia) { setError("Adjuntá evidencia de recepción o de la incidencia (PDF, JPG o PNG)."); return; }
    if (!["application/pdf","image/jpeg","image/png"].includes(evidencia.type) || evidencia.size<=0 || evidencia.size>10*1024*1024) {
      setError("La evidencia debe ser PDF, JPG o PNG y no superar 10 MB."); return;
    }
    setGuardando(true); setError(""); setMensaje("");
    let evidencePath: string | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Iniciá sesión nuevamente.");
      const safeName = evidencia.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100);
      evidencePath = `${operacionId}/logistica/${viaje.id}/recepcion/${auth.user.id}-${evidencia.lastModified}-${evidencia.size}-${++evidenceCounter.current}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("documentos-operacion")
        .upload(evidencePath,evidencia,{contentType:evidencia.type,upsert:false});
      if (uploadError) throw uploadError;
      const { data: resultadoRecepcion, error: rpcError } = await supabase.rpc("confirmar_recepcion_productor", {
        p_viaje_id: viaje.id, p_kilos_recibidos: Number(kilos),
        p_confirmar: aceptar, p_observaciones: observaciones || "", p_evidencia_path: evidencePath
      });
      if (rpcError) throw rpcError;
      const recepcionData = asJsonRecord(resultadoRecepcion);
      setEvidenciasProductor((current)=>({...current,[viaje.id]:null}));
      if (!aceptar) {
        setMensaje("Incidencia registrada con evidencia. La operación y la comisión permanecen bloqueadas hasta su resolución.");
      } else {
        const { data: confirmaciones, error: consultaError } = await supabase
          .from("viajes")
          .select("id,transportista_entrega_confirmada_at,productor_recepcion_confirmada_at,estado,productor_recepcion_observada_at")
          .eq("operacion_id", operacionId);
        if (consultaError) {
          setError("Recepción guardada, pero no se pudo comprobar el cierre de todos los viajes: " + consultaError.message);
        } else {
          const todosConfirmados = Boolean(confirmaciones?.length) && confirmaciones!.every((item: any) =>
            item.transportista_entrega_confirmada_at && item.productor_recepcion_confirmada_at &&
            item.estado === "ENTREGADO_CONFIRMADO" && !item.productor_recepcion_observada_at
          );
          if (todosConfirmados && onEntregaConfirmada) {
            const avanzada = await onEntregaConfirmada();
            setMensaje(avanzada
              ? (recepcionData?.comision_liberada === true
                ? "Doble conformidad completa. La operación pasó a Liquidación y la comisión quedó liberada contablemente."
                : "Doble conformidad completa. La operación pasó a Liquidación; la comisión permanece retenida hasta verificar la transferencia.")
              : "Doble conformidad registrada. La operación requiere revisar el avance de etapa desde Administración.");
          } else {
            setMensaje(recepcionData?.comision_liberada === true
              ? "Recepción confirmada. La comisión quedó liberada contablemente."
              : "Recepción del productor confirmada. Quedan otros viajes pendientes de doble conformidad; la comisión permanece retenida.");
          }
        }
      }
    } catch (e) {
      if (evidencePath) await supabase.storage.from("documentos-operacion").remove([evidencePath]);
      setError(e instanceof Error ? e.message : "No se pudo registrar la recepción.");
    }
    await cargar(); setGuardando(false);
  }

  if (loading) return <div style={{ padding: 18, color: "#64748b" }}>Cargando viajes, cartas de porte y seguimiento…</div>;

  return (
    <div style={{ display: "grid", gap: 15, minWidth: 0, color: "#0f172a" }}>
      <section style={{ ...panel, background: "#f8fafc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 850, fontSize: 16 }}>🚚 Transporte y seguimiento por camión</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Cada camión tiene su propio viaje, carta de porte, eventos y liquidación parcial.</div>
          </div>
          <button type="button" style={secondary} disabled={guardando} onClick={() => void cargar()}>Actualizar</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
          {[
            ["Camiones", resumen.viajes],
            ["Entregados", resumen.entregados],
            ["TN confirmadas", resumen.toneladas.toLocaleString("es-AR", { maximumFractionDigits: 3 })],
            ["Comisión liberada", "USD " + resumen.comision.toLocaleString("es-AR", { maximumFractionDigits: 2 })],
            ["Comisión por liberar", "USD " + resumen.comisionPendiente.toLocaleString("es-AR", { maximumFractionDigits: 2 })],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, minWidth: 0 }}>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 850, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      {!esTransportista && <section style={panel}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Acceso documental para corredores</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Autoriza únicamente la consulta de Cartas de Porte de esta operación. No habilita acceso a logística, transportistas ni seguimiento.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
          <input value={busquedaCorredor} onChange={e => setBusquedaCorredor(e.target.value)} placeholder="Nombre o email del corredor" style={input} />
          <button type="button" style={secondary} onClick={() => void buscarCorredores()}>Buscar</button>
        </div>
        {corredores.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={corredorSeleccionado} onChange={e => setCorredorSeleccionado(e.target.value)} style={{ ...input, flex: 1 }}>
            <option value="">Seleccionar corredor</option>
            {corredores.map(x => <option key={x.profile_id} value={x.profile_id}>{x.nombre || "Corredor"}{x.email ? " — " + x.email : ""}</option>)}
          </select>
          <button type="button" style={primary} disabled={guardando || !corredorSeleccionado} onClick={() => void autorizarCorredor()}>Autorizar</button>
        </div>}
        {autorizaciones.map(a => <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, border: "1px solid #e2e8f0", borderRadius: 8, padding: 9 }}>
          <span style={{ fontSize: 12 }}>{a.corredor_profile_id.slice(0,8)} · {a.revocado_at ? "Acceso revocado" : "Acceso activo"}</span>
          {!a.revocado_at && <button type="button" style={secondary} disabled={guardando} onClick={() => void revocarCorredor(a.id)}>Revocar</button>}
        </div>)}
      </section>}
      {!esTransportista && <section style={panel}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Asignar un camión</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Solo aparecen transportistas verificados. Al seleccionarlos, se muestran únicamente los dominios registrados a su nombre y se completan automáticamente.</div>
        </div>
        <div style={{ padding: 10, borderRadius: 9, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: 12 }}>Para asignar un camión deben existir un cierre formal de logística aprobado por Administración y un camión habilitado registrado a nombre del transportista. La aprobación de la comisión logística es un requisito previo; no se genera automáticamente al abrir esta pantalla.</div>
        {transportistas.length===0&&<div style={{ padding: 10, borderRadius: 9, background: "#fff1f2", border: "1px solid #fecaca", color: "#9f1239", fontSize: 12 }}>No hay transportistas verificados y habilitados para esta operación. Administración debe completar la verificación correspondiente.</div>}
        {transportistaId&&vehiculosDisponibles.filter(v=>String(v.tipo).toUpperCase()==="CAMION").length===0&&<div style={{ padding: 10, borderRadius: 9, background: "#fff1f2", border: "1px solid #fecaca", color: "#9f1239", fontSize: 12 }}>El transportista seleccionado no tiene un camión habilitado registrado. Debe registrar el vehículo y completar su habilitación antes de asignarlo.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 700 }}>Transportista
            <select value={transportistaId} onChange={(e) => void seleccionarTransportista(e.target.value)} style={input}>
              <option value="">Seleccionar transportista verificado</option>
              {transportistas.map((t) => <option key={t.profile_id} value={t.profile_id}>{t.nombre_completo}{t.empresa_transporte ? " — " + t.empresa_transporte : ""}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 700 }}>Camión registrado
            <select value={vehiculoCamionId} onChange={e=>{setVehiculoCamionId(e.target.value);setPatente(vehiculosDisponibles.find(v=>v.id===e.target.value)?.patente||"")}} style={input} disabled={!transportistaId}>
              <option value="">Seleccionar dominio del camión</option>
              {vehiculosDisponibles.filter(v=>String(v.tipo).toUpperCase()==="CAMION").map(v=><option key={v.id} value={v.id}>{v.patente}{v.capacidad_tn?" · "+v.capacidad_tn+" TN":""}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 700 }}>Empresa / productor de origen
            <input value={origenNombre} onChange={(e) => setOrigenNombre(e.target.value)} placeholder="Nombre exacto de planta, productor o acopio" style={input} />
          </label>
          <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 700 }}>Dirección de origen
            <input value={origenDireccion} onChange={(e) => setOrigenDireccion(e.target.value)} placeholder="Localidad, provincia y dirección" style={input} />
          </label>
          <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 700 }}>Empresa / acopio de destino
            <input value={destinoNombre} onChange={(e) => setDestinoNombre(e.target.value)} placeholder="Nombre exacto del comprador o destino" style={input} />
          </label>
          <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 700 }}>Dirección de destino
            <input value={destinoDireccion} onChange={(e) => setDestinoDireccion(e.target.value)} placeholder="Localidad, provincia y dirección" style={input} />
          </label>
          <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 700 }}>Acoplado registrado (opcional)
            <select value={vehiculoAcopladoId} onChange={e=>{setVehiculoAcopladoId(e.target.value);setAcoplado(vehiculosDisponibles.find(v=>v.id===e.target.value)?.patente||"")}} style={input} disabled={!transportistaId}>
              <option value="">Sin acoplado</option>
              {vehiculosDisponibles.filter(v=>String(v.tipo).toUpperCase()==="ACOPLADO").map(v=><option key={v.id} value={v.id}>{v.patente}</option>)}
            </select>
          </label>
        </div>
        <div><button type="button" style={primary} disabled={guardando} onClick={() => void crearViaje()}>{guardando ? "Guardando…" : "Crear viaje y asignar transportista"}</button></div>
      </section>}

      {error && <div role="alert" style={{ padding: 11, borderRadius: 9, border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", fontSize: 13 }}>{error}</div>}
      {mensaje && <div role="status" style={{ padding: 11, borderRadius: 9, border: "1px solid #a7f3d0", background: "#ecfdf5", color: "#166534", fontSize: 13 }}>{mensaje}</div>}

      {viajes.length === 0 && <div style={{ ...panel, color: "#64748b", textAlign: "center" }}>Todavía no hay camiones asignados a esta operación.</div>}

      {viajes.map((viaje, index) => {
        const cartasViaje = cartas.filter((c) => c.viaje_id === viaje.id);
        const eventosViaje = eventos.filter((e) => e.viaje_id === viaje.id);
        const comisionViaje = comisiones.find((c) => c.viaje_id === viaje.id);
        const ultimoEvento = eventosViaje[eventosViaje.length - 1];
        const siguienteEtapa = ETAPAS.find(([key]) => !eventosViaje.some((e) => e.estado === key));
        const transportista = transportistas.find((t) => t.profile_id === viaje.transportista_profile_id);
        return (
          <section key={viaje.id} style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 850 }}>Camión {index + 1} · {viaje.patente_camion || "Patente pendiente"}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{viaje.origen_nombre || viaje.origen || "Origen pendiente"} → {viaje.destino_nombre || viaje.destino || "Destino pendiente"}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Transportista: {transportista?.nombre_completo || (viaje.transportista_profile_id ? "Asignado" : "Sin asignar")} · Identidad: transportista verificado</div>
                {viaje.carta_porte_ctg&&<div style={{fontSize:12,color:"#047857",marginTop:4,fontWeight:750}}>CTG ARCA: {viaje.carta_porte_ctg} · Volumen declarado: {Number(viaje.carta_porte_tn||0).toLocaleString("es-AR",{maximumFractionDigits:3})} TN</div>}
                {(()=>{const tn=Number(viaje.carta_porte_tn||0);const asignada=comisionViaje?Number(comisionViaje.importe_asignado||0):tn*COMISION_PLATAFORMA_USD_POR_TN;const liberada=Number(comisionViaje?.importe_liberado||0);const pendiente=Math.max(asignada-liberada,0);return <div style={{fontSize:12,color:"#334155",marginTop:5,padding:"8px 10px",borderRadius:8,background:"#f8fafc",border:"1px solid #e2e8f0"}}><strong>Comisión de este transporte:</strong> {Number(comisionViaje?.toneladas_entregadas||tn).toLocaleString("es-AR",{maximumFractionDigits:3})} TN · Asignada / estimada USD {asignada.toLocaleString("es-AR",{maximumFractionDigits:2})} · Liberada USD {liberada.toLocaleString("es-AR",{maximumFractionDigits:2})} · Por liberar USD {pendiente.toLocaleString("es-AR",{maximumFractionDigits:2})} · {comisionViaje?.estado||"ESTIMADA · PENDIENTE DE VALIDACIÓN"}</div>})()}
                {transportista?.foto_perfil_path && <button type="button" style={{ ...secondary, marginTop: 7 }} onClick={() => void verFotoTransportista(transportista.foto_perfil_path)}>Ver fotografía del conductor</button>}
              </div>
              <span style={{ padding: "6px 10px", borderRadius: 99, background: viaje.estado === "ENTREGADO_CONFIRMADO" ? "#dcfce7" : "#eaf2ff", color: viaje.estado === "ENTREGADO_CONFIRMADO" ? "#166534" : "#1d4ed8", fontSize: 11, fontWeight: 800 }}>{estadoLabel(viaje.estado)}</span>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Cartas de Porte del camión</div>
              {cartasViaje.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", padding: 10, border: "1px solid #e2e8f0", borderRadius: 9 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 750 }}>CPE {c.numero_carta_porte}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{c.nombre_archivo} · {c.kilos_declarados ? (Number(c.kilos_declarados) / 1000).toLocaleString("es-AR") + " TN" : "Cantidad pendiente"} · {c.estado_verificacion === "VALIDADA" ? "Validada" : c.estado_verificacion === "OBSERVADA" ? "Observada" : "Pendiente de revisión"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <button type="button" style={secondary} onClick={() => void abrirCarta(c.archivo_path)}>Ver PDF</button>
                    {!esTransportista && c.estado_verificacion !== "VALIDADA" && viaje.estado !== "ENTREGADO_CONFIRMADO" && <button type="button" style={primary} disabled={guardando} onClick={() => void validarCarta(c)}>Revisar cantidad del PDF</button>}
                  </div>
                </div>
              ))}
              {!esTransportista && <label style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, fontWeight: 750, color: "#0f766e" }}>
                <input type="file" accept="application/pdf,.pdf" multiple disabled={guardando || viaje.estado === "ENTREGADO_CONFIRMADO"} onChange={(e) => { void subirCartas(viaje, e.target.files); e.currentTarget.value = ""; }} />
                Cargar uno o varios PDF de Cartas de Porte
              </label>}
              {!esTransportista && <div style={{ fontSize: 11, color: "#64748b" }}>El número y los kilos se ingresan según cada PDF. La cantidad queda pendiente hasta que un participante autorizado revise el documento.</div>}
            </div>

            <div style={{ display: "grid", gap: 9 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Línea de tiempo del viaje</div>
              {eventosViaje.length === 0 && <div style={{ color: "#64748b", fontSize: 12 }}>Sin movimientos registrados.</div>}
              <div style={{ display: "grid", gap: 8 }}>
                {eventosViaje.map((evento) => (
                  <div key={evento.id} style={{ display: "grid", gridTemplateColumns: "12px minmax(0,1fr)", gap: 9 }}>
                    <div style={{ display: "flex", justifyContent: "center" }}><span style={{ width: 9, height: 9, borderRadius: 99, background: "#078b58", marginTop: 4 }} /></div>
                    <div style={{ borderLeft: "2px solid #d1fae5", padding: "0 0 8px 10px", marginLeft: -6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>{estadoLabel(evento.estado)}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{evento.empresa_nombre || ""}{evento.lugar ? " · " + evento.lugar : ""} · {fecha(evento.registrado_at)}</div>
                      {evento.observaciones && <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{evento.observaciones}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {siguienteEtapa && viaje.estado !== "ENTREGADO_CONFIRMADO" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button type="button" style={secondary} disabled={guardando} onClick={() => void registrarEtapa(viaje, siguienteEtapa[0])}>Registrar: {siguienteEtapa[1]}</button>
                  {ultimoEvento && <span style={{ fontSize: 11, color: "#64748b" }}>Último movimiento: {estadoLabel(ultimoEvento.estado)}</span>}
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Transportista: {viaje.transportista_entrega_confirmada_at ? "confirmado el " + fecha(viaje.transportista_entrega_confirmada_at) : "pendiente"} · Productor: {viaje.productor_recepcion_confirmada_at ? "recepción confirmada el " + fecha(viaje.productor_recepcion_confirmada_at) : viaje.productor_recepcion_observada_at ? "incidencia registrada" : "pendiente"}.
                La comisión de este camión se libera contablemente cuando estén completas ambas confirmaciones, la evidencia, la Carta de Porte validada y la retención bancaria verificada. Si falta alguna condición, permanece retenida.
              </div>
              {esTransportista && viaje.transportista_profile_id === profileId && !viaje.transportista_entrega_confirmada_at && viaje.estado !== "OBSERVADO" && (
                <div style={{display:"grid",gap:8}}>
                  <label style={{fontSize:12,fontWeight:700}}>Evidencia de entrega (PDF, JPG o PNG; máximo 10 MB)
                    <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e)=>setEvidenciasTransportista((current)=>({...current,[viaje.id]:e.target.files?.[0]||null}))} />
                  </label>
                  <button type="button" style={primary} disabled={guardando || !evidenciasTransportista[viaje.id] || !cartasViaje.some((c) => c.estado_verificacion === "VALIDADA") || !eventosViaje.some((e) => e.estado === "DESCARGA_FINALIZADA")} onClick={() => void confirmarEntregaTransportista(viaje)}>
                    Confirmar mercadería entregada
                  </button>
                </div>
              )}
              {esProductor && viaje.transportista_entrega_confirmada_at && !viaje.productor_recepcion_confirmada_at && !viaje.productor_recepcion_observada_at && (
                <div style={{display:"grid",gap:8}}>
                  <label style={{fontSize:12,fontWeight:700}}>Evidencia de recepción (PDF, JPG o PNG; máximo 10 MB)
                    <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e)=>setEvidenciasProductor((current)=>({...current,[viaje.id]:e.target.files?.[0]||null}))} />
                  </label>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button type="button" style={primary} disabled={guardando || !evidenciasProductor[viaje.id]} onClick={() => void confirmarRecepcionProductor(viaje, true)}>Confirmar recepción conforme</button>
                    <button type="button" style={secondary} disabled={guardando || !evidenciasProductor[viaje.id]} onClick={() => void confirmarRecepcionProductor(viaje, false)}>Reportar diferencia o incidencia</button>
                  </div>
                </div>
              )}
              {esAdminPlataforma && viaje.transportista_entrega_evidencia_path && <button type="button" style={secondary} onClick={()=>void abrirEvidenciaEntrega(viaje.transportista_entrega_evidencia_path)}>Ver evidencia del transportista</button>}
              {esAdminPlataforma && viaje.productor_recepcion_evidencia_path && <button type="button" style={secondary} onClick={()=>void abrirEvidenciaEntrega(viaje.productor_recepcion_evidencia_path)}>Ver evidencia del productor</button>}
              {viaje.productor_recepcion_observaciones && <div style={{ color: "#b45309", fontSize: 12 }}>Observación del productor: {viaje.productor_recepcion_observaciones}</div>}
              {esAdminPlataforma && viaje.estado === "OBSERVADO" && <button type="button" style={primary} disabled={guardando} onClick={()=>void resolverIncidenciaRecepcion(viaje)}>Resolver incidencia y solicitar nueva confirmación</button>}
              {viaje.productor_recepcion_confirmada_at && <div style={{ color: "#166534", fontSize: 12, fontWeight: 800 }}>Doble confirmación completa · {Number(viaje.productor_kilos_recibidos || 0).toLocaleString("es-AR")} kg · {fecha(viaje.productor_recepcion_confirmada_at)}</div>}
              {viaje.estado === "OBSERVADO" && <div style={{ color: "#b45309", fontSize: 12, fontWeight: 800 }}>Operación observada: requiere resolución administrativa antes de continuar.</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
