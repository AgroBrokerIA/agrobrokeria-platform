"use client";

import { useEffect, useState } from "react";
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
};

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

  const [contratoAbierto, setContratoAbierto] = useState<string | null>(null);

  const [visadoAbierto, setVisadoAbierto] =
    useState<string | null>(null);

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
  }, []);

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
    const { data: companyUsers, error: errorCompanyUsers } =
      await supabase
        .from("company_users")
        .select("company_id")
        .eq("rol", "intermediario")
        .eq("activo", true);

    if (errorCompanyUsers) {
      console.error(errorCompanyUsers);
      setError(
        `No se pudieron cargar los intermediarios: ${errorCompanyUsers.message}`
      );
      return;
    }

    const companyIds = [
      ...new Set(
        (companyUsers || [])
          .map((item) => item.company_id)
          .filter(Boolean)
      ),
    ];

    if (companyIds.length === 0) {
      setIntermediariosDisponibles([]);
      return;
    }

    const { data: companies, error: errorCompanies } =
      await supabase
        .from("companies")
        .select("id, razon_social, nombre_comercial, cuit")
        .in("id", companyIds);

    if (errorCompanies) {
      console.error(errorCompanies);
      setError(
        `No se pudieron cargar las empresas intermediarias: ${errorCompanies.message}`
      );
      return;
    }

    const cuits = [
      ...new Set(
        (companies || [])
          .map((company) => company.cuit)
          .filter(Boolean)
      ),
    ];

    if (cuits.length === 0) {
      setIntermediariosDisponibles([]);
      return;
    }

    const { data: empresas, error: errorEmpresas } =
      await supabase
        .from("empresas")
        .select("id, razon_social, nombre_comercial, cuit")
        .in("cuit", cuits)
        .eq("activa", true);

    if (errorEmpresas) {
      console.error(errorEmpresas);
      setError(
        `No se pudieron vincular las empresas intermediarias: ${errorEmpresas.message}`
      );
      return;
    }

    const empresasPorCuit = new Map(
      (empresas || []).map((empresa) => [
        empresa.cuit,
        empresa,
      ])
    );

    const disponibles: IntermediarioDisponible[] = (companies || [])
      .flatMap((company) => {
        const empresa = empresasPorCuit.get(company.cuit);

        if (!empresa) return [];

        return [{
          empresa_id: empresa.id,
          razon_social:
            empresa.razon_social ||
            company.razon_social ||
            "Empresa sin razón social",
          nombre_comercial:
            empresa.nombre_comercial ||
            company.nombre_comercial ||
            null,
          cuit:
            empresa.cuit ||
            company.cuit ||
            null,
        }];
      })
      .sort((a, b) =>
        a.razon_social.localeCompare(b.razon_social)
      );

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
          "id, codigo, estado, tipo_operacion, precio_tn, cantidad_tn, importe_total, moneda_id, fecha_operacion"
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

      const {
        data: workflowsDB,
        error: errorWorkflows,
      } = await supabase
        .from("operacion_workflow")
        .select(
          `
          id,
          operacion_id,
          workflow_id,
          etapa_actual_id,
          estado,
          workflow_etapas(
            orden,
            nombre
          )
        `
        );

      if (errorWorkflows) {
        console.error(errorWorkflows);
        setError(
          `No se pudo cargar el workflow: ${errorWorkflows.message}`
        );
        return;
      }

      const workflowsNormalizados: Workflow[] = [];

      for (const item of workflowsDB || []) {
        const etapa = Array.isArray(item.workflow_etapas)
          ? item.workflow_etapas[0]
          : item.workflow_etapas;

        workflowsNormalizados.push({
          id: item.id,
          operacion_id: item.operacion_id,
          workflow_id: item.workflow_id,
          etapa_actual_id: item.etapa_actual_id,
          estado: item.estado,
          etapa_actual: etapa?.nombre || "Sin etapa",
          orden: etapa?.orden || 1,
        });
      }

      const { data: monedaRows, error: monedaError } = await supabase.from("monedas").select("id,codigo");
      if (monedaError) console.error("No se pudieron cargar las monedas:", monedaError);
      setMonedas(Object.fromEntries((monedaRows || []).map((m) => [m.id, m.codigo])));

      setOperaciones(
        (operacionesDB || []).map((item) => ({
          id: item.id,
          codigo: item.codigo,
          estado: item.estado,
          tipo_operacion: item.tipo_operacion || "F2",
          precio_tn: Number(item.precio_tn),
          cantidad_tn: Number(item.cantidad_tn),
          importe_total: Number(item.importe_total),
          moneda_id: item.moneda_id ?? null,
          fecha_operacion: item.fecha_operacion,
        }))
      );

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

      const { data: controlesFirmas, error: errorControlesFirmas } =
        await supabase
          .from("operacion_control_comercial")
          .select(
            "operacion_id, vendedor_firma_estado, comprador_firma_estado, intermediario_firma_estado"
          );

      if (errorControlesFirmas) {
        console.error(errorControlesFirmas);
      } else {
        for (const workflow of workflowsNormalizados) {
          if (workflow.orden !== 5) {
            continue;
          }

          const control = (controlesFirmas || []).find(
            (item) => item.operacion_id === workflow.operacion_id
          );

          if (!control) {
            continue;
          }

          const vendedorFirmado =
            control.vendedor_firma_estado === "FIRMADO";

          const compradorFirmado =
            control.comprador_firma_estado === "FIRMADO";

          const intermediarioCumplido =
            control.intermediario_firma_estado === "FIRMADO" ||
            control.intermediario_firma_estado === "NO_CORRESPONDE";

          if (
            !vendedorFirmado ||
            !compradorFirmado ||
            !intermediarioCumplido
          ) {
            continue;
          }

          const { data: etapaFondos, error: errorEtapaFondos } =
            await supabase
              .from("workflow_etapas")
              .select("id, nombre, orden")
              .eq("workflow_id", workflow.workflow_id)
              .eq("orden", 6)
              .maybeSingle();

          if (errorEtapaFondos || !etapaFondos) {
            console.error(
              "No se pudo localizar la etapa Fondos:",
              errorEtapaFondos
            );
            continue;
          }

          const { error: errorAvanceFondos } = await avanzarWorkflowSeguro(workflow.id, etapaFondos.id);

          if (errorAvanceFondos) {
            console.error(
              "No se pudo avanzar la operación a Fondos:",
              errorAvanceFondos
            );
            continue;
          }

          console.log(
            `✅ Operación ${workflow.operacion_id} pasó automáticamente de Firmas a Fondos.`
          );

          try {
            await notificarParticipantesOperacion({
              operacionId: workflow.operacion_id,
              titulo: "💰 Fondos",
              mensaje:
                `La operación ${workflow.operacion_id} completó las firmas requeridas y pasó a la etapa Fondos.`,
              tipo: "FONDOS",
            });
          } catch (errorNotificacion) {
            console.error(
              "ERROR NOTIFICACIÓN FIRMAS → FONDOS:",
              errorNotificacion
            );
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
    setVisadoAbierto(operacion.id);
  }

  async function cargarControlComercial(
    operacion: Operacion
  ) {
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
      return;
    }

    if (data) {
      setControlesComerciales((actual) => ({
        ...actual,
        [operacionId]: {
          ...data,
          comision_monto:
            data.comision_monto !== null &&
            data.comision_monto !== undefined
              ? Number(data.comision_monto)
              : null,
          cantidad_cuotas:
            data.cantidad_cuotas !== null &&
            data.cantidad_cuotas !== undefined
              ? Number(data.cantidad_cuotas)
              : null,
          tasa_financiacion:
            data.tasa_financiacion !== null &&
            data.tasa_financiacion !== undefined
              ? Number(data.tasa_financiacion)
              : null,
        },
      }));
    }

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
          `CON-2026-${operacion.codigo.replace(
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
        await supabase.rpc("guardar_control_comercial", {
          p_operacion_id: operacion.id,
          p_cambios: {
            comision_estado: "PENDIENTE",
            fondos_estado: "PENDIENTES",
            visado_estado: "PENDIENTE",
            vendedor_firma_estado: "PENDIENTE",
            comprador_firma_estado: "PENDIENTE",
            intermediario_firma_estado:
              operacion.tipo_operacion === "F1" ? "PENDIENTE" : "NO_CORRESPONDE",
            datos_operativos_estado: "PROTEGIDOS",
            no_elusion_aceptada: false,
            cancelacion_estado: "NO_CANCELADA",
          },
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

    for (const linea of contrato.contenido.split("\n")) {
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
    acuerdoDatos: Acuerdo
  ) {
    const vendedor = contactos.find(
      (c) => c.id === vendedorSeleccionado
    );

    const comprador = contactos.find(
      (c) => c.id === compradorSeleccionado
    );

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
        .join("\n");
    };

    return `CONTRATO DE ABASTECIMIENTO DE GRANOS

N.º ${contrato.numero_contrato}

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

      if (operacion.tipo_operacion === "F2") {
        try {
          // Generar el contrato directamente con los datos recuperados de Supabase.
          contenidoContrato = generarContenidoContratoF2(
            operacion,
            acuerdoReal
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
        const comisionAgroBrokerEsperada =
          Number(operacion.cantidad_tn || 0);

        const {
          data: controlAgroBroker,
          error: errorControlAgroBroker,
        } = await supabase
          .from("operacion_control_comercial")
          .select("id, comision_monto, comision_moneda")
          .eq("operacion_id", operacion.id)
          .maybeSingle();

        if (errorControlAgroBroker) {
          setMensaje("");
          setError(
            `No se pudo verificar la comisión de AgroBrokerIA: ${errorControlAgroBroker.message}`
          );
          return;
        }

        const comisionAgroBrokerRegistrada =
          Number(controlAgroBroker?.comision_monto ?? 0);

        const monedaAgroBroker =
          controlAgroBroker?.comision_moneda;

        if (
          comisionAgroBrokerRegistrada !== comisionAgroBrokerEsperada ||
          monedaAgroBroker !== "USD"
        ) {
          setMensaje("");
          setError(
            `No se puede confirmar el Acuerdo Comercial: la comisión de AgroBrokerIA debe ser de USD ${comisionAgroBrokerEsperada.toFixed(
              2
            )} (USD 1 por tonelada).`
          );
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
      const workflow = obtenerWorkflow(operacionId);

      if (!workflow) {
        setError(
          "El visado fue aprobado, pero la operación no tiene workflow asociado."
        );
        return false;
      }

      const { data: etapaContrato, error: errorEtapaContrato } =
        await supabase
          .from("workflow_etapas")
          .select("id, nombre, orden")
          .eq("workflow_id", workflow.workflow_id)
          .eq("orden", 4)
          .maybeSingle();

      if (errorEtapaContrato) {
        setError(
          `El visado fue aprobado, pero no se pudo localizar la etapa Contrato Definitivo: ${errorEtapaContrato.message}`
        );
        return false;
      }

      if (!etapaContrato) {
        setError(
          "El visado fue aprobado, pero no existe la etapa 4 (Contrato Definitivo)."
        );
        return false;
      }

      const { error: errorAvance } = await avanzarWorkflowSeguro(workflow.id, etapaContrato.id);

      if (errorAvance) {
        setError(
          `El visado fue aprobado, pero no se pudo avanzar a Contrato Definitivo: ${errorAvance.message}`
        );
        return false;
      }

      setVisadoAbierto(null);
      setError("");
      setMensaje(
        "✅ Visado de mercadería APROBADO. La operación pasó a Contrato Definitivo."
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
        "La liquidación fue confirmada, pero la operación no tiene workflow asociado."
      );
      return false;
    }

    if (workflow.orden !== 9) {
      setError(
        `No se puede cerrar la operación porque está en la etapa ${workflow.etapa_actual}.`
      );
      return false;
    }

    const { data: etapaCerrada, error: errorEtapaCerrada } =
      await supabase
        .from("workflow_etapas")
        .select("id, nombre, orden")
        .eq("workflow_id", workflow.workflow_id)
        .eq("orden", 10)
        .maybeSingle();

    if (errorEtapaCerrada) {
      setError(
        `No se pudo localizar la etapa Cerrada: ${errorEtapaCerrada.message}`
      );
      return false;
    }

    if (!etapaCerrada) {
      setError(
        "No existe la etapa 10 (Cerrada) en este workflow."
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

    const { error: errorAvance } = await avanzarWorkflowSeguro(workflow.id, etapaCerrada.id, "CERRADA");

    if (errorAvance) {
      setError(
        `La liquidación y la comisión fueron registradas, pero no se pudo actualizar el workflow: ${errorAvance.message}`
      );
      return false;
    }

    setMensaje(
      "✅ Liquidación confirmada. Comisión AgroBroker IA registrada y operación cerrada."
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

    const comisionAbonada =
      controlActual.comision_estado === "ABONADA";

    const noElusionAceptada =
      controlActual.no_elusion_aceptada === true;

    if (
      !fondosLiberados ||
      !comisionAbonada ||
      !noElusionAceptada
    ) {
      setError(
        "🔒 Los datos operativos continúan protegidos. Para liberarlos deben cumplirse: Fondos LIBERADOS + Comisión AgroBroker IA ABONADA + No elusión ACEPTADA."
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

    const { data: etapaLiberacion, error: errorEtapaLiberacion } =
      await supabase
        .from("workflow_etapas")
        .select("id, nombre, orden")
        .eq("workflow_id", workflow.workflow_id)
        .eq("orden", 7)
        .maybeSingle();

    if (errorEtapaLiberacion) {
      setError(
        `No se pudo localizar la etapa Liberación operativa: ${errorEtapaLiberacion.message}`
      );
      return false;
    }

    if (!etapaLiberacion) {
      setError(
        "No existe la etapa 7 (Liberación operativa) en este workflow."
      );
      return false;
    }

    const ahora = new Date().toISOString();

    const { error: errorActualizacionControl } =
      await supabase.rpc("guardar_control_comercial", { p_operacion_id: operacionId, p_cambios: { datos_operativos_estado: "HABILITADOS", datos_operativos_liberados_at: ahora } });

    if (errorActualizacionControl) {
      setError(
        `No se pudieron habilitar los datos operativos: ${errorActualizacionControl.message}`
      );
      return false;
    }

    const { error: errorWorkflow } = await avanzarWorkflowSeguro(workflow.id, etapaLiberacion.id);

    if (errorWorkflow) {
      // Si el workflow falla, volvemos a proteger los datos.
      await supabase.rpc("guardar_control_comercial", { p_operacion_id: operacionId, p_cambios: { datos_operativos_estado: "PROTEGIDOS", datos_operativos_liberados_at: null } });

      setError(
        `No se pudo avanzar a Liberación operativa: ${errorWorkflow.message}`
      );
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
      "✅ Fondos liberados, comisión abonada y no elusión aceptada. Los datos operativos fueron habilitados."
    );

    await cargarOperaciones();

    return true;
  }


  const operacionesFiltradas = operaciones.filter((operacion) => {
    const workflow = obtenerWorkflow(operacion.id);
    const etapa = workflow?.etapa_actual || "";
    const estadoVista =
      workflow?.orden === 1 ? "En negociación" :
      workflow?.orden === 4 || workflow?.orden === 5 ? "En contrato" :
      workflow?.orden === 7 || workflow?.orden === 8 ? "En logística" :
      workflow?.orden === 9 || /CERR|FINAL/i.test(operacion.estado) ? "Finalizadas" :
      /CANCEL/i.test(operacion.estado) ? "Canceladas" :
      "En liquidación";
    const texto = `${operacion.codigo} ${operacion.tipo_operacion} ${etapa}`.toLowerCase();
    const fecha = operacion.fecha_operacion?.slice(0,10) || "";
    return (!filtroEstado || estadoVista === filtroEstado) &&
      (!filtroTipo || operacion.tipo_operacion === filtroTipo) &&
      (!filtroProducto || texto.includes(filtroProducto.toLowerCase())) &&
      (!filtroOrigen || texto.includes(filtroOrigen.toLowerCase())) &&
      (!filtroDestino || texto.includes(filtroDestino.toLowerCase())) &&
      (!filtroMinVol || operacion.cantidad_tn >= Number(filtroMinVol)) &&
      (!filtroMaxVol || operacion.cantidad_tn <= Number(filtroMaxVol)) &&
      (!filtroMinPrecio || operacion.precio_tn >= Number(filtroMinPrecio)) &&
      (!filtroMaxPrecio || operacion.precio_tn <= Number(filtroMaxPrecio)) &&
      (!filtroDesde || fecha >= filtroDesde) &&
      (!filtroHasta || fecha <= filtroHasta);
  });
  const totalVolumen = operaciones.reduce((a,o)=>a+o.cantidad_tn,0);
  const enNegociacion = operaciones.filter(o=>obtenerWorkflow(o.id)?.orden===1).length;
  const enContrato = operaciones.filter(o=>[4,5].includes(obtenerWorkflow(o.id)?.orden||0)).length;
  const enLogistica = operaciones.filter(o=>[7,8].includes(obtenerWorkflow(o.id)?.orden||0)).length;
  const enLiquidacion = operaciones.filter(o=>[6,9].includes(obtenerWorkflow(o.id)?.orden||0)).length;
  const limpiarFiltros=()=>{setFiltroEstado("");setFiltroTipo("");setFiltroOrigen("");setFiltroDestino("");setFiltroProducto("");setFiltroMinVol("");setFiltroMaxVol("");setFiltroMinPrecio("");setFiltroMaxPrecio("");setFiltroDesde("");setFiltroHasta("")};

  return (
    <main className="operations-reference">
      <header className="operations-head">
        <div><h1>Operaciones</h1><p>Gestiona todas tus operaciones de granos y commodities, desde la negociación hasta la liquidación</p></div>
        <button className="operations-new" onClick={()=>setMensaje("Para crear una operación, iniciá una negociación desde Ofertas o Demandas.")}>＋ Nueva operación</button>
      </header>

      {error && <div className="operations-alert error">{error}</div>}
      {mensaje && <div className="operations-alert success">{mensaje}</div>}

      <section className="operations-kpis">
        <Kpi icon="🟢" value={operaciones.length.toLocaleString("es-AR")} label="Operaciones totales" trend="+18% este mes ↗" tone="green"/>
        <Kpi icon="🤝" value={enNegociacion.toLocaleString("es-AR")} label="En negociación" trend="+12% este mes ↗" tone="blue"/>
        <Kpi icon="📄" value={enContrato.toLocaleString("es-AR")} label="En contrato" trend="+25% este mes ↗" tone="purple"/>
        <Kpi icon="🚚" value={enLogistica.toLocaleString("es-AR")} label="En logística" trend="+20% este mes ↗" tone="mint"/>
        <Kpi icon="💰" value={enLiquidacion.toLocaleString("es-AR")} label="En liquidación" trend="+15% este mes ↗" tone="orange"/>
      </section>

      <div className="operations-tabs">
        {["Todas las operaciones","En negociación","En contrato","En logística","En liquidación","Finalizadas","Canceladas"].map(tab=>
          <button key={tab} className={filtroEstado===(tab==="Todas las operaciones"?"":tab)?"active":""} onClick={()=>setFiltroEstado(tab==="Todas las operaciones"?"":tab)}>{tab}</button>
        )}
      </div>

      <section className="operations-layout">
        <div className="operations-main-card">
          <div className="operations-table-head">
            <span># OPERACIÓN</span><span>PRODUCTO</span><span>VOLUMEN</span><span>PRECIO (USD/tn)</span><span>TIPO</span><span>ORIGEN</span><span>DESTINO</span><span>CONTRAPARTE</span><span>ESTADO</span><span>FECHA</span><span>ACCIONES</span>
          </div>
          {loading ? <div className="operations-empty">Cargando operaciones…</div> :
            operacionesFiltradas.map((operacion,index)=>{
              const workflow=obtenerWorkflow(operacion.id), orden=workflow?.orden||0;
              const estado=orden===1?"En negociación":([4,5].includes(orden)?"En contrato":([7,8].includes(orden)?"En logística":([9].includes(orden)||/CERR|FINAL/i.test(operacion.estado)?"Finalizada":/CANCEL/i.test(operacion.estado)?"Cancelada":"En liquidación")));
              const estadoClass=estado.toLowerCase().replaceAll(" ","-").replace("ó","o");
              const producto=["Soja","Maíz","Trigo","Girasol","Aceite de Soja","Harina de Soja","Pellets de Soja","Sorgo"][index%8];
              const action=orden===1?()=>iniciarAcuerdoComercial(operacion.id):orden===2?()=>abrirAcuerdo(operacion):orden===3?()=>abrirVisado(operacion):orden===4?()=>abrirContrato(operacion):orden===7?()=>iniciarLogistica(operacion):undefined;
              return <div className="operation-directory-row" key={operacion.id}>
                <span className="op-code">{operacion.codigo}</span>
                <span className="op-product"><b>{["🫘","🌽","🌾","🌻","🫒","🌾","🫘","🌾"][index%8]}</b><strong>{producto}</strong></span>
                <span><strong>{formatoNumero(operacion.cantidad_tn)} TN</strong></span>
                <span><strong>{formatoNumero(operacion.precio_tn)}</strong></span>
                <span><em className={"op-condition "+(operacion.tipo_operacion==="F1"?"f1":"f2")}>{operacion.tipo_operacion}</em></span>
                <span>🇦🇷 <small>Argentina</small></span>
                <span>🌎 <small>Destino internacional</small></span>
                <span><small>Contraparte comercial</small></span>
                <span><em className={"op-status "+estadoClass}>{estado}</em></span>
                <span>{formatoFecha(operacion.fecha_operacion)}</span>
                <span className="op-actions">{action?<button onClick={action} className="op-more">⋮</button>:<button className="op-more" onClick={()=>setMensaje(`Operación ${operacion.codigo}: ${workflow?.etapa_actual||"sin etapa"}.`)}>⋮</button>}</span>
              </div>
            })}
          {!loading&&!operacionesFiltradas.length&&<div className="operations-empty">No hay operaciones que coincidan con los filtros seleccionados.</div>}
        </div>

        <aside className="operations-filters">
          <div className="op-filter-title"><h2>Filtrar operaciones</h2><button onClick={limpiarFiltros}>Limpiar filtros</button></div>
          <Filter label="Producto"><select value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{["Soja","Maíz","Trigo","Girasol","Aceite de Soja","Harina de Soja","Pellets de Soja","Sorgo"].map(x=><option key={x}>{x}</option>)}</select></Filter>
          <Filter label="Estado"><select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}><option value="">Todos los estados</option>{["En negociación","En contrato","En logística","En liquidación","Finalizadas","Canceladas"].map(x=><option key={x}>{x}</option>)}</select></Filter>
          <Filter label="Tipo de contrato"><select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}><option value="">Todos los tipos</option><option value="F1">F1</option><option value="F2">F2</option></select></Filter>
          <Filter label="País de origen"><select value={filtroOrigen} onChange={e=>setFiltroOrigen(e.target.value)}><option value="">Todos los países</option><option>Argentina</option></select></Filter>
          <Filter label="País de destino"><select value={filtroDestino} onChange={e=>setFiltroDestino(e.target.value)}><option value="">Todos los países</option><option>Internacional</option></select></Filter>
          <Filter label="Rango de fecha"><div className="op-two"><input type="date" value={filtroDesde} onChange={e=>setFiltroDesde(e.target.value)}/><input type="date" value={filtroHasta} onChange={e=>setFiltroHasta(e.target.value)}/></div></Filter>
          <Filter label="Rango de volumen (TN)"><div className="op-two"><input placeholder="Mínimo" value={filtroMinVol} onChange={e=>setFiltroMinVol(e.target.value)}/><input placeholder="Máximo" value={filtroMaxVol} onChange={e=>setFiltroMaxVol(e.target.value)}/></div></Filter>
          <Filter label="Rango de precio (USD/tn)"><div className="op-two"><input placeholder="Mínimo" value={filtroMinPrecio} onChange={e=>setFiltroMinPrecio(e.target.value)}/><input placeholder="Máximo" value={filtroMaxPrecio} onChange={e=>setFiltroMaxPrecio(e.target.value)}/></div></Filter>
          <button className="operations-apply" onClick={()=>setMensaje(`${operacionesFiltradas.length} operaciones coinciden con los filtros.`)}>⚱ Aplicar filtros</button>
        </aside>
      </section>

      <section className="operations-bottom">
        <Bottom title="Volumen por estado"><div className="op-donut" style={{background:"conic-gradient(#1686e6 0 28%,#f4bd18 28% 52%,#8c3de8 52% 72%,#07965a 72% 87%,#b7ddd2 87% 93%,#ef3338 93% 100%)"}}><b>{formatoNumero(totalVolumen)}<small>TN</small><small>Total</small></b></div><div className="op-legend"><p>🔵 En negociación <b>28%</b></p><p>🟡 En contrato <b>24%</b></p><p>🟣 En logística <b>20%</b></p><p>🟢 En liquidación <b>15%</b></p><p>⚪ Finalizadas <b>10%</b></p><p>🔴 Canceladas <b>7%</b></p></div></Bottom>
        <Bottom title="Valor total por producto"><Bars items={["Soja","Maíz","Trigo","Girasol","Aceite de Soja","Harina de Soja","Otros"].map((x,i)=>[x,[42,18,12,10,8,6,4][i]+"%"])}/></Bottom>
        <Bottom title="Operaciones por país de destino"><Bars items={["🇨🇳 China","🇮🇹 Italia","🇳🇱 Países Bajos","🇩🇪 Alemania","🇧🇷 Brasil","🇺🇾 Uruguay","Otros"].map((x,i)=>[x,[28,18,14,12,10,8,10][i]+"%"])}/></Bottom>
        <Bottom title="Evolución de operaciones"><div className="op-chart"><svg viewBox="0 0 300 120" preserveAspectRatio="none"><polyline points="0,92 45,96 90,76 135,81 180,62 225,40 270,25 300,10" fill="none" stroke="#078d54" strokeWidth="3"/><polygon points="0,92 45,96 90,76 135,81 180,62 225,40 270,25 300,10 300,120 0,120" fill="#d8f4e7" opacity=".9"/></svg></div><div className="op-chart-labels"><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Sep</span></div></Bottom>
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
