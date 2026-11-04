"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import ControlComercial from "./ControlComercial";
import LogisticaEntrega from "./LogisticaEntrega";
import Liquidacion from "./Liquidacion";
import PanelMensajes from "@/components/mensajes/PanelMensajes";
import { notificarParticipantesOperacion } from "@/lib/notificaciones/notificarParticipantesOperacion";
import { sincronizarComisionIntermediario } from "@/lib/comisiones/sincronizarComisionIntermediario";

type Operacion = {
  id: string;
  codigo: string;
  estado: string;
  tipo_operacion: string;
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

  lado: "VENDEDOR" | "COMPRADOR";

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
  "Contrato Definitivo",
  "Firmas",
  "Fondos",
  "Liberación operativa",
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
  const [filtroTipo, setFiltroTipo] = useState("");
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
  }, []);

  function visadoAprobado(control?: ControlComercialData | null) {
    return control?.visado_resultado === "APROBADO" || control?.visado_estado === "APROBADO";
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
      p_estado: estado ?? null,
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
          "id, codigo, estado, tipo_operacion, precio_tn, cantidad_tn, importe_total, moneda_id, fecha_operacion, publicacion_compra_id, publicacion_venta_id"
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
      setMonedas(Object.fromEntries((monedaRows || []).map((m) => [m.id, m.codigo])));

      const operacionesNormalizadas = (operacionesDB || []).map((item) => ({
          id: item.id,
          codigo: item.codigo,
          estado: item.estado,
          tipo_operacion: item.tipo_operacion || "F2",
          precio_tn: Number(item.precio_tn),
          cantidad_tn: Number(item.cantidad_tn),
          importe_total: Number(item.importe_total),
          moneda_id: item.moneda_id ?? null,
          fecha_operacion: item.fecha_operacion,
          publicacion_compra_id: item.publicacion_compra_id ?? null,
          publicacion_venta_id: item.publicacion_venta_id ?? null,
        }));

      setOperaciones(operacionesNormalizadas);

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
      // SINCRONIZACIÓN AUTOMÁTICA: FIRMAS → FONDOS
      // =========================================================
      // Si una operación está en etapa 5 (Firmas) y todas las
      // firmas requeridas están completas, avanzamos a etapa 6.
      // Esto también corrige operaciones cuyas firmas ya estaban
      // registradas antes de ejecutar esta lógica.
      // =========================================================

      for (const workflow of workflowsNormalizados) {
        if (workflow.orden !== 5) continue;

        // La misma fuente de verdad que valida avanzar_operacion_workflow:
        // contratos confirmados + contrato_firmantes. No usar los antiguos
        // flags de operacion_control_comercial para habilitar Fondos.
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

        const contratoId = contratosFirmados[0].id;
        const [{ data: participantesFirma, error: participantesError }, { data: firmasDB, error: firmasError }] = await Promise.all([
          supabase.from("operacion_participantes").select("rol").eq("operacion_id", workflow.operacion_id).in("rol", ["VENDEDOR", "COMPRADOR"]),
          supabase.from("contrato_firmantes").select("rol,firmado").eq("contrato_id", contratoId).in("rol", ["VENDEDOR", "COMPRADOR"]),
        ]);

        if (participantesError || firmasError) {
          console.error("No se pudieron verificar las firmas requeridas:", participantesError || firmasError);
          continue;
        }

        const rolesRequeridos = [...new Set((participantesFirma || []).map((p: any) => String(p.rol).toUpperCase()))];
        const firmasPorRol = new Map((firmasDB || []).map((firma: any) => [String(firma.rol).toUpperCase(), firma.firmado === true]));
        const todasFirmasCompletas = rolesRequeridos.length === 2 && ["VENDEDOR", "COMPRADOR"].every((rol) => firmasPorRol.get(rol) === true);

        if (!todasFirmasCompletas) continue;

        const { data: etapaFondos, error: errorEtapaFondos } = await supabase
          .from("workflow_etapas")
          .select("id")
          .eq("workflow_id", workflow.workflow_id)
          .eq("orden", 6)
          .maybeSingle();

        if (errorEtapaFondos || !etapaFondos) {
          console.error("No se pudo localizar la etapa Fondos:", errorEtapaFondos);
          continue;
        }

        const { error: errorAvanceFondos } = await avanzarWorkflowSeguro(workflow.id, etapaFondos.id);
        if (errorAvanceFondos) {
          console.error("No se pudo avanzar la operación a Fondos:", errorAvanceFondos);
          continue;
        }

        try {
          await notificarParticipantesOperacion({
            operacionId: workflow.operacion_id,
            titulo: "💰 Fondos",
            mensaje: `La operación ${workflow.operacion_id} completó las firmas requeridas y pasó a la etapa Fondos.`,
            tipo: "FONDOS",
          });
        } catch (errorNotificacion) {
          console.error("ERROR NOTIFICACIÓN FIRMAS → FONDOS:", errorNotificacion);
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

  async function avanzarAContratoConComision(operacion: Operacion) {
    setError(""); setMensaje("");
    const control = controlesComerciales[operacion.id];
    if (!visadoAprobado(control)) {
      setError("Primero debe aprobarse el visado de mercadería.");
      return false;
    }
    const workflow = obtenerWorkflow(operacion.id);
    if (!workflow || workflow.orden !== 4) {
      setError("La operación debe estar en Fondos para pasar al Contrato Definitivo.");
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
    setMensaje("Visado aprobado. La operación pasó a Fondos para verificar y retener la comisión AgroBrokerIA antes del Contrato Definitivo.");
    await cargarOperaciones();
    return true;
  }

  // Bypass temporal de QA: solo administradores de plataforma. No crea pagos,
  // retenciones ni cambia el estado de comisión; se debe retirar al terminar las pruebas.
  async function omitirComisionParaPruebas(operacion: Operacion) {
    setError(""); setMensaje("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("No se pudo validar la sesión administrativa."); return false; }
    const { data: admin, error: adminError } = await supabase
      .from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (adminError || !admin) { setError("Esta opción temporal está disponible únicamente para administradores de AgroBrokerIA."); return false; }
    // QA temporal: el administrador puede saltar la etapa completa de visado/comisión
    // para validar contrato y etapas posteriores. No modifica el estado del visado ni pagos.
    const workflow = obtenerWorkflow(operacion.id);
    if (!workflow || workflow.orden !== 3) { setError("La operación debe estar en Visado de mercadería."); return false; }
    const { data: etapa, error: etapaError } = await supabase
      .from("workflow_etapas").select("id")
      .eq("workflow_id", workflow.workflow_id).eq("orden", 4).maybeSingle();
    if (etapaError || !etapa) { setError("No se encontró la etapa Fondos."); return false; }
    const { error: advanceError } = await avanzarWorkflowSeguro(workflow.id, etapa.id, "QA_SIN_PAGO");
    if (advanceError) { setError(advanceError.message); return false; }
    setMensaje("AVANCE DE PRUEBA: pasó a Contrato Definitivo. La comisión sigue PENDIENTE; no se registró ni aprobó ningún pago real.");
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
      setMensaje("Comprobante bancario cargado y enviado. AgroBrokerIA verificará la transferencia. La operación permanecerá en Visado hasta que la comisión quede RETENIDA.");
      setComisionReferenciaTransferencia("");
      setComisionComprobanteFile(null);
      await cargarOperaciones();
    } catch (e) {
      if (uploadedPath) {
        await supabase.storage.from("documentos-operacion").remove([uploadedPath]);
      }
      setError(e instanceof Error ? e.message : "No se pudo registrar el comprobante.");
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

    const comisiones = (data || []).map((item) => ({
      ...item,
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

    setContactos((actuales) =>
      [...actuales, data].sort((a, b) =>
        a.nombre_razon_social.localeCompare(
          b.nombre_razon_social
        )
      )
    );

    if (mostrarNuevoContacto === "VENDEDOR") {
      setVendedorSeleccionado(data.id);
    }

    if (mostrarNuevoContacto === "COMPRADOR") {
      setCompradorSeleccionado(data.id);
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

    const numeroContratoInicial = contratoData?.numero_contrato ||
      `CON-${operacion.codigo.replace(/^OP-/, "")}`;
    let contenidoInicial = contratoData?.contenido || "";
    if (!contenidoInicial.trim()) {
      try {
        contenidoInicial = generarContenidoContratoF2(
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
          `MODELO: ${operacion.tipo_operacion === "F1" ? "F1" : "F2"}`,
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
        (contenidoInicial.includes("TERCERA: PLAZO DE ENTREGA") && contenidoInicial.includes("de 2027"))) {
      try {
        contenidoInicial = generarContenidoContratoF2(
          operacion,
          acuerdoContrato,
          vendedorSeleccionado,
          compradorSeleccionado,
          numeroContratoInicial
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
    const doc = new jsPDF();

    const margen = 20;
    const ancho = 170;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);

    doc.text(
      "CONTRATO DE COMPRAVENTA DE GRANOS",
      105,
      y,
      { align: "center" }
    );

    y += 12;

    doc.setFontSize(11);
    doc.text(
      `N° ${contrato.numero_contrato}`,
      105,
      y,
      { align: "center" }
    );

    y += 15;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const contenidoNormalizado = contrato.contenido
      .replace(/\\n/g, String.fromCharCode(10))
      .replace(/\\r/g, "")
      .replace(/\\t/g, "  ");
    for (const linea of contenidoNormalizado.split(String.fromCharCode(10))) {
      const texto = linea.trim();

      if (!texto) {
        y += 5;
        continue;
      }

      const palabras = doc.splitTextToSize(
        texto,
        ancho
      );

      if (y + palabras.length * 5 > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(palabras, margen, y);
      y += palabras.length * 5 + 2;
    }

    if (y > 250) {
      doc.addPage();
      y = 25;
    }

    y += 15;

    doc.line(20, y, 90, y);
    doc.line(120, y, 190, y);

    y += 7;

    doc.text("Firma vendedor", 20, y);
    doc.text("Firma comprador", 120, y);

    y += 20;

    doc.line(20, y, 90, y);
    doc.line(120, y, 190, y);

    y += 7;

    doc.text("Aclaración", 20, y);
    doc.text("Aclaración", 120, y);

    doc.save(
      `${contrato.numero_contrato}.pdf`
    );
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

  function generarContenidoContratoF2(
    operacion: Operacion,
    acuerdoDatos: Acuerdo,
    vendedorId: string = vendedorSeleccionado,
    compradorId: string = compradorSeleccionado,
    numeroContrato: string = contrato.numero_contrato
  ) {
    const vendedor = contactos.find((c) => c.id === vendedorId);
    const comprador = contactos.find((c) => c.id === compradorId);

    const fecha = new Date().toLocaleDateString(
      "es-AR"
    );

    if (!vendedor) {
      throw new Error(
        "Debe seleccionar el vendedor antes de generar el contrato."
      );
    }

    if (!comprador) {
      throw new Error(
        "Debe seleccionar el comprador antes de generar el contrato."
      );
    }

    const datosPersona = (
      persona: ContactoComercial
    ) => {
      const identificacion = [
        persona.dni
          ? `DNI: ${persona.dni}`
          : "",
        persona.cuit
          ? `CUIT: ${persona.cuit}`
          : "",
      ]
        .filter(Boolean)
        .join(" — ");

      const domicilio = [
        persona.domicilio,
        persona.localidad,
        persona.provincia,
      ]
        .filter(Boolean)
        .join(", ");

      const representante =
        persona.representante_nombre
          ? `Representante: ${persona.representante_nombre}${
              persona.representante_dni
                ? ` — DNI ${persona.representante_dni}`
                : ""
            }${
              persona.representante_cargo
                ? ` — ${persona.representante_cargo}`
                : ""
            }`
          : "";

      return [
        persona.nombre_razon_social,
        identificacion,
        domicilio
          ? `Domicilio: ${domicilio}`
          : "",
        representante,
      ]
        .filter(Boolean)
        .join(String.fromCharCode(10));
    };

    return `CONTRATO DE ABASTECIMIENTO DE GRANOS

N.º ${numeroContrato}

FECHA: ${fecha}

OPERACIÓN: ${operacion.codigo}

Entre:

VENDEDOR

${datosPersona(vendedor)}

y

COMPRADOR

${datosPersona(comprador)}

Las partes celebran el presente CONTRATO DE ABASTECIMIENTO DE GRANOS, sujeto a las siguientes cláusulas:

CLÁUSULA 1 — OBJETO

El VENDEDOR se obliga a entregar al COMPRADOR la mercadería indicada en el presente contrato, y el COMPRADOR se obliga a recibirla y abonar el precio convenido, conforme a las condiciones comerciales aquí establecidas.

CLÁUSULA 2 — MERCADERÍA Y VOLUMEN

Producto: ${acuerdoDatos.calidad || "Grano conforme a las condiciones comerciales acordadas"}.

Cantidad: ${formatoNumero(operacion.cantidad_tn)} TN.

La cantidad corresponde a la operación comercial identificada como ${operacion.codigo}.

CLÁUSULA 3 — PRECIO

Precio pactado: ${monedaOperacion(operacion)} ${formatoNumero(operacion.precio_tn)} por tonelada.

Importe total estimado de la operación: ${monedaOperacion(operacion)} ${formatoNumero(operacion.importe_total)}.

Cualquier modificación del precio o de las condiciones de fijación deberá constar por escrito y ser aceptada por las partes.

CLÁUSULA 4 — CONDICIONES COMERCIALES

Lugar de carga: ${acuerdoDatos.lugar_carga || "Según coordinación de las partes"}.

Destino: ${acuerdoDatos.destino || "Según coordinación de las partes"}.

Condición de entrega: ${acuerdoDatos.condicion_entrega || "Según lo acordado comercialmente"}.

CLÁUSULA 5 — FORMA Y PLAZO DE PAGO

Forma de pago: ${acuerdoDatos.forma_pago || "Según acuerdo comercial"}.

Plazo de pago: ${acuerdoDatos.plazo_pago || "Según acuerdo comercial"}.

El pago deberá efectuarse conforme a las condiciones expresamente pactadas por las partes.

CLÁUSULA 6 — FLETE Y LOGÍSTICA

Flete: ${acuerdoDatos.flete || "Según acuerdo comercial"}.

Las partes coordinarán la logística necesaria para la entrega y recepción de la mercadería, conforme a las condiciones de la operación.

CLÁUSULA 7 — CALIDAD Y CONDICIÓN DE LA MERCADERÍA

${acuerdoDatos.calidad || "La mercadería deberá responder a las condiciones de calidad pactadas entre las partes para la presente operación."}

CLÁUSULA 8 — PLAZO Y VIGENCIA

El presente contrato tendrá vigencia durante el período necesario para el cumplimiento de las obligaciones asumidas respecto de la operación ${operacion.codigo}, salvo modificación escrita acordada por las partes.

CLÁUSULA 9 — ENTREGA

La entrega se realizará en las condiciones indicadas en el presente contrato y conforme a la coordinación operativa establecida entre las partes.

CLÁUSULA 10 — FUERZA MAYOR

Ninguna de las partes será responsable por el incumplimiento derivado de acontecimientos extraordinarios, imprevisibles o inevitables que impidan temporalmente el cumplimiento de las obligaciones, en la medida en que tales circunstancias se encuentren debidamente acreditadas.

CLÁUSULA 11 — INCUMPLIMIENTO

El incumplimiento de las obligaciones asumidas en el presente contrato dará lugar a las consecuencias que correspondan conforme a las condiciones pactadas entre las partes y la normativa aplicable.

CLÁUSULA 12 — CONFIDENCIALIDAD

Las partes se comprometen a mantener la confidencialidad respecto de la información comercial, económica y contractual a la que tengan acceso con motivo de la presente operación, salvo cuando su divulgación resulte necesaria por obligación legal o requerimiento de autoridad competente.

CLÁUSULA 13 — LEGISLACIÓN Y JURISDICCIÓN

Las partes procurarán resolver de buena fe cualquier diferencia relacionada con la interpretación o cumplimiento del presente contrato.

En caso de resultar necesaria la intervención judicial, las partes se someterán a la jurisdicción que corresponda conforme a la legislación aplicable y a los domicilios constituidos en el presente contrato.

CLÁUSULA 14 — DISPOSICIONES GENERALES

El presente contrato contiene las condiciones comerciales acordadas respecto de la operación identificada.

Toda modificación, ampliación o aclaración deberá constar por escrito y ser aceptada por las partes.

OBSERVACIONES

${acuerdoDatos.observaciones || "Sin observaciones adicionales."}

Las partes declaran haber leído y aceptado las condiciones establecidas en el presente contrato, prestando su conformidad respecto de la operación identificada.

FIRMA DEL VENDEDOR

Nombre / Razón social: ${vendedor.nombre_razon_social}
${vendedor.dni ? `DNI: ${vendedor.dni}` : ""}
${vendedor.cuit ? `CUIT: ${vendedor.cuit}` : ""}

Firma: ______________________________


FIRMA DEL COMPRADOR

Nombre / Razón social: ${comprador.nombre_razon_social}
${comprador.dni ? `DNI: ${comprador.dni}` : ""}
${comprador.cuit ? `CUIT: ${comprador.cuit}` : ""}

Firma: ______________________________
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
          contenidoContrato = generarContenidoContratoF2(
            operacion,
            acuerdoReal,
            vendedorSeleccionado,
            compradorSeleccionado,
            contrato.numero_contrato
          );
        } catch (e) {
          setMensaje("");
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo generar el contrato F2."
          );
          return;
        }
      }

      const { data: contratoGuardado, error: errorContrato } = await supabase.rpc("guardar_contrato_comercial", {
        p_operacion_id: operacion.id,
        p_datos: {
          acuerdo_id: acuerdoDB.id,
          numero_contrato: contrato.numero_contrato,
          tipo_contrato: operacion.tipo_operacion === "F1" ? "F1" : "F2 - ABASTECIMIENTO DE GRANOS",
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

      setContrato((actual) => ({
        ...actual,
        id: contratoGuardado.id,
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
          .eq("orden", 5)
          .maybeSingle();

      if (errorEtapa) {
        setMensaje("");
        setError(
          `El Contrato Definitivo se guardó, pero no se pudo encontrar Firmas: ${errorEtapa.message}`
        );
        return;
      }

      if (!siguienteEtapa) {
        setMensaje("");
        setError(
          "El Contrato Definitivo se guardó, pero no existe la etapa 5 (Firmas)."
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

      setAcuerdo((actual) => ({
        ...actual,
        id: acuerdoGuardado.id,
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

    setControlesComerciales((actual) => ({
      ...actual,
      [operacionId]: {
        ...actual[operacionId],
        ...data,
      },
    }));

    // =========================================================
    // VISADO DE MERCADERÍA
    // =========================================================

    if (cambios.visado_resultado === "APROBADO") {
      setVisadoAbierto(null);
      setError("");
      setMensaje(
        "✅ Visado de mercadería APROBADO. Antes de preparar el contrato definitivo, corresponde abonar y verificar la comisión de AgroBrokerIA, que quedará retenida hasta el cierre."
      );
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
      const vendedorFirmado =
        data.vendedor_firma_estado === "FIRMADO";

      const compradorFirmado =
        data.comprador_firma_estado === "FIRMADO";

      const intermediarioCumplido =
        data.intermediario_firma_estado === "FIRMADO" ||
        data.intermediario_firma_estado === "NO_CORRESPONDE";

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
            `Las firmas fueron registradas, pero no se pudo localizar la etapa Fondos: ${errorEtapaFondos.message}`
          );
          return false;
        }

        if (!etapaFondos) {
          setError(
            "Las firmas fueron registradas, pero no existe la etapa 6 (Fondos)."
          );
          return false;
        }

        const { error: errorAvanceFondos } = await avanzarWorkflowSeguro(workflow.id, etapaFondos.id);

        if (errorAvanceFondos) {
          setError(
            `Las firmas fueron registradas, pero no se pudo avanzar a Fondos: ${errorAvanceFondos.message}`
          );
          return false;
        }

        setError("");
        setMensaje(
          "✅ Todas las firmas requeridas fueron completadas. La operación pasó a Fondos."
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

    // Evaluar automáticamente si corresponde liberar
    // los datos operativos.
    const etapaFondosActual = data.fondos_estado === "LIBERADOS";

    const cambioCondicionLiberacion =
      cambios.fondos_estado !== undefined ||
      cambios.comision_estado !== undefined ||
      cambios.no_elusion_aceptada !== undefined;

    if (etapaFondosActual && cambioCondicionLiberacion) {
      await verificarLiberacionOperativa(operacionId);
    }

    return true;
  }

  async function iniciarLogistica(operacionId: string) {
    setError("");
    setMensaje("");

    const control = controlesComerciales[operacionId];

    if (!control) {
      setError(
        "No se puede iniciar la logística porque no existe el control comercial de la operación."
      );
      return false;
    }

    if (control.datos_operativos_estado !== "HABILITADOS") {
      setError(
        "🔒 No se puede iniciar la logística: los datos operativos todavía están protegidos."
      );
      return false;
    }

    const workflow = obtenerWorkflow(operacionId);

    if (!workflow) {
      setError(
        "La operación no tiene un workflow asociado."
      );
      return false;
    }

    if (workflow.orden !== 7) {
      setError(
        `No se puede iniciar la logística desde la etapa actual (${workflow.etapa_actual}).`
      );
      return false;
    }

    const { data: etapaLogistica, error: errorEtapaLogistica } =
      await supabase
        .from("workflow_etapas")
        .select("id, nombre, orden")
        .eq("workflow_id", workflow.workflow_id)
        .eq("orden", 8)
        .maybeSingle();

    if (errorEtapaLogistica) {
      setError(
        `No se pudo localizar la etapa Logística / Entrega: ${errorEtapaLogistica.message}`
      );
      return false;
    }

    if (!etapaLogistica) {
      setError(
        "No existe la etapa 8 (Logística / Entrega) en este workflow."
      );
      return false;
    }

    const { error: errorAvance } = await avanzarWorkflowSeguro(workflow.id, etapaLogistica.id);

    if (errorAvance) {
      setError(
        `No se pudo iniciar la logística: ${errorAvance.message}`
      );
      return false;
    }

    setError("");
    setMensaje(
      "🚚 Logística / Entrega iniciada. Los datos operativos continúan habilitados."
    );

    await cargarOperaciones();

    return true;
  }

  async function confirmarEntregaYAvanzar(
    operacionId: string
  ) {
    setError("");
    setMensaje("");

    const workflow = obtenerWorkflow(operacionId);

    if (!workflow) {
      setError(
        "La entrega fue registrada, pero la operación no tiene workflow asociado."
      );
      return false;
    }

    if (workflow.orden !== 8) {
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
        .eq("orden", 9)
        .maybeSingle();

    if (errorEtapaLiquidacion) {
      setError(
        `La entrega fue registrada, pero no se pudo localizar la etapa Liquidación: ${errorEtapaLiquidacion.message}`
      );
      return false;
    }

    if (!etapaLiquidacion) {
      setError(
        "La entrega fue registrada, pero no existe la etapa 9 (Liquidación) en este workflow."
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

    if (workflow.orden !== 9) {
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

    // El RPC de cierre confirma la liquidación, registra la comisión de plataforma
    // y cierra atómicamente la operación y su workflow. No debe intentarse un
    // segundo avance secuencial hacia la etapa 10.
    setMensaje(
      "✅ Liquidación confirmada. Comisión AgroBrokerIA liberada y operación cerrada."
    );

    await cargarOperaciones();

    return true;
  }

  async function verificarLiberacionOperativa(
    operacionId: string
  ) {
    const { data: controlActual, error: errorControl } =
      await supabase
        .from("operacion_control_comercial")
        .select(
          "fondos_estado, comision_estado, no_elusion_aceptada, datos_operativos_estado"
        )
        .eq("operacion_id", operacionId)
        .single();

    if (errorControl) {
      console.error(errorControl);
      setError(
        `No se pudo verificar la liberación operativa: ${errorControl.message}`
      );
      return false;
    }

    const fondosLiberados =
      controlActual.fondos_estado === "LIBERADOS";

    const comisionRetenida =
      ["RETENIDA","LIBERADA"].includes(controlActual.comision_estado);

    if (
      !fondosLiberados ||
      !comisionRetenida
    ) {
      setError(
        "🔒 Los datos operativos continúan protegidos. Para liberarlos deben cumplirse: Fondos LIBERADOS + Comisión AgroBrokerIA RETENIDA."
      );
      return false;
    }

    const workflow = obtenerWorkflow(operacionId);

    if (!workflow) {
      setError(
        "Las condiciones fueron cumplidas, pero la operación no tiene workflow asociado."
      );
      return false;
    }

    if (workflow.orden !== 7) {
      setError(`La liberación operativa solo se puede verificar en su etapa correspondiente. Etapa actual: ${workflow.etapa_actual}.`);
      return false;
    }

    const ahora = new Date().toISOString();
    const { error: errorActualizacionControl } = await supabase.rpc("guardar_control_comercial", {
      p_operacion_id: operacionId,
      p_cambios: { datos_operativos_estado: "HABILITADOS", datos_operativos_liberados_at: ahora }
    });
    if (errorActualizacionControl) {
      setError(`No se pudieron habilitar los datos operativos: ${errorActualizacionControl.message}`);
      return false;
    }

    setControlesComerciales((actual) => ({
      ...actual,
      [operacionId]: {
        ...actual[operacionId],
        ...controlActual,
        datos_operativos_estado: "HABILITADOS",
        datos_operativos_liberados_at: ahora,
      },
    }));

    setError("");
    setMensaje(
      "✅ Fondos liberados y comisión retenida. Los datos operativos fueron habilitados."
    );

    await cargarOperaciones();

    return true;
  }


  const estadoVistaOperacion = (operacion: Operacion) => {
    const workflow = obtenerWorkflow(operacion.id);
    const orden = workflow?.orden ?? 0;
    if (/CANCEL/i.test(operacion.estado)) return "Canceladas";
    if (orden === 10 || /CERR|FINAL/i.test(operacion.estado)) return "Finalizadas";
    if (orden >= 1 && orden <= 3) return "En negociación";
    if (orden >= 4 && orden <= 6) return "En contrato";
    if (orden >= 7 && orden <= 8) return "En logística";
    if (orden === 9) return "En liquidación";
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
    const texto = `${operacion.codigo} ${operacion.tipo_operacion} ${etapa} ${meta.producto} ${meta.origen} ${meta.destino}`.toLowerCase();
    const fecha = operacion.fecha_operacion?.slice(0,10) || "";
    return (!filtroEstado || estadoVista === filtroEstado) &&
      (!filtroTipo || operacion.tipo_operacion === filtroTipo) &&
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
  const limpiarFiltros=()=>{setFiltroEstado("");setFiltroTipo("");setFiltroOrigen("");setFiltroDestino("");setFiltroProducto("");setFiltroMinVol("");setFiltroMaxVol("");setFiltroMinPrecio("");setFiltroMaxPrecio("");setFiltroDesde("");setFiltroHasta("")};

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
                <span><em className={"op-condition "+(operacion.tipo_operacion==="F1"?"f1":"f2")}>{operacion.tipo_operacion}</em></span>
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
          <Filter label="Tipo de contrato"><select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}><option value="">Todos los tipos</option><option value="F1">F1</option><option value="F2">F2</option></select></Filter>
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
              resultado = await avanzarAContratoConComision(detalleOperacion);
            } else {
              abrirVisado(detalleOperacion); resultado = true;
            }
          } else if (ordenDetalle === 4) {
            const controlActual = await cargarControlComercial(detalleOperacion);
            if (String(controlActual?.comision_estado||"").toUpperCase() !== "RETENIDA") {
              setError("El Contrato Definitivo se habilita cuando Administración confirma la retención de la comisión AgroBrokerIA.");
              return;
            }
            resultado = await avanzarAContratoConComision(detalleOperacion);
          } else if (ordenDetalle === 5) {
            await abrirContrato(detalleOperacion);
            resultado = true;
          } else if (ordenDetalle === 6) {
            window.location.href = "/contratos?tab=firmas";
            return;
          } else if (ordenDetalle === 7) {
            resultado = await iniciarLogistica(detalleOperacion.id);
          } else if (ordenDetalle === 0 || !workflowDetalle) {
            setError("Esta operación todavía no tiene un flujo de etapas asociado. No se puede avanzar hasta inicializar su workflow.");
            return;
          } else if (ordenDetalle === 8) {
            window.location.href = "/logistica";
            return;
            return;
          } else if (ordenDetalle >= 9) {
            setError("La operación ya está en Liquidación o finalizada. La acción correspondiente se gestiona desde el módulo Liquidación.");
            return;
          } else {
            setError("No hay una acción disponible para esta etapa. Podés continuar la negociación desde Mensajes.");
          }
          if (resultado) setDetalleOperacion(null);
        };
        return <div role="dialog" aria-modal="true" aria-label={"Detalle " + detalleOperacion.codigo} className="operation-detail-backdrop" style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,23,42,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={() => setDetalleOperacion(null)}>
          <section className="operation-detail-dialog" style={{position:"relative",width:"min(100%,560px)",maxHeight:"85vh",overflowY:"auto",background:"#fff",color:"#123",borderRadius:16,padding:28,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}} onClick={(event) => event.stopPropagation()}>
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
                <strong style={{fontSize:12,color:"#0f766e"}}>Etapa {Math.min(Math.max(ordenDetalle,1),10)} de 10</strong>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(Math.max(ordenDetalle,0),10)/10*100)} style={{height:8,borderRadius:99,background:"#e2e8f0",overflow:"hidden",marginBottom:14}}>
                <div style={{height:"100%",width:`${Math.min(Math.max(ordenDetalle,0),10)/10*100}%`,background:"#059669",borderRadius:99,transition:"width .25s ease"}}/>
              </div>
              <ol style={{listStyle:"none",padding:0,margin:0,display:"grid",gap:8}}>
                {ETAPAS.map((etapa,index)=>{const orden=index+1;const completada=ordenDetalle>orden;const actual=ordenDetalle===orden;return <li key={etapa} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,background:actual?"#dbeafe":completada?"#dcfce7":"#fff",border:actual?"1px solid #60a5fa":completada?"1px solid #86efac":"1px solid #e2e8f0",color:actual?"#1d4ed8":completada?"#166534":"#64748b"}}>
                  <span aria-hidden="true" style={{fontWeight:800,minWidth:22}}>{completada?"✓":actual?"●":"○"}</span>
                  <span style={{flex:1,fontWeight:actual?700:500}}>{etapa}</span>
                  <small>{completada?"Completada":actual?"Etapa actual":"Pendiente"}</small>
                </li>})}
              </ol>
              {ordenDetalle>0&&ordenDetalle<10&&<p style={{margin:"12px 0 0",fontSize:13,color:"#334155"}}><strong>Siguiente paso:</strong> {ETAPAS[ordenDetalle]}</p>}
              {ordenDetalle===10&&<p style={{margin:"12px 0 0",fontSize:13,color:"#166534",fontWeight:700}}>Operación completada.</p>}
            </section>
            {ordenDetalle === 4 && <section style={{marginTop:18,padding:16,border:"1px solid #86efac",borderRadius:12,background:"#f0fdf4"}}>
              <h3 style={{margin:"0 0 8px",color:"#166534"}}>Comisión AgroBrokerIA</h3>
              <p style={{margin:"0 0 8px",color:"#14532d"}}>La comisión de plataforma se gestiona después del visado y antes del Contrato Definitivo. Importe de referencia: USD {Number(detalleOperacion.cantidad_tn || 0).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2})} (USD 1 por TN).</p>
              <strong style={{display:"inline-flex",padding:"6px 10px",borderRadius:999,background:(String(controlesComerciales[detalleOperacion.id]?.comision_estado||"").toUpperCase()==="RETENIDA"?"#dcfce7":"#fef3c7"),color:(String(controlesComerciales[detalleOperacion.id]?.comision_estado||"").toUpperCase()==="RETENIDA"?"#166534":"#92400e")}}>Comisión AgroBrokerIA: {String(controlesComerciales[detalleOperacion.id]?.comision_estado||"").toUpperCase()==="RETENIDA"?"RETENIDA":"PENDIENTE DE VERIFICACIÓN"}</strong>
              <p style={{margin:"8px 0 0",fontSize:12,color:"#475569"}}>La comisión solo se mostrará como RETENIDA cuando el sistema registre la retención confirmada por Administración.</p>
            </section>}
            {error && <p role="alert" style={{marginTop:12,padding:12,borderRadius:8,background:"#fee2e2",color:"#991b1b"}}>{error}</p>}
            <div className="operation-detail-actions" style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:24,flexWrap:"wrap"}}><button type="button" style={{padding:"10px 16px",borderRadius:8,border:"1px solid #cbd5e1",cursor:"pointer"}} onClick={() => setDetalleOperacion(null)}>Cerrar</button>}<button type="button" style={{padding:"10px 16px",borderRadius:8,border:0,background:"#078b58",color:"#fff",cursor:"pointer"}} onClick={continuar}>{ordenDetalle === 1 ? "Iniciar Acuerdo Comercial / Reserva" : ordenDetalle === 2 ? "Completar acuerdo preliminar" : ordenDetalle === 3 ? (visadoAprobado(controlesComerciales[detalleOperacion.id]) ? "Continuar a Fondos" : "Registrar visado de mercadería") : ordenDetalle === 4 ? (String(controlesComerciales[detalleOperacion.id]?.comision_estado||"").toUpperCase()==="RETENIDA" ? "Continuar a Contrato Definitivo" : "Esperar retención de comisión") : ordenDetalle === 5 ? "Preparar contrato definitivo" : ordenDetalle === 6 ? "Gestionar firmas del contrato" : ordenDetalle === 7 ? "Verificar fondos y habilitar datos operativos" : ordenDetalle === 7 ? "Iniciar logística" : ordenDetalle === 8 ? "Registrar entrega" : ordenDetalle === 9 ? "Confirmar liquidación" : ordenDetalle === 10 ? "Operación cerrada" : "Revisar workflow"}</button></div>
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
              <div><h2 style={{margin:"0 0 6px"}}>Contrato definitivo</h2><p style={{margin:0,color:"#64748b"}}>{contrato.numero_contrato} · {operacionContrato.tipo_operacion} · {formatoNumero(operacionContrato.cantidad_tn)} TN</p></div>
              <button type="button" onClick={()=>setContratoAbierto(null)} style={{border:0,background:"transparent",fontSize:26,cursor:"pointer"}} aria-label="Cerrar">×</button>
            </header>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginTop:18}}>
              <label>Número de contrato<input style={inputContrato} value={contrato.numero_contrato} onChange={e=>setContrato(v=>({...v,numero_contrato:e.target.value}))}/></label>
              <label>Modelo contractual<input style={inputContrato} value={operacionContrato.tipo_operacion==="F1"?"F1":"F2"} readOnly/></label>
              <label>Cantidad (TN)<input style={inputContrato} value={formatoNumero(operacionContrato.cantidad_tn)} readOnly/></label>
              <label>Precio por TN<input style={inputContrato} value={formatoNumero(operacionContrato.precio_tn)} readOnly/></label>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:16}}>
              <label style={{display:"block"}}>Vendedor
                <select style={inputContrato} value={vendedorSeleccionado} onChange={async (e) => {
                  const id = e.target.value;
                  setVendedorSeleccionado(id);
                  if (id) {
                    await guardarParteOperacion(operacionContrato.id, "VENDEDOR", id);
                    const compradorId = compradorSeleccionado;
                    if (compradorId) {
                      try {
                        const texto = generarContenidoContratoF2(operacionContrato, acuerdo, id, compradorId, contrato.numero_contrato);
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
                  if (id) {
                    await guardarParteOperacion(operacionContrato.id, "COMPRADOR", id);
                    const vendedorId = vendedorSeleccionado;
                    if (vendedorId) {
                      try {
                        const texto = generarContenidoContratoF2(operacionContrato, acuerdo, vendedorId, id, contrato.numero_contrato);
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
        <Bottom title="Resumen por estado"><div className="op-legend"><p>🔵 En negociación <b>{enNegociacion}</b></p><p>🟡 En contrato <b>{enContrato}</b></p><p>🟣 En logística <b>{enLogistica}</b></p><p>🟠 En liquidación <b>{enLiquidacion}</b></p><p>🟢 Finalizadas <b>{operaciones.filter(o=>obtenerWorkflow(o.id)?.orden===10 || /CERR|FINAL/i.test(o.estado)).length}</b></p><p>🔴 Canceladas <b>{operaciones.filter(o=>/CANCEL/i.test(o.estado)).length}</b></p></div></Bottom>
        <Bottom title="Volumen total registrado"><div className="op-volume-summary"><strong>{formatoNumero(totalVolumen)} TN</strong><span>Calculado sobre las operaciones cargadas</span></div></Bottom>
        <Bottom title="Tipos de contrato"><Bars items={[["F1",String(operaciones.filter(o=>o.tipo_operacion==="F1").length)],["F2",String(operaciones.filter(o=>o.tipo_operacion==="F2").length)]]}/></Bottom>
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
