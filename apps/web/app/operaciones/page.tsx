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
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [acuerdoAbierto, setAcuerdoAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [contratoAbierto, setContratoAbierto] = useState<string | null>(null);

  const [visadoAbierto, setVisadoAbierto] =
    useState<string | null>(null);

  const [guardandoVisado, setGuardandoVisado] =
    useState(false);

  const [controlesComerciales, setControlesComerciales] =
    useState<Record<string, ControlComercialData>>({});

  const [comisionesIntermediarios, setComisionesIntermediarios] =
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

  const [participantesCargadosPorOperacion, setParticipantesCargadosPorOperacion] =
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
    const { data, error } = await supabase
      .from("contactos_comerciales")
      .select("*")
      .eq("activo", true)
      .order("nombre_razon_social", {
        ascending: true,
      });

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
          "id, codigo, estado, tipo_operacion, precio_tn, cantidad_tn, importe_total, fecha_operacion"
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

      setOperaciones(
        (operacionesDB || []).map((item) => ({
          id: item.id,
          codigo: item.codigo,
          estado: item.estado,
          tipo_operacion: item.tipo_operacion || "F2",
          precio_tn: Number(item.precio_tn),
          cantidad_tn: Number(item.cantidad_tn),
          importe_total: Number(item.importe_total),
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
      // =========================================================
      // SINCRONIZACIÓN AUTOMÁTICA: COMISIÓN AGROBROKER IA
      // =========================================================
      // USD 1 por cada tonelada de la operación.
      // Corrige operaciones existentes que tengan la comisión
      // en 0, vacía o con moneda diferente de USD.
      // =========================================================

      for (const operacion of operacionesDB || []) {
        const montoComision =
          Number(operacion.cantidad_tn) * 1;

        if (!Number.isFinite(montoComision)) {
          continue;
        }

        const { data: controlComision, error: errorControlComision } =
          await supabase
            .from("operacion_control_comercial")
            .select("comision_monto, comision_moneda")
            .eq("operacion_id", operacion.id)
            .maybeSingle();

        if (errorControlComision) {
          console.error(
            "No se pudo consultar la comisión de AgroBroker IA:",
            errorControlComision
          );
          continue;
        }

        if (!controlComision) {
          continue;
        }

        if (
          Number(controlComision.comision_monto) === montoComision &&
          controlComision.comision_moneda === "USD"
        ) {
          continue;
        }

        const { error: errorActualizarComision } =
          await supabase
            .from("operacion_control_comercial")
            .update({
              comision_monto: montoComision,
              comision_moneda: "USD",
              updated_at: new Date().toISOString(),
            })
            .eq("operacion_id", operacion.id);

        if (!errorActualizarComision) {
          setControlesComerciales((actual) => ({
            ...actual,
            [operacion.id]: {
              ...actual[operacion.id],
              comision_monto: montoComision,
              comision_moneda: "USD",
            },
          }));
        }

        if (errorActualizarComision) {
          console.error(
            "No se pudo actualizar la comisión de AgroBroker IA:",
            errorActualizarComision
          );
          continue;
        }

        console.log(
          `✅ Comisión AgroBroker IA actualizada: ${operacion.id} → USD ${montoComision}`
        );
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

    await asegurarComisionAgroBrokerIA(operacion);
  }

  async function asegurarComisionAgroBrokerIA(
    operacion: Operacion
  ) {
    const montoComision =
      Number(operacion.cantidad_tn) * 1;

    const controlActual =
      controlesComerciales[operacion.id];

    if (
      controlActual?.comision_monto === montoComision &&
      controlActual?.comision_moneda === "USD"
    ) {
      return;
    }

    const { data, error } = await supabase.rpc("guardar_control_comercial", { p_operacion_id: operacion.id, p_cambios: { comision_monto: montoComision, comision_moneda: "USD" } })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      setError(
        `No se pudo calcular la comisión de AgroBroker IA: ${error.message}`
      );
      return;
    }

    setControlesComerciales((actual) => ({
      ...actual,
      [operacion.id]: {
        ...actual[operacion.id],
        ...data,
      },
    }));
  }

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

    const { data, error } = await supabase
      .from("contactos_comerciales")
      .insert({
        tipo_persona: nuevoContacto.tipo_persona,
        nombre_razon_social:
          nuevoContacto.nombre_razon_social,
        dni: nuevoContacto.dni || null,
        cuit: nuevoContacto.cuit || null,
        domicilio: nuevoContacto.domicilio || null,
        localidad: nuevoContacto.localidad || null,
        provincia: nuevoContacto.provincia || null,
        email: nuevoContacto.email || null,
        telefono: nuevoContacto.telefono || null,
        representante_nombre:
          nuevoContacto.representante_nombre || null,
        representante_dni:
          nuevoContacto.representante_dni || null,
        representante_cargo:
          nuevoContacto.representante_cargo || null,
      })
      .select()
      .single();

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
        await supabase
          .from("operacion_control_comercial")
          .insert({
            operacion_id: operacion.id,
            comision_estado: "PENDIENTE",
            fondos_estado: "PENDIENTES",
            visado_estado: "PENDIENTE",
            vendedor_firma_estado: "PENDIENTE",
            comprador_firma_estado: "PENDIENTE",
            intermediario_firma_estado:
              operacion.tipo_operacion === "F1"
                ? "PENDIENTE"
                : "NO_CORRESPONDE",
            datos_operativos_estado: "PROTEGIDOS",
            no_elusion_aceptada: false,
            cancelacion_estado: "NO_CANCELADA",
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

    // Comisión automática AgroBroker IA:
    // USD 1 por cada tonelada de la operación.
    await asegurarComisionAgroBrokerIA(operacion);

    setContratoAbierto(operacion.id);
  }


  function generarPDFContrato(operacion: Operacion) {
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

    const { error } = await supabase
      .from("partes_operacion")
      .upsert(
        {
          operacion_id: operacionId,
          contacto_id: contactoId,
          rol,
          tipo_persona:
            contactos.find((c) => c.id === contactoId)
              ?.tipo_persona || "FISICA",
          nombre_razon_social:
            contactos.find((c) => c.id === contactoId)
              ?.nombre_razon_social || "",
          dni:
            contactos.find((c) => c.id === contactoId)
              ?.dni || null,
          cuit:
            contactos.find((c) => c.id === contactoId)
              ?.cuit || null,
          domicilio:
            contactos.find((c) => c.id === contactoId)
              ?.domicilio || null,
          localidad:
            contactos.find((c) => c.id === contactoId)
              ?.localidad || null,
          provincia:
            contactos.find((c) => c.id === contactoId)
              ?.provincia || null,
          email:
            contactos.find((c) => c.id === contactoId)
              ?.email || null,
          telefono:
            contactos.find((c) => c.id === contactoId)
              ?.telefono || null,
          representante_nombre:
            contactos.find((c) => c.id === contactoId)
              ?.representante_nombre || null,
          representante_dni:
            contactos.find((c) => c.id === contactoId)
              ?.representante_dni || null,
          representante_cargo:
            contactos.find((c) => c.id === contactoId)
              ?.representante_cargo || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            "operacion_id,rol",
        }
      );

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

Precio pactado: USD ${formatoNumero(operacion.precio_tn)} por tonelada.

Importe total estimado de la operación: USD ${formatoNumero(operacion.importe_total)}.

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

      // Sincronizar el estado local con el acuerdo real
      setAcuerdo({
        id: acuerdoDB.id,
        operacion_id: operacion.id,
        lugar_carga: acuerdoDB.lugar_carga || "",
        destino: acuerdoDB.destino || "",
        condicion_entrega:
          acuerdoDB.condicion_entrega || "",
        forma_pago:
          acuerdoDB.forma_pago || "",
        plazo_pago:
          acuerdoDB.plazo_pago || "",
        flete:
          acuerdoDB.flete || "",
        calidad:
          acuerdoDB.calidad || "",
        observaciones:
          acuerdoDB.observaciones || "",
        estado:
          acuerdoDB.estado || "CONFIRMADO",
      });

      // Utilizar los datos reales del acuerdo para el contrato
      const acuerdoOriginal = acuerdo;

      setAcuerdo((actual) => ({
        ...actual,
        id: acuerdoDB.id,
        lugar_carga: acuerdoDB.lugar_carga || "",
        destino: acuerdoDB.destino || "",
        condicion_entrega:
          acuerdoDB.condicion_entrega || "",
        forma_pago:
          acuerdoDB.forma_pago || "",
        plazo_pago:
          acuerdoDB.plazo_pago || "",
        flete:
          acuerdoDB.flete || "",
        calidad:
          acuerdoDB.calidad || "",
        observaciones:
          acuerdoDB.observaciones || "",
        estado:
          acuerdoDB.estado || "CONFIRMADO",
      }));

      let contenidoContrato = contrato.contenido;

      if (operacion.tipo_operacion === "F2") {
        try {
          // La función utiliza el estado del acuerdo.
          // Lo actualizamos con los datos recuperados arriba.
          const acuerdoAnterior = {
            ...acuerdoOriginal,
            id: acuerdoDB.id,
            operacion_id: operacion.id,
            lugar_carga:
              acuerdoDB.lugar_carga || "",
            destino:
              acuerdoDB.destino || "",
            condicion_entrega:
              acuerdoDB.condicion_entrega || "",
            forma_pago:
              acuerdoDB.forma_pago || "",
            plazo_pago:
              acuerdoDB.plazo_pago || "",
            flete:
              acuerdoDB.flete || "",
            calidad:
              acuerdoDB.calidad || "",
            observaciones:
              acuerdoDB.observaciones || "",
            estado:
              acuerdoDB.estado || "CONFIRMADO",
          };

          const acuerdoActual = acuerdo;

          setAcuerdo(acuerdoAnterior);

          // Generar el contrato directamente con los datos
          // recuperados de Supabase.
          contenidoContrato =
            generarContenidoContratoF2(
              operacion,
              acuerdoAnterior
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
          acuerdo_id: contrato.acuerdo_id || null,
          numero_contrato: contrato.numero_contrato,
          tipo_contrato: operacion.tipo_operacion === "F1" ? "F1" : "F2 - ABASTECIMIENTO DE GRANOS",
          estado,
          cantidad_tn: operacion.cantidad_tn,
          precio_tn: operacion.precio_tn,
          importe_total: operacion.importe_total,
          lugar_carga: acuerdo.lugar_carga || null,
          destino: acuerdo.destino || null,
          condicion_entrega: acuerdo.condicion_entrega || null,
          forma_pago: acuerdo.forma_pago || null,
          plazo_pago: acuerdo.plazo_pago || null,
          flete: acuerdo.flete || null,
          calidad: acuerdo.calidad || null,
          observaciones: acuerdo.observaciones || null,
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
       * El borrador puede guardarse sin intermediario ni comisión.
       *
       * Para CONFIRMAR:
       * 1. Debe existir intermediario seleccionado.
       * 2. Debe existir como participante INTERMEDIARIO.
       * 3. Debe existir comisión del intermediario.
       * 4. La comisión debe ser mayor a cero.
       * 5. La comisión automática de AgroBrokerIA debe coincidir
       *    con USD 1 por tonelada.
       */

      if (confirmar) {
        const intermediarioId =
          intermediariosSeleccionados[operacion.id];

        if (!intermediarioId) {
          setMensaje("");
          setError(
            "No se puede confirmar el Acuerdo Comercial: primero debe seleccionar el intermediario de la operación."
          );
          return;
        }

        const {
          data: participanteIntermediario,
          error: errorParticipante,
        } = await supabase
          .from("operacion_participantes")
          .select("id, empresa_id, rol")
          .eq("operacion_id", operacion.id)
          .eq("empresa_id", intermediarioId)
          .eq("rol", "INTERMEDIARIO")
          .maybeSingle();

        if (errorParticipante) {
          setMensaje("");
          setError(
            `No se pudo verificar el intermediario de la operación: ${errorParticipante.message}`
          );
          return;
        }

        if (!participanteIntermediario) {
          setMensaje("");
          setError(
            "No se puede confirmar el Acuerdo Comercial: el intermediario seleccionado todavía no está registrado como participante de esta operación."
          );
          return;
        }

        const {
          data: comisionesIntermediario,
          error: errorComision,
        } = await supabase
          .from("comisiones_intermediarios")
          .select(
            "id, valor_comision, estado, moneda, tipo_comision, quien_abona"
          )
          .eq("operacion_id", operacion.id)
          .eq(
            "parte_operacion_id",
            participanteIntermediario.id
          )
          .order("created_at", {
            ascending: false,
          });

        if (errorComision) {
          setMensaje("");
          setError(
            `No se pudo verificar la comisión del intermediario: ${errorComision.message}`
          );
          return;
        }

        const comisionIntermediario =
          (comisionesIntermediario || []).find(
            (comision) =>
              Number(comision.valor_comision) > 0 &&
              comision.estado !== "ANULADA" &&
              comision.estado !== "DEVUELTA"
          );

        if (!comisionIntermediario) {
          setMensaje("");
          setError(
            "No se puede confirmar el Acuerdo Comercial: el intermediario seleccionado todavía no tiene una comisión acordada."
          );
          return;
        }

          const comisionAgroBrokerEsperada =
            Number(operacion.cantidad_tn || 0);

          // ---------------------------------------------------------
          // Verificar comisión AgroBrokerIA directamente en Supabase
          // ---------------------------------------------------------
          // No dependemos del estado local de React porque puede
          // quedar desactualizado después de guardar la comisión.

          const {
            data: controlAgroBroker,
            error: errorControlAgroBroker,
          } = await supabase
            .from("operacion_control_comercial")
            .select("id, comision_monto, comision_moneda")
            .eq("operacion_id", operacion.id)
            .maybeSingle();

          if (errorControlAgroBroker) {
            console.error(
              "ERROR VERIFICANDO COMISIÓN AGROBROKERIA:",
              errorControlAgroBroker
            );

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
            comisionAgroBrokerRegistrada !==
              comisionAgroBrokerEsperada ||
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

          console.log(
            "VALIDACIONES DEL ACUERDO OK",
            {
              intermediarioId,
              participanteIntermediario,
              comisionIntermediario,
              comisionAgroBrokerEsperada,
              comisionAgroBrokerRegistrada,
              monedaAgroBroker,
              controlAgroBroker,
            }
          );
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


  return (
    <main
      style={{
        maxWidth: 1250,
        margin: "40px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ marginBottom: 30 }}>
        <h1
          style={{
            fontSize: 36,
            marginBottom: 8,
          }}
        >
          📊 Operaciones
        </h1>

        <p style={{ color: "#666", margin: 0 }}>
          Seguimiento de las operaciones comerciales y su workflow.
        </p>
      </div>

      {loading && (
        <div
          style={{
            background: "white",
            padding: 30,
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          Cargando operaciones...
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 20,
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {mensaje && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 20,
            borderRadius: 12,
            marginBottom: 20,
            fontWeight: 700,
          }}
        >
          {mensaje}
        </div>
      )}

      {!loading &&
        !error &&
        operaciones.length === 0 && (
          <div
            style={{
              background: "white",
              padding: 50,
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 50, marginBottom: 15 }}>
              📭
            </div>
            <h2>No hay operaciones.</h2>
          </div>
        )}

      {!loading &&
        operaciones.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 25,
            }}
          >
            {operaciones.map((operacion) => {
              const workflow = obtenerWorkflow(operacion.id);
              const ordenActual = workflow?.orden || 0;

              return (
                <div
                  key={operacion.id}
                  style={{
                    background: "white",
                    borderRadius: 16,
                    padding: 25,
                    boxShadow:
                      "0 2px 10px rgba(0,0,0,0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          marginBottom: 8,
                        }}
                      >
                        🔄 {operacion.codigo}
                      </h2>

                      <div style={{ color: "#666" }}>
                        Fecha:{" "}
                        {formatoFecha(
                          operacion.fecha_operacion
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 15px",
                        borderRadius: 20,
                        background:
                          operacion.estado === "ACEPTADA"
                            ? "#dcfce7"
                            : "#fef3c7",
                        color:
                          operacion.estado === "ACEPTADA"
                            ? "#166534"
                            : "#92400e",
                        fontWeight: 700,
                      }}
                    >
                      {operacion.estado}
                    </div>
                  </div>

                  <hr
                    style={{
                      margin: "20px 0",
                      border: 0,
                      borderTop: "1px solid #eee",
                    }}
                  />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 15,
                      marginBottom: 30,
                    }}
                  >
                    <div>
                      <small style={{ color: "#777" }}>
                        Cantidad
                      </small>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 20,
                          marginTop: 5,
                        }}
                      >
                        {formatoNumero(
                          operacion.cantidad_tn
                        )}{" "}
                        TN
                      </div>
                    </div>

                    <div>
                      <small style={{ color: "#777" }}>
                        Precio
                      </small>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 20,
                          marginTop: 5,
                        }}
                      >
                        USD{" "}
                        {formatoNumero(
                          operacion.precio_tn
                        )}{" "}
                        / TN
                      </div>
                    </div>

                    <div>
                      <small style={{ color: "#777" }}>
                        Importe total
                      </small>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 20,
                          marginTop: 5,
                        }}
                      >
                        USD{" "}
                        {formatoNumero(
                          operacion.importe_total
                        )}
                      </div>
                    </div>
                  </div>

                  {workflow &&
                      ordenActual === 1 && (
                        <button
                          onClick={() =>
                            iniciarAcuerdoComercial(
                              operacion.id
                            )
                          }
                          style={{
                            width: "100%",
                            padding: "16px 20px",
                            border: 0,
                            borderRadius: 10,
                            background: "#2563eb",
                            color: "white",
                            fontSize: 17,
                            fontWeight: 700,
                            cursor: "pointer",
                            marginBottom: 25,
                          }}
                        >
                          🤝 INICIAR ACUERDO COMERCIAL
                        </button>
                      )}

                    {workflow &&
                      ordenActual === 2 && (
                      <button
                        onClick={() =>
                          abrirAcuerdo(operacion)
                        }
                        style={{
                          width: "100%",
                          padding: "16px 20px",
                          border: 0,
                          borderRadius: 10,
                          background: "#2563eb",
                          color: "white",
                          fontSize: 17,
                          fontWeight: 700,
                          cursor: "pointer",
                          marginBottom: 25,
                        }}
                      >
                        🤝 ABRIR ACUERDO COMERCIAL
                      </button>
                    )}

                  {workflow &&
                    ordenActual === 3 && (
                      <button
                        onClick={() =>
                          abrirVisado(operacion)
                        }
                        style={{
                          width: "100%",
                          padding: "16px 20px",
                          border: 0,
                          borderRadius: 10,
                          background: "#ea580c",
                          color: "white",
                          fontSize: 17,
                          fontWeight: 700,
                          cursor: "pointer",
                          marginBottom: 25,
                        }}
                      >
                        🔎 ABRIR VISADO DE MERCADERÍA
                      </button>
                    )}

                  {workflow &&
                    ordenActual === 4 && (
                      <button
                        onClick={() => abrirContrato(operacion)}
                        style={{
                          width: "100%",
                          padding: "16px 20px",
                          border: 0,
                          borderRadius: 10,
                          background: "#7c3aed",
                          color: "white",
                          fontSize: 17,
                          fontWeight: 700,
                          cursor: "pointer",
                          marginBottom: 25,
                        }}
                      >
                        📄 ABRIR CONTRATO DEFINITIVO
                      </button>
                    )}

                  {acuerdoAbierto === operacion.id && (
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "2px solid #dbeafe",
                        borderRadius: 14,
                        padding: 25,
                        marginBottom: 30,
                      }}
                    >
                      <h3
                        style={{
                          marginTop: 0,
                          fontSize: 24,
                        }}
                      >
                        🤝 Acuerdo comercial
                      </h3>

                      <p style={{ color: "#666" }}>
                        Complete las condiciones de la operación
                        antes de confirmar el acuerdo.
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(280px, 1fr))",
                          gap: 18,
                        }}
                      >
                        <Campo
                          label="Lugar de carga"
                          value={acuerdo.lugar_carga}
                          onChange={(v) =>
                            cambiarCampo(
                              "lugar_carga",
                              v
                            )
                          }
                        />

                        <Campo
                          label="Destino"
                          value={acuerdo.destino}
                          onChange={(v) =>
                            cambiarCampo(
                              "destino",
                              v
                            )
                          }
                        />

                        <Campo
                          label="Condición de entrega"
                          value={
                            acuerdo.condicion_entrega
                          }
                          onChange={(v) =>
                            cambiarCampo(
                              "condicion_entrega",
                              v
                            )
                          }
                        />

                        <Campo
                          label="Forma de pago"
                          value={acuerdo.forma_pago}
                          onChange={(v) =>
                            cambiarCampo(
                              "forma_pago",
                              v
                            )
                          }
                        />

                        <Campo
                          label="Plazo de pago"
                          value={acuerdo.plazo_pago}
                          onChange={(v) =>
                            cambiarCampo(
                              "plazo_pago",
                              v
                            )
                          }
                        />

                        <Campo
                          label="Flete"
                          value={acuerdo.flete}
                          onChange={(v) =>
                            cambiarCampo(
                              "flete",
                              v
                            )
                          }
                        />

                        <Campo
                          label="Calidad / condición de mercadería"
                          value={acuerdo.calidad}
                          onChange={(v) =>
                            cambiarCampo(
                              "calidad",
                              v
                            )
                          }
                        />
                      </div>

                      <div style={{ marginTop: 18 }}>
                        <label
                          style={{
                            display: "block",
                            fontWeight: 700,
                            marginBottom: 7,
                          }}
                        >
                        {/* ACUERDO: INTERMEDIARIO */}
                        <div
                          style={{
                            marginTop: 22,
                            padding: 20,
                            background: "#f5f3ff",
                            border: "2px solid #c4b5fd",
                            borderRadius: 12,
                          }}
                        >
                          <h4
                            style={{
                              marginTop: 0,
                              marginBottom: 8,
                              fontSize: 19,
                            }}
                          >
                            🤝 Intermediario de la operación
                          </h4>

                          <p
                            style={{
                              marginTop: 0,
                              color: "#475569",
                              fontSize: 14,
                            }}
                          >
                            Seleccione el intermediario que participa específicamente
                            en esta operación.
                          </p>

                          <select
                            value={intermediariosSeleccionados[operacion.id] || ""}
                            onChange={(e) =>
                              setIntermediariosSeleccionados((actual) => ({
                                ...actual,
                                [operacion.id]: e.target.value,
                              }))
                            }
                            style={{
                              width: "100%",
                              padding: 12,
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                            }}
                          >
                            <option value="">
                              Seleccionar empresa intermediaria...
                            </option>

                            {participantesCargadosPorOperacion[operacion.id]
                              ? intermediariosDisponibles
                              .filter((intermediario) => {
                                  const partesOperacion =
                                    participantesPorOperacion[operacion.id] || [];

                                  return !partesOperacion.some(
                                    (parte) =>
                                      parte.empresa_id === intermediario.empresa_id &&
                                      (parte.rol === "VENDEDOR" ||
                                        parte.rol === "COMPRADOR")
                                  );
                                })
                                .map((intermediario) => (
                                  <option
                                    key={intermediario.empresa_id}
                                    value={intermediario.empresa_id}
                                  >
                                    {intermediario.razon_social}
                                    {intermediario.cuit
                                      ? ` — CUIT ${intermediario.cuit}`
                                      : ""}
                                  </option>
                                ))
                              : null}
                          </select>

                          <p
                            style={{
                              marginTop: 7,
                              marginBottom: 0,
                              color: "#64748b",
                              fontSize: 13,
                            }}
                          >
                            Solo aparecen empresas habilitadas con rol de
                            intermediario.
                          </p>

                          {intermediariosSeleccionados[operacion.id] && (
                            <button
                              type="button"
                              onClick={() =>
                                guardarIntermediarioOperacion(
                                  operacion.id,
                                  intermediariosSeleccionados[operacion.id]
                                )
                              }
                              style={{
                                marginTop: 10,
                                padding: "9px 14px",
                                borderRadius: 8,
                                border: 0,
                                background: "#7c3aed",
                                color: "white",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              ✓ GUARDAR INTERMEDIARIO
                            </button>
                          )}

                          {intermediariosSeleccionados[operacion.id] && (
                            <div
                              style={{
                                marginTop: 18,
                                padding: 18,
                                background: "white",
                                border: "1px solid #ddd6fe",
                                borderRadius: 10,
                              }}
                            >
                              <h5
                                style={{
                                  marginTop: 0,
                                  marginBottom: 15,
                                  fontSize: 16,
                                }}
                              >
                                💵 Comisión del intermediario
                              </h5>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit, minmax(210px, 1fr))",
                                  gap: 12,
                                }}
                              >
                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      fontWeight: 700,
                                      marginBottom: 6,
                                    }}
                                  >
                                    Tipo de comisión
                                  </label>

                                  <select
                                    id={`acuerdo-tipo-comision-${operacion.id}`}
                                    defaultValue="USD_TN"
                                    style={{
                                      width: "100%",
                                      padding: 10,
                                      borderRadius: 7,
                                      border: "1px solid #cbd5e1",
                                    }}
                                  >
                                    <option value="USD_TN">
                                      USD por tonelada
                                    </option>
                                    <option value="PORCENTAJE">
                                      Porcentaje
                                    </option>
                                    <option value="MONTO_FIJO">
                                      Monto fijo
                                    </option>
                                  </select>
                                </div>

                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      fontWeight: 700,
                                      marginBottom: 6,
                                    }}
                                  >
                                    Valor de comisión
                                  </label>

                                  <input
                                    id={`acuerdo-valor-comision-${operacion.id}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Ej. 2"
                                    style={{
                                      width: "100%",
                                      boxSizing: "border-box",
                                      padding: 10,
                                      borderRadius: 7,
                                      border: "1px solid #cbd5e1",
                                    }}
                                  />
                                </div>

                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      fontWeight: 700,
                                      marginBottom: 6,
                                    }}
                                  >
                                    ¿Quién abona?
                                  </label>

                                  <select
                                    id={`acuerdo-quien-abona-${operacion.id}`}
                                    defaultValue="VENDEDOR"
                                    style={{
                                      width: "100%",
                                      padding: 10,
                                      borderRadius: 7,
                                      border: "1px solid #cbd5e1",
                                    }}
                                  >
                                    <option value="VENDEDOR">
                                      Vendedor / productor
                                    </option>
                                    <option value="COMPRADOR">
                                      Comprador
                                    </option>
                                    <option value="COMPARTIDA">
                                      Compartida
                                    </option>
                                  </select>
                                </div>
                              </div>

                              <div
                                style={{
                                  marginTop: 14,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 9,
                                }}
                              >
                                <input
                                  id={`acuerdo-previo-comision-${operacion.id}`}
                                  type="checkbox"
                                />

                                <label
                                  htmlFor={`acuerdo-previo-comision-${operacion.id}`}
                                  style={{ fontWeight: 600 }}
                                >
                                  La comisión ya fue acordada previamente
                                </label>
                              </div>

                              <div style={{ marginTop: 14 }}>
                                <label
                                  style={{
                                    display: "block",
                                    fontWeight: 700,
                                    marginBottom: 6,
                                  }}
                                >
                                  Detalle de la comisión
                                </label>

                                <textarea
                                  id={`acuerdo-detalle-comision-${operacion.id}`}
                                  rows={3}
                                  placeholder="Indicar condiciones acordadas..."
                                  style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    padding: 10,
                                    borderRadius: 7,
                                    border: "1px solid #cbd5e1",
                                    resize: "vertical",
                                  }}
                                />
                              </div>

                              <div
                                style={{
                                  marginTop: 14,
                                  padding: 14,
                                  background: "#ecfdf5",
                                  border: "1px solid #86efac",
                                  borderRadius: 9,
                                }}
                              >
                                <strong>
                                  💰 Comisión automática AgroBroker IA
                                </strong>

                                <div style={{ marginTop: 6 }}>
                                  {formatoNumero(operacion.cantidad_tn)} TN ×
                                  USD 1/TN ={" "}
                                  <strong>
                                    USD {formatoNumero(operacion.cantidad_tn)}
                                  </strong>
                                </div>

                                <div
                                  style={{
                                    marginTop: 5,
                                    fontSize: 13,
                                    color: "#166534",
                                  }}
                                >
                                  Comisión automática del sistema. No editable
                                  por las partes.
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={async () => {
                                  const tipo =
                                    (
                                      document.getElementById(
                                        `acuerdo-tipo-comision-${operacion.id}`
                                      ) as HTMLSelectElement
                                    )?.value || "USD_TN";

                                  const valor = Number(
                                    (
                                      document.getElementById(
                                        `acuerdo-valor-comision-${operacion.id}`
                                      ) as HTMLInputElement
                                    )?.value || 0
                                  );

                                  const quien =
                                    (
                                      document.getElementById(
                                        `acuerdo-quien-abona-${operacion.id}`
                                      ) as HTMLSelectElement
                                    )?.value || "VENDEDOR";

                                  const acuerdoPrevio =
                                    (
                                      document.getElementById(
                                        `acuerdo-previo-comision-${operacion.id}`
                                      ) as HTMLInputElement
                                    )?.checked || false;

                                  const detalle =
                                    (
                                      document.getElementById(
                                        `acuerdo-detalle-comision-${operacion.id}`
                                      ) as HTMLTextAreaElement
                                    )?.value || "";

                                  if (valor <= 0) {
                                    setError(
                                      "Debe ingresar un valor de comisión mayor a cero."
                                    );
                                    return;
                                  }

                                  const empresaIntermediariaId =
                                    intermediariosSeleccionados[operacion.id];

                                  if (!empresaIntermediariaId) {
                                    setError(
                                      "Debe seleccionar primero el intermediario."
                                    );
                                    return;
                                  }

                                  const {
                                    data: participanteIntermediario,
                                    error: errorParticipante,
                                  } = await supabase
                                    .from("operacion_participantes")
                                    .select("id, empresa_id")
                                    .eq("operacion_id", operacion.id)
                                    .eq("rol", "INTERMEDIARIO")
                                    .eq("empresa_id", empresaIntermediariaId)
                                    .maybeSingle();

                                  if (
                                    errorParticipante ||
                                    !participanteIntermediario
                                  ) {
                                    setError(
                                      errorParticipante
                                        ? `No se pudo identificar al intermediario: ${errorParticipante.message}`
                                        : "Debe guardar primero el intermediario de la operación."
                                    );
                                    return;
                                  }

                                  const { data, error } =
                                    await supabase
                                      .from("comisiones_intermediarios")
                                      .insert({
                                        operacion_id: operacion.id,
                                        contacto_id: null,
                                        parte_operacion_id:
                                          participanteIntermediario.id,
                                        lado: "VENDEDOR",
                                        tipo_comision: tipo,
                                        valor_comision: valor,
                                        moneda: "USD",
                                        quien_abona: quien,
                                        acuerdo_previo: acuerdoPrevio,
                                        acuerdo_previo_detalle:
                                          detalle || null,
                                        estado: "ACORDADA",
                                        fecha_acuerdo:
                                          new Date().toISOString(),
                                        observaciones: detalle || null,
                                      })
                                      .select("*")
                                      .single();

                                  
                                  if (error) {
                                    setError(
                                      `No se pudo guardar la comisión: ${error.message}`
                                    );
                                    return;
                                  }

                                  try {
                                    await sincronizarComisionIntermediario({
                                      operacionId: operacion.id,
                                      empresaIntermediariaId,
                                      tipoComision: tipo,
                                      valorComision: valor,
                                      quienAbona: quien,
                                      estado: "ACORDADA",
                                      acuerdoPrevio,
                                      detalle,
                                    });
                                  } catch (errorEconomico) {
                                    console.error(
                                      "Error sincronizando comisión en módulo económico:",
                                      errorEconomico
                                    );

                                    setError(
                                      errorEconomico instanceof Error
                                        ? `La comisión se guardó, pero no pudo sincronizarse en el módulo económico: ${errorEconomico.message}`
                                        : "La comisión se guardó, pero no pudo sincronizarse en el módulo económico."
                                    );
                                  }

                                  setComisionesIntermediarios((actual) => ({
                                    ...actual,
                                    [operacion.id]: [
                                      ...(actual[operacion.id] || []),
                                      {
                                        ...data,
                                        valor_comision: Number(
                                          data.valor_comision
                                        ),
                                      },
                                    ],
                                  }));

                                  setError("");
                                  setMensaje(
                                    "✅ Comisión del intermediario guardada correctamente."
                                  );
                                }}
                                style={{
                                  marginTop: 14,
                                  padding: "11px 18px",
                                  border: 0,
                                  borderRadius: 8,
                                  background: "#7c3aed",
                                  color: "white",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                💾 GUARDAR COMISIÓN
                              </button>
                            </div>
                          )}
                        </div>

                          Observaciones
                        </label>

                        <textarea
                          value={acuerdo.observaciones}
                          onChange={(e) =>
                            cambiarCampo(
                              "observaciones",
                              e.target.value
                            )
                          }
                          rows={4}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: 12,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            resize: "vertical",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                          marginTop: 25,
                        }}
                      >
                        <button
                          onClick={() =>
                            guardarAcuerdo(
                              operacion,
                              false
                            )
                          }
                          disabled={guardando}
                          style={{
                            padding: "14px 20px",
                            borderRadius: 9,
                            border:
                              "1px solid #94a3b8",
                            background: "white",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          💾 GUARDAR BORRADOR
                        </button>

                        <button
                          onClick={() =>
                            guardarAcuerdo(
                              operacion,
                              true
                            )
                          }
                          disabled={guardando}
                          style={{
                            padding: "14px 20px",
                            border: 0,
                            borderRadius: 9,
                            background: "#16a34a",
                            color: "white",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {guardando
                            ? "GUARDANDO..."
                            : "✅ CONFIRMAR ACUERDO"}
                        </button>

                        <button
                          onClick={() =>
                            setAcuerdoAbierto(null)
                          }
                          disabled={guardando}
                          style={{
                            padding: "14px 20px",
                            border: 0,
                            borderRadius: 9,
                            background: "#e5e7eb",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          CANCELAR
                        </button>
                      </div>
                    </div>
                  )}


                  {visadoAbierto === operacion.id && (
                    <div
                      style={{
                        background: "#fff7ed",
                        border: "2px solid #fdba74",
                        borderRadius: 14,
                        padding: 25,
                        marginBottom: 30,
                      }}
                    >
                      <h3
                        style={{
                          marginTop: 0,
                          fontSize: 24,
                        }}
                      >
                        🔎 Visado de mercadería
                      </h3>

                      <div
                        style={{
                          background: "white",
                          borderRadius: 10,
                          padding: 20,
                          marginBottom: 20,
                          border: "1px solid #fed7aa",
                        }}
                      >
                        <p>
                          <strong>Operación:</strong>{" "}
                          {operacion.codigo}
                        </p>

                        <p>
                          <strong>Cantidad:</strong>{" "}
                          {formatoNumero(operacion.cantidad_tn)} TN
                        </p>

                        <p>
                          <strong>Mercadería:</strong>{" "}
                          La inspección debe realizarse en el lugar
                          donde se encuentra físicamente la mercadería.
                        </p>

                        <p
                          style={{
                            marginBottom: 0,
                            color: "#9a3412",
                            fontWeight: 600,
                          }}
                        >
                          El visado debe aprobarse antes de habilitar
                          el Contrato Definitivo.
                        </p>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: 15,
                          marginBottom: 20,
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              marginBottom: 7,
                            }}
                          >
                            Responsable del visado
                          </label>

                          <input
                            value={
                              controlesComerciales[operacion.id]
                                ?.visado_responsable || ""
                            }
                            onChange={(e) =>
                              actualizarControlComercial(
                                operacion.id,
                                {
                                  visado_responsable:
                                    e.target.value,
                                }
                              )
                            }
                            placeholder="Nombre del responsable"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding: 11,
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              marginBottom: 7,
                            }}
                          >
                            Humedad
                          </label>

                          <input
                            value={
                              controlesComerciales[operacion.id]
                                ?.visado_humedad || ""
                            }
                            onChange={(e) =>
                              actualizarControlComercial(
                                operacion.id,
                                {
                                  visado_humedad:
                                    e.target.value,
                                }
                              )
                            }
                            placeholder="% humedad"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding: 11,
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              marginBottom: 7,
                            }}
                          >
                            Calidad
                          </label>

                          <input
                            value={
                              controlesComerciales[operacion.id]
                                ?.visado_calidad || ""
                            }
                            onChange={(e) =>
                              actualizarControlComercial(
                                operacion.id,
                                {
                                  visado_calidad:
                                    e.target.value,
                                }
                              )
                            }
                            placeholder="Resultado / condición de calidad"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding: 11,
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              marginBottom: 7,
                            }}
                          >
                            Condición
                          </label>

                          <input
                            value={
                              controlesComerciales[operacion.id]
                                ?.visado_condicion || ""
                            }
                            onChange={(e) =>
                              actualizarControlComercial(
                                operacion.id,
                                {
                                  visado_condicion:
                                    e.target.value,
                                }
                              )
                            }
                            placeholder="Condición de la mercadería"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding: 11,
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <label
                          style={{
                            display: "block",
                            fontWeight: 700,
                            marginBottom: 7,
                          }}
                        >
                          Observaciones del visado
                        </label>

                        <textarea
                          value={
                            controlesComerciales[operacion.id]
                              ?.visado_observaciones || ""
                          }
                          onChange={(e) =>
                            actualizarControlComercial(
                              operacion.id,
                              {
                                visado_observaciones:
                                  e.target.value,
                              }
                            )
                          }
                          rows={4}
                          placeholder="Observaciones de la inspección..."
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: 11,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            resize: "vertical",
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <label
                          style={{
                            display: "block",
                            fontWeight: 700,
                            marginBottom: 7,
                          }}
                        >
                          Resultado del visado
                        </label>

                        <select
                          value={
                            controlesComerciales[operacion.id]
                              ?.visado_resultado || ""
                          }
                          onChange={(e) =>
                            actualizarControlComercial(
                              operacion.id,
                              {
                                visado_resultado:
                                  e.target.value || null,
                                visado_estado:
                                  e.target.value === "APROBADO"
                                    ? "APROBADO"
                                    : e.target.value === "RECHAZADO"
                                      ? "RECHAZADO"
                                      : "PENDIENTE",
                                visado_fecha:
                                  e.target.value
                                    ? new Date().toISOString()
                                    : null,
                              }
                            )
                          }
                          style={{
                            width: "100%",
                            padding: 12,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          <option value="">
                            Seleccionar resultado...
                          </option>
                          <option value="APROBADO">
                            ✅ APROBADO
                          </option>
                          <option value="RECHAZADO">
                            ❌ RECHAZADO
                          </option>
                        </select>
                      </div>

                      {controlesComerciales[operacion.id]
                        ?.visado_resultado === "RECHAZADO" && (
                        <div style={{ marginBottom: 20 }}>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              marginBottom: 7,
                            }}
                          >
                            Motivo del rechazo
                          </label>

                          <textarea
                            value={
                              controlesComerciales[operacion.id]
                                ?.visado_motivo_rechazo || ""
                            }
                            onChange={(e) =>
                              actualizarControlComercial(
                                operacion.id,
                                {
                                  visado_motivo_rechazo:
                                    e.target.value,
                                }
                              )
                            }
                            rows={3}
                            placeholder="Indicar motivo del rechazo..."
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding: 11,
                              borderRadius: 8,
                              border: "1px solid #fca5a5",
                              resize: "vertical",
                            }}
                          />
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setVisadoAbierto(null)
                          }
                          style={{
                            padding: "13px 18px",
                            border: 0,
                            borderRadius: 9,
                            background: "#e5e7eb",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          CERRAR VISADO
                        </button>
                      </div>
                    </div>
                  )}

                  {ordenActual === 6 && (
                    <div
                      style={{
                        background: "#eff6ff",
                        border: "2px solid #93c5fd",
                        borderRadius: 14,
                        padding: 25,
                        marginBottom: 30,
                      }}
                    >
                      <ControlComercial
                        control={
                          controlesComerciales[operacion.id]
                        }
                        cantidadTn={operacion.cantidad_tn}
                        onActualizarComision={async (
                          cambios
                        ) =>
                          actualizarControlComercial(
                            operacion.id,
                            cambios
                          )
                        }
                        onActualizarControl={async (
                          cambios
                        ) =>
                          actualizarControlComercial(
                            operacion.id,
                            cambios
                          )
                        }
                      />
                    </div>
                  )}

                  {ordenActual === 7 && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "2px solid #86efac",
                        borderRadius: 14,
                        padding: 25,
                        marginBottom: 30,
                      }}
                    >
                      <h3
                        style={{
                          marginTop: 0,
                          fontSize: 24,
                        }}
                      >
                        🔓 Liberación operativa
                      </h3>

                      <div
                        style={{
                          background: "white",
                          borderRadius: 10,
                          padding: 18,
                          marginBottom: 20,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            marginBottom: 8,
                          }}
                        >
                          Datos operativos:
                          {" "}
                          {controlesComerciales[operacion.id]
                            ?.datos_operativos_estado === "HABILITADOS"
                            ? "✅ HABILITADOS"
                            : "🔒 PROTEGIDOS"}
                        </div>

                        <div
                          style={{
                            fontSize: 14,
                            color: "#475569",
                          }}
                        >
                          Los datos operativos fueron habilitados luego de
                          cumplir las condiciones comerciales, contractuales
                          y de fondos de la operación.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          iniciarLogistica(operacion.id)
                        }
                        disabled={
                          controlesComerciales[operacion.id]
                            ?.datos_operativos_estado !== "HABILITADOS"
                        }
                        style={{
                          padding: "14px 22px",
                          border: 0,
                          borderRadius: 10,
                          background:
                            controlesComerciales[operacion.id]
                              ?.datos_operativos_estado === "HABILITADOS"
                              ? "#16a34a"
                              : "#94a3b8",
                          color: "white",
                          fontWeight: 800,
                          fontSize: 16,
                          cursor:
                            controlesComerciales[operacion.id]
                              ?.datos_operativos_estado === "HABILITADOS"
                              ? "pointer"
                              : "not-allowed",
                        }}
                      >
                        🚚 INICIAR LOGÍSTICA / ENTREGA
                      </button>
                    </div>
                  )}

                  {ordenActual === 8 && (
                    <LogisticaEntrega
                      operacionId={operacion.id}
                      onEntregaConfirmada={() =>
                        confirmarEntregaYAvanzar(operacion.id)
                      }
                    />
                  )}

                  {ordenActual === 9 && (
                    <Liquidacion
                      operacionId={operacion.id}
                      cantidadContractualTn={operacion.cantidad_tn}
                      precioTn={operacion.precio_tn}
                      onLiquidacionConfirmada={() =>
                        confirmarLiquidacionYAvanzar(
                          operacion.id
                        )
                      }
                    />
                  )}

                  <PanelMensajes
                    operacionId={operacion.id}
                    codigoOperacion={operacion.codigo}
                  />

                  {contratoAbierto === operacion.id && (
                    <div
                      style={{
                        background: "#faf5ff",
                        border: "2px solid #ddd6fe",
                        borderRadius: 14,
                        padding: 25,
                        marginBottom: 30,
                      }}
                    >
                      <ControlComercial
                        control={
                          controlesComerciales[operacion.id]
                        }
                        cantidadTn={operacion.cantidad_tn}
                        onActualizarComision={async (
                          cambios
                        ) =>
                          actualizarControlComercial(
                            operacion.id,
                            cambios
                          )
                        }
                        onActualizarControl={async (
                          cambios
                        ) =>
                          actualizarControlComercial(
                            operacion.id,
                            cambios
                          )
                        }
                      />

                      <h3
                        style={{
                          marginTop: 0,
                          fontSize: 24,
                        }}
                      >
                        📄 Contrato comercial
                      </h3>

                      <div
                        style={{
                          background: "white",
                          borderRadius: 10,
                          padding: 20,
                          marginBottom: 20,
                        }}
                      >
                        <p>
                          <strong>Operación:</strong>{" "}
                          {operacion.codigo}
                        </p>
                        <p>
                          <strong>Cantidad:</strong>{" "}
                          {formatoNumero(operacion.cantidad_tn)} TN
                        </p>
                        <p>
                          <strong>Precio:</strong> USD{" "}
                          {formatoNumero(operacion.precio_tn)} / TN
                        </p>
                        <p>
                          <strong>Importe total:</strong> USD{" "}
                          {formatoNumero(operacion.importe_total)}
                        </p>
                      </div>

                      <div
                        style={{
                          background: "white",
                          borderRadius: 12,
                          padding: 20,
                          marginBottom: 22,
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <h4
                          style={{
                            marginTop: 0,
                            marginBottom: 18,
                            fontSize: 19,
                          }}
                        >
                          👥 PARTES DE LA OPERACIÓN
                        </h4>

                        {mostrarNuevoContacto && (
                          <div
                            style={{
                              background: "#eff6ff",
                              border: "1px solid #bfdbfe",
                              borderRadius: 10,
                              padding: 18,
                              marginBottom: 22,
                            }}
                          >
                            <h5
                              style={{
                                marginTop: 0,
                                marginBottom: 16,
                                fontSize: 17,
                              }}
                            >
                              ➕ NUEVO CONTACTO —{" "}
                              {mostrarNuevoContacto}
                            </h5>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(240px, 1fr))",
                                gap: 12,
                              }}
                            >
                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontWeight: 700,
                                    marginBottom: 5,
                                  }}
                                >
                                  Tipo de persona
                                </label>

                                <select
                                  value={
                                    nuevoContacto.tipo_persona
                                  }
                                  onChange={(e) =>
                                    setNuevoContacto(
                                      (actual) => ({
                                        ...actual,
                                        tipo_persona:
                                          e.target.value,
                                      })
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    padding: 10,
                                    borderRadius: 7,
                                    border:
                                      "1px solid #cbd5e1",
                                  }}
                                >
                                  <option value="FISICA">
                                    Persona física
                                  </option>
                                  <option value="JURIDICA">
                                    Persona jurídica
                                  </option>
                                </select>
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontWeight: 700,
                                    marginBottom: 5,
                                  }}
                                >
                                  Nombre / Razón social *
                                </label>

                                <input
                                  value={
                                    nuevoContacto.nombre_razon_social
                                  }
                                  onChange={(e) =>
                                    setNuevoContacto(
                                      (actual) => ({
                                        ...actual,
                                        nombre_razon_social:
                                          e.target.value,
                                      })
                                    )
                                  }
                                  placeholder="Nombre o razón social"
                                  style={{
                                    width: "100%",
                                    boxSizing:
                                      "border-box",
                                    padding: 10,
                                    borderRadius: 7,
                                    border:
                                      "1px solid #cbd5e1",
                                  }}
                                />
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontWeight: 700,
                                    marginBottom: 5,
                                  }}
                                >
                                  DNI
                                </label>

                                <input
                                  value={
                                    nuevoContacto.dni || ""
                                  }
                                  onChange={(e) =>
                                    setNuevoContacto(
                                      (actual) => ({
                                        ...actual,
                                        dni: e.target.value,
                                      })
                                    )
                                  }
                                  placeholder="DNI"
                                  style={{
                                    width: "100%",
                                    boxSizing:
                                      "border-box",
                                    padding: 10,
                                    borderRadius: 7,
                                    border:
                                      "1px solid #cbd5e1",
                                  }}
                                />
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontWeight: 700,
                                    marginBottom: 5,
                                  }}
                                >
                                  CUIT
                                </label>

                                <input
                                  value={
                                    nuevoContacto.cuit || ""
                                  }
                                  onChange={(e) =>
                                    setNuevoContacto(
                                      (actual) => ({
                                        ...actual,
                                        cuit: e.target.value,
                                      })
                                    )
                                  }
                                  placeholder="CUIT"
                                  style={{
                                    width: "100%",
                                    boxSizing:
                                      "border-box",
                                    padding: 10,
                                    borderRadius: 7,
                                    border:
                                      "1px solid #cbd5e1",
                                  }}
                                />
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontWeight: 700,
                                    marginBottom: 5,
                                  }}
                                >
                                  Domicilio
                                </label>

                                <input
                                  value={
                                    nuevoContacto.domicilio ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setNuevoContacto(
                                      (actual) => ({
                                        ...actual,
                                        domicilio:
                                          e.target.value,
                                      })
                                    )
                                  }
                                  placeholder="Domicilio"
                                  style={{
                                    width: "100%",
                                    boxSizing:
                                      "border-box",
                                    padding: 10,
                                    borderRadius: 7,
                                    border:
                                      "1px solid #cbd5e1",
                                  }}
                                />
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontWeight: 700,
                                    marginBottom: 5,
                                  }}
                                >
                                  Localidad
                                </label>

                                <input
                                  value={
                                    nuevoContacto.localidad ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setNuevoContacto(
                                      (actual) => ({
                                        ...actual,
                                        localidad:
                                          e.target.value,
                                      })
                                    )
                                  }
                                  placeholder="Localidad"
                                  style={{
                                    width: "100%",
                                    boxSizing:
                                      "border-box",
                                    padding: 10,
                                    borderRadius: 7,
                                    border:
                                      "1px solid #cbd5e1",
                                  }}
                                />
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontWeight: 700,
                                    marginBottom: 5,
                                  }}
                                >
                                  Provincia
                                </label>

                                <input
                                  value={
                                    nuevoContacto.provincia ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setNuevoContacto(
                                      (actual) => ({
                                        ...actual,
                                        provincia:
                                          e.target.value,
                                      })
                                    )
                                  }
                                  placeholder="Provincia"
                                  style={{
                                    width: "100%",
                                    boxSizing:
                                      "border-box",
                                    padding: 10,
                                    borderRadius: 7,
                                    border:
                                      "1px solid #cbd5e1",
                                  }}
                                />
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontWeight: 700,
                                    marginBottom: 5,
                                  }}
                                >
                                  Email
                                </label>

                                <input
                                  type="email"
                                  value={
                                    nuevoContacto.email || ""
                                  }
                                  onChange={(e) =>
                                    setNuevoContacto(
                                      (actual) => ({
                                        ...actual,
                                        email: e.target.value,
                                      })
                                    )
                                  }
                                  placeholder="Email"
                                  style={{
                                    width: "100%",
                                    boxSizing:
                                      "border-box",
                                    padding: 10,
                                    borderRadius: 7,
                                    border:
                                      "1px solid #cbd5e1",
                                  }}
                                />
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    fontWeight: 700,
                                    marginBottom: 5,
                                  }}
                                >
                                  Teléfono
                                </label>

                                <input
                                  value={
                                    nuevoContacto.telefono ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setNuevoContacto(
                                      (actual) => ({
                                        ...actual,
                                        telefono:
                                          e.target.value,
                                      })
                                    )
                                  }
                                  placeholder="Teléfono"
                                  style={{
                                    width: "100%",
                                    boxSizing:
                                      "border-box",
                                    padding: 10,
                                    borderRadius: 7,
                                    border:
                                      "1px solid #cbd5e1",
                                  }}
                                />
                              </div>

                              {nuevoContacto.tipo_persona ===
                                "JURIDICA" && (
                                <>
                                  <div>
                                    <label
                                      style={{
                                        display: "block",
                                        fontWeight: 700,
                                        marginBottom: 5,
                                      }}
                                    >
                                      Representante
                                    </label>

                                    <input
                                      value={
                                        nuevoContacto.representante_nombre ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setNuevoContacto(
                                          (actual) => ({
                                            ...actual,
                                            representante_nombre:
                                              e.target.value,
                                          })
                                        )
                                      }
                                      placeholder="Nombre del representante"
                                      style={{
                                        width: "100%",
                                        boxSizing:
                                          "border-box",
                                        padding: 10,
                                        borderRadius: 7,
                                        border:
                                          "1px solid #cbd5e1",
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <label
                                      style={{
                                        display: "block",
                                        fontWeight: 700,
                                        marginBottom: 5,
                                      }}
                                    >
                                      DNI representante
                                    </label>

                                    <input
                                      value={
                                        nuevoContacto.representante_dni ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setNuevoContacto(
                                          (actual) => ({
                                            ...actual,
                                            representante_dni:
                                              e.target.value,
                                          })
                                        )
                                      }
                                      placeholder="DNI"
                                      style={{
                                        width: "100%",
                                        boxSizing:
                                          "border-box",
                                        padding: 10,
                                        borderRadius: 7,
                                        border:
                                          "1px solid #cbd5e1",
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <label
                                      style={{
                                        display: "block",
                                        fontWeight: 700,
                                        marginBottom: 5,
                                      }}
                                    >
                                      Cargo
                                    </label>

                                    <input
                                      value={
                                        nuevoContacto.representante_cargo ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setNuevoContacto(
                                          (actual) => ({
                                            ...actual,
                                            representante_cargo:
                                              e.target.value,
                                          })
                                        )
                                      }
                                      placeholder="Cargo"
                                      style={{
                                        width: "100%",
                                        boxSizing:
                                          "border-box",
                                        padding: 10,
                                        borderRadius: 7,
                                        border:
                                          "1px solid #cbd5e1",
                                      }}
                                    />
                                  </div>
                                </>
                              )}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                marginTop: 18,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                onClick={crearContacto}
                                style={{
                                  padding: "11px 18px",
                                  border: 0,
                                  borderRadius: 8,
                                  background: "#16a34a",
                                  color: "white",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                💾 GUARDAR CONTACTO
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setMostrarNuevoContacto(
                                    null
                                  );
                                  setError("");
                                  setMensaje("");
                                }}
                                style={{
                                  padding: "11px 18px",
                                  border: 0,
                                  borderRadius: 8,
                                  background: "#e5e7eb",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                CANCELAR
                              </button>
                            </div>
                          </div>
                        )}

                        {/* VENDEDOR */}
                        <div style={{ marginBottom: 20 }}>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              marginBottom: 7,
                            }}
                          >
                            Vendedor
                          </label>

                          <select
                            value={vendedorSeleccionado}
                            onChange={(e) =>
                              setVendedorSeleccionado(
                                e.target.value
                              )
                            }
                            style={{
                              width: "100%",
                              padding: 12,
                              borderRadius: 8,
                              border:
                                "1px solid #cbd5e1",
                            }}
                          >
                            <option value="">
                              Seleccionar vendedor...
                            </option>

                            {contactos.map((contacto) => (
                              <option
                                key={contacto.id}
                                value={contacto.id}
                              >
                                {contacto.nombre_razon_social}
                                {contacto.cuit
                                  ? ` — CUIT ${contacto.cuit}`
                                  : ""}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              setMostrarNuevoContacto(
                                "VENDEDOR"
                              );
                              setError("");
                              setMensaje("");
                            }}
                            style={{
                              marginTop: 8,
                              padding: "9px 14px",
                              borderRadius: 8,
                              border:
                                "1px solid #2563eb",
                              background: "white",
                              color: "#2563eb",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            + NUEVO VENDEDOR
                          </button>

                          {vendedorSeleccionado && (
                            <button
                              type="button"
                              onClick={() =>
                                guardarParteOperacion(
                                  operacion.id,
                                  "VENDEDOR",
                                  vendedorSeleccionado
                                )
                              }
                              style={{
                                marginTop: 8,
                                marginLeft: 8,
                                padding: "9px 14px",
                                borderRadius: 8,
                                border: 0,
                                background: "#16a34a",
                                color: "white",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              ✓ GUARDAR VENDEDOR
                            </button>
                          )}
                        </div>

                        {/* COMPRADOR */}
                        <div style={{ marginBottom: 20 }}>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              marginBottom: 7,
                            }}
                          >
                            Comprador
                          </label>

                          <select
                            value={compradorSeleccionado}
                            onChange={(e) =>
                              setCompradorSeleccionado(
                                e.target.value
                              )
                            }
                            style={{
                              width: "100%",
                              padding: 12,
                              borderRadius: 8,
                              border:
                                "1px solid #cbd5e1",
                            }}
                          >
                            <option value="">
                              Seleccionar comprador...
                            </option>

                            {contactos.map((contacto) => (
                              <option
                                key={contacto.id}
                                value={contacto.id}
                              >
                                {contacto.nombre_razon_social}
                                {contacto.cuit
                                  ? ` — CUIT ${contacto.cuit}`
                                  : ""}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              setMostrarNuevoContacto(
                                "COMPRADOR"
                              );
                              setError("");
                              setMensaje("");
                            }}
                            style={{
                              marginTop: 8,
                              padding: "9px 14px",
                              borderRadius: 8,
                              border:
                                "1px solid #2563eb",
                              background: "white",
                              color: "#2563eb",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            + NUEVO COMPRADOR
                          </button>

                          {compradorSeleccionado && (
                            <button
                              type="button"
                              onClick={() =>
                                guardarParteOperacion(
                                  operacion.id,
                                  "COMPRADOR",
                                  compradorSeleccionado
                                )
                              }
                              style={{
                                marginTop: 8,
                                marginLeft: 8,
                                padding: "9px 14px",
                                borderRadius: 8,
                                border: 0,
                                background: "#16a34a",
                                color: "white",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              ✓ GUARDAR COMPRADOR
                            </button>
                          )}
                        </div>

                        {/* INTERMEDIARIO DE LA OPERACIÓN */}
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              marginBottom: 7,
                            }}
                          >
                            Intermediario de la operación
                          </label>

                          <select
                            value={
                              intermediariosSeleccionados[
                                operacion.id
                              ] || ""
                            }
                            onChange={(e) =>
                              setIntermediariosSeleccionados(
                                (actual) => ({
                                  ...actual,
                                  [operacion.id]:
                                    e.target.value,
                                })
                              )
                            }
                            style={{
                              width: "100%",
                              padding: 12,
                              borderRadius: 8,
                              border:
                                "1px solid #cbd5e1",
                            }}
                          >
                            <option value="">
                              Seleccionar empresa intermediaria...
                            </option>

                            {intermediariosDisponibles
                              .filter((intermediario) => {
                                const partesOperacion =
                                  participantesPorOperacion[
                                    operacion.id
                                  ] || [];

                                return !partesOperacion.some(
                                  (parte) =>
                                    parte.empresa_id ===
                                      intermediario.empresa_id &&
                                    (
                                      parte.rol ===
                                        "VENDEDOR" ||
                                      parte.rol ===
                                        "COMPRADOR"
                                    )
                                );
                              })
                              .map((intermediario) => (
                                <option
                                  key={
                                    intermediario.empresa_id
                                  }
                                  value={
                                    intermediario.empresa_id
                                  }
                                >
                                  {
                                    intermediario.razon_social
                                  }
                                  {intermediario.cuit
                                    ? ` — CUIT ${intermediario.cuit}`
                                    : ""}
                                </option>
                              ))}
                          </select>

                          <p
                            style={{
                              marginTop: 7,
                              marginBottom: 0,
                              color: "#64748b",
                              fontSize: 13,
                            }}
                          >
                            Solo aparecen empresas habilitadas
                            con rol de intermediario. La empresa
                            se selecciona específicamente para
                            esta operación.
                          </p>

                          {intermediariosSeleccionados[
                            operacion.id
                          ] && (
                            <button
                              type="button"
                              onClick={() =>
                                guardarIntermediarioOperacion(
                                  operacion.id,
                                  intermediariosSeleccionados[
                                    operacion.id
                                  ]
                                )
                              }
                              style={{
                                marginTop: 8,
                                padding: "9px 14px",
                                borderRadius: 8,
                                border: 0,
                                background: "#7c3aed",
                                color: "white",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              ✓ GUARDAR INTERMEDIARIO
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginBottom: 18 }}>
                        <label
                          style={{
                            display: "block",
                            fontWeight: 700,
                            marginBottom: 7,
                          }}
                        >
                          {/* =================================================
                              COMISIONES DE INTERMEDIARIOS
                              ================================================= */}

                          <div
                            style={{
                              background: "#f5f3ff",
                              border: "2px solid #c4b5fd",
                              borderRadius: 12,
                              padding: 20,
                              marginBottom: 22,
                            }}
                          >
                            <h4
                              style={{
                                marginTop: 0,
                                marginBottom: 8,
                                fontSize: 19,
                              }}
                            >
                              🤝 COMISIONES DE INTERMEDIARIOS
                            </h4>

                            <p
                              style={{
                                marginTop: 0,
                                color: "#475569",
                              }}
                            >
                              Las comisiones de intermediarios son
                              independientes de la comisión automática
                              de AgroBroker IA.
                            </p>

                            <div
                              style={{
                                background: "#ecfdf5",
                                border: "1px solid #86efac",
                                borderRadius: 9,
                                padding: 14,
                                marginBottom: 18,
                              }}
                            >
                              <strong>
                                💰 Comisión AgroBroker IA
                              </strong>

                              <div style={{ marginTop: 6 }}>
                                USD{" "}
                                {formatoNumero(
                                  operacion.cantidad_tn
                                )}{" "}
                                × USD 1/TN ={" "}
                                <strong>
                                  USD{" "}
                                  {formatoNumero(
                                    operacion.cantidad_tn
                                  )}
                                </strong>
                              </div>

                              <div
                                style={{
                                  marginTop: 5,
                                  fontSize: 13,
                                  color: "#166534",
                                }}
                              >
                                Comisión automática del sistema.
                                No editable por las partes.
                              </div>
                            </div>

                            {intermediariosSeleccionados[operacion.id] && (
                              <div
                                style={{
                                  background: "white",
                                  border: "1px solid #ddd6fe",
                                  borderRadius: 10,
                                  padding: 18,
                                }}
                              >
                                <h5
                                  style={{
                                    marginTop: 0,
                                    marginBottom: 15,
                                    fontSize: 16,
                                  }}
                                >
                                  🤝 Comisión del intermediario
                                </h5>

                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(210px, 1fr))",
                                    gap: 12,
                                  }}
                                >
                                  <div>
                                    <label
                                      style={{
                                        display: "block",
                                        fontWeight: 700,
                                        marginBottom: 6,
                                      }}
                                    >
                                      Tipo de comisión
                                    </label>

                                    <select
                                      id={`tipo-comision-${operacion.id}`}
                                      defaultValue="USD_TN"
                                      style={{
                                        width: "100%",
                                        padding: 10,
                                        borderRadius: 7,
                                        border:
                                          "1px solid #cbd5e1",
                                      }}
                                    >
                                      <option value="USD_TN">
                                        USD por tonelada
                                      </option>
                                      <option value="PORCENTAJE">
                                        Porcentaje
                                      </option>
                                      <option value="MONTO_FIJO">
                                        Monto fijo
                                      </option>
                                    </select>
                                  </div>

                                  <div>
                                    <label
                                      style={{
                                        display: "block",
                                        fontWeight: 700,
                                        marginBottom: 6,
                                      }}
                                    >
                                      Valor de comisión
                                    </label>

                                    <input
                                      id={`valor-comision-${operacion.id}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="Ej. 2"
                                      style={{
                                        width: "100%",
                                        boxSizing:
                                          "border-box",
                                        padding: 10,
                                        borderRadius: 7,
                                        border:
                                          "1px solid #cbd5e1",
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <label
                                      style={{
                                        display: "block",
                                        fontWeight: 700,
                                        marginBottom: 6,
                                      }}
                                    >
                                      ¿Quién abona?
                                    </label>

                                    <select
                                      id={`quien-abona-${operacion.id}`}
                                      defaultValue="VENDEDOR"
                                      style={{
                                        width: "100%",
                                        padding: 10,
                                        borderRadius: 7,
                                        border:
                                          "1px solid #cbd5e1",
                                      }}
                                    >
                                      <option value="VENDEDOR">
                                        Vendedor / productor
                                      </option>
                                      <option value="COMPRADOR">
                                        Comprador
                                      </option>
                                      <option value="COMPARTIDA">
                                        Compartida
                                      </option>
                                    </select>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    marginTop: 14,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 9,
                                  }}
                                >
                                  <input
                                    id={`acuerdo-previo-${operacion.id}`}
                                    type="checkbox"
                                  />

                                  <label
                                    htmlFor={`acuerdo-previo-${operacion.id}`}
                                    style={{
                                      fontWeight: 600,
                                    }}
                                  >
                                    Ya existe un acuerdo previo sobre
                                    esta comisión
                                  </label>
                                </div>

                                <div style={{ marginTop: 14 }}>
                                  <label
                                    style={{
                                      display: "block",
                                      fontWeight: 700,
                                      marginBottom: 6,
                                    }}
                                  >
                                    Detalle del acuerdo / condiciones
                                  </label>

                                  <textarea
                                    id={`detalle-comision-${operacion.id}`}
                                    rows={3}
                                    placeholder="Indicar condiciones acordadas..."
                                    style={{
                                      width: "100%",
                                      boxSizing:
                                        "border-box",
                                      padding: 10,
                                      borderRadius: 7,
                                      border:
                                        "1px solid #cbd5e1",
                                      resize: "vertical",
                                    }}
                                  />
                                </div>

                                <div
                                  style={{
                                    marginTop: 14,
                                    display: "flex",
                                    gap: 10,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const tipo =
                                        (
                                          document.getElementById(
                                            `tipo-comision-${operacion.id}`
                                          ) as HTMLSelectElement
                                        )?.value || "USD_TN";

                                      const valor = Number(
                                        (
                                          document.getElementById(
                                            `valor-comision-${operacion.id}`
                                          ) as HTMLInputElement
                                        )?.value || 0
                                      );

                                      const quien =
                                        (
                                          document.getElementById(
                                            `quien-abona-${operacion.id}`
                                          ) as HTMLSelectElement
                                        )?.value || "VENDEDOR";

                                      const acuerdoPrevio =
                                        (
                                          document.getElementById(
                                            `acuerdo-previo-${operacion.id}`
                                          ) as HTMLInputElement
                                        )?.checked || false;

                                      const detalle =
                                        (
                                          document.getElementById(
                                            `detalle-comision-${operacion.id}`
                                          ) as HTMLTextAreaElement
                                        )?.value || "";

                                      if (valor <= 0) {
                                        setError(
                                          "Debe ingresar un valor de comisión mayor a cero."
                                        );
                                        return;
                                      }

                                      setError("");
                                      setMensaje(
                                        "Guardando comisión del intermediario..."
                                      );

                                      const empresaIntermediariaId =
                                        intermediariosSeleccionados[
                                          operacion.id
                                        ];

                                      if (!empresaIntermediariaId) {
                                        setMensaje("");
                                        setError(
                                          "Debe seleccionar y guardar primero la empresa intermediaria."
                                        );
                                        return;
                                      }

                                      const { data: participanteIntermediario, error: errorParticipanteIntermediario } =
                                        await supabase
                                          .from("operacion_participantes")
                                          .select("id, empresa_id")
                                          .eq(
                                            "operacion_id",
                                            operacion.id
                                          )
                                          .eq(
                                            "rol",
                                            "INTERMEDIARIO"
                                          )
                                          .eq(
                                            "empresa_id",
                                            empresaIntermediariaId
                                          )
                                          .maybeSingle();

                                      if (
                                        errorParticipanteIntermediario ||
                                        !participanteIntermediario
                                      ) {
                                        setMensaje("");
                                        setError(
                                          errorParticipanteIntermediario
                                            ? `No se pudo identificar al intermediario: ${errorParticipanteIntermediario.message}`
                                            : "Debe guardar primero el intermediario de la operación."
                                        );
                                        return;
                                      }

                                      const { data, error } =
                                        await supabase
                                          .from(
                                            "comisiones_intermediarios"
                                          )
                                          .insert({
                                            operacion_id:
                                              operacion.id,
                                            contacto_id: null,
                                            parte_operacion_id:
                                              participanteIntermediario.id,
                                            lado: "VENDEDOR",
                                            tipo_comision: tipo,
                                            valor_comision: valor,
                                            moneda: "USD",
                                            quien_abona: quien,
                                            acuerdo_previo:
                                              acuerdoPrevio,
                                            acuerdo_previo_detalle:
                                              detalle || null,
                                            estado: acuerdoPrevio
                                              ? "ACORDADA"
                                              : "PENDIENTE",
                                            fecha_acuerdo:
                                              acuerdoPrevio
                                                ? new Date().toISOString()
                                                : null,
                                            observaciones:
                                              detalle || null,
                                          })
                                          .select("*")
                                          .single();

                                      if (error) {
                                        console.error(error);
                                        setMensaje("");
                                        setError(
                                          `No se pudo guardar la comisión: ${error.message}`
                                        );
                                        return;
                                      }

                                      setComisionesIntermediarios(
                                        (actual) => ({
                                          ...actual,
                                          [operacion.id]: [
                                            ...(actual[
                                              operacion.id
                                            ] || []),
                                            {
                                              ...data,
                                              valor_comision:
                                                Number(
                                                  data.valor_comision
                                                ),
                                            },
                                          ],
                                        })
                                      );

                                      setMensaje(
                                        "✅ Comisión del intermediario guardada correctamente."
                                      );
                                    }}
                                    style={{
                                      padding: "11px 18px",
                                      border: 0,
                                      borderRadius: 8,
                                      background: "#7c3aed",
                                      color: "white",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    💾 GUARDAR COMISIÓN
                                  </button>
                                </div>
                              </div>
                            )}

                            {!intermediariosSeleccionados[operacion.id] && (
                              <div
                                style={{
                                  padding: 14,
                                  background: "#f8fafc",
                                  borderRadius: 8,
                                  color: "#64748b",
                                }}
                              >
                                Seleccione primero un intermediario
                                para cargar su comisión.
                              </div>
                            )}
                          </div>

                          Número de contrato
                        </label>

                        <input
                          value={contrato.numero_contrato}
                          onChange={(e) =>
                            setContrato((actual) => ({
                              ...actual,
                              numero_contrato: e.target.value,
                            }))
                          }
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: 12,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontWeight: 700,
                            marginBottom: 7,
                          }}
                        >
                          Contenido del contrato
                        </label>

                        <textarea
                          value={contrato.contenido}
                          onChange={(e) =>
                            setContrato((actual) => ({
                              ...actual,
                              contenido: e.target.value,
                            }))
                          }
                          rows={22}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: 15,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            resize: "vertical",
                            fontFamily: "Arial, sans-serif",
                            lineHeight: 1.5,
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                          marginTop: 25,
                        }}
                      >
                        <button
                          onClick={() =>
                            generarPDFContrato(operacion)
                          }
                          style={{
                            padding: "14px 20px",
                            borderRadius: 9,
                            border: "1px solid #7c3aed",
                            background: "white",
                            color: "#7c3aed",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          📄 GENERAR CONTRATO PDF
                        </button>

                        <button
                          onClick={() =>
                            guardarContrato(
                              operacion,
                              false
                            )
                          }
                          disabled={guardandoContrato}
                          style={{
                            padding: "14px 20px",
                            borderRadius: 9,
                            border: "1px solid #94a3b8",
                            background: "white",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          💾 GUARDAR BORRADOR
                        </button>

                        <button
                          onClick={() =>
                            guardarContrato(
                              operacion,
                              true
                            )
                          }
                          disabled={guardandoContrato}
                          style={{
                            padding: "14px 20px",
                            border: 0,
                            borderRadius: 9,
                            background: "#16a34a",
                            color: "white",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {guardandoContrato
                            ? "GUARDANDO..."
                            : "✍️ CONFIRMAR CONTRATO"}
                        </button>

                        <button
                          onClick={() =>
                            setContratoAbierto(null)
                          }
                          disabled={guardandoContrato}
                          style={{
                            padding: "14px 20px",
                            border: 0,
                            borderRadius: 9,
                            background: "#e5e7eb",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          CANCELAR
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 style={{ marginBottom: 20 }}>
                      📌 Estado del workflow
                    </h3>

                    {!workflow && (
                      <div
                        style={{
                          background: "#fff7ed",
                          color: "#9a3412",
                          padding: 15,
                          borderRadius: 10,
                        }}
                      >
                        Esta operación todavía no tiene un
                        workflow asociado.
                      </div>
                    )}

                    {workflow && (
                      <>
                        <div
                          style={{
                            background: "#eff6ff",
                            padding: 15,
                            borderRadius: 10,
                            marginBottom: 20,
                          }}
                        >
                          <strong>
                            Etapa actual:
                          </strong>{" "}
                          {workflow.etapa_actual}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          {ETAPAS.map(
                            (etapa, index) => {
                              const orden = index + 1;

                              const estilo =
                                claseEtapa(
                                  orden,
                                  ordenActual
                                );

                              return (
                                <div
                                  key={etapa}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 15,
                                    padding: "14px 18px",
                                    borderRadius: 10,
                                    ...estilo,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: "50%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent:
                                        "center",
                                      fontWeight: 700,
                                      background: "white",
                                    }}
                                  >
                                    {orden <
                                    ordenActual
                                      ? "✓"
                                      : orden}
                                  </div>

                                  <div>
                                    <strong>
                                      {etapa}
                                    </strong>

                                    {orden ===
                                      ordenActual && (
                                      <div
                                        style={{
                                          fontSize: 13,
                                          marginTop: 3,
                                        }}
                                      >
                                        Etapa actual
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </main>
  );
}

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
