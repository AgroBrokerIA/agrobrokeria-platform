"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import LogisticaEntrega from "./LogisticaEntrega";
import FirmasContratoOperacion from "./FirmasContratoOperacion";
import Liquidacion from "./Liquidacion";
import PanelMensajes from "@/components/mensajes/PanelMensajes";
import { notificarParticipantesOperacion } from "@/lib/notificaciones/notificarParticipantesOperacion";
import { sincronizarComisionIntermediario } from "@/lib/comisiones/sincronizarComisionIntermediario";

function asJsonRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

type Operacion = {
  id: string;
  codigo: string;
  estado: string;
  precio_tn: number;
  cantidad_tn: number;
  importe_total: number;
  moneda_id: number | null;
  fecha_operacion: string;
  publicacion_compra_id?: string | null;
  publicacion_venta_id?: string | null;
};

type OperacionMeta = { producto: string; origen: string; destino: string; contraparte: string; };

type Workflow = {
  id: string;
  operacion_id: string;
  workflow_id: string;
  etapa_actual_id: string;
  estado: string;
  etapa_actual: string;
  orden: number;
};

type ContactoComercial = {
  id: string;
  tipo_persona: string;
  nombre_razon_social: string;
  dni?: string | null;
  cuit?: string | null;
  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  email?: string | null;
  telefono?: string | null;
  representante_nombre?: string | null;
  representante_dni?: string | null;
  representante_cargo?: string | null;
};

type Contrato = {
  id?: string;
  operacion_id: string;
  acuerdo_id?: string | null;
  numero_contrato: string;
  estado: string;

  cantidad_tn?: number;
  precio_tn?: number;
  importe_total?: number;

  lugar_carga?: string;
  destino?: string;
  condicion_entrega?: string;
  forma_pago?: string;
  plazo_pago?: string;
  flete?: string;
  calidad?: string;
  observaciones?: string;

  contenido: string;
};



type CuentaBancariaPlataforma = {
  bank_name: string;
  account_holder: string;
  holder_tax_id?: string | null;
  account_type?: string | null;
  currency: string;
  cbu: string;
  alias?: string | null;
  notes?: string | null;
};

type ControlComercialData = {
  id?: string;
  operacion_id: string;

  comision_monto?: number | null;
  comision_moneda?: string | null;
  comision_estado: string;
  comision_fecha_pago?: string | null;
  comision_fecha_retencion?: string | null;
  comision_fecha_devolucion?: string | null;
  comision_medio_pago?: string | null;
  comision_referencia_pago?: string | null;

  medio_pago?: string | null;
  entidad_financiera?: string | null;
  titular_pago?: string | null;
  cuit_titular_pago?: string | null;
  banco?: string | null;
  cbu?: string | null;
  alias?: string | null;
  moneda_pago?: string | null;
  condiciones_financiacion?: string | null;
  cantidad_cuotas?: number | null;
  fecha_primer_vencimiento?: string | null;
  tasa_financiacion?: number | null;
  gastos_financieros?: string | null;
  condiciones_pago?: string | null;

  fondos_estado: string;
  fondos_fecha_habilitacion?: string | null;
  fondos_fecha_liberacion?: string | null;
  fondos_referencia?: string | null;

  visado_estado: string;
  visado_fecha?: string | null;
  visado_responsable?: string | null;
  visado_resultado?: string | null;
  visado_observaciones?: string | null;
  visado_motivo_rechazo?: string | null;
  visado_humedad?: string | null;
  visado_calidad?: string | null;
  visado_proteina?: string | null;
  visado_condicion?: string | null;

  vendedor_firma_estado: string;
  comprador_firma_estado: string;
  intermediario_firma_estado: string;

  fecha_firma_vendedor?: string | null;
  fecha_firma_comprador?: string | null;
  fecha_firma_intermediario?: string | null;

  datos_operativos_estado: string;
  datos_operativos_liberados_at?: string | null;

  no_elusion_aceptada: boolean;
  no_elusion_aceptada_at?: string | null;
  no_elusion_observaciones?: string | null;

  cancelacion_estado: string;
  cancelacion_motivo?: string | null;
  cancelacion_fecha?: string | null;
};

type Acuerdo = {
  id?: string;
  operacion_id: string;
  lugar_carga: string;
  destino: string;
  condicion_entrega: string;
  forma_pago: string;
  plazo_pago: string;
  flete: string;
  calidad: string;
  observaciones: string;
  estado: string;
};

type IntermediarioDisponible = {
  empresa_id: string;
  razon_social: string;
  nombre_comercial?: string | null;
  cuit?: string | null;
};

type ComisionIntermediario = {
  id?: string;
  operacion_id: string;
  contacto_id?: string | null;
  parte_operacion_id?: string | null;

  lado: string;

  tipo_comision:
    | "USD_TN"
    | "PORCENTAJE"
    | "MONTO_FIJO";

  valor_comision: number;
  moneda?: string | null;

  quien_abona:
    | "VENDEDOR"
    | "COMPRADOR"
    | "COMPARTIDA";

  acuerdo_previo: boolean;
  acuerdo_previo_detalle?: string | null;

  estado: string;

  medio_pago?: string | null;
  entidad_financiera?: string | null;
  titular_pago?: string | null;
  cuit_titular_pago?: string | null;
  banco?: string | null;
  cbu?: string | null;
  alias?: string | null;
  referencia_pago?: string | null;

  observaciones?: string | null;
};

const ETAPAS = [
  "Oferta aceptada",
  "Acuerdo Comercial / Reserva",
  "Visado de mercadería",
  "Retención de comisión AgroBrokerIA",
  "Contrato Definitivo",
  "Firmas del vendedor y comprador",
  "Logística / Entrega",
  "Liquidación",
  "Cerrada",
];

export default function OperacionesPage() {
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [detalleOperacion, setDetalleOperacion] = useState<Operacion | null>(null);
  const [operacionMeta, setOperacionMeta] = useState<Record<string, OperacionMeta>>({});
  const [monedas, setMonedas] = useState<Record<number, string>>({});
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");
  const [filtroDestino, setFiltroDestino] = useState("");
  const [filtroProducto, setFiltroProducto] = useState("");
  const [filtroMinVol, setFiltroMinVol] = useState("");
  const [filtroMaxVol, setFiltroMaxVol] = useState("");
  const [filtroMinPrecio, setFiltroMinPrecio] = useState("");
  const [filtroMaxPrecio, setFiltroMaxPrecio] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  const [acuerdoAbierto, setAcuerdoAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [comisionReferenciaTransferencia, setComisionReferenciaTransferencia] = useState("");
  const [comisionComprobanteFile, setComisionComprobanteFile] = useState<File | null>(null);
  const [cuentaBancariaPlataforma, setCuentaBancariaPlataforma] = useState<CuentaBancariaPlataforma | null>(null);
  const [cargandoCuentaBancaria, setCargandoCuentaBancaria] = useState(true);
  const [enviandoComprobanteComision, setEnviandoComprobanteComision] = useState(false);
  const [mostrarFormularioComision, setMostrarFormularioComision] = useState(false);
  const [esAdminPlataforma, setEsAdminPlataforma] = useState(false);
  const [retencionesComision, setRetencionesComision] = useState<Record<string, any>>({});
  const [revisandoRetencionComision, setRevisandoRetencionComision] = useState(false);

  const [contratoAbierto, setContratoAbierto] = useState<string | null>(null);

  const [visadoAbierto, setVisadoAbierto] =
    useState<string | null>(null);
  const [visadoForm, setVisadoForm] = useState({
    responsable: "",
    calidad: "",
    humedad: "",
    proteina: "",
    observaciones: "",
    motivoRechazo: "",
  });
  const [guardandoVisado, setGuardandoVisado] = useState(false);

  const [controlesComerciales, setControlesComerciales] =
    useState<Record<string, ControlComercialData>>({});

  const [, setComisionesIntermediarios] =
    useState<Record<string, ComisionIntermediario[]>>({});

  const [contactos, setContactos] = useState<ContactoComercial[]>([]);
  const [vendedorSeleccionado, setVendedorSeleccionado] =
    useState<string>("");
  const [compradorSeleccionado, setCompradorSeleccionado] =
    useState<string>("");
  const [intermediariosDisponibles, setIntermediariosDisponibles] =
    useState<IntermediarioDisponible[]>([]);

  const [intermediariosSeleccionados, setIntermediariosSeleccionados] =
    useState<Record<string, string>>({});

  const [participantesCargadosPorOperacion] =
    useState<Record<string, boolean>>({});

  const [participantesPorOperacion, setParticipantesPorOperacion] =
    useState<
      Record<
        string,
        { empresa_id: string; rol: string }[]
      >
    >({});

  const [mostrarNuevoContacto, setMostrarNuevoContacto] =
    useState<string | null>(null);

  const [nuevoContacto, setNuevoContacto] =
    useState<ContactoComercial>({
      id: "",
      tipo_persona: "FISICA",
      nombre_razon_social: "",
      dni: "",
      cuit: "",
      domicilio: "",
      localidad: "",
      provincia: "",
      email: "",
      telefono: "",
      representante_nombre: "",
      representante_dni: "",
      representante_cargo: "",
    });

  const [guardandoContrato, setGuardandoContrato] = useState(false);
  const [cuitVendedorContrato, setCuitVendedorContrato] = useState("");
  const [cuitCompradorContrato, setCuitCompradorContrato] = useState("");
  const [calidadContrato, setCalidadContrato] = useState("");


  const [contrato, setContrato] = useState<Contrato>({
    operacion_id: "",
    acuerdo_id: "",
    numero_contrato: "",
    estado: "BORRADOR",
    contenido: "",
  });


  const [acuerdo, setAcuerdo] = useState<Acuerdo>({
    operacion_id: "",
    lugar_carga: "",
    destino: "",
    condicion_entrega: "",
    forma_pago: "",
    plazo_pago: "",
    flete: "",
    calidad: "",
    observaciones: "",
    estado: "BORRADOR",
  });

  useEffect(() => {
    cargarOperaciones();
    cargarContactos();
    cargarIntermediariosDisponibles();
    cargarCuentaBancariaPlataforma();
    cargarPermisosAdminPlataforma();
  }, []);

  function visadoAprobado(control?: ControlComercialData | null) {
    return control?.visado_resultado === "APROBADO" || control?.visado_estado === "APROBADO";
  }

  async function cargarPermisosAdminPlataforma() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setEsAdminPlataforma(false); return; }
    const { data, error } = await supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (error) {
      console.error("No se pudo verificar el rol de administración:", error);
      setEsAdminPlataforma(false);
      return;
    }
    setEsAdminPlataforma(Boolean(data));
  }

  async function abrirComprobanteRetencionComision(path: string) {
    if (!esAdminPlataforma) { setError("Solo Administración puede abrir el comprobante bancario."); return; }
    const { data, error } = await supabase.storage.from("documentos-operacion").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) { setError(error?.message || "No se pudo abrir el comprobante."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function revisarRetencionComision(retencionId: string, resultado: "RETENIDA" | "RECHAZADO") {
    if (!esAdminPlataforma) { setError("Solo Administración puede revisar la retención de comisión."); return; }
    let observaciones: string | null = null;
    let referenciaBancaria: string | null = null;
    if (resultado === "RECHAZADO") {
      observaciones = window.prompt("Indicá el motivo del rechazo para que la empresa pueda volver a cargar el comprobante:")?.trim() || null;
      if (!observaciones) { setError("Para rechazar el comprobante tenés que indicar el motivo."); return; }
    } else {
      referenciaBancaria = window.prompt("Ingresá el número de operación que verificaste en el homebanking:")?.trim() || null;
      if (!referenciaBancaria) { setError("La validación requiere el número de operación bancaria real."); return; }
      observaciones = window.prompt("Observación administrativa (opcional):")?.trim() || null;
      if (!window.confirm("¿Confirmás que verificaste el ingreso real en la cuenta bancaria? La comisión se asignará a cada viaje y se liberará tramo por tramo cuando se confirme la entrega.")) return;
    }
    setRevisandoRetencionComision(true); setError(""); setMensaje("");
    try {
      const { data: resultadoRevision, error } = resultado === "RETENIDA"
        ? await supabase.rpc("validar_comprobante_comision_bancaria", { p_retencion_id: retencionId, p_numero_operacion_bancaria: referenciaBancaria as string, p_observaciones: observaciones as string })
        : await supabase.rpc("rechazar_comprobante_comision_plataforma", { p_retencion_id: retencionId, p_motivo: observaciones as string });
      if (error) throw error;
      setMensaje(resultado === "RETENIDA"
        ? "Ingreso bancario validado. La comisión se distribuyó por viaje y cada tramo se liberará al confirmar CPE validada y doble conformidad de entrega."
        : "Comprobante rechazado. El motivo quedó registrado y la empresa pagadora puede volver a cargarlo desde Operaciones.");
      await cargarOperaciones();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo revisar el comprobante de comisión.");
    } finally {
      setRevisandoRetencionComision(false);
    }
  }

  async function cargarCuentaBancariaPlataforma() {
    setCargandoCuentaBancaria(true);
    const { data, error } = await supabase
      .from("platform_payment_accounts")
      .select("bank_name,account_holder,holder_tax_id,account_type,currency,cbu,alias,notes")
      .eq("active", true)
      .maybeSingle();
    if (error) {
      console.error("No se pudieron cargar los datos bancarios de AgroBrokerIA:", error);
      setCuentaBancariaPlataforma(null);
    } else {
      setCuentaBancariaPlataforma(data as CuentaBancariaPlataforma | null);
    }
    setCargandoCuentaBancaria(false);
  }

  async function cargarContactos() {
    const { data, error } = await supabase.rpc(
      "listar_contactos_comerciales_autorizados"
    );

    if (error) {
      console.error(error);
      setError(
        `No se pudieron cargar los contactos: ${error.message}`
      );
      return;
    }

    setContactos(data || []);
  }

  async function cargarIntermediariosDisponibles() {
    const { data: empresas, error } = await supabase
      .from("empresas")
      .select("id, razon_social, nombre_comercial, cuit, tipo_empresa, activa")
      .eq("tipo_empresa", "INTERMEDIARIO")
      .eq("activa", true)
      .order("razon_social", { ascending: true });

    if (error) {
      console.error(error);
      setError(`No se pudieron cargar los intermediarios: ${error.message}`);
      return;
    }

    const disponibles: IntermediarioDisponible[] = (empresas || []).map((empresa) => ({
      empresa_id: String(empresa.id),
      razon_social: empresa.razon_social || "Empresa sin razón social",
      nombre_comercial: empresa.nombre_comercial || null,
      cuit: empresa.cuit || null,
    }));

    setIntermediariosDisponibles(disponibles);
  }


  async function avanzarWorkflowSeguro(workflowId: string, etapaDestinoId: string, estado?: string) {
    return supabase.rpc("avanzar_operacion_workflow", {
      p_workflow_id: workflowId,
      p_etapa_destino_id: etapaDestinoId,
      p_estado: estado,
    });
  }

  async function cargarOperaciones() {
    try {
      setLoading(true);
      setError("");

      const {
        data: operacionesDB,
        error: errorOperaciones,
      } = await supabase
        .from("operaciones")
        .select(
          "id, codigo, estado, precio_tn, cantidad_tn, importe_total, moneda_id, fecha_operacion, publicacion_compra_id, publicacion_venta_id"
        )
        .order("fecha_operacion", {
          ascending: false,
        });

      if (errorOperaciones) {
        console.error(errorOperaciones);
        setError(
          `No se pudieron cargar las operaciones: ${errorOperaciones.message}`
        );
        return;
      }

      // RPC segura: devuelve workflow + etapa en una sola lectura autorizada.
      const idsOperaciones = (operacionesDB || []).map((item) => item.id);
      const { data: workflowsDB, error: errorWorkflows } = idsOperaciones.length
        ? await supabase.rpc("obtener_workflows_operaciones_usuario", {
            p_operacion_ids: idsOperaciones,
          })
        : { data: [], error: null };

      if (errorWorkflows) {
        console.error("No se pudieron cargar los workflows:", errorWorkflows);
        setError(`No se pudo cargar el workflow: ${errorWorkflows.message}`);
        return;
      }

      const workflowsNormalizados: Workflow[] = (workflowsDB || []).map((item: any) => ({
        id: item.id,
        operacion_id: item.operacion_id,
        workflow_id: item.workflow_id,
        etapa_actual_id: item.etapa_actual_id,
        estado: item.estado,
        etapa_actual: item.nombre_etapa || "Etapa sin nombre",
        orden: Number(item.orden || 0),
      }));

      const { data: monedaRows, error: monedaError } = await supabase.from("monedas").select("id,codigo");
      if (monedaError) console.error("No se pudieron cargar las monedas:", monedaError);
      setMonedas(Object.fromEntries((monedaRows || []).filter((m) => m.codigo !== null).map((m) => [m.id, m.codigo as string])));

      const operacionesNormalizadas = (operacionesDB || []).map((item) => ({
          id: item.id,
          codigo: item.codigo,
          estado: item.estado ?? "PENDIENTE",
          precio_tn: Number(item.precio_tn),
          cantidad_tn: Number(item.cantidad_tn),
          importe_total: Number(item.importe_total ?? Number(item.precio_tn) * Number(item.cantidad_tn)),
          moneda_id: item.moneda_id ?? null,
          fecha_operacion: item.fecha_operacion ?? new Date().toISOString(),
          publicacion_compra_id: item.publicacion_compra_id ?? null,
          publicacion_venta_id: item.publicacion_venta_id ?? null,
        }));

      setOperaciones(operacionesNormalizadas);

      if (idsOperaciones.length) {
        const { data: retencionesDB, error: retencionesError } = await supabase
          .from("operacion_comision_retenciones")
          .select("id,operacion_id,importe,moneda_id,referencia_pago,comprobante_url,estado,observaciones,creado_at,verificado_at")
          .in("operacion_id", idsOperaciones);
        if (retencionesError) {
          console.error("No se pudieron cargar los comprobantes de comisión:", retencionesError);
        } else {
          setRetencionesComision(Object.fromEntries((retencionesDB || []).map((row: any) => [row.operacion_id, row])));
        }
      } else {
        setRetencionesComision({});
      }

      const publicationIds = [...new Set(operacionesNormalizadas.flatMap((item) => [item.publicacion_compra_id, item.publicacion_venta_id]).filter(Boolean))] as string[];
      const meta: Record<string, OperacionMeta> = {};
      if (publicationIds.length) {
        const { data: pubs } = await supabase.from("publicaciones").select("id, empresa_id, producto_id, provincia, localidad, puerto").in("id", publicationIds);
        const productIds = [...new Set((pubs || []).map((p: any) => p.producto_id).filter(Boolean))];
        const companyIds = [...new Set((pubs || []).map((p: any) => p.empresa_id).filter(Boolean))];
        const [{ data: products }, { data: companies }] = await Promise.all([
          productIds.length ? supabase.from("productos").select("id,nombre").in("id", productIds) : Promise.resolve({ data: [] as any[] }),
          companyIds.length ? supabase.from("empresas").select("id,razon_social,nombre_comercial").in("id", companyIds) : Promise.resolve({ data: [] as any[] }),
        ]);
        const productMap = new Map((products || []).map((p: any) => [String(p.id), String(p.nombre || "Producto")]));
        const companyMap = new Map((companies || []).map((x: any) => [String(x.id), String(x.nombre_comercial || x.razon_social || "Empresa registrada")]));
        const pubMap = new Map((pubs || []).map((p: any) => [String(p.id), p]));
        for (const op of operacionesNormalizadas) {
          const venta = op.publicacion_venta_id ? pubMap.get(op.publicacion_venta_id) : null;
          const compra = op.publicacion_compra_id ? pubMap.get(op.publicacion_compra_id) : null;
          const origen = venta ? [venta.localidad, venta.provincia, venta.puerto].filter(Boolean).join(" · ") : "No informado";
          const destino = compra ? [compra.localidad, compra.provincia, compra.puerto].filter(Boolean).join(" · ") : "No informado";
          const counterpart = compra && venta ? (companyMap.get(String(venta.empresa_id)) || companyMap.get(String(compra.empresa_id)) || "Contraparte registrada") : "No informado";
          meta[op.id] = { producto: productMap.get(String((venta || compra)?.producto_id)) || "Producto registrado", origen, destino, contraparte: counterpart };
        }
      }
      setOperacionMeta(meta);

      setWorkflows(workflowsNormalizados);

      // =========================================================
      // CARGAR CONTROLES COMERCIALES COMPLETOS
      // =========================================================
      // Mantiene sincronizado el estado React con Supabase.
      // Es necesario para conocer correctamente si los datos
      // operativos están PROTEGIDOS o HABILITADOS.
      // =========================================================

      const {
        data: controlesComercialesDB,
        error: errorControlesComerciales,
      } = await supabase
        .from("operacion_control_comercial")
        .select("*");

      if (errorControlesComerciales) {
        console.error(
          "No se pudieron cargar los controles comerciales:",
          errorControlesComerciales
        );
      } else {
        const controlesNormalizados: Record<
          string,
          ControlComercialData
        > = {};

        for (const control of controlesComercialesDB || []) {
          controlesNormalizados[control.operacion_id] = {
            ...control,

            comision_monto:
              control.comision_monto !== null &&
              control.comision_monto !== undefined
                ? Number(control.comision_monto)
                : null,

            cantidad_cuotas:
              control.cantidad_cuotas !== null &&
              control.cantidad_cuotas !== undefined
                ? Number(control.cantidad_cuotas)
                : null,

            tasa_financiacion:
              control.tasa_financiacion !== null &&
              control.tasa_financiacion !== undefined
                ? Number(control.tasa_financiacion)
                : null,
          };
        }

        setControlesComerciales(controlesNormalizados);
      }

      // =========================================================
      // RECONCILIACIÓN: VISADO APROBADO → RETENCIÓN DE COMISIÓN
      // Corrige operaciones aprobadas que quedaron detenidas en etapa 3
      // por no haberse ejecutado el avance al guardar el visado.
      // =========================================================
      let workflowsActualizados = [...workflowsNormalizados];
      for (const workflow of workflowsNormalizados) {
        const control = (controlesComercialesDB || []).find((item: any) => item.operacion_id === workflow.operacion_id);
        const aprobado = String(control?.visado_resultado || control?.visado_estado || "").toUpperCase() === "APROBADO";
        if (workflow.orden !== 3 || !aprobado) continue;
        const { data: avance, error: avanceError } = await supabase.rpc(
          "avanzar_visado_aprobado_a_retencion",
          { p_operacion_id: workflow.operacion_id }
        );
        if (avanceError) {
          console.error("Visado aprobado pendiente de avance a retención:", workflow.operacion_id, avanceError);
          continue;
        }
        workflowsActualizados = workflowsActualizados.map((item) => item.operacion_id === workflow.operacion_id
          ? {...item, orden:4, etapa_actual:"Retención de comisión AgroBrokerIA", etapa_actual_id: avance && typeof avance === "object" && !Array.isArray(avance) && typeof avance.etapa_destino_id === "string" ? avance.etapa_destino_id : item.etapa_actual_id}
          : item);
      }
      setWorkflows(workflowsActualizados);

      // =========================================================
      // SINCRONIZACIÓN AUTOMÁTICA: FIRMAS APROBADAS → LOGÍSTICA
      // La base valida las dos copias aprobadas y mueve el workflow
      // de forma atómica, sin depender de estados React desactualizados.
      // =========================================================
      for (const workflow of workflowsNormalizados) {
        if (workflow.orden !== 6) continue;
        const { data: contratosFirmados, error: contratosError } = await supabase
          .from("contratos")
          .select("id")
          .eq("operacion_id", workflow.operacion_id)
          .eq("estado", "CONFIRMADO")
          .limit(1);
        if (contratosError || !contratosFirmados?.length) {
          if (contratosError) console.error("No se pudo consultar el contrato confirmado:", contratosError);
          continue;
        }
        const { data: syncResult, error: syncError } = await supabase.rpc(
          "sincronizar_workflow_firmas_contrato",
          { p_contrato_id: contratosFirmados[0].id }
        );
        if (syncError) {
          console.error("No se pudo avanzar automáticamente a Logística / Entrega:", syncError);
          continue;
        }
        if (syncResult && typeof syncResult === "object" && !Array.isArray(syncResult) && syncResult.avanzada === true) {
          try {
            await notificarParticipantesOperacion({
              operacionId: workflow.operacion_id,
              titulo: "Logística / Entrega",
              mensaje: `La operación ${workflow.operacion_id} completó las dos firmas aprobadas y pasó automáticamente a Logística / Entrega.`,
              tipo: "LOGISTICA_ENTREGA",
            });
          } catch (errorNotificacion) {
            console.error("ERROR NOTIFICACIÓN FIRMAS → LOGÍSTICA:", errorNotificacion);
          }
        }
      }
    } catch (e) {
      console.error(e);
      setError("Ocurrió un error al cargar las operaciones.");
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // OFERTA ACEPTADA → ACUERDO COMERCIAL / RESERVA
  // =========================================================

  async function avanzarAVisadoConComision(operacion: Operacion) {
    setError(""); setMensaje("");
    const { data: agreement, error: agreementError } = await supabase.from("acuerdos_comerciales").select("estado").eq("operacion_id", operacion.id).maybeSingle();
    if (agreementError || agreement?.estado !== "CONFIRMADO") { setError("Primero debe quedar confirmado el Acuerdo Comercial / Reserva preliminar."); return false; }
    const workflow = obtenerWorkflow(operacion.id);
    if (!workflow || workflow.orden !== 2) { setError("La operación ya no se encuentra en la etapa de Acuerdo Comercial / Reserva."); return false; }
    const { data: etapa, error: etapaError } = await supabase.from("workflow_etapas").select("id").eq("workflow_id", workflow.workflow_id).eq("orden", 3).maybeSingle();
    if (etapaError || !etapa) { setError("No se encontró la etapa Visado de mercadería."); return false; }
    const { error: advanceError } = await avanzarWorkflowSeguro(workflow.id, etapa.id);
    if (advanceError) { setError(advanceError.message); return false; }
    setMensaje("Acuerdo preliminar confirmado. La operación pasó a Visado de mercadería. La comisión se abonará después del visado y antes del contrato definitivo.");
    await cargarOperaciones(); return true;
  }

  async function avanzarAFondos(operacion: Operacion) {
    setError(""); setMensaje("");
    const control = await cargarControlComercial(operacion);
    if (!visadoAprobado(control)) { setError("El Visado de mercadería debe estar APROBADO antes de pasar a Retención de comisión AgroBrokerIA."); return false; }
    const workflow = obtenerWorkflow(operacion.id);
    if (!workflow || workflow.orden !== 3) { setError("La operación debe estar en Visado de mercadería."); return false; }
    const { data: etapa, error } = await supabase.from("workflow_etapas").select("id")
      .eq("workflow_id", workflow.workflow_id).eq("orden", 4).maybeSingle();
    if (error || !etapa) { setError("No se encontró la etapa Retención de comisión AgroBrokerIA."); return false; }
    const { error: advanceError } = await avanzarWorkflowSeguro(workflow.id, etapa.id);
    if (advanceError) { setError(advanceError.message); return false; }
    setMensaje("Visado aprobado. La operación pasó a Retención de comisión AgroBrokerIA. La comisión debe quedar RETENIDA antes del Contrato Definitivo.");
    await cargarOperaciones(); return true;
  }

  async function avanzarAContratoConComision(operacion: Operacion) {
    setError(""); setMensaje("");
    const { data: visadoRows, error: visadoError } = await supabase.rpc(
      "obtener_visado_operacion_para_avance",
      { p_operacion_id: operacion.id }
    );
    if (visadoError) {
      setError("No se pudo consultar el visado aprobado: " + visadoError.message);
      return false;
    }
    const visado = Array.isArray(visadoRows) ? visadoRows[0] : visadoRows;
    const resultadoVisado = String(visado?.visado_resultado || visado?.visado_estado || "").trim().toUpperCase();
    if (resultadoVisado !== "APROBADO") {
      setError("El visado de mercadería no está APROBADO para esta operación. Estado leído: " + (resultadoVisado || "SIN REGISTRO") + ".");
      return false;
    }
    const control = { visado_resultado: visado.visado_resultado, visado_estado: visado.visado_estado };
    setControlesComerciales((actual) => ({...actual,[operacion.id]:{...actual[operacion.id],...control}}));
    const { data: retencion, error: retencionError } = await supabase
      .from("operacion_comision_retenciones")
      .select("estado")
      .eq("operacion_id", operacion.id)
      .maybeSingle();
    if (retencionError) {
      setError("No se pudo verificar la retención de la comisión: " + retencionError.message);
      return false;
    }
    const estadoComision = String(retencion?.estado || "").toUpperCase();
    if (!["RETENIDA", "LIBERADA"].includes(estadoComision)) {
      setError("El Contrato Definitivo se habilita únicamente cuando Administración confirma la retención de la comisión AgroBrokerIA.");
      return false;
    }
    const workflow = obtenerWorkflow(operacion.id);
    if (!workflow || workflow.orden !== 4) {
      setError("La operación debe estar en Retención de comisión AgroBrokerIA para pasar al Contrato Definitivo.");
      return false;
    }
    const { data: etapa, error: etapaError } = await supabase
      .from("workflow_etapas")
      .select("id")
      .eq("workflow_id", workflow.workflow_id)
      .eq("orden", 5)
      .maybeSingle();
    if (etapaError || !etapa) {
      setError("No se encontró la etapa Contrato Definitivo.");
      return false;
    }
    const { error: advanceError } = await avanzarWorkflowSeguro(workflow.id, etapa.id);
    if (advanceError) { setError(advanceError.message); return false; }
    setMensaje("Comisión AgroBrokerIA retenida y visado aprobado. La operación pasó a Contrato Definitivo.");
    await cargarOperaciones();
    return true;
  }

  async function enviarComprobanteComision(operacion: Operacion) {
    setError("");
    setMensaje("");
    if (!cuentaBancariaPlataforma) {
      setError("AgroBrokerIA todavía no configuró su cuenta bancaria receptora. No realices la transferencia hasta que aparezcan los datos oficiales.");
      return;
    }
    if (!comisionReferenciaTransferencia.trim()) {
      setError("Ingresá la referencia o número de operación de la transferencia.");
      return;
    }
    if (!comisionComprobanteFile) {
      setError("Adjuntá el comprobante bancario para poder continuar.");
      return;
    }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(comisionComprobanteFile.type)) {
      setError("El comprobante debe ser PDF, JPG o PNG.");
      return;
    }
    if (comisionComprobanteFile.size > 10 * 1024 * 1024) {
      setError("El comprobante no puede superar los 10 MB.");
      return;
    }
    setEnviandoComprobanteComision(true);
    let uploadedPath: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Necesitás iniciar sesión.");
      const { data: profile, error: profileError } = await supabase.from("profiles").select("active_company_id").eq("id", user.id).single();
      if (profileError || !profile?.active_company_id) throw new Error("No se encontró una empresa activa.");
      const safeName = comisionComprobanteFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
      uploadedPath = `${operacion.id}/comisiones/${user.id}-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("documentos-operacion")
        .upload(uploadedPath, comisionComprobanteFile, {
          contentType: comisionComprobanteFile.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { error: submitError } = await supabase.rpc("registrar_comprobante_comision_plataforma", {
        p_operacion_id: operacion.id,
        p_empresa_pagadora_id: profile.active_company_id,
        p_referencia_pago: comisionReferenciaTransferencia.trim(),
        p_comprobante_url: uploadedPath,
      });
      if (submitError) throw submitError;
      setMensaje("Comprobante bancario cargado y enviado. AgroBrokerIA verificará la transferencia. La operación permanecerá en Retención de comisión AgroBrokerIA hasta que Administración confirme la retención.");
      setComisionReferenciaTransferencia("");
      setComisionComprobanteFile(null);
      await cargarOperaciones();
    } catch (e) {
      if (uploadedPath) {
        await supabase.storage.from("documentos-operacion").remove([uploadedPath]);
      }
      const detail = e && typeof e === "object" && "message" in e
        ? String((e as {message?:unknown}).message || "")
        : e instanceof Error ? e.message : "";
      setError(detail || "No se pudo registrar el comprobante. Revisá tu autorización, la empresa pagadora y la etapa de la operación.");
    } finally {
      setEnviandoComprobanteComision(false);
    }
  }

  async function registrarPruebaComision(operacion: Operacion) {
    setError("");
    setMensaje("");
    if (!comisionReferenciaTransferencia.trim()) { setError("Ingresá una referencia identificatoria para la simulación."); return; }
    if (!comisionComprobanteFile) { setError("Adjuntá una imagen o archivo de prueba."); return; }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(comisionComprobanteFile.type)) { setError("El archivo de prueba debe ser PDF, JPG o PNG."); return; }
    if (comisionComprobanteFile.size <= 0 || comisionComprobanteFile.size > 10 * 1024 * 1024) { setError("El archivo debe pesar entre 1 byte y 10 MB."); return; }
    setEnviandoComprobanteComision(true);
    let testPath: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Necesitás iniciar sesión.");
      const safeName = comisionComprobanteFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
      testPath = `${operacion.id}/comisiones-prueba/${user.id}-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("documentos-operacion").upload(testPath, comisionComprobanteFile, { contentType: comisionComprobanteFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: rpcError } = await supabase.rpc("registrar_simulacion_comision_plataforma", {
        p_operacion_id: operacion.id,
        p_referencia_prueba: comisionReferenciaTransferencia.trim(),
        p_archivo_path: testPath,
        p_nombre_archivo: comisionComprobanteFile.name,
        p_tamano_bytes: comisionComprobanteFile.size,
      });
      if (rpcError) throw rpcError;
      setMensaje("SIMULACIÓN REGISTRADA. No se creó un pago, una retención ni un movimiento económico real. Podés revisar el circuito de prueba desde administración.");
      setComisionReferenciaTransferencia("");
      setComisionComprobanteFile(null);
    } catch (e) {
      if (testPath) await supabase.storage.from("documentos-operacion").remove([testPath]);
      setError(e instanceof Error ? e.message : "No se pudo registrar la simulación.");
    } finally {
      setEnviandoComprobanteComision(false);
    }
  }

  async function iniciarAcuerdoComercial(operacionId: string) {
    setError("");
    setMensaje("");

    const workflow = obtenerWorkflow(operacionId);

    if (!workflow) {
      setError(
        "La operación no tiene un workflow asociado."
      );
      return false;
    }

    if (workflow.orden !== 1) {
      setError(
        `No se puede iniciar el Acuerdo Comercial porque la operación está en la etapa ${workflow.etapa_actual}.`
      );
      return false;
    }

    const { data: etapaAcuerdo, error: errorEtapaAcuerdo } =
      await supabase
        .from("workflow_etapas")
        .select("id, nombre, orden")
        .eq("workflow_id", workflow.workflow_id)
        .eq("orden", 2)
        .maybeSingle();

    if (errorEtapaAcuerdo) {
      setError(
        `No se pudo localizar la etapa Acuerdo Comercial / Reserva: ${errorEtapaAcuerdo.message}`
      );
      return false;
    }

    if (!etapaAcuerdo) {
      setError(
        "No existe la etapa 2 (Acuerdo Comercial / Reserva) en este workflow."
      );
      return false;
    }

    const { error: errorWorkflow } = await avanzarWorkflowSeguro(workflow.id, etapaAcuerdo.id);

    if (errorWorkflow) {
      setError(
        `No se pudo iniciar el Acuerdo Comercial: ${errorWorkflow.message}`
      );
      return false;
    }

    setError("");
    setMensaje(
      "🤝 Acuerdo Comercial / Reserva iniciado."
    );

    try {
      await notificarParticipantesOperacion({
        operacionId,
        titulo: "🤝 Acuerdo Comercial / Reserva",
        mensaje:
          "Se inició el Acuerdo Comercial / Reserva de la operación.",
        tipo: "ACUERDO_COMERCIAL",
      });
    } catch (errorNotificacion) {
      console.error(
        "ERROR NOTIFICACIÓN ACUERDO COMERCIAL:",
        errorNotificacion
      );
    }

    await cargarOperaciones();

    return true;
  }

  function obtenerWorkflow(operacionId: string) {
    return workflows.find(
      (workflow) => workflow.operacion_id === operacionId
    );
  }

  function formatoNumero(numero: number) {
    return numero.toLocaleString("es-AR", {
      maximumFractionDigits: 2,
    });
  }

  function monedaOperacion(operacion: Operacion) {
    return operacion.moneda_id ? (monedas[operacion.moneda_id] || "Sin moneda") : "Sin moneda";
  }

  function formatoFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function claseEtapa(
    ordenEtapa: number,
    ordenActual: number
  ) {
    if (ordenEtapa < ordenActual) {
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "2px solid #22c55e",
      };
    }

    if (ordenEtapa === ordenActual) {
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
        border: "2px solid #3b82f6",
      };
    }

    return {
      background: "#f3f4f6",
      color: "#6b7280",
      border: "2px solid #d1d5db",
    };
  }

  function abrirVisado(operacion: Operacion) {
    setError("");
    setMensaje("");
    setContratoAbierto(null);
    const control = controlesComerciales[operacion.id];
    setVisadoForm({
      responsable: control?.visado_responsable || "",
      calidad: control?.visado_calidad || "",
      humedad: control?.visado_humedad || "",
      proteina: control?.visado_proteina || "",
      observaciones: control?.visado_observaciones || "",
      motivoRechazo: control?.visado_motivo_rechazo || "",
    });
    setVisadoAbierto(operacion.id);
  }

  async function guardarResultadoVisado(resultado: "APROBADO" | "RECHAZADO") {
    if (!visadoAbierto) return;
    if (!visadoForm.responsable.trim()) {
      setError("Indicá quién realizó o certificó el visado de mercadería.");
      return;
    }
    if (resultado === "RECHAZADO" && !visadoForm.motivoRechazo.trim()) {
      setError("Indicá el motivo del rechazo del visado.");
      return;
    }
    setGuardandoVisado(true);
    const ok = await actualizarControlComercial(visadoAbierto, {
      visado_estado: resultado,
      visado_resultado: resultado,
      visado_responsable: visadoForm.responsable.trim(),
      visado_calidad: visadoForm.calidad.trim(),
      visado_humedad: visadoForm.humedad.trim(),
      visado_proteina: visadoForm.proteina.trim(),
      visado_observaciones: visadoForm.observaciones.trim(),
      visado_motivo_rechazo: resultado === "RECHAZADO" ? visadoForm.motivoRechazo.trim() : "",
    });
    setGuardandoVisado(false);
    if (ok) setVisadoAbierto(null);
  }

  async function cargarControlComercial(
    operacion: Operacion
  ): Promise<ControlComercialData | null> {
    const operacionId = operacion.id;
    const { data, error } = await supabase
      .from("operacion_control_comercial")
      .select("*")
      .eq("operacion_id", operacionId)
      .maybeSingle();

    if (error) {
      console.error(error);
      setError(
        `No se pudo cargar el control comercial: ${error.message}`
      );
      return null;
    }

    if (data) {
      const controlNormalizado = { ...data, comision_monto: data.comision_monto == null ? null : Number(data.comision_monto), cantidad_cuotas: data.cantidad_cuotas == null ? null : Number(data.cantidad_cuotas), tasa_financiacion: data.tasa_financiacion == null ? null : Number(data.tasa_financiacion) } as ControlComercialData;
      setControlesComerciales((actual) => ({
        ...actual,
        [operacionId]: controlNormalizado,
      }));
      return controlNormalizado;
    }
    return null;
  }

  // La comisión de AgroBroker IA es fija y automática: USD 1 por tonelada.
  // Las comisiones de intermediarios externos se registran por separado.

  async function cargarComisionesIntermediarios(
    operacionId: string
  ) {
    const { data, error } = await supabase
      .from("comisiones_intermediarios")
      .select("*")
      .eq("operacion_id", operacionId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      setError(
        `No se pudieron cargar las comisiones de intermediarios: ${error.message}`
      );
      return;
    }

    const comisiones: ComisionIntermediario[] = (data || []).map((item) => ({
      ...item,
      tipo_comision: item.tipo_comision as ComisionIntermediario["tipo_comision"],
      valor_comision:
        item.valor_comision !== null &&
        item.valor_comision !== undefined
          ? Number(item.valor_comision)
          : 0,
    }));
    setComisionesIntermediarios((actual) => ({
      ...actual,
      [operacionId]: comisiones,
    }));
  }

  async function crearContacto() {
    setError("");
    setMensaje("");

    if (!nuevoContacto.nombre_razon_social.trim()) {
      setError(
        "Debe ingresar el nombre o razón social del contacto."
      );
      return;
    }

    const { data, error } = await supabase.rpc("guardar_contacto_comercial", {
      p_datos: {
        tipo_persona: nuevoContacto.tipo_persona,
        nombre_razon_social: nuevoContacto.nombre_razon_social,
        dni: nuevoContacto.dni || null,
        cuit: nuevoContacto.cuit || null,
        domicilio: nuevoContacto.domicilio || null,
        localidad: nuevoContacto.localidad || null,
        provincia: nuevoContacto.provincia || null,
        email: nuevoContacto.email || null,
        telefono: nuevoContacto.telefono || null,
        representante_nombre: nuevoContacto.representante_nombre || null,
        representante_dni: nuevoContacto.representante_dni || null,
        representante_cargo: nuevoContacto.representante_cargo || null,
      },
    });

    if (error) {
      console.error(error);
      setError(
        `No se pudo crear el contacto: ${error.message}`
      );
      return;
    }

    // guardar_contacto_comercial devuelve el UUID del registro, no el objeto.
    if (typeof data !== "string" || !data) {
      setError("El contacto se guardó sin devolver un identificador válido.");
      return;
    }
    const { data: contactoGuardado, error: contactoError } = await supabase
      .from("contactos_comerciales")
      .select("*")
      .eq("id", data)
      .single();
    if (contactoError || !contactoGuardado) {
      setError("El contacto fue creado, pero no se pudo recuperar su ficha: " + (contactoError?.message || "registro no encontrado"));
      return;
    }
    setContactos((actuales) =>
      [...actuales, contactoGuardado].sort((a, b) =>
        a.nombre_razon_social.localeCompare(b.nombre_razon_social)
      )
    );

    if (mostrarNuevoContacto === "VENDEDOR") {
      setVendedorSeleccionado(contactoGuardado.id);
    }

    if (mostrarNuevoContacto === "COMPRADOR") {
      setCompradorSeleccionado(contactoGuardado.id);
    }

    setMostrarNuevoContacto(null);

    setNuevoContacto({
      id: "",
      tipo_persona: "FISICA",
      nombre_razon_social: "",
      dni: "",
      cuit: "",
      domicilio: "",
      localidad: "",
      provincia: "",
      email: "",
      telefono: "",
      representante_nombre: "",
      representante_dni: "",
      representante_cargo: "",
    });

    setMensaje(
      "✅ Contacto creado correctamente."
    );
  }

  async function abrirContrato(operacion: Operacion) {
    setMensaje("");
    setError("");

    // ---------------------------------------------------------
    // Cargar contrato
    // ---------------------------------------------------------

    const { data: contratoData, error: errorContrato } =
      await supabase
        .from("contratos")
        .select("*")
        .eq("operacion_id", operacion.id)
        .maybeSingle();

    if (errorContrato) {
      setError(
        `No se pudo cargar el contrato: ${errorContrato.message}`
      );
      return;
    }

    if (contratoData) {
      setContrato({
        id: contratoData.id,
        operacion_id: operacion.id,
        acuerdo_id: contratoData.acuerdo_id || null,
        numero_contrato:
          contratoData.numero_contrato || "",
        estado:
          contratoData.estado || "BORRADOR",
        cantidad_tn:
          Number(contratoData.cantidad_tn || operacion.cantidad_tn),
        precio_tn:
          Number(contratoData.precio_tn || operacion.precio_tn),
        importe_total:
          Number(
            contratoData.importe_total ||
              operacion.importe_total
          ),
        lugar_carga:
          contratoData.lugar_carga || "",
        destino:
          contratoData.destino || "",
        condicion_entrega:
          contratoData.condicion_entrega || "",
        forma_pago:
          contratoData.forma_pago || "",
        plazo_pago:
          contratoData.plazo_pago || "",
        flete:
          contratoData.flete || "",
        calidad:
          contratoData.calidad || "",
        observaciones:
          contratoData.observaciones || "",
        contenido:
          contratoData.contenido || "",
      });
    } else {
      setContrato({
        operacion_id: operacion.id,
        acuerdo_id: null,
        numero_contrato:
          `CON-${operacion.codigo.replace(
            /^OP-/,
            ""
          )}`,
        estado: "BORRADOR",
        cantidad_tn: operacion.cantidad_tn,
        precio_tn: operacion.precio_tn,
        importe_total: operacion.importe_total,
        lugar_carga: "",
        destino: "",
        condicion_entrega: "",
        forma_pago: "",
        plazo_pago: "",
        flete: "",
        calidad: "",
        observaciones: "",
        contenido: "",
      });
    }

    // ---------------------------------------------------------
    // Cargar partes de la operación
    // ---------------------------------------------------------

    const {
      data: partesData,
      error: errorPartes,
    } = await supabase
      .from("partes_operacion")
      .select("*")
      .eq("operacion_id", operacion.id)
      .order("orden_firma", {
        ascending: true,
      });

    if (errorPartes) {
      setError(
        `No se pudieron cargar las partes de la operación: ${errorPartes.message}`
      );
      return;
    }

    const partes = partesData || [];

    const vendedor = partes.find(
      (parte) => parte.rol === "VENDEDOR"
    );

    const comprador = partes.find(
      (parte) => parte.rol === "COMPRADOR"
    );
    const contactoVendedor = contactos.find((c) => c.id === (vendedor?.contacto_id || ""));
    const contactoComprador = contactos.find((c) => c.id === (comprador?.contacto_id || ""));
    setCuitVendedorContrato(contactoVendedor?.cuit || "");
    setCuitCompradorContrato(contactoComprador?.cuit || "");


    // Recuperar el acuerdo y generar el texto inicial al abrir el editor.
    const { data: acuerdoInicial, error: errorAcuerdoInicial } = await supabase
      .from("acuerdos_comerciales")
      .select("*")
      .eq("operacion_id", operacion.id)
      .maybeSingle();

    if (errorAcuerdoInicial) {
      setError(`No se pudo cargar el acuerdo comercial: ${errorAcuerdoInicial.message}`);
      return;
    }

    const acuerdoContrato: Acuerdo = {
      operacion_id: operacion.id,
      lugar_carga: acuerdoInicial?.lugar_carga || "",
      destino: acuerdoInicial?.destino || "",
      condicion_entrega: acuerdoInicial?.condicion_entrega || "",
      forma_pago: acuerdoInicial?.forma_pago || "",
      plazo_pago: acuerdoInicial?.plazo_pago || "",
      flete: acuerdoInicial?.flete || "",
      calidad: acuerdoInicial?.calidad || "",
      observaciones: acuerdoInicial?.observaciones || "",
      estado: acuerdoInicial?.estado || "BORRADOR",
    };
    setAcuerdo(acuerdoContrato);
    setCalidadContrato(acuerdoContrato.calidad || "");


    const numeroContratoInicial = contratoData?.numero_contrato ||
      `CON-${operacion.codigo.replace(/^OP-/, "")}`;
    let contenidoInicial = contratoData?.contenido || "";
    if (!contenidoInicial.trim()) {
      try {
        contenidoInicial = generarContenidoContratoF1(
          operacion,
          acuerdoContrato,
          vendedor?.contacto_id || "",
          comprador?.contacto_id || "",
          numeroContratoInicial
        );
      } catch (e) {
        contenidoInicial = [
          "CONTRATO DEFINITIVO DE COMPRAVENTA DE GRANOS",
          "",
          `N.º ${numeroContratoInicial}`,
          `OPERACIÓN: ${operacion.codigo}`,
          "MODELO: F1",
          `CANTIDAD: ${formatoNumero(operacion.cantidad_tn)} TN`,
          `PRECIO POR TN: ${monedaOperacion(operacion)} ${formatoNumero(operacion.precio_tn)}`,
          `IMPORTE TOTAL: ${monedaOperacion(operacion)} ${formatoNumero(operacion.importe_total)}`,
          "",
          "DATOS DE VENDEDOR Y COMPRADOR: completar desde los contactos de la operación.",
          "CONDICIONES COMERCIALES: completar los campos faltantes del acuerdo.",
          "",
          "Este borrador requiere revisión y aceptación expresa de ambas partes antes de su firma."
        ].join(String.fromCharCode(10));
      }
    }
    // Normalizar borradores antiguos que guardaron los saltos de línea escapados.
    contenidoInicial = contenidoInicial.replace(/\\n/g, String.fromCharCode(10));
    // Si el contenido proviene del texto genérico de respaldo, reconstruirlo
    // con los contactos seleccionados en esta operación.
    if (contenidoInicial.includes("DATOS DE VENDEDOR Y COMPRADOR: completar desde los contactos de la operación.") ||
        contenidoInicial.includes("CONDICIONES COMERCIALES: completar los campos faltantes del acuerdo.") ||
        contenidoInicial.includes("Producto: 13.") ||
        contenidoInicial.includes("CONTRATO DE ABASTECIMIENTO DE GRANOS") ||
        (contenidoInicial.includes("TERCERA: PLAZO DE ENTREGA") && contenidoInicial.includes("de 2027"))) {
      try {
        contenidoInicial = generarContenidoContratoF1(
          operacion,
          acuerdoContrato,
          vendedor?.contacto_id || "",
          comprador?.contacto_id || "",
          numeroContratoInicial,
          "F1",
          contactos.find((c) => c.id === (vendedor?.contacto_id || ""))?.cuit || "",
          contactos.find((c) => c.id === (comprador?.contacto_id || ""))?.cuit || "",
          acuerdoContrato.calidad || ""
        );
      } catch {
        // Mantener el borrador editable; la confirmación exige seleccionar ambas partes.
      }
    }

    setContrato((actual) => ({
      ...actual,
      operacion_id: operacion.id,
      acuerdo_id: acuerdoInicial?.id || null,
      numero_contrato: numeroContratoInicial,
      estado: contratoData?.estado || "BORRADOR",
      cantidad_tn: Number(contratoData?.cantidad_tn || operacion.cantidad_tn),
      precio_tn: Number(contratoData?.precio_tn || operacion.precio_tn),
      importe_total: Number(contratoData?.importe_total || operacion.importe_total),
      contenido: contenidoInicial,
    }));

    // ---------------------------------------------------------
    // Intermediario de la operación
    // La selección comercial se obtiene desde
    // operacion_participantes. partes_operacion se conserva
    // únicamente como snapshot contractual.
    // ---------------------------------------------------------

    const { data: participantesOperacion, error: errorParticipantes } =
      await supabase
        .from("operacion_participantes")
        .select("id, empresa_id, rol")
        .eq("operacion_id", operacion.id);

    if (errorParticipantes) {
      setError(
        `No se pudieron cargar los participantes de la operación: ${errorParticipantes.message}`
      );
      return;
    }

    setParticipantesPorOperacion((actual) => ({
      ...actual,
      [operacion.id]: (participantesOperacion || []).map(
        (participante) => ({
          empresa_id: participante.empresa_id,
          rol: participante.rol,
        })
      ),
    }));

    const intermediarioParticipante =
      (participantesOperacion || []).find(
        (participante) => participante.rol === "INTERMEDIARIO"
      );

    setIntermediariosSeleccionados((actual) => ({
      ...actual,
      [operacion.id]:
        intermediarioParticipante?.empresa_id || "",
    }));

    // ---------------------------------------------------------
    // Sincronizar vendedor y comprador contractuales
    // ---------------------------------------------------------

    setVendedorSeleccionado(
      vendedor?.contacto_id || ""
    );

    setCompradorSeleccionado(
      comprador?.contacto_id || ""
    );

    // ---------------------------------------------------------
    // Crear control comercial de la operación si no existe
    // ---------------------------------------------------------

    const { data: controlExistente, error: errorControl } =
      await supabase
        .from("operacion_control_comercial")
        .select("id")
        .eq("operacion_id", operacion.id)
        .maybeSingle();

    if (errorControl) {
      setError(
        `No se pudo cargar el control comercial: ${errorControl.message}`
      );
      return;
    }

    if (!controlExistente) {
      const { error: errorCrearControl } =
        await supabase.rpc("inicializar_control_comercial_contrato", {
          p_operacion_id: operacion.id,
        });

      if (errorCrearControl) {
        setError(
          `No se pudo crear el control comercial: ${errorCrearControl.message}`
        );
        return;
      }
    }

    await cargarControlComercial(operacion);

    await cargarComisionesIntermediarios(
      operacion.id
    );

    setContratoAbierto(operacion.id);
  }


  function generarPDFContrato() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margen = 20;
    const ancho = 170;
    const alto = 297;
    const pie = 18;
    let y = 24;
    let pagina = 1;

    const encabezado = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(5, 92, 67);
      doc.text("AGROBROKERIA · CONTRATO COMERCIAL MODELO F1", margen, 12);
      doc.setDrawColor(5, 140, 91);
      doc.line(margen, 15, 190, 15);
      doc.setTextColor(25, 35, 45);
    };
    const piePagina = () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 120);
      doc.text(`Contrato ${contrato.numero_contrato} · Página ${pagina}`, margen, 288);
      doc.text("Borrador contractual sujeto a revisión y firma de las partes", 190, 288, { align: "right" });
      doc.setTextColor(25, 35, 45);
    };
    encabezado();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("CONTRATO DE COMPRAVENTA DE GRANOS", 105, y, { align: "center" });
    y += 7;
    doc.setFontSize(11);
    doc.text('"MODELO F1"', 105, y, { align: "center" });
    y += 10;

    const contenido = contrato.contenido
      .replace(/\\n/g, String.fromCharCode(10))
      .replace(/\\r/g, "")
      .replace(/\\t/g, "  ");
    for (const linea of contenido.split(String.fromCharCode(10))) {
      const texto = linea.trim();
      if (!texto) { y += 3; continue; }
      const esTitulo = /^(PREÁMBULO|CLÁUSULA|DATOS DE FIRMA|EL VENDEDOR|EL COMPRADOR|INTERMEDIARIO|OBSERVACIONES|ANEXO DE VERIFICACIÓN)/i.test(texto);
      doc.setFont("helvetica", esTitulo ? "bold" : "normal");
      doc.setFontSize(esTitulo ? 10 : 9);
      const lineas = doc.splitTextToSize(texto, ancho);
      const altoTexto = lineas.length * (esTitulo ? 5.2 : 4.6);
      if (y + altoTexto > alto - pie - 8) {
        piePagina();
        doc.addPage();
        pagina += 1;
        encabezado();
        y = 24;
      }
      doc.text(lineas, margen, y);
      y += altoTexto + (esTitulo ? 2 : 1);
    }
    piePagina();
    doc.save(`${contrato.numero_contrato || "contrato-F1"}.pdf`);
  }

  async function guardarIntermediarioOperacion(
    operacionId: string,
    empresaId: string
  ) {
    if (!empresaId) {
      setError("Debe seleccionar una empresa intermediaria.");
      return;
    }

    setError("");
    setMensaje("");

    const intermediario = intermediariosDisponibles.find(
      (item) => item.empresa_id === empresaId
    );

    if (!intermediario) {
      setError(
        "La empresa seleccionada no está habilitada como intermediario."
      );
      return;
    }

    // Verificar que la empresa no sea comprador ni vendedor.
    const { data: participantes, error: errorParticipantes } =
      await supabase
        .from("operacion_participantes")
        .select("empresa_id, rol")
        .eq("operacion_id", operacionId);

    if (errorParticipantes) {
      setError(
        `No se pudieron verificar las partes de la operación: ${errorParticipantes.message}`
      );
      return;
    }

    const esPartePrincipal = (participantes || []).some(
      (participante) =>
        participante.empresa_id === empresaId &&
        (
          participante.rol === "VENDEDOR" ||
          participante.rol === "COMPRADOR"
        )
    );

    if (esPartePrincipal) {
      setError(
        "La empresa intermediaria no puede ser simultáneamente vendedor o comprador de la misma operación."
      );
      return;
    }

    const { error: errorAsignacion } = await supabase.rpc("asignar_intermediario_operacion", {
      p_operacion_id: operacionId,
      p_empresa_id: empresaId,
    });

    if (errorAsignacion) {
      setError(`No se pudo registrar el intermediario: ${errorAsignacion.message}`);
      return;
    }

    setIntermediariosSeleccionados((actual) => ({
      ...actual,
      [operacionId]: empresaId,
    }));

    setParticipantesPorOperacion((actual) => {
      const actuales = actual[operacionId] || [];

      const sinIntermediario = actuales.filter(
        (participante) =>
          participante.rol !== "INTERMEDIARIO"
      );

      return {
        ...actual,
        [operacionId]: [
          ...sinIntermediario,
          {
            empresa_id: empresaId,
            rol: "INTERMEDIARIO",
          },
        ],
      };
    });

    setMensaje(
      `✅ Intermediario ${intermediario.razon_social} asignado a la operación.`
    );
  }

  async function guardarParteOperacion(
    operacionId: string,
    rol: string,
    contactoId: string
  ) {
    if (!contactoId) {
      setError(
        `Debe seleccionar un contacto para ${rol.toLowerCase()}.`
      );
      return;
    }

    setError("");
    setMensaje("");

    const { error } = await supabase.rpc("guardar_parte_operacion", {
      p_operacion_id: operacionId,
      p_contacto_id: contactoId,
      p_rol: rol,
    });

    if (error) {
      console.error(error);
      setError(
        `No se pudo guardar ${rol.toLowerCase()}: ${error.message}`
      );
      return;
    }

    setMensaje(
      `✅ ${rol.charAt(0) + rol.slice(1).toLowerCase()} guardado correctamente.`
    );
  }

  function generarContenidoContratoF1(
    operacion: Operacion,
    acuerdoDatos: Acuerdo,
    vendedorId: string = vendedorSeleccionado,
    compradorId: string = compradorSeleccionado,
    numeroContrato: string = contrato.numero_contrato,
    tipoContrato: "F1" = "F1",
    cuitVendedorOverride?: string,
    cuitCompradorOverride?: string,
    calidadOverride?: string
  ) {
    const vendedor = contactos.find((c) => c.id === vendedorId);
    const comprador = contactos.find((c) => c.id === compradorId);
    if (!vendedor) throw new Error("Debe seleccionar el vendedor antes de generar el contrato.");
    if (!comprador) throw new Error("Debe seleccionar el comprador antes de generar el contrato.");

    const fecha = new Date().toLocaleDateString("es-AR");
    const meta = operacionMeta[operacion.id];
    const producto = meta?.producto && meta.producto !== "Producto registrado"
      ? meta.producto
      : "Producto pendiente de identificación en la publicación";
    const cuitVendedor = (cuitVendedorOverride ?? vendedor.cuit ?? "").trim();
    const cuitComprador = (cuitCompradorOverride ?? comprador.cuit ?? "").trim();
    const calidad = (calidadOverride ?? acuerdoDatos.calidad ?? "").trim() || "Condición de calidad pendiente de especificación y aceptación por las partes";
    const domicilio = (p: ContactoComercial) => [p.domicilio, p.localidad, p.provincia].filter(Boolean).join(", ") || "Domicilio pendiente de completar";
    const cuitTexto = (v: string) => v ? v : "A VERIFICAR EN LEGAJO DIGITAL";
    const moneda = monedaOperacion(operacion);
    const monto = (Number(operacion.cantidad_tn || 0) * Number(operacion.precio_tn || 0));
    const intermediario = "AgroComercio Santa Fe (plataforma AgroBrokerIA)";
    const origen = acuerdoDatos.lugar_carga || meta?.origen || "Pendiente de completar";
    const destino = acuerdoDatos.destino || meta?.destino || "Pendiente de completar";
    const entrega = acuerdoDatos.condicion_entrega || "Según acuerdo comercial confirmado";
    const pago = acuerdoDatos.forma_pago || "Transferencia bancaria directa entre las partes, según liquidación oficial";
    const plazo = acuerdoDatos.plazo_pago || "Contra entrega física verificada, sujeto a liquidación acordada";
    const flete = acuerdoDatos.flete || "A definir expresamente por las partes";
    return `CONTRATO DE COMPRAVENTA DE GRANOS "MODELO F1"

N° CONTRATO: ${numeroContrato}
N° OPERACIÓN: ${operacion.codigo}
FECHA DE EMISIÓN: ${fecha}

PREÁMBULO: PARTES CONTRATANTES

En la localidad y provincia que surgen de los domicilios constituidos, República Argentina, se celebra el presente instrumento de compraventa de granos asociado a la operación identificada, entre las siguientes partes:

1. EL VENDEDOR: ${vendedor.nombre_razon_social}, CUIT/CUIL: ${cuitTexto(cuitVendedor)}, con domicilio en ${domicilio(vendedor)}.
2. EL COMPRADOR: ${comprador.nombre_razon_social}, CUIT/CUIL: ${cuitTexto(cuitComprador)}, con domicilio en ${domicilio(comprador)}.
3. EL INTERMEDIARIO / PLATAFORMA: ${intermediario}. Su intervención y alcance se limitan a los servicios efectivamente contratados y habilitados en la plataforma. Los datos fiscales y la representación legal deberán verificarse en el legajo correspondiente antes de la firma.

CLÁUSULA 1 — OBJETO Y MERCADERÍA

El VENDEDOR se obliga a transferir y entregar al COMPRADOR, quien se obliga a recibir y pagar, la mercadería individualizada a continuación, conforme a las condiciones comerciales aceptadas por ambas partes:
- Producto: ${producto}.
- Volumen total: ${formatoNumero(operacion.cantidad_tn)} tonelada(s) métrica(s) (${formatoNumero(Number(operacion.cantidad_tn) * 1000)} kg).
- Tipo de contrato: compraventa de granos — Modelo F1.
- Identificación de control: ${operacion.codigo}.

CLÁUSULA 2 — PRECIO Y LIQUIDACIÓN

El precio pactado es de ${moneda} ${formatoNumero(operacion.precio_tn)} por tonelada métrica. El importe total estimado, sujeto a pesaje, calidad y liquidación definitiva, asciende a ${moneda} ${formatoNumero(monto)}. La liquidación se realizará conforme a la documentación comercial y fiscal aplicable y a las condiciones expresamente aceptadas por las partes. Los pagos entre comprador y vendedor se efectuarán por los canales bancarios acordados, fuera de cualquier custodia de fondos que no haya sido expresamente habilitada.

CLÁUSULA 3 — CONDICIONES DE LOGÍSTICA Y ENTREGA

- Lugar de carga (origen): ${origen}.
- Destino de descarga: ${destino}.
- Condición / modalidad de entrega: ${entrega}.
- Forma de pago: ${pago}.
- Plazo de pago: ${plazo}.
- Responsabilidad del flete: ${flete}.
Las partes deberán completar y respetar los turnos, cupos, datos de transporte y demás condiciones operativas antes del despacho.

CLÁUSULA 4 — DOCUMENTACIÓN DE TRANSPORTE

El traslado deberá contar con la Carta de Porte Electrónica (CPE) y demás documentación exigible, emitida y autorizada por los organismos competentes. El dador de carga y el transportista serán responsables de la exactitud de los datos declarados y de la vigencia de la documentación. AgroBrokerIA solo informará una validación automática cuando la integración correspondiente se encuentre efectivamente habilitada y haya devuelto una respuesta verificable; este contrato no presume la existencia de webhooks, telemetría GPS ni monitoreo activo si no constan como servicios habilitados para esta operación.

CLÁUSULA 5 — CALIDAD Y CONDICIÓN DE LA MERCADERÍA

Condición de calidad pactada: ${calidad}
Los parámetros de humedad, materias extrañas, granos dañados, merma, tolerancias y cualquier bonificación o descuento deberán consignarse de manera expresa en el acuerdo comercial o en el certificado de calidad aceptado por ambas partes. No se presumirán valores técnicos que no hayan sido informados y verificados.

CLÁUSULA 6 — SERVICIO DE INTERMEDIACIÓN Y COMISIÓN TECNOLÓGICA

Las partes reconocen únicamente las comisiones que se encuentren expresamente informadas y aceptadas en el registro de la operación. La comisión propia de AgroBrokerIA es de USD 1 (un dólar estadounidense) por tonelada métrica, equivalente a USD ${formatoNumero(operacion.cantidad_tn)} para el volumen contractual indicado. Se paga por transferencia bancaria a la cuenta corporativa verificada; su retención o liberación contable depende de las reglas operativas y verificaciones efectivamente registradas. Los honorarios de intermediarios terceros se acuerdan, facturan y liquidan externamente entre quienes correspondan. Esta cláusula no establece custodia de fondos del flete ni garantiza una transferencia automática de fondos de terceros.

CLÁUSULA 7 — ENTREGA, RECEPCIÓN Y CONSTANCIAS

La entrega se acreditará mediante la documentación de transporte, constancias de descarga, pesaje y recepción que correspondan. Las partes deberán revisar y registrar cualquier diferencia de kilos, calidad, faltante, rechazo o incidencia antes de dar por cumplida la entrega. La liberación de importes retenidos por la plataforma, si correspondiera, dependerá exclusivamente de las verificaciones registradas y de las reglas operativas efectivamente habilitadas.

CLÁUSULA 8 — VIGENCIA Y MODIFICACIONES

El presente contrato regirá para la operación ${operacion.codigo} hasta el cumplimiento de las obligaciones aquí asumidas. Toda modificación de producto, volumen, precio, calidad, destino, forma de pago o logística deberá documentarse y contar con aceptación expresa de las partes.

CLÁUSULA 9 — INCUMPLIMIENTO Y FUERZA MAYOR

El incumplimiento será tratado conforme a las obligaciones expresamente asumidas y a la normativa aplicable. Ninguna parte responderá por imposibilidad de cumplimiento causada por hechos extraordinarios, imprevisibles e inevitables debidamente acreditados, sin perjuicio del deber de notificar y mitigar sus efectos.

CLÁUSULA 10 — LEGISLACIÓN Y JURISDICCIÓN

El contrato se interpretará conforme a las leyes de la República Argentina. Si resulta legalmente procedente y ambas partes lo aceptan expresamente, se someten a los Tribunales Ordinarios competentes de Venado Tuerto, Provincia de Santa Fe. Esta elección deberá ser revisada por las partes y su asesoría legal antes de la firma.

CLÁUSULA 11 — CONFORMIDAD, FIRMA Y DOCUMENTACIÓN

Las partes declaran haber leído el contenido y deberán prestar su conformidad mediante firma manuscrita o mediante la carga en AgroBrokerIA de un ejemplar PDF firmado por los representantes autorizados. La plataforma registrará el archivo y sus datos de auditoría cuando la función de carga se encuentre habilitada. No se afirma que este documento tenga firma digital integrada.

DATOS DE FIRMA

EL VENDEDOR
Nombre / Razón social: ${vendedor.nombre_razon_social}
CUIT/CUIL: ${cuitTexto(cuitVendedor)}
Firma: ______________________________________
Aclaración: __________________________________
Fecha: _______________________________________

EL COMPRADOR
Nombre / Razón social: ${comprador.nombre_razon_social}
CUIT/CUIL: ${cuitTexto(cuitComprador)}
Firma: ______________________________________
Aclaración: __________________________________
Fecha: _______________________________________

INTERMEDIARIO / CONSTANCIA DE PLATAFORMA
${intermediario}
La constancia de plataforma no sustituye la firma de las partes ni la documentación fiscal o de transporte exigible.

OBSERVACIONES
${acuerdoDatos.observaciones?.trim() || "Sin observaciones adicionales."}

ANEXO DE VERIFICACIÓN
Los datos fiscales, domicilios, calidad, condiciones de entrega, jurisdicción y facultades de representación indicados como pendientes deberán verificarse y completarse antes de la firma. La huella criptográfica deberá calcularse sobre el archivo PDF final efectivamente generado y conservarse en el registro de auditoría; no se incorpora un hash de ejemplo o prefabricado.
`;
  }

  async function guardarContrato(
    operacion: Operacion,
    confirmar: boolean
  ) {
    try {
      setGuardandoContrato(true);
      setError("");
      setMensaje(
        confirmar
          ? "Procesando confirmación del contrato..."
          : "Guardando contrato..."
      );

      const estado = confirmar
        ? "CONFIRMADO"
        : "BORRADOR";

      // ---------------------------------------------------------
      // Recuperar el Acuerdo Comercial real de la operación
      // ---------------------------------------------------------

      const {
        data: acuerdoDB,
        error: errorAcuerdoDB,
      } = await supabase
        .from("acuerdos_comerciales")
        .select("*")
        .eq("operacion_id", operacion.id)
        .maybeSingle();

      if (errorAcuerdoDB) {
        setMensaje("");
        setError(
          `No se pudo recuperar el Acuerdo Comercial: ${errorAcuerdoDB.message}`
        );
        return;
      }

      if (!acuerdoDB) {
        setMensaje("");
        setError(
          "No existe un Acuerdo Comercial guardado para esta operación."
        );
        return;
      }

      const acuerdoReal: Acuerdo = {
        id: acuerdoDB.id,
        operacion_id: operacion.id,
        lugar_carga: acuerdoDB.lugar_carga || "",
        destino: acuerdoDB.destino || "",
        condicion_entrega: acuerdoDB.condicion_entrega || "",
        forma_pago: acuerdoDB.forma_pago || "",
        plazo_pago: acuerdoDB.plazo_pago || "",
        flete: acuerdoDB.flete || "",
        calidad: acuerdoDB.calidad || "",
        observaciones: acuerdoDB.observaciones || "",
        estado: acuerdoDB.estado || "CONFIRMADO",
      };

      setAcuerdo(acuerdoReal);

      let contenidoContrato = contrato.contenido;

      if (!contenidoContrato.trim()) {
        try {
          contenidoContrato = generarContenidoContratoF1(
            operacion,
            acuerdoReal,
            vendedorSeleccionado,
            compradorSeleccionado,
            contrato.numero_contrato,
            "F1"
          );
        } catch (e) {
          setMensaje("");
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo generar el contrato F1."
          );
          return;
        }
      }

      const { data: contratoGuardado, error: errorContrato } = await supabase.rpc("guardar_contrato_comercial", {
        p_operacion_id: operacion.id,
        p_datos: {
          acuerdo_id: acuerdoDB.id,
          numero_contrato: contrato.numero_contrato,
          estado,
          cantidad_tn: operacion.cantidad_tn,
          precio_tn: operacion.precio_tn,
          importe_total: operacion.importe_total,
          lugar_carga: acuerdoDB.lugar_carga || null,
          destino: acuerdoDB.destino || null,
          condicion_entrega: acuerdoDB.condicion_entrega || null,
          forma_pago: acuerdoDB.forma_pago || null,
          plazo_pago: acuerdoDB.plazo_pago || null,
          flete: acuerdoDB.flete || null,
          calidad: acuerdoDB.calidad || null,
          observaciones: acuerdoDB.observaciones || null,
          contenido: contenidoContrato,
        },
      });

      if (errorContrato) {
        console.error(errorContrato);
        setMensaje("");
        setError(
          `No se pudo guardar el contrato: ${errorContrato.message}`
        );
        return;
      }

      const contratoGuardadoData = asJsonRecord(contratoGuardado);
      const contratoGuardadoId = contratoGuardadoData?.id;
      if (typeof contratoGuardadoId !== "string") {
        setError("La base de datos guardó el contrato sin devolver un identificador válido.");
        return;
      }
      setContrato((actual) => ({
        ...actual,
        id: contratoGuardadoId,
        estado,
        contenido: contenidoContrato,
      }));

      if (!confirmar) {
        setError("");
        setMensaje(
          "✅ Contrato guardado como borrador."
        );
        return;
      }

      const workflow = obtenerWorkflow(operacion.id);

      if (!workflow) {
        setMensaje("");
        setError(
          "El contrato se guardó, pero la operación no tiene workflow."
        );
        return;
      }

      const { data: siguienteEtapa, error: errorEtapa } =
        await supabase
          .from("workflow_etapas")
          .select("id, nombre, orden")
          .eq("workflow_id", workflow.workflow_id)
          .eq("orden", 6)
          .maybeSingle();

      if (errorEtapa) {
        setMensaje("");
        setError(
          `El Contrato Definitivo se guardó, pero no se pudo encontrar la etapa Firmas del vendedor y comprador: ${errorEtapa.message}`
        );
        return;
      }

      if (!siguienteEtapa) {
        setMensaje("");
        setError(
          "El Contrato Definitivo se guardó, pero no existe la etapa 6 (Firmas del vendedor y comprador)."
        );
        return;
      }

      const { error: errorWorkflow } = await avanzarWorkflowSeguro(workflow.id, siguienteEtapa.id);

      if (errorWorkflow) {
        setMensaje("");
        setError(
          `El Contrato Definitivo se guardó, pero no se pudo avanzar a Firmas: ${errorWorkflow.message}`
        );
        return;
      }

      setError("");
      setMensaje(
        "✅ Contrato Definitivo confirmado. La operación pasó a Firmas."
      );

      setContratoAbierto(null);

      await cargarOperaciones();
    } catch (e) {
      console.error(e);
      setMensaje("");
      setError(
        `Ocurrió un error al guardar el contrato: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    } finally {
      setGuardandoContrato(false);
    }
  }

  async function guardarAcuerdo(
    operacion: Operacion,
    confirmar: boolean
  ) {
    console.log("GUARDAR ACUERDO", {
      operacion: operacion.codigo,
      confirmar,
      acuerdo,
    });

    try {
      setGuardando(true);
      setError("");
      setMensaje(
        confirmar
          ? "Procesando confirmación del acuerdo..."
          : "Guardando acuerdo comercial..."
      );

      /*
       * =========================================================
       * VALIDACIONES PARA CONFIRMAR ACUERDO COMERCIAL
       * =========================================================
       *
       * El Acuerdo Comercial puede confirmarse con o sin
       * intermediario externo.
       *
       * La comisión de AgroBrokerIA es siempre automática:
       * USD 1 por tonelada.
       *
       * Si existe un intermediario externo, su comisión se
       * registra y liquida por separado.
       */
      if (confirmar) {
        // La comisión de plataforma se calcula siempre a USD 1 por TN.
        // Sincronizamos el control comercial desde el dato maestro de la operación
        // para evitar bloquear la confirmación por un control desactualizado.
        const comisionAgroBrokerEsperada = Number(operacion.cantidad_tn || 0);
        // La función de base de datos calcula monto y moneda desde cantidad_tn.
        // No enviar comision_estado: su cambio está reservado al circuito de retención verificada.
        const { error: sincronizacionError } = await supabase.rpc("guardar_control_comercial", {
          p_operacion_id: operacion.id,
          p_cambios: {},
        });
        if (sincronizacionError) {
          setMensaje("");
          setError(`No se pudo sincronizar la comisión automática de USD 1 por tonelada: ${sincronizacionError.message}`);
          return;
        }
      }

      const estado = confirmar
        ? "CONFIRMADO"
        : "BORRADOR";

      const datosAcuerdo = {
        operacion_id: operacion.id,
        lugar_carga: acuerdo.lugar_carga || null,
        destino: acuerdo.destino || null,
        condicion_entrega:
          acuerdo.condicion_entrega || null,
        forma_pago: acuerdo.forma_pago || null,
        plazo_pago: acuerdo.plazo_pago || null,
        flete: acuerdo.flete || null,
        calidad: acuerdo.calidad || null,
        observaciones:
          acuerdo.observaciones || null,
        estado,
        confirmado_at: confirmar
          ? new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };

      console.log(
        "DATOS A GUARDAR:",
        datosAcuerdo
      );

      const { data: acuerdoGuardado, error: errorAcuerdo } = await supabase.rpc("guardar_acuerdo_comercial", {
        p_operacion_id: operacion.id,
        p_datos: datosAcuerdo,
      });

      if (errorAcuerdo) {
        console.error(
          "ERROR SUPABASE:",
          errorAcuerdo
        );

        setMensaje("");
        setError(
          `No se pudo guardar el acuerdo: ${errorAcuerdo.message}`
        );
        return;
      }

      console.log(
        "ACUERDO GUARDADO:",
        acuerdoGuardado
      );

      const acuerdoGuardadoData = asJsonRecord(acuerdoGuardado);
      const acuerdoGuardadoId = acuerdoGuardadoData?.id;
      if (typeof acuerdoGuardadoId !== "string") {
        setError("La base de datos guardó el acuerdo sin devolver un identificador válido.");
        return;
      }
      setAcuerdo((actual) => ({
        ...actual,
        id: acuerdoGuardadoId,
        estado,
      }));

      if (!confirmar) {
        setError("");
        setMensaje(
          "✅ Acuerdo comercial guardado como borrador."
        );
        return;
      }

      const workflow =
        obtenerWorkflow(operacion.id);

      if (!workflow) {
        setMensaje("");
        setError(
          "El acuerdo se guardó, pero la operación no tiene workflow asociado."
        );
        return;
      }

      const {
        data: siguienteEtapa,
        error: errorEtapa,
      } = await supabase
        .from("workflow_etapas")
        .select("id, nombre, orden")
        .eq(
          "workflow_id",
          workflow.workflow_id
        )
        .eq("orden", 3)
        .maybeSingle();

      if (errorEtapa) {
        setMensaje("");
        setError(
          `El acuerdo se guardó, pero no se pudo buscar Visado de mercadería: ${errorEtapa.message}`
        );
        return;
      }

      if (!siguienteEtapa) {
        setMensaje("");
        setError(
          "El acuerdo se guardó, pero no existe la etapa 3 (Visado de mercadería) en este workflow."
        );
        return;
      }

      const { error: errorWorkflow } = await avanzarWorkflowSeguro(workflow.id, siguienteEtapa.id);

      if (errorWorkflow) {
        setMensaje("");
        setError(
          `El acuerdo se guardó, pero no se pudo avanzar a Visado de mercadería: ${errorWorkflow.message}`
        );
        return;
      }

      setError("");
      setMensaje(
        "✅ Acuerdo Comercial confirmado. La operación pasó a Visado de mercadería."
      );

      setAcuerdoAbierto(null);

      await cargarOperaciones();
    } catch (e) {
      console.error(
        "ERROR GENERAL:",
        e
      );

      setMensaje("");
      setError(
        `Ocurrió un error al guardar el acuerdo: ${
          e instanceof Error
            ? e.message
            : String(e)
        }`
      );
    } finally {
      setGuardando(false);
    }
  }

  async function abrirAcuerdo(operacion: Operacion) {
    setMensaje("");
    setError("");

    const { data, error } = await supabase
      .from("acuerdos_comerciales")
      .select("*")
      .eq("operacion_id", operacion.id)
      .maybeSingle();

    if (error) {
      setError(`No se pudo cargar el acuerdo: ${error.message}`);
      return;
    }

    if (data) {
      setAcuerdo({
        id: data.id,
        operacion_id: operacion.id,
        lugar_carga: data.lugar_carga || "",
        destino: data.destino || "",
        condicion_entrega: data.condicion_entrega || "",
        forma_pago: data.forma_pago || "",
        plazo_pago: data.plazo_pago || "",
        flete: data.flete || "",
        calidad: data.calidad || "",
        observaciones: data.observaciones || "",
        estado: data.estado || "BORRADOR",
      });
    } else {
      setAcuerdo({
        operacion_id: operacion.id,
        lugar_carga: "",
        destino: "",
        condicion_entrega: "",
        forma_pago: "",
        plazo_pago: "",
        flete: "",
        calidad: "",
        observaciones: "",
        estado: "BORRADOR",
      });
    }

    setAcuerdoAbierto(operacion.id);
  }

  function cambiarCampo(
    campo: keyof Acuerdo,
    valor: string
  ) {
    setAcuerdo((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  async function actualizarControlComercial(
    operacionId: string,
    cambios: Partial<ControlComercialData>
  ) {
    setError("");
    setMensaje("");

    const { data, error } = await supabase.rpc("guardar_control_comercial", {
      p_operacion_id: operacionId,
      p_cambios: cambios,
    });

    if (error) {
      console.error(error);
      setError(
        `No se pudo actualizar el control comercial: ${error.message}`
      );
      return false;
    }

    const controlGuardado = asJsonRecord(data);
    if (!controlGuardado) {
      setError("La base de datos no devolvió el control comercial actualizado.");
      return false;
    }
    setControlesComerciales((actual) => ({
      ...actual,
      [operacionId]: {
        ...actual[operacionId],
        ...controlGuardado as Partial<ControlComercialData>,
      },
    }));

    // =========================================================
    // VISADO DE MERCADERÍA
    // =========================================================

    if (cambios.visado_resultado === "APROBADO") {
      setError("");
      // El visado aprobado debe mover el workflow de forma inmediata a la retención.
      const { data: avance, error: avanceError } = await supabase.rpc(
        "avanzar_visado_aprobado_a_retencion",
        { p_operacion_id: operacionId }
      );
      if (avanceError) {
        console.error("Visado aprobado pero no se pudo avanzar el workflow:", avanceError);
        setMensaje("Visado APROBADO. No se perdió la aprobación; el avance a Retención quedó pendiente.");
        setError("El visado se guardó como APROBADO, pero no se pudo avanzar a Retención de comisión: " + avanceError.message);
        await cargarOperaciones();
        return false;
      }
      setVisadoAbierto(null);
      const avanceData = asJsonRecord(avance);
      setMensaje(avanceData?.ya_estaba_avanzada === true
        ? "Visado APROBADO. La operación ya estaba en Retención de comisión AgroBrokerIA."
        : "Visado APROBADO. La operación avanzó automáticamente a Retención de comisión AgroBrokerIA. Ahora corresponde cargar y verificar el comprobante bancario.");
      await cargarOperaciones();
      return true;
    }

    if (cambios.visado_resultado === "RECHAZADO") {
      setMensaje(
        "❌ Visado rechazado. La operación permanece bloqueada y no puede avanzar a Contrato Definitivo."
      );

      return true;
    }

    // =========================================================
    // FIRMAS DEL CONTRATO DEFINITIVO
    // =========================================================

    const esCambioDeFirma =
      cambios.vendedor_firma_estado !== undefined ||
      cambios.comprador_firma_estado !== undefined ||
      cambios.intermediario_firma_estado !== undefined;

    if (esCambioDeFirma) {
      const controlActualizado = asJsonRecord(data);
      const vendedorFirmado =
        controlActualizado?.vendedor_firma_estado === "FIRMADO";

      const compradorFirmado =
        controlActualizado?.comprador_firma_estado === "FIRMADO";

      const intermediarioCumplido =
        controlActualizado?.intermediario_firma_estado === "FIRMADO" ||
        controlActualizado?.intermediario_firma_estado === "NO_CORRESPONDE";

      if (
        vendedorFirmado &&
        compradorFirmado &&
        intermediarioCumplido
      ) {
        const workflow = obtenerWorkflow(operacionId);

        if (!workflow) {
          setError(
            "Las firmas fueron registradas, pero la operación no tiene workflow asociado."
          );
          return false;
        }

        const { data: etapaFondos, error: errorEtapaFondos } =
          await supabase
            .from("workflow_etapas")
            .select("id, nombre, orden")
            .eq("workflow_id", workflow.workflow_id)
            .eq("orden", 6)
            .maybeSingle();

        if (errorEtapaFondos) {
          setError(
            `Las firmas fueron registradas, pero no se pudo localizar la etapa Firmas: ${errorEtapaFondos.message}`
          );
          return false;
        }

        if (!etapaFondos) {
          setError(
            "Las firmas fueron registradas, pero no existe la etapa 6 (Firmas)."
          );
          return false;
        }

        const { error: errorAvanceFondos } = await avanzarWorkflowSeguro(workflow.id, etapaFondos.id);

        if (errorAvanceFondos) {
          setError(
            `Las firmas fueron registradas, pero no se pudo avanzar a Firmas: ${errorAvanceFondos.message}`
          );
          return false;
        }

        setError("");
        setMensaje(
          "✅ Todas las firmas requeridas fueron completadas. La operación pasó a Firmas."
        );

        await cargarOperaciones();

        return true;
      }

      setError("");
      setMensaje(
        "✅ Firma registrada. La operación permanece en Firmas hasta completar todas las firmas requeridas."
      );

      return true;
    }

    return true;
  }

  async function iniciarLogistica(operacionId: string) {
    const workflow = obtenerWorkflow(operacionId);
    if (!workflow || workflow.orden !== 7) {
      setError("La operación debe estar en Logística / Entrega para gestionar la entrega.");
      return false;
    }
    return true;
  }

  async function confirmarEntregaYAvanzar(
    operacionId: string
  ) {
    setError("");
    setMensaje("");

    const { data: viajesConfirmacion, error: errorViajes } = await supabase
      .from("viajes")
      .select("id,transportista_entrega_confirmada_at,productor_recepcion_confirmada_at,estado,productor_recepcion_observada_at")
      .eq("operacion_id", operacionId);
    if (errorViajes) {
      setError("No se pudo verificar la doble conformidad de los viajes: " + errorViajes.message);
      return false;
    }
    const todosConfirmados = Boolean(viajesConfirmacion?.length) && viajesConfirmacion!.every((viaje: any) =>
      viaje.transportista_entrega_confirmada_at &&
      viaje.productor_recepcion_confirmada_at &&
      viaje.estado === "ENTREGADO_CONFIRMADO" &&
      !viaje.productor_recepcion_observada_at
    );
    if (!todosConfirmados) {
      setError("La operación no puede avanzar: cada viaje debe tener confirmación del transportista y recepción conforme del productor.");
      return false;
    }

    const workflow = obtenerWorkflow(operacionId);

    if (!workflow) {
      setError(
        "La entrega fue registrada, pero la operación no tiene workflow asociado."
      );
      return false;
    }

    if (workflow.orden !== 7) {
      setError(
        `La entrega no puede avanzar porque la operación está en la etapa ${workflow.etapa_actual}.`
      );
      return false;
    }

    const { data: etapaLiquidacion, error: errorEtapaLiquidacion } =
      await supabase
        .from("workflow_etapas")
        .select("id, nombre, orden")
        .eq("workflow_id", workflow.workflow_id)
        .eq("orden", 8)
        .maybeSingle();

    if (errorEtapaLiquidacion) {
      setError(
        `La entrega fue registrada, pero no se pudo localizar la etapa Liquidación: ${errorEtapaLiquidacion.message}`
      );
      return false;
    }

    if (!etapaLiquidacion) {
      setError(
        "La entrega fue registrada, pero no existe la etapa 8 (Liquidación) en este workflow."
      );
      return false;
    }

    const { error: errorAvance } = await avanzarWorkflowSeguro(workflow.id, etapaLiquidacion.id);

    if (errorAvance) {
      setError(
        `La entrega fue registrada, pero no se pudo avanzar a Liquidación: ${errorAvance.message}`
      );
      return false;
    }

    setError("");
    setMensaje(
      "✅ Entrega confirmada. La operación pasó a Liquidación."
    );

    await cargarOperaciones();

    return true;
  }

  async function confirmarLiquidacionYAvanzar(
    operacionId: string
  ) {
    setError("");
    setMensaje("");

    const workflow = obtenerWorkflow(operacionId);

    if (!workflow) {
      setError(
        "La operación no tiene workflow asociado."
      );
      return false;
    }

    if (workflow.orden !== 8) {
      setError(
        `No se puede cerrar la operación porque está en la etapa ${workflow.etapa_actual}.`
      );
      return false;
    }

    const { error: errorEconomico } = await supabase.rpc(
      "confirmar_liquidacion_y_cerrar_operacion",
      {
        p_operacion_id: operacionId,
      }
    );

    if (errorEconomico) {
      setError(
        `No se pudo confirmar económicamente la liquidación: ${errorEconomico.message}`
      );
      return false;
    }

    // El RPC de cierre solo cierra la operación si la comisión ya fue liberada
    // por el control independiente de pago bancario + doble conformidad de entrega.
    // No libera fondos ni debe intentarse un segundo avance secuencial.
    setMensaje(
      "✅ Liquidación confirmada. Comisión AgroBrokerIA previamente liberada contablemente y operación cerrada."
    );

    await cargarOperaciones();

    return true;
  }

  const estadoVistaOperacion = (operacion: Operacion) => {
    const workflow = obtenerWorkflow(operacion.id);
    const orden = workflow?.orden ?? 0;
    if (/CANCEL/i.test(operacion.estado)) return "Canceladas";
    if (orden === 9 || /CERR|FINAL/i.test(operacion.estado)) return "Finalizadas";
    if (orden >= 1 && orden <= 3) return "En negociación";
    if (orden >= 4 && orden <= 6) return "En contrato";
    if (orden === 7) return "En logística";
    if (orden === 8) return "En liquidación";
    const estado = (operacion.estado || "").toUpperCase();
    if (["NEGOCIACION", "EN_NEGOCIACION", "PENDIENTE_NEGOCIACION"].includes(estado)) return "En negociación";
    if (["EN_CONTRATO", "CONTRATO"].includes(estado)) return "En contrato";
    if (["EN_LOGISTICA", "LOGISTICA"].includes(estado)) return "En logística";
    if (["EN_LIQUIDACION", "LIQUIDACION"].includes(estado)) return "En liquidación";
    return "En negociación";
  };

  const operacionesFiltradas = operaciones.filter((operacion) => {
    const workflow = obtenerWorkflow(operacion.id);
    const etapa = workflow?.etapa_actual || "";
    const estadoVista = estadoVistaOperacion(operacion);
    const meta = operacionMeta[operacion.id] || { producto: "", origen: "", destino: "", contraparte: "" };
    const texto = `${operacion.codigo} ${etapa} ${meta.producto} ${meta.origen} ${meta.destino}`.toLowerCase();
    const fecha = operacion.fecha_operacion?.slice(0,10) || "";
    return (!filtroEstado || estadoVista === filtroEstado) &&
      (!filtroProducto || texto.includes(filtroProducto.toLowerCase())) &&
      (!filtroOrigen || meta.origen.toLowerCase().includes(filtroOrigen.toLowerCase())) &&
      (!filtroDestino || meta.destino.toLowerCase().includes(filtroDestino.toLowerCase())) &&
      (!filtroMinVol || operacion.cantidad_tn >= Number(filtroMinVol)) &&
      (!filtroMaxVol || operacion.cantidad_tn <= Number(filtroMaxVol)) &&
      (!filtroMinPrecio || operacion.precio_tn >= Number(filtroMinPrecio)) &&
      (!filtroMaxPrecio || operacion.precio_tn <= Number(filtroMaxPrecio)) &&
      (!filtroDesde || fecha >= filtroDesde) &&
      (!filtroHasta || fecha <= filtroHasta);
  });
  const totalVolumen = operaciones.reduce((a,o)=>a+o.cantidad_tn,0);
  const enNegociacion = operaciones.filter(o=>estadoVistaOperacion(o)==="En negociación").length;
  const enContrato = operaciones.filter(o=>estadoVistaOperacion(o)==="En contrato").length;
  const enLogistica = operaciones.filter(o=>estadoVistaOperacion(o)==="En logística").length;
  const enLiquidacion = operaciones.filter(o=>estadoVistaOperacion(o)==="En liquidación").length;
  const limpiarFiltros=()=>{setFiltroEstado("");setFiltroOrigen("");setFiltroDestino("");setFiltroProducto("");setFiltroMinVol("");setFiltroMaxVol("");setFiltroMinPrecio("");setFiltroMaxPrecio("");setFiltroDesde("");setFiltroHasta("")};

  return (
    <main className="operations-reference">
      <header className="operations-head">
        <div><h1>Operaciones</h1><p>Gestiona todas tus operaciones de granos y commodities, desde la negociación hasta la liquidación</p></div>
        <button className="operations-new" onClick={()=>window.location.href="/operaciones/nueva"}>＋ Nueva operación</button>
      </header>

      {error && <div className="operations-alert error">{error}</div>}
      {mensaje && <div className="operations-alert success">{mensaje}</div>}

      <section className="operations-kpis">
        <Kpi icon="🟢" value={operaciones.length.toLocaleString("es-AR")} label="Operaciones totales" trend="Datos registrados" tone="green"/>
        <Kpi icon="🤝" value={enNegociacion.toLocaleString("es-AR")} label="En negociación" trend="Estado actual" tone="blue"/>
        <Kpi icon="📄" value={enContrato.toLocaleString("es-AR")} label="En contrato" trend="Estado actual" tone="purple"/>
        <Kpi icon="🚚" value={enLogistica.toLocaleString("es-AR")} label="En logística" trend="Estado actual" tone="mint"/>
        <Kpi icon="💰" value={enLiquidacion.toLocaleString("es-AR")} label="En liquidación" trend="Estado actual" tone="orange"/>
      </section>

      <div className="operations-tabs">
        {["Todas las operaciones","En negociación","En contrato","En logística","En liquidación","Finalizadas","Canceladas"].map(tab=>
          <button key={tab} className={filtroEstado===(tab==="Todas las operaciones"?"":tab)?"active":""} onClick={()=>setFiltroEstado(tab==="Todas las operaciones"?"":tab)}>{tab}</button>
        )}
      </div>

      <section className="operations-layout">
        <div className="operations-main-card">
          <div className="operations-table-head">
            <span># OPERACIÓN</span><span>PRODUCTO</span><span>VOLUMEN</span><span>PRECIO / TN</span><span>TIPO</span><span>ORIGEN</span><span>DESTINO</span><span>CONTRAPARTE</span><span>ESTADO</span><span>FECHA</span><span>ACCIONES</span>
          </div>
          {loading ? <div className="operations-empty">Cargando operaciones…</div> :
            operacionesFiltradas.map((operacion)=>{
              const workflow=obtenerWorkflow(operacion.id), orden=workflow?.orden||0;
              const estado=estadoVistaOperacion(operacion)==="Finalizadas"?"Finalizada":estadoVistaOperacion(operacion);
              const estadoClass=estado.toLowerCase().replaceAll(" ","-").replace("ó","o");
              const meta=operacionMeta[operacion.id] || {producto:"Producto registrado",origen:"No informado",destino:"No informado",contraparte:"No informado"};
              const action=orden===1?()=>iniciarAcuerdoComercial(operacion.id):orden===2?()=>abrirAcuerdo(operacion):orden===3?()=>abrirVisado(operacion):orden===4?()=>abrirContrato(operacion):orden===7?()=>iniciarLogistica(operacion.id):undefined;
              return <div className="operation-directory-row" key={operacion.id}>
                <span className="op-code">{operacion.codigo}</span>
                <span className="op-product"><b>🌾</b><strong>{meta.producto}</strong></span>
                <span><strong>{formatoNumero(operacion.cantidad_tn)} TN</strong></span>
                <span><strong>{formatoNumero(operacion.precio_tn)}</strong></span>
                <span><em className={"op-condition "+"f1"}>F1</em></span>
                <span>🌎 <small>{meta.origen}</small></span>
                <span>🌎 <small>{meta.destino}</small></span>
                <span><small>{meta.contraparte}</small></span>
                <span><em className={"op-status "+estadoClass}>{estado}</em></span>
                <span>{formatoFecha(operacion.fecha_operacion)}</span>
                <span className="op-actions"><button aria-label={"Ver acciones de "+operacion.codigo} title="Ver detalle y acciones" onClick={async()=>{await cargarControlComercial(operacion);setDetalleOperacion(operacion);}} className="op-more">⋮</button></span>
              </div>
            })}
          {!loading&&!operacionesFiltradas.length&&<div className="operations-empty">No hay operaciones que coincidan con los filtros seleccionados.</div>}
        </div>

        <aside className="operations-filters">
          <div className="op-filter-title"><h2>Filtrar operaciones</h2><button onClick={limpiarFiltros}>Limpiar filtros</button></div>
          <Filter label="Producto"><input value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)} placeholder="Buscar producto" /></Filter>
          <Filter label="Estado"><select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}><option value="">Todos los estados</option>{["En negociación","En contrato","En logística","En liquidación","Finalizadas","Canceladas"].map(x=><option key={x}>{x}</option>)}</select></Filter>
          <Filter label="País de origen"><input value={filtroOrigen} onChange={e=>setFiltroOrigen(e.target.value)} placeholder="Buscar origen" /></Filter>
          <Filter label="País de destino"><input value={filtroDestino} onChange={e=>setFiltroDestino(e.target.value)} placeholder="Buscar destino" /></Filter>
          <Filter label="Rango de fecha"><div className="op-two"><input type="date" value={filtroDesde} onChange={e=>setFiltroDesde(e.target.value)}/><input type="date" value={filtroHasta} onChange={e=>setFiltroHasta(e.target.value)}/></div></Filter>
          <Filter label="Rango de volumen (TN)"><div className="op-two"><input type="number" min="0" step="0.01" placeholder="Mínimo" value={filtroMinVol} onChange={e=>setFiltroMinVol(e.target.value)}/><input type="number" min="0" step="0.01" placeholder="Máximo" value={filtroMaxVol} onChange={e=>setFiltroMaxVol(e.target.value)}/></div></Filter>
          <Filter label="Rango de precio / TN"><div className="op-two"><input type="number" min="0" step="0.01" placeholder="Mínimo" value={filtroMinPrecio} onChange={e=>setFiltroMinPrecio(e.target.value)}/><input type="number" min="0" step="0.01" placeholder="Máximo" value={filtroMaxPrecio} onChange={e=>setFiltroMaxPrecio(e.target.value)}/></div></Filter>
          <button className="operations-apply" onClick={()=>document.getElementById("operations-table")?.scrollIntoView({behavior:"smooth"})}>⚱ Aplicar filtros</button>
        </aside>
      </section>

      {detalleOperacion && (() => {
        const workflowDetalle = obtenerWorkflow(detalleOperacion.id);
        const ordenDetalle = workflowDetalle?.orden || 0;

        const metaDetalle = operacionMeta[detalleOperacion.id] || { producto: "Producto registrado", origen: "No informado", destino: "No informado", contraparte: "No informado" };
        const retencionComision = retencionesComision[detalleOperacion.id];
        const continuar = async () => {
          let resultado = false;
          if (ordenDetalle === 1) {
            resultado = await iniciarAcuerdoComercial(detalleOperacion.id);
          } else if (ordenDetalle === 2) {
            await abrirAcuerdo(detalleOperacion);
            resultado = true;
          } else if (ordenDetalle === 3) {
            // Leer el estado persistido antes de decidir; no depender de un estado React potencialmente desactualizado.
            const controlActual = await cargarControlComercial(detalleOperacion);
            if (visadoAprobado(controlActual)) {
              resultado = await avanzarAFondos(detalleOperacion);
            } else {
              abrirVisado(detalleOperacion); resultado = true;
            }
          } else if (ordenDetalle === 4) {
            const controlActual = await cargarControlComercial(detalleOperacion);
            const { data: retencionActual, error: retencionActualError } = await supabase
              .from("operacion_comision_retenciones")
              .select("estado")
              .eq("operacion_id", detalleOperacion.id)
              .maybeSingle();
            if (retencionActualError) {
              setError("No se pudo verificar la retención de la comisión: " + retencionActualError.message);
              return;
            }
            const comisionRetenida = ["RETENIDA", "LIBERADA"].includes(String(retencionActual?.estado || controlActual?.comision_estado || "").toUpperCase());
            if (!comisionRetenida) {
              setMostrarFormularioComision(true);
              return;
            }
            resultado = await avanzarAContratoConComision(detalleOperacion);
          } else if (ordenDetalle === 5) {
            await abrirContrato(detalleOperacion);
            resultado = true;
          } else if (ordenDetalle === 6) {
            setError("");
            setMensaje("Verificando las dos copias firmadas y las aprobaciones administrativas…");
            const { data: contratoFirmado, error: contratoFirmadoError } = await supabase
              .from("contratos")
              .select("id")
              .eq("operacion_id", detalleOperacion.id)
              .eq("estado", "CONFIRMADO")
              .order("confirmado_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (contratoFirmadoError || !contratoFirmado?.id) {
              setMensaje("");
              setError("No se encontró el contrato definitivo confirmado: " + (contratoFirmadoError?.message || "contrato inexistente"));
              return;
            }
            const { data: syncResult, error: syncError } = await supabase.rpc(
              "sincronizar_workflow_firmas_contrato",
              { p_contrato_id: contratoFirmado.id }
            );
            if (syncError) {
              setMensaje("");
              setError("No se pudo avanzar a Logística / Entrega: " + syncError.message);
              return;
            }
            const syncData = asJsonRecord(syncResult);
            if (syncData?.avanzada === true || syncData?.ya_avanzada === true) {
              setMensaje("Las dos copias firmadas están aprobadas. La operación pasó a Logística / Entrega.");
              await cargarOperaciones();
              setDetalleOperacion(null);
              return;
            }
            setMensaje("");
            const pendientes = [
              typeof syncData?.copias_aprobadas === "number" ? `copias aprobadas: ${syncData.copias_aprobadas}/2` : null,
              typeof syncData?.roles_requeridos === "number" ? `partes requeridas: ${syncData.roles_requeridos}/2` : null,
              typeof syncData?.firmas_registradas === "number" ? `firmas registradas: ${syncData.firmas_registradas}/2` : null,
            ].filter(Boolean).join(" · ");
            setError("La base de datos todavía no autorizó el avance. " + (pendientes || "Revisá que ambas copias estén aprobadas para la misma versión del contrato.") + (typeof syncData?.orden === "number" ? ` · etapa actual: ${syncData.orden}` : ""));
            return;
          } else if (ordenDetalle === 7) {
            return;
          } else if (ordenDetalle === 8) {
            resultado = true;
          } else if (ordenDetalle === 0 || !workflowDetalle) {
            setError("Esta operación todavía no tiene un flujo de etapas asociado. No se puede avanzar hasta inicializar su workflow.");
            return;
          } else if (ordenDetalle >= 9) {
            setError("La operación ya está cerrada o finalizada.");
            return;
          } else {
            setError("No hay una acción disponible para esta etapa. Podés continuar la negociación desde Mensajes.");
          }
          if (resultado) setDetalleOperacion(null);
        };
        return <div role="dialog" aria-modal="true" aria-label={"Detalle " + detalleOperacion.codigo} className="operation-detail-backdrop" style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,23,42,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={() => setDetalleOperacion(null)}>
          <section className="operation-detail-dialog" style={{position:"relative",width:"min(100%,920px)",maxHeight:"92vh",overflowY:"auto",background:"#fff",color:"#123",borderRadius:16,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="operation-detail-close" style={{position:"absolute",right:12,top:8,fontSize:24,border:0,background:"transparent",cursor:"pointer"}} onClick={() => setDetalleOperacion(null)} aria-label="Cerrar">×</button>
            <h2>Operación {detalleOperacion.codigo}</h2>
            <p><strong>Producto:</strong> {metaDetalle.producto}</p>
            <p><strong>Volumen:</strong> {formatoNumero(detalleOperacion.cantidad_tn)} TN</p>
            <p><strong>Precio:</strong> {formatoNumero(detalleOperacion.precio_tn)} por TN</p>
            <p><strong>Origen:</strong> {metaDetalle.origen}</p>
            <p><strong>Destino:</strong> {metaDetalle.destino}</p>
            <p><strong>Contraparte:</strong> {metaDetalle.contraparte}</p>
            <p><strong>Estado:</strong> {workflowDetalle?.etapa_actual || detalleOperacion.estado}</p>
            <section aria-label="Progreso de la operación" style={{marginTop:18,padding:16,border:"1px solid #dbe3ee",borderRadius:12,background:"#f8fafc"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:10,flexWrap:"wrap"}}>
                <h3 style={{margin:0,fontSize:16}}>Etapas de la operación</h3>
                <strong style={{fontSize:12,color:"#0f766e"}}>Etapa {Math.min(Math.max(ordenDetalle,1),9)} de 9</strong>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(Math.max(ordenDetalle,0),9)/9*100)} style={{height:8,borderRadius:99,background:"#e2e8f0",overflow:"hidden",marginBottom:14}}>
                <div style={{height:"100%",width:`${Math.min(Math.max(ordenDetalle,0),9)/9*100}%`,background:"#059669",borderRadius:99,transition:"width .25s ease"}}/>
              </div>
              <ol style={{listStyle:"none",padding:0,margin:0,display:"grid",gap:8}}>
                {ETAPAS.map((etapa,index)=>{const orden=index+1;const completada=ordenDetalle>orden;const actual=ordenDetalle===orden;return <li key={etapa} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,background:actual?"#dbeafe":completada?"#dcfce7":"#fff",border:actual?"1px solid #60a5fa":completada?"1px solid #86efac":"1px solid #e2e8f0",color:actual?"#1d4ed8":completada?"#166534":"#64748b"}}>
                  <span aria-hidden="true" style={{fontWeight:800,minWidth:22}}>{completada?"✓":actual?"●":"○"}</span>
                  <span style={{flex:1,fontWeight:actual?700:500}}>{etapa}</span>
                  <small>{completada?"Completada":actual?"Etapa actual":"Pendiente"}</small>
                </li>})}
              </ol>
              {ordenDetalle>0&&ordenDetalle<9&&<p style={{margin:"12px 0 0",fontSize:13,color:"#334155"}}><strong>Siguiente paso:</strong> {ETAPAS[ordenDetalle]}</p>}
              {ordenDetalle===9&&<p style={{margin:"12px 0 0",fontSize:13,color:"#166534",fontWeight:700}}>Operación completada.</p>}
            </section>
            {ordenDetalle === 6 && <section style={{marginTop:18,padding:16,border:"1px solid #bfdbfe",borderRadius:12,background:"#eff6ff"}}>
              <h3 style={{marginTop:0}}>Firmas del contrato definitivo</h3>
              <FirmasContratoOperacion operacionId={detalleOperacion.id} onWorkflowAdvanced={cargarOperaciones} />
            </section>}
            {ordenDetalle === 7 && <section style={{marginTop:18,padding:16,border:"1px solid #93c5fd",borderRadius:12,background:"#eff6ff"}}>
              <h3 style={{marginTop:0}}>Logística y entrega de esta operación</h3>
              <p style={{marginTop:0,color:"#475569"}}>Completá la Carta de Porte, transporte, carga y recepción desde aquí. Los datos se guardan en el registro oficial del módulo Logística.</p>
              <LogisticaEntrega operacionId={detalleOperacion.id} onEntregaConfirmada={() => confirmarEntregaYAvanzar(detalleOperacion.id)} />
            </section>}
            {ordenDetalle === 8 && <section style={{marginTop:18,padding:16,border:"1px solid #cbd5e1",borderRadius:12,background:"#fff"}}>
              <h3 style={{marginTop:0}}>Liquidación de la operación</h3>
              <Liquidacion operacionId={detalleOperacion.id} cantidadContractualTn={detalleOperacion.cantidad_tn} precioTn={detalleOperacion.precio_tn} onLiquidacionConfirmada={() => confirmarLiquidacionYAvanzar(detalleOperacion.id)} />
            </section>}
            {ordenDetalle === 4 && <section style={{marginTop:18,padding:16,border:"1px solid #86efac",borderRadius:12,background:"#f0fdf4"}}>
              <h3 style={{margin:"0 0 8px",color:"#166534"}}>Comisión AgroBrokerIA</h3>
              <p style={{margin:"0 0 8px",color:"#14532d"}}>La comisión de plataforma se gestiona después del visado y antes del Contrato Definitivo. Importe de referencia: USD {Number(detalleOperacion.cantidad_tn || 0).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})} (USD 1 por TN).</p>
              <strong style={{display:"inline-flex",padding:"6px 10px",borderRadius:999,background:(["RETENIDA","LIBERADA"].includes(String(retencionComision?.estado || controlesComerciales[detalleOperacion.id]?.comision_estado||"").toUpperCase())?"#dcfce7":"#fef3c7"),color:(["RETENIDA","LIBERADA"].includes(String(retencionComision?.estado || controlesComerciales[detalleOperacion.id]?.comision_estado||"").toUpperCase())?"#166534":"#92400e")}}>Comisión AgroBrokerIA: {String(retencionComision?.estado || controlesComerciales[detalleOperacion.id]?.comision_estado || "PENDIENTE DE VERIFICACIÓN").replaceAll("_"," ")}</strong>
              <p style={{margin:"8px 0 0",fontSize:12,color:"#475569"}}>La comisión solo se mostrará como RETENIDA cuando el sistema registre la retención confirmada por Administración.</p>
            </section>}
            {ordenDetalle === 4 && retencionComision && <section style={{marginTop:16,padding:16,border:"1px solid #cbd5e1",borderRadius:12,background:"#fff",display:"grid",gap:10}}>
              <h3 style={{margin:0}}>Revisión del comprobante de comisión</h3>
              <p style={{margin:0}}>Estado: <strong>{retencionComision.estado==="COMPROBANTE_ENVIADO"?"Pendiente de revisión":retencionComision.estado==="RETENIDA"?"Transferencia verificada · comisión retenida":retencionComision.estado==="LIBERADA"?"Doble conformidad y pago verificados · comisión liberada contablemente":retencionComision.estado==="RECHAZADO"?"Comprobante rechazado":retencionComision.estado}</strong></p>
              <p style={{margin:0}}>Importe: <strong>USD {Number(retencionComision.importe||0).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong> · Referencia: {retencionComision.referencia_pago||"No informada"}</p>
              {retencionComision.observaciones && <p style={{margin:0,color:"#92400e"}}>Observaciones: {retencionComision.observaciones}</p>}
              {esAdminPlataforma && retencionComision.comprobante_url && <button type="button" onClick={()=>void abrirComprobanteRetencionComision(retencionComision.comprobante_url)} style={{justifySelf:"start",padding:"8px 12px",border:"1px solid #94a3b8",borderRadius:8,background:"#fff",cursor:"pointer"}}>Abrir comprobante bancario</button>}
              {esAdminPlataforma && retencionComision.estado==="COMPROBANTE_ENVIADO" && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button type="button" disabled={revisandoRetencionComision} onClick={()=>void revisarRetencionComision(retencionComision.id,"RETENIDA")} style={{padding:"9px 12px",border:0,borderRadius:8,background:"#047857",color:"#fff",cursor:"pointer"}}>{revisandoRetencionComision?"Procesando…":"Validar ingreso y asignar por camión"}</button>
                <button type="button" disabled={revisandoRetencionComision} onClick={()=>void revisarRetencionComision(retencionComision.id,"RECHAZADO")} style={{padding:"9px 12px",border:"1px solid #b91c1c",borderRadius:8,background:"#fff",color:"#b91c1c",cursor:"pointer"}}>Rechazar comprobante</button>
              </div>}
              {retencionComision.estado==="RETENIDA" && <div style={{display:"grid",gap:8}}>
                <p style={{margin:0,color:"#166534",fontWeight:600}}>La comisión ya está retenida. La siguiente etapa es Contrato Definitivo.</p>
                <button type="button" onClick={()=>void continuar()} style={{justifySelf:"start",padding:"11px 16px",border:0,borderRadius:8,background:"#078b58",color:"#fff",fontWeight:700,cursor:"pointer"}}>Continuar al Contrato Definitivo →</button>
              </div>}
              {!esAdminPlataforma && retencionComision.estado==="COMPROBANTE_ENVIADO" && <p style={{margin:0,fontSize:12,color:"#475569"}}>El comprobante fue enviado. Administración lo revisará desde esta misma operación.</p>}
            </section>}
            {ordenDetalle === 4 && mostrarFormularioComision && !["RETENIDA","LIBERADA"].includes(String(retencionComision?.estado || controlesComerciales[detalleOperacion.id]?.comision_estado || "").toUpperCase()) && <section style={{marginTop:16,padding:16,border:"1px solid #cbd5e1",borderRadius:12,background:"#f8fafc",display:"grid",gap:12}}>
              <h3 style={{margin:0}}>Comprobante de comisión AgroBrokerIA</h3>
              <p style={{margin:0,fontSize:13,color:"#475569"}}>La comisión es USD 1 por TN. Cargá aquí el comprobante; Administración lo revisará sin salir de Operaciones.</p>
              {cuentaBancariaPlataforma ? <div style={{padding:12,borderRadius:8,background:"#fff",border:"1px solid #e2e8f0",fontSize:13}}>
                <strong>Cuenta bancaria oficial de AgroBrokerIA</strong>
                <p>Banco: {cuentaBancariaPlataforma.bank_name} · Titular: {cuentaBancariaPlataforma.account_holder}</p>
                <p>Moneda: {cuentaBancariaPlataforma.currency} · Alias: {cuentaBancariaPlataforma.alias||"No informado"}</p>
                <p>CBU: {cuentaBancariaPlataforma.cbu}</p>
              </div> : <p role="alert" style={{color:"#991b1b"}}>No se pudo cargar la cuenta receptora. No realices la transferencia.</p>}
              <label>Referencia de transferencia<input value={comisionReferenciaTransferencia} onChange={e=>setComisionReferenciaTransferencia(e.target.value)} placeholder="Número o referencia bancaria" style={{display:"block",width:"100%",padding:10,border:"1px solid #cbd5e1",borderRadius:8}}/></label>
              <label>Comprobante bancario (PDF, JPG o PNG)<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>setComisionComprobanteFile(e.target.files?.[0]||null)}/></label>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button type="button" onClick={()=>setMostrarFormularioComision(false)}>Cancelar</button>
                <button type="button" disabled={enviandoComprobanteComision||!cuentaBancariaPlataforma} onClick={()=>enviarComprobanteComision(detalleOperacion)}>{enviandoComprobanteComision?"Enviando…":"Enviar comprobante para revisión"}</button>
              </div>
            </section>}
            {error && <p role="alert" style={{marginTop:12,padding:12,borderRadius:8,background:"#fee2e2",color:"#991b1b"}}>{error}</p>}
            <div className="operation-detail-actions" style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:24,flexWrap:"wrap"}}><Link href={"/carta-porte?operacion="+detalleOperacion.id} style={{display:"inline-flex",alignItems:"center",padding:"10px 16px",borderRadius:8,border:0,background:"#078b58",color:"#fff",fontWeight:800,textDecoration:"none"}}>Emitir Carta de Porte</Link><button type="button" style={{padding:"10px 16px",borderRadius:8,border:"1px solid #cbd5e1",cursor:"pointer"}} onClick={() => setDetalleOperacion(null)}>Cerrar</button>{ordenDetalle !== 8 && ordenDetalle !== 7 && <button type="button" style={{padding:"10px 16px",borderRadius:8,border:0,background:"#078b58",color:"#fff",cursor:"pointer"}} onClick={continuar}>{ordenDetalle === 1 ? "Iniciar Acuerdo Comercial / Reserva" : ordenDetalle === 2 ? "Completar acuerdo preliminar" : ordenDetalle === 3 ? (visadoAprobado(controlesComerciales[detalleOperacion.id]) ? "Continuar a Retención de comisión" : "Registrar visado de mercadería") : ordenDetalle === 4 ? (["RETENIDA","LIBERADA"].includes(String(retencionComision?.estado || controlesComerciales[detalleOperacion.id]?.comision_estado || "").toUpperCase()) ? "Continuar al Contrato Definitivo" : "Cargar / revisar comprobante de comisión") : ordenDetalle === 5 ? "Preparar contrato definitivo" : ordenDetalle === 6 ? "Verificar firmas y pasar a Logística" : ordenDetalle === 7 ? "Gestionar entrega" : ordenDetalle === 9 ? "Operación cerrada" : "Revisar workflow"}</button>}</div>
          </section>
        </div>;
      })()}

      {contratoAbierto && (() => {
        const operacionContrato = operaciones.find((item) => item.id === contratoAbierto);
        if (!operacionContrato) return null;
        const inputContrato: CSSProperties = {width:"100%",boxSizing:"border-box",padding:11,border:"1px solid #cbd5e1",borderRadius:8,background:"#fff",color:"#123"};
        return <div role="dialog" aria-modal="true" aria-label="Contrato definitivo" style={{position:"fixed",inset:0,zIndex:1300,background:"rgba(15,23,42,.62)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setContratoAbierto(null)}>
          <section style={{width:"min(100%,850px)",maxHeight:"92vh",overflowY:"auto",background:"#fff",borderRadius:16,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.3)",color:"#123"}} onClick={e=>e.stopPropagation()}>
            <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
              <div><h2 style={{margin:"0 0 6px"}}>Contrato definitivo</h2><p style={{margin:0,color:"#64748b"}}>{contrato.numero_contrato} · F1 · {formatoNumero(operacionContrato.cantidad_tn)} TN</p></div>
              <button type="button" onClick={()=>setContratoAbierto(null)} style={{border:0,background:"transparent",fontSize:26,cursor:"pointer"}} aria-label="Cerrar">×</button>
            </header>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginTop:18}}>
              <label>Número de contrato<input style={inputContrato} value={contrato.numero_contrato} onChange={e=>setContrato(v=>({...v,numero_contrato:e.target.value}))}/></label>
              <label>Modelo contractual<input style={inputContrato} value="F1 · Formal" readOnly/><small>La operación utiliza exclusivamente el modelo formal.</small></label>
              <label>Cantidad (TN)<input style={inputContrato} value={formatoNumero(operacionContrato.cantidad_tn)} readOnly/></label>
              <label>Precio por TN<input style={inputContrato} value={formatoNumero(operacionContrato.precio_tn)} readOnly/></label>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:16}}>
              <label style={{display:"block"}}>Vendedor
                <select style={inputContrato} value={vendedorSeleccionado} onChange={async (e) => {
                  const id = e.target.value;
                  setVendedorSeleccionado(id);
                  setCuitVendedorContrato(contactos.find((c) => c.id === id)?.cuit || "");
                  if (id) {
                    await guardarParteOperacion(operacionContrato.id, "VENDEDOR", id);
                    const compradorId = compradorSeleccionado;
                    if (compradorId) {
                      try {
                        const texto = generarContenidoContratoF1(operacionContrato, acuerdo, id, compradorId, contrato.numero_contrato, "F1", contactos.find((c) => c.id === id)?.cuit || "", cuitCompradorContrato, calidadContrato);
                        setContrato(actual => ({ ...actual, contenido: texto }));
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "No se pudo actualizar el contrato.");
                      }
                    }
                  }
                }}>
                  <option value="">Seleccionar vendedor…</option>
                  {contactos.map((contacto) => <option key={contacto.id} value={contacto.id}>{contacto.nombre_razon_social}{contacto.cuit ? ` — CUIT ${contacto.cuit}` : ""}</option>)}
                </select>
              </label>
              <label style={{display:"block"}}>Comprador
                <select style={inputContrato} value={compradorSeleccionado} onChange={async (e) => {
                  const id = e.target.value;
                  setCompradorSeleccionado(id);
                  setCuitCompradorContrato(contactos.find((c) => c.id === id)?.cuit || "");
                  if (id) {
                    await guardarParteOperacion(operacionContrato.id, "COMPRADOR", id);
                    const vendedorId = vendedorSeleccionado;
                    if (vendedorId) {
                      try {
                        const texto = generarContenidoContratoF1(operacionContrato, acuerdo, vendedorId, id, contrato.numero_contrato, "F1", cuitVendedorContrato, contactos.find((c) => c.id === id)?.cuit || "", calidadContrato);
                        setContrato(actual => ({ ...actual, contenido: texto }));
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "No se pudo actualizar el contrato.");
                      }
                    }
                  }
                }}>
                  <option value="">Seleccionar comprador…</option>
                  {contactos.map((contacto) => <option key={contacto.id} value={contacto.id}>{contacto.nombre_razon_social}{contacto.cuit ? ` — CUIT ${contacto.cuit}` : ""}</option>)}
                </select>
              </label>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:14}}>
              <label>CUIT vendedor<input style={inputContrato} value={cuitVendedorContrato} onChange={e=>setCuitVendedorContrato(e.target.value)} placeholder="CUIT del legajo del vendedor"/></label>
              <label>CUIT comprador<input style={inputContrato} value={cuitCompradorContrato} onChange={e=>setCuitCompradorContrato(e.target.value)} placeholder="CUIT del legajo del comprador"/></label>
              <label>Producto / tipo de grano<input style={inputContrato} value={operacionMeta[operacionContrato.id]?.producto || "Producto pendiente de identificación"} readOnly/></label>
              <label>Condición de calidad<input style={inputContrato} value={calidadContrato} onChange={e=>setCalidadContrato(e.target.value)} placeholder="Humedad, merma y condición acordada"/></label>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
              <button type="button" onClick={()=>{
                try {
                  if(!vendedorSeleccionado || !compradorSeleccionado) throw new Error("Seleccioná vendedor y comprador antes de regenerar el contrato.");
                  const texto=generarContenidoContratoF1(operacionContrato, {...acuerdo, calidad:calidadContrato}, vendedorSeleccionado, compradorSeleccionado, contrato.numero_contrato, "F1", cuitVendedorContrato, cuitCompradorContrato, calidadContrato);
                  setContrato(actual=>({...actual,contenido:texto}));
                  setMensaje("Plantilla oficial F1 regenerada con los datos actuales. Revisá todos los campos antes de guardar.");
                  setError("");
                } catch(e) { setError(e instanceof Error ? e.message : "No se pudo regenerar el contrato."); }
              }} style={{padding:"9px 12px",border:"1px solid #047857",borderRadius:8,background:"#ecfdf5",color:"#065f46",fontWeight:700,cursor:"pointer"}}>Regenerar plantilla oficial F1</button>
            </div>
            {contactos.length === 0 && <p style={{marginTop:8,color:"#b45309"}}>No hay contactos comerciales disponibles. Revisá permisos o registrá primero los contactos de vendedor y comprador.</p>}
            <label style={{display:"block",marginTop:16}}>Contenido del contrato (editable)
              <textarea style={{...inputContrato,minHeight:260,marginTop:6,fontFamily:"inherit",resize:"vertical"}} value={contrato.contenido} onChange={e=>setContrato(v=>({...v,contenido:e.target.value}))} placeholder="El contenido contractual se completará con los datos del Acuerdo Comercial guardado. Revisá y completá los campos antes de guardar."/>
            </label>
            {mensaje && <p role="status" style={{padding:10,background:"#ecfdf5",color:"#166534",borderRadius:8}}>{mensaje}</p>}
            {error && <p role="alert" style={{padding:10,background:"#fee2e2",color:"#991b1b",borderRadius:8}}>{error}</p>}
            <div style={{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap",marginTop:18}}>
              <button type="button" onClick={()=>generarPDFContrato()} style={{padding:"10px 14px",border:"1px solid #94a3b8",borderRadius:8,background:"#fff",cursor:"pointer"}}>Descargar PDF</button>
              <button type="button" disabled={guardandoContrato} onClick={()=>guardarContrato(operacionContrato,false)} style={{padding:"10px 14px",border:0,borderRadius:8,background:"#078b58",color:"#fff",cursor:"pointer",opacity:guardandoContrato?0.6:1}}>{guardandoContrato?"Guardando…":"Guardar borrador"}</button>
              <button type="button" disabled={guardandoContrato||!vendedorSeleccionado||!compradorSeleccionado||!contrato.contenido.trim()} onClick={()=>guardarContrato(operacionContrato,true)} style={{padding:"10px 14px",border:0,borderRadius:8,background:"#1d4ed8",color:"#fff",cursor:"pointer",opacity:guardandoContrato||!vendedorSeleccionado||!compradorSeleccionado||!contrato.contenido.trim()?0.55:1}}>{guardandoContrato?"Confirmando…":"Confirmar contrato y pasar a Firmas"}</button>
              <button type="button" onClick={()=>setContratoAbierto(null)} style={{padding:"10px 14px",border:"1px solid #cbd5e1",borderRadius:8,background:"#fff",cursor:"pointer"}}>Cerrar</button>
            </div>
          </section>
        </div>;
      })()}

      {visadoAbierto && (() => {
        const operacionVisado = operaciones.find((item) => item.id === visadoAbierto);
        if (!operacionVisado) return null;
        const metaVisado = operacionMeta[visadoAbierto] || { producto: "Producto registrado", origen: "No informado", destino: "No informado", contraparte: "No informado" };
        const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff" };
        return <div role="dialog" aria-modal="true" aria-label="Visado de mercadería" style={{position:"fixed",inset:0,zIndex:1150,background:"rgba(15,23,42,.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>!guardandoVisado&&setVisadoAbierto(null)}>
          <section style={{width:"min(100%,720px)",maxHeight:"90vh",overflowY:"auto",background:"#fff",borderRadius:16,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.28)",color:"#123"}} onClick={e=>e.stopPropagation()}>
            <header style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
              <div><h2 style={{margin:"0 0 6px"}}>Visado de mercadería</h2><p style={{margin:"0 0 16px",color:"#64748b"}}>Registrá la inspección antes de solicitar el depósito de la comisión y preparar el contrato definitivo.</p></div>
              <button type="button" onClick={()=>setVisadoAbierto(null)} disabled={guardandoVisado} style={{border:0,background:"transparent",fontSize:25,cursor:"pointer"}} aria-label="Cerrar">×</button>
            </header>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,padding:14,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,marginBottom:16}}>
              <div><small>Operación</small><strong style={{display:"block"}}>{operacionVisado.codigo}</strong></div>
              <div><small>Producto</small><strong style={{display:"block"}}>{metaVisado.producto}</strong></div>
              <div><small>Volumen</small><strong style={{display:"block"}}>{formatoNumero(operacionVisado.cantidad_tn)} TN</strong></div>
              <div><small>Origen / carga</small><strong style={{display:"block"}}>{metaVisado.origen}</strong></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
              <label style={{fontWeight:700}}>Responsable del visado<input value={visadoForm.responsable} onChange={e=>setVisadoForm(v=>({...v,responsable:e.target.value}))} placeholder="Nombre del inspector / certificador" style={{...inputStyle,display:"block",marginTop:6}} /></label>
              <label style={{fontWeight:700}}>Calidad / condición<input value={visadoForm.calidad} onChange={e=>setVisadoForm(v=>({...v,calidad:e.target.value}))} placeholder="Grado, condición, especificación" style={{...inputStyle,display:"block",marginTop:6}} /></label>
              <label style={{fontWeight:700}}>Humedad (%)<input value={visadoForm.humedad} onChange={e=>setVisadoForm(v=>({...v,humedad:e.target.value}))} placeholder="Dato medido" style={{...inputStyle,display:"block",marginTop:6}} /></label>
              <label style={{fontWeight:700}}>Proteína (%)<input value={visadoForm.proteina} onChange={e=>setVisadoForm(v=>({...v,proteina:e.target.value}))} placeholder="Dato medido" style={{...inputStyle,display:"block",marginTop:6}} /></label>
            </div>
            <label style={{display:"block",fontWeight:700,marginTop:14}}>Observaciones de inspección<textarea value={visadoForm.observaciones} onChange={e=>setVisadoForm(v=>({...v,observaciones:e.target.value}))} rows={3} placeholder="Resultados, documentación revisada, muestras, incidencias..." style={{...inputStyle,display:"block",marginTop:6,resize:"vertical"}} /></label>
            <label style={{display:"block",fontWeight:700,marginTop:14}}>Motivo de rechazo (solo si corresponde)<textarea value={visadoForm.motivoRechazo} onChange={e=>setVisadoForm(v=>({...v,motivoRechazo:e.target.value}))} rows={2} placeholder="Completar únicamente si el visado no resulta aprobado" style={{...inputStyle,display:"block",marginTop:6,resize:"vertical"}} /></label>
            <div style={{marginTop:16,padding:13,border:"1px solid #bfdbfe",borderRadius:10,background:"#eff6ff"}}>
              <strong>Comisión AgroBrokerIA: USD {formatoNumero(operacionVisado.cantidad_tn)}.</strong>
              <p style={{margin:"5px 0 0",fontSize:13,color:"#1e40af"}}>No se cobra en el visado. Si la inspección se aprueba, se habilita el depósito de USD 1 por tonelada; el importe se verifica y queda retenido antes del contrato definitivo.</p>
            </div>
            {error && <p role="alert" style={{padding:11,background:"#fee2e2",color:"#991b1b",borderRadius:8}}>{error}</p>}
            <div style={{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap",marginTop:18}}>
              <button type="button" disabled={guardandoVisado} onClick={()=>setVisadoAbierto(null)} style={{padding:"10px 16px",border:"1px solid #cbd5e1",borderRadius:8,background:"#fff"}}>Cancelar</button>
              <button type="button" disabled={guardandoVisado} onClick={()=>guardarResultadoVisado("RECHAZADO")} style={{padding:"10px 16px",border:0,borderRadius:8,background:"#b91c1c",color:"#fff",fontWeight:700}}>{guardandoVisado?"Guardando…":"Rechazar visado"}</button>
              <button type="button" disabled={guardandoVisado} onClick={()=>guardarResultadoVisado("APROBADO")} style={{padding:"10px 18px",border:0,borderRadius:8,background:"#078b58",color:"#fff",fontWeight:700}}>{guardandoVisado?"Guardando…":"Aprobar visado"}</button>
            </div>
          </section>
        </div>;
      })()}

      {acuerdoAbierto && (() => {
        const operacionAcuerdo = operaciones.find((item) => item.id === acuerdoAbierto);
        if (!operacionAcuerdo) return null;
        const metaAcuerdo = operacionMeta[acuerdoAbierto] || { producto: "Producto registrado", origen: "No informado", destino: "No informado", contraparte: "No informado" };
        const comisionEstimada = Number(operacionAcuerdo.cantidad_tn || 0);
        return <div role="dialog" aria-modal="true" aria-label="Acuerdo comercial preliminar" style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(15,23,42,.58)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={() => !guardando && setAcuerdoAbierto(null)}>
          <section style={{width:"min(100%,760px)",maxHeight:"90vh",overflowY:"auto",background:"#fff",borderRadius:16,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.28)",color:"#123"}} onClick={(event) => event.stopPropagation()}>
            <header style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:18}}>
              <div><h2 style={{margin:"0 0 6px",fontSize:22}}>Acuerdo Comercial / Reserva preliminar</h2><p style={{margin:0,color:"#64748b",fontSize:13}}>Completá las condiciones pactadas por vendedor y comprador. Este acuerdo no es el contrato definitivo.</p></div>
              <button type="button" onClick={() => setAcuerdoAbierto(null)} disabled={guardando} aria-label="Cerrar" style={{border:0,background:"transparent",fontSize:25,cursor:"pointer"}}>×</button>
            </header>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:14,marginBottom:18}}>
              <div><small style={{color:"#64748b"}}>Operación</small><strong style={{display:"block"}}>{operacionAcuerdo.codigo}</strong></div>
              <div><small style={{color:"#64748b"}}>Producto</small><strong style={{display:"block"}}>{metaAcuerdo.producto}</strong></div>
              <div><small style={{color:"#64748b"}}>Volumen</small><strong style={{display:"block"}}>{formatoNumero(operacionAcuerdo.cantidad_tn)} TN</strong></div>
              <div><small style={{color:"#64748b"}}>Precio por tonelada</small><strong style={{display:"block"}}>{formatoNumero(operacionAcuerdo.precio_tn)} {monedaOperacion(operacionAcuerdo)}</strong></div>
              <div><small style={{color:"#64748b"}}>Origen</small><strong style={{display:"block"}}>{metaAcuerdo.origen}</strong></div>
              <div><small style={{color:"#64748b"}}>Destino</small><strong style={{display:"block"}}>{metaAcuerdo.destino}</strong></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
              <Campo label="Lugar de carga" value={acuerdo.lugar_carga} onChange={(value)=>cambiarCampo("lugar_carga",value)} />
              <Campo label="Destino / lugar de descarga" value={acuerdo.destino} onChange={(value)=>cambiarCampo("destino",value)} />
              <Campo label="Condición de entrega (Incoterm / condición)" value={acuerdo.condicion_entrega} onChange={(value)=>cambiarCampo("condicion_entrega",value)} />
              <Campo label="Forma de pago" value={acuerdo.forma_pago} onChange={(value)=>cambiarCampo("forma_pago",value)} />
              <Campo label="Plazo de pago" value={acuerdo.plazo_pago} onChange={(value)=>cambiarCampo("plazo_pago",value)} />
              <Campo label="Flete / responsable del transporte" value={acuerdo.flete} onChange={(value)=>cambiarCampo("flete",value)} />
              <Campo label="Calidad y especificaciones" value={acuerdo.calidad} onChange={(value)=>cambiarCampo("calidad",value)} />
            </div>
            <label style={{display:"block",fontWeight:700,marginTop:14,marginBottom:6}}>Observaciones y condiciones adicionales</label>
            <textarea value={acuerdo.observaciones} onChange={(event)=>cambiarCampo("observaciones",event.target.value)} rows={4} style={{width:"100%",boxSizing:"border-box",padding:12,border:"1px solid #cbd5e1",borderRadius:8,resize:"vertical"}} placeholder="Condiciones comerciales acordadas por las partes..." />
            <div style={{marginTop:16,padding:14,border:"1px solid #bfdbfe",borderRadius:10,background:"#eff6ff"}}>
              <strong>Comisión de plataforma: USD {formatoNumero(comisionEstimada)}</strong>
              <p style={{margin:"5px 0 0",fontSize:13,color:"#1e40af"}}>Cálculo automático de USD 1 por tonelada. No se paga en esta etapa: se abonará después del visado aprobado y antes del contrato definitivo. Quedará retenida hasta el cierre de la operación.</p>
            </div>
            {error && <p role="alert" style={{marginTop:14,padding:12,borderRadius:8,background:"#fee2e2",color:"#991b1b"}}>{error}</p>}
            {mensaje && <p role="status" style={{marginTop:14,padding:12,borderRadius:8,background:"#dcfce7",color:"#166534"}}>{mensaje}</p>}
            <div style={{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap",marginTop:20}}>
              <button type="button" disabled={guardando} onClick={()=>setAcuerdoAbierto(null)} style={{padding:"10px 16px",border:"1px solid #cbd5e1",borderRadius:8,background:"#fff",cursor:"pointer"}}>Cerrar</button>
              <button type="button" disabled={guardando} onClick={()=>guardarAcuerdo(operacionAcuerdo,false)} style={{padding:"10px 16px",border:"1px solid #0f766e",borderRadius:8,background:"#fff",color:"#0f766e",fontWeight:700,cursor:"pointer"}}>{guardando?"Guardando…":"Guardar borrador"}</button>
              <button type="button" disabled={guardando} onClick={()=>guardarAcuerdo(operacionAcuerdo,true)} style={{padding:"10px 18px",border:0,borderRadius:8,background:"#078b58",color:"#fff",fontWeight:700,cursor:"pointer"}}>{guardando?"Confirmando…":"Confirmar acuerdo y pasar a Visado"}</button>
            </div>
          </section>
        </div>;
      })()}

      <section className="operations-bottom">
        <Bottom title="Resumen por estado"><div className="op-legend"><p>🔵 En negociación <b>{enNegociacion}</b></p><p>🟡 En contrato <b>{enContrato}</b></p><p>🟣 En logística <b>{enLogistica}</b></p><p>🟠 En liquidación <b>{enLiquidacion}</b></p><p>🟢 Finalizadas <b>{operaciones.filter(o=>obtenerWorkflow(o.id)?.orden===9 || /CERR|FINAL/i.test(o.estado)).length}</b></p><p>🔴 Canceladas <b>{operaciones.filter(o=>/CANCEL/i.test(o.estado)).length}</b></p></div></Bottom>
        <Bottom title="Volumen total registrado"><div className="op-volume-summary"><strong>{formatoNumero(totalVolumen)} TN</strong><span>Calculado sobre las operaciones cargadas</span></div></Bottom>
        <Bottom title="Contratos formales"><Bars items={[["F1",String(operaciones.length)]]}/></Bottom>
        <Bottom title="Evolución de operaciones"><div className="op-legend"><p>Datos históricos disponibles según fecha de operación.</p><p><b>{operaciones.length}</b> operaciones cargadas en la vista actual.</p></div></Bottom>
      </section>
    </main>
  );

}

function Kpi({icon,value,label,trend,tone}:{icon:string;value:string;label:string;trend:string;tone:string}){return <div className={"operation-kpi "+tone}><b>{icon}</b><span><strong>{value}</strong><small>{label}</small><i>{trend}</i></span></div>}
function Filter({label,children}:{label:string;children:any}){return <label className="op-filter">{label}{children}</label>}
function Bottom({title,children}:{title:string;children:any}){return <section className="operations-bottom-card"><h2>{title}</h2>{children}</section>}
function Bars({items}:{items:string[][]}){return <div className="op-bars">{items.map((x,i)=><div key={i}><span>{x[0]}</span><i style={{width:x[1]}}/><b>{x[1]}</b></div>)}</div>}

function Campo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontWeight: 700,
          marginBottom: 7,
        }}
      >
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #cbd5e1",
        }}
      />
    </div>
  );
}
