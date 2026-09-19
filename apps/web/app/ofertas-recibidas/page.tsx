"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { crearNotificacion } from "@/lib/notificaciones/crearNotificacion";
import { sincronizarComisionAgroBrokerIA } from "@/lib/comisiones/sincronizarComisionesOperacion";

type Oferta = {
  oferta_id: string;
  empresa_id: string;
  precio_tn: number;
  cantidad_tn: number;
  observaciones: string | null;
  estado: string;
  codigo_operacion: string;
  publicacion_id: string;
  tipo: string;
  cantidad_publicada: number;
  precio_publicado: number;
  provincia: string | null;
  localidad: string | null;
  puerto: string | null;
  empresa_publicante: string | null;
  cuit_publicante: string | null;
  operacion_id: string;
};

type PerfilEmpresa = {
  company_id: string;
};

type Empresa = {
  id: string;
  razon_social: string | null;
  nombre_comercial: string | null;
  cuit: string | null;
};

type OfertaDB = {
  id: string;
  empresa_id: string;
  precio_tn: number | string;
  cantidad_tn: number | string;
  observaciones: string | null;
  estado: string;
  operacion_id: string;
  operaciones:
    | {
        codigo: string | null;
        publicacion_venta_id: string | null;
        publicacion_compra_id: string | null;
      }
    | {
        codigo: string | null;
        publicacion_venta_id: string | null;
        publicacion_compra_id: string | null;
      }[]
    | null;
};

type PublicacionDB = {
  id: string;
  empresa_id: string;
  tipo: string;
  cantidad_tn: number | string;
  precio_tn: number | string;
  provincia: string | null;
  localidad: string | null;
  puerto: string | null;
  empresas:
    | Empresa
    | Empresa[]
    | null;
};

export default function OfertasRecibidasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarOfertas();
  }, []);

  async function cargarOfertas() {
    try {
      setLoading(true);
      setError("");

      // =====================================================
      // 1. USUARIO AUTENTICADO
      // =====================================================

      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) {
        console.error(errorUsuario);

        setError(
          `No se pudo obtener el usuario: ${errorUsuario.message}`
        );

        return;
      }

      if (!user) {
        setError(
          "Necesitás iniciar sesión para ver las ofertas recibidas."
        );

        return;
      }

      // =====================================================
      // 2. OBTENER COMPANY_ID DEL USUARIO
      // =====================================================

      const {
        data: companyUser,
        error: errorCompanyUser,
      } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("profile_id", user.id)
        .eq("activo", true)
        .limit(1)
        .maybeSingle();

      if (errorCompanyUser) {
        console.error(errorCompanyUser);

        setError(
          `No se pudo obtener la empresa del usuario: ${errorCompanyUser.message}`
        );

        return;
      }

      if (!companyUser?.company_id) {
        setError(
          "Tu usuario no tiene una empresa asociada."
        );

        return;
      }

      const perfilEmpresa: PerfilEmpresa = companyUser;

      console.log(
        "COMPANY ID DEL USUARIO:",
        perfilEmpresa.company_id
      );

      // =====================================================
      // 3. OBTENER EMPRESA
      // =====================================================

      const {
        data: company,
        error: errorCompany,
      } = await supabase
        .from("companies")
        .select("id, razon_social")
        .eq("id", perfilEmpresa.company_id)
        .maybeSingle();

      if (errorCompany) {
        console.error(errorCompany);

        setError(
          `No se pudieron obtener los datos de tu empresa: ${errorCompany.message}`
        );

        return;
      }

      if (!company?.razon_social) {
        setError(
          "No encontramos la razón social de tu empresa."
        );

        return;
      }

      console.log(
        "EMPRESA DEL USUARIO:",
        company.razon_social
      );

      // =====================================================
      // 4. BUSCAR EMPRESA OPERATIVA
      // =====================================================

      const {
        data: empresa,
        error: errorEmpresa,
      } = await supabase
        .from("empresas")
        .select(
          "id, razon_social, nombre_comercial, cuit"
        )
        .eq("razon_social", company.razon_social)
        .limit(1)
        .maybeSingle();

      if (errorEmpresa) {
        console.error(errorEmpresa);

        setError(
          `No se pudo encontrar la empresa operativa: ${errorEmpresa.message}`
        );

        return;
      }

      if (!empresa) {
        setError(
          "No encontramos la empresa correspondiente en la tabla empresas."
        );

        return;
      }

      console.log(
        "EMPRESA OPERATIVA:",
        empresa
      );

      const empresaId = empresa.id;

      // =====================================================
      // 5. OBTENER PUBLICACIONES DE NUESTRA EMPRESA
      // =====================================================

      const {
        data: publicaciones,
        error: errorPublicaciones,
      } = await supabase
        .from("publicaciones")
        .select(
          "id, empresa_id, tipo, cantidad_tn, precio_tn, provincia, localidad, puerto, empresas(id, razon_social, nombre_comercial, cuit)"
        )
        .eq("empresa_id", empresaId);

      if (errorPublicaciones) {
        console.error(errorPublicaciones);

        setError(
          `No se pudieron cargar tus publicaciones: ${errorPublicaciones.message}`
        );

        return;
      }

      console.log(
        "PUBLICACIONES DE NUESTRA EMPRESA:",
        publicaciones
      );

      if (!publicaciones || publicaciones.length === 0) {
        setOfertas([]);
        return;
      }

      // =====================================================
      // 6. OBTENER OFERTAS
      // =====================================================

      const {
        data: ofertasDB,
        error: errorOfertas,
      } = await supabase
        .from("ofertas_negociacion")
        .select(
          `
          id,
          empresa_id,
          precio_tn,
          cantidad_tn,
          observaciones,
          estado,
          operacion_id,
          operaciones(
            codigo,
            publicacion_venta_id,
            publicacion_compra_id
          )
        `
        )
        .order("creada_en", {
          ascending: false,
        });

      if (errorOfertas) {
        console.error(errorOfertas);

        setError(
          `No se pudieron cargar las ofertas: ${errorOfertas.message}`
        );

        return;
      }

      console.log(
        "OFERTAS ENCONTRADAS:",
        ofertasDB
      );

      // =====================================================
      // 7. ARMAR RESULTADO
      // =====================================================

      const resultado: Oferta[] = [];

      for (const ofertaDB of (ofertasDB || []) as OfertaDB[]) {
        const operacion = Array.isArray(
          ofertaDB.operaciones
        )
          ? ofertaDB.operaciones[0]
          : ofertaDB.operaciones;

        if (!operacion) {
          continue;
        }

        const publicacionId =
          operacion.publicacion_venta_id ||
          operacion.publicacion_compra_id;

        if (!publicacionId) {
          continue;
        }

        const publicacion = (
          publicaciones as PublicacionDB[]
        ).find(
          (item) => item.id === publicacionId
        );

        if (!publicacion) {
          continue;
        }

        const empresaPublicacion =
          Array.isArray(publicacion.empresas)
            ? publicacion.empresas[0]
            : publicacion.empresas;

        resultado.push({
          oferta_id: ofertaDB.id,

          empresa_id: ofertaDB.empresa_id,

          precio_tn: Number(
            ofertaDB.precio_tn
          ),

          cantidad_tn: Number(
            ofertaDB.cantidad_tn
          ),

          observaciones:
            ofertaDB.observaciones ?? null,

          estado:
            ofertaDB.estado ?? "PENDIENTE",

          codigo_operacion:
            operacion.codigo ?? "",

          publicacion_id:
            publicacion.id,

          tipo:
            publicacion.tipo,

          cantidad_publicada:
            Number(
              publicacion.cantidad_tn
            ),

          precio_publicado:
            Number(
              publicacion.precio_tn
            ),

          provincia:
            publicacion.provincia,

          localidad:
            publicacion.localidad,

          puerto:
            publicacion.puerto,

          empresa_publicante:
            empresaPublicacion?.nombre_comercial ||
            empresaPublicacion?.razon_social ||
            null,

          cuit_publicante:
            empresaPublicacion?.cuit ||
            null,

          operacion_id:
            ofertaDB.operacion_id,
        });
      }

      console.log(
        "RESULTADO FINAL:",
        resultado
      );

      setOfertas(resultado);
    } catch (e) {
      console.error(e);

      setError(
        "Ocurrió un error al cargar las ofertas recibidas."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // OBTENER EMPRESA DE UNA OFERTA
  // =====================================================

  function ofertaDBEmpresaId(
    oferta: Oferta
  ): string | null {
    /*
     * La empresa compradora se obtiene desde
     * ofertas_negociacion.empresa_id.
     *
     * Este valor se incorporará al objeto Oferta
     * durante la carga de ofertas.
     */

    return (oferta as Oferta & {
      empresa_id?: string;
    }).empresa_id ?? null;
  }

  // =====================================================
  // CAMBIAR ESTADO DE OFERTA
  // =====================================================

  async function cambiarEstado(
    oferta: Oferta,
    nuevoEstado: string
  ) {
    const mensaje =
      nuevoEstado === "ACEPTADA"
        ? "¿Querés aceptar esta oferta?"
        : "¿Querés rechazar esta oferta?";

    if (!window.confirm(mensaje)) {
      return;
    }

    console.log("Actualizando oferta:", {
      oferta_id: oferta.oferta_id,
      nuevoEstado,
    });

    // =====================================================
    // 1. ACTUALIZAR OFERTA
    // =====================================================

    const { data: ofertaActualizada, error: errorOferta } =
      await supabase
        .from("ofertas_negociacion")
        .update({
          estado: nuevoEstado,
        })
        .eq("id", oferta.oferta_id)
        .select("id, estado")
        .maybeSingle();

    if (errorOferta) {
      console.error(
        "ERROR ACTUALIZANDO OFERTA:",
        errorOferta
      );

      alert(
        `No se pudo actualizar la oferta: ${errorOferta.message}`
      );

      return;
    }

    if (!ofertaActualizada) {
      alert(
        "No se actualizó la oferta. Supabase no devolvió ninguna fila."
      );

      return;
    }

    // =====================================================
    // 2. SI SE ACEPTA, ACTUALIZAR OPERACIÓN
    // =====================================================

    if (nuevoEstado === "ACEPTADA") {
      const { data: operacionActualizada, error: errorOperacion } =
        await supabase
          .from("operaciones")
          .update({
            estado: "ACEPTADA",
          })
          .eq("id", oferta.operacion_id)
          .select("id, estado")
          .maybeSingle();

      if (errorOperacion) {
        console.error(
          "ERROR ACTUALIZANDO OPERACIÓN:",
          errorOperacion
        );

        alert(
          `La oferta fue aceptada, pero no se pudo actualizar la operación: ${errorOperacion.message}`
        );

        return;
      }

      if (!operacionActualizada) {
        alert(
          "La oferta fue aceptada, pero Supabase no devolvió la operación actualizada."
        );

        return;
      }

        // =====================================================
        // 2.5. CREAR CONTROL COMERCIAL DE LA OPERACIÓN
        // =====================================================

        /*
         * Cada operación aceptada debe tener su propio control
         * comercial.
         *
         * Comisión automática AgroBrokerIA:
         * USD 1 por tonelada.
         *
         * Si el control ya existe, se actualiza.
         * Si no existe, se crea.
         */

        const {
          data: operacionParaControl,
          error: errorOperacionControl,
        } = await supabase
          .from("operaciones")
          .select("id, cantidad_tn")
          .eq("id", oferta.operacion_id)
          .maybeSingle();

        if (errorOperacionControl) {
          console.error(
            "ERROR OBTENIENDO CANTIDAD PARA CONTROL COMERCIAL:",
            errorOperacionControl
          );

          alert(
            `La oferta fue aceptada, pero no se pudo obtener la cantidad de la operación para calcular la comisión de AgroBrokerIA: ${errorOperacionControl.message}`
          );

          return;
        }

        const cantidadTnControl =
          Number(operacionParaControl?.cantidad_tn ?? 0);

        if (cantidadTnControl <= 0) {
          alert(
            "La oferta fue aceptada, pero la operación no tiene una cantidad válida para calcular la comisión de AgroBrokerIA."
          );

          return;
        }

        const comisionAgroBrokerIA =
          cantidadTnControl * 1;

        const {
          data: controlComercialExistente,
          error: errorControlExistente,
        } = await supabase
          .from("operacion_control_comercial")
          .select("id")
          .eq("operacion_id", oferta.operacion_id)
          .maybeSingle();

        if (errorControlExistente) {
          console.error(
            "ERROR VERIFICANDO CONTROL COMERCIAL:",
            errorControlExistente
          );

          alert(
            `La oferta fue aceptada, pero no se pudo verificar el control comercial: ${errorControlExistente.message}`
          );

          return;
        }

        if (!controlComercialExistente) {
          const {
            error: errorCrearControl,
          } = await supabase
            .from("operacion_control_comercial")
            .insert({
              operacion_id: oferta.operacion_id,
              comision_monto: comisionAgroBrokerIA,
              comision_moneda: "USD",
              updated_at: new Date().toISOString(),
            });

          if (errorCrearControl) {
            console.error(
              "ERROR CREANDO CONTROL COMERCIAL:",
              errorCrearControl
            );

            alert(
              `La oferta fue aceptada, pero no se pudo crear el control comercial: ${errorCrearControl.message}`
            );

            return;
          }
        } else {
          const {
            error: errorActualizarControl,
          } = await supabase
            .from("operacion_control_comercial")
            .update({
              comision_monto: comisionAgroBrokerIA,
              comision_moneda: "USD",
              updated_at: new Date().toISOString(),
            })
            .eq("id", controlComercialExistente.id);

          if (errorActualizarControl) {
            console.error(
              "ERROR ACTUALIZANDO CONTROL COMERCIAL:",
              errorActualizarControl
            );

            alert(
              `La oferta fue aceptada, pero no se pudo actualizar la comisión de AgroBrokerIA: ${errorActualizarControl.message}`
            );

            return;
          }
        }

        console.log(
          "CONTROL COMERCIAL CREADO/ACTUALIZADO:",
          {
            operacion_id: oferta.operacion_id,
            cantidad_tn: cantidadTnControl,
            comision_agrobrokeria_usd: comisionAgroBrokerIA,
          }
        );

        // =====================================================
        // 2.6. SINCRONIZAR COMISIÓN CON EL MÓDULO ECONÓMICO
        // =====================================================

        try {
          await sincronizarComisionAgroBrokerIA({
            operacionId: oferta.operacion_id,
            cantidadTn: cantidadTnControl,
          });

          console.log(
            "COMISIÓN AGROBROKERIA SINCRONIZADA EN MÓDULO ECONÓMICO:",
            {
              operacion_id: oferta.operacion_id,
              cantidad_tn: cantidadTnControl,
              comision_usd: comisionAgroBrokerIA,
            }
          );
        } catch (errorComisionEconomica) {
          console.error(
            "ERROR SINCRONIZANDO COMISIÓN EN MÓDULO ECONÓMICO:",
            errorComisionEconomica
          );

          alert(
            `La operación fue aceptada y el control comercial fue creado, pero no se pudo registrar la comisión en el módulo económico: ${
              errorComisionEconomica instanceof Error
                ? errorComisionEconomica.message
                : String(errorComisionEconomica)
            }`
          );

          return;
        }

      // =====================================================
      // 3. REGISTRAR PARTICIPANTES DE LA OPERACIÓN
      // =====================================================

      /*
       * VENDEDOR:
       * Es la empresa propietaria de la publicación.
       *
       * COMPRADOR:
       * Es la empresa que realizó la oferta.
       *
       * operacion_participantes utiliza empresas.id.
       */

      const {
        data: publicacionOperacion,
        error: errorPublicacionOperacion,
      } = await supabase
        .from("publicaciones")
        .select("id, empresa_id")
        .eq("id", oferta.publicacion_id)
        .maybeSingle();

      if (errorPublicacionOperacion) {
        console.error(
          "ERROR OBTENIENDO PUBLICACIÓN DE LA OPERACIÓN:",
          errorPublicacionOperacion
        );

        alert(
          `La oferta fue aceptada, pero no se pudo identificar el vendedor: ${errorPublicacionOperacion.message}`
        );

        return;
      }

      if (!publicacionOperacion?.empresa_id) {
        alert(
          "La oferta fue aceptada, pero la publicación no tiene una empresa vendedora válida."
        );

        return;
      }

      const compradorEmpresaId = ofertaDBEmpresaId(oferta);

      if (!compradorEmpresaId) {
        alert(
          "La oferta fue aceptada, pero no se pudo identificar la empresa compradora."
        );

        return;
      }

      if (
        publicacionOperacion.empresa_id ===
        compradorEmpresaId
      ) {
        alert(
          "La operación no puede continuar: comprador y vendedor pertenecen a la misma empresa."
        );

        return;
      }

      // -----------------------------------------------------
      // Verificar participantes existentes
      // -----------------------------------------------------

      const {
        data: participantesExistentes,
        error: errorParticipantesExistentes,
      } = await supabase
        .from("operacion_participantes")
        .select("id, empresa_id, rol")
        .eq("operacion_id", oferta.operacion_id);

      if (errorParticipantesExistentes) {
        console.error(
          "ERROR VERIFICANDO PARTICIPANTES:",
          errorParticipantesExistentes
        );

        alert(
          `La oferta fue aceptada, pero no se pudieron verificar los participantes: ${errorParticipantesExistentes.message}`
        );

        return;
      }

      const participantes =
        participantesExistentes ?? [];

      // -----------------------------------------------------
      // VENDEDOR
      // -----------------------------------------------------

      const vendedorExiste =
        participantes.some(
          (participante) =>
            participante.empresa_id ===
              publicacionOperacion.empresa_id &&
            participante.rol === "VENDEDOR"
        );

      if (!vendedorExiste) {
        const {
          error: errorVendedor,
        } = await supabase
          .from("operacion_participantes")
          .insert({
            operacion_id:
              oferta.operacion_id,
            empresa_id:
              publicacionOperacion.empresa_id,
            rol: "VENDEDOR",
            porcentaje_comision: null,
            monto_comision: null,
            factura_presentada: false,
            factura_aprobada: false,
          });

        if (errorVendedor) {
          console.error(
            "ERROR CREANDO PARTICIPANTE VENDEDOR:",
            errorVendedor
          );

          alert(
            `La oferta fue aceptada, pero no se pudo registrar el vendedor: ${errorVendedor.message}`
          );

          return;
        }
      }

      // -----------------------------------------------------
      // COMPRADOR
      // -----------------------------------------------------

      const compradorExiste =
        participantes.some(
          (participante) =>
            participante.empresa_id ===
              compradorEmpresaId &&
            participante.rol === "COMPRADOR"
        );

      if (!compradorExiste) {
        const {
          error: errorComprador,
        } = await supabase
          .from("operacion_participantes")
          .insert({
            operacion_id:
              oferta.operacion_id,
            empresa_id:
              compradorEmpresaId,
            rol: "COMPRADOR",
            porcentaje_comision: null,
            monto_comision: null,
            factura_presentada: false,
            factura_aprobada: false,
          });

        if (errorComprador) {
          console.error(
            "ERROR CREANDO PARTICIPANTE COMPRADOR:",
            errorComprador
          );

          alert(
            `La oferta fue aceptada, pero no se pudo registrar el comprador: ${errorComprador.message}`
          );

          return;
        }
      }

      console.log(
        "PARTICIPANTES REGISTRADOS CORRECTAMENTE:",
        {
          operacion_id:
            oferta.operacion_id,
          vendedor:
            publicacionOperacion.empresa_id,
          comprador:
            compradorEmpresaId,
        }
      );

      // =====================================================
      // 4. OBTENER WORKFLOW
      // =====================================================

      const { data: workflow, error: errorWorkflow } =
        await supabase
          .from("workflows")
          .select("id")
          .eq("nombre", "Operación de granos")
          .eq("activo", true)
          .limit(1)
          .maybeSingle();

      if (errorWorkflow) {
        console.error(
          "ERROR OBTENIENDO WORKFLOW:",
          errorWorkflow
        );

        alert(
          `La oferta fue aceptada, pero no se pudo obtener el workflow: ${errorWorkflow.message}`
        );

        return;
      }

      if (!workflow) {
        alert(
          "La oferta fue aceptada, pero no existe un workflow activo llamado 'Operación de granos'."
        );

        return;
      }

      // =====================================================
      // 4. OBTENER PRIMERA ETAPA
      // =====================================================

      const { data: primeraEtapa, error: errorEtapa } =
        await supabase
          .from("workflow_etapas")
          .select("id, orden, nombre")
          .eq("workflow_id", workflow.id)
          .eq("orden", 1)
          .limit(1)
          .maybeSingle();

      if (errorEtapa) {
        console.error(
          "ERROR OBTENIENDO ETAPA:",
          errorEtapa
        );

        alert(
          `La oferta fue aceptada, pero no se pudo obtener la primera etapa: ${errorEtapa.message}`
        );

        return;
      }

      if (!primeraEtapa) {
        alert(
          "La oferta fue aceptada, pero el workflow no tiene una etapa 1."
        );

        return;
      }

      // =====================================================
      // 5. VERIFICAR SI YA EXISTE WORKFLOW PARA LA OPERACIÓN
      // =====================================================

      const { data: workflowExistente, error: errorWorkflowExistente } =
        await supabase
          .from("operacion_workflow")
          .select("id")
          .eq("operacion_id", oferta.operacion_id)
          .limit(1)
          .maybeSingle();

      if (errorWorkflowExistente) {
        console.error(
          "ERROR VERIFICANDO WORKFLOW EXISTENTE:",
          errorWorkflowExistente
        );

        alert(
          `La oferta fue aceptada, pero no se pudo verificar el workflow de la operación: ${errorWorkflowExistente.message}`
        );

        return;
      }

      // =====================================================
      // 6. CREAR WORKFLOW SI NO EXISTE
      // =====================================================

      if (!workflowExistente) {
        const {
          data: nuevoWorkflow,
          error: errorNuevoWorkflow,
        } = await supabase
          .from("operacion_workflow")
          .insert({
            operacion_id: oferta.operacion_id,
            workflow_id: workflow.id,
            etapa_actual_id: primeraEtapa.id,
            estado: "EN_CURSO",
          })
          .select("id")
          .single();

        if (errorNuevoWorkflow) {
          console.error(
            "ERROR CREANDO OPERACION_WORKFLOW:",
            errorNuevoWorkflow
          );

          alert(
            `La oferta fue aceptada, pero no se pudo iniciar el workflow: ${errorNuevoWorkflow.message}`
          );

          return;
        }

        // =====================================================
        // 7. CREAR HISTORIAL
        // =====================================================

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error: errorHistorial } =
          await supabase
            .from("workflow_historial")
            .insert({
              operacion_workflow_id: nuevoWorkflow.id,
              etapa_id: primeraEtapa.id,
              fecha_inicio: new Date().toISOString(),
              usuario_id: user?.id ?? null,
              observaciones:
                "La oferta fue aceptada y se inició el workflow de la operación.",
            });

        if (errorHistorial) {
          console.error("ERROR CREANDO HISTORIAL:", {
            message: errorHistorial.message,
            details: errorHistorial.details,
            hint: errorHistorial.hint,
            code: errorHistorial.code,
          });

          alert(
            `La oferta fue aceptada y el workflow fue creado, pero no se pudo crear el historial.\n\n` +
            `Código: ${errorHistorial.code ?? "N/D"}\n` +
            `Mensaje: ${errorHistorial.message ?? "Sin mensaje"}\n` +
            `Detalles: ${errorHistorial.details ?? "Sin detalles"}`
          );

          return;
        }
      }

      console.log(
        "WORKFLOW INICIADO CORRECTAMENTE PARA LA OPERACIÓN:",
        oferta.operacion_id
      );
    }

    // =====================================================
    // NOTIFICACIÓN DE OFERTA ACEPTADA
    // =====================================================

    if (nuevoEstado === "ACEPTADA") {
      try {
        const empresaOferenteId = ofertaDBEmpresaId(oferta);

        if (empresaOferenteId) {
          const { data: usuariosEmpresa, error: errorUsuarios } =
            await supabase
              .from("company_users")
              .select("profile_id")
              .eq("company_id", empresaOferenteId)
              .eq("activo", true);

          if (errorUsuarios) {
            console.error(
              "ERROR OBTENIENDO USUARIOS DE LA EMPRESA OFERENTE:",
              errorUsuarios
            );
          } else {
            for (const usuario of usuariosEmpresa || []) {
              try {
                await crearNotificacion({
                  profileId: usuario.profile_id,
                  titulo: "🌾 Oferta aceptada",
                  mensaje:
                    `Tu oferta fue aceptada para la operación ${oferta.codigo_operacion}.`,
                  tipo: "OFERTA_ACEPTADA",
                  operacionId: oferta.operacion_id,
                  ofertaId: oferta.oferta_id,
                });
              } catch (errorNotificacion) {
                console.error(
                  "ERROR CREANDO NOTIFICACIÓN:",
                  errorNotificacion
                );
              }
            }
          }
        }
      } catch (errorNotificacion) {
        console.error(
          "ERROR PROCESANDO NOTIFICACIÓN DE OFERTA ACEPTADA:",
          errorNotificacion
        );
      }
    }

    // =====================================================
    // NOTIFICACIÓN DE OFERTA RECHAZADA
    // =====================================================

    if (nuevoEstado === "RECHAZADA") {
      try {
        const empresaOferenteId = ofertaDBEmpresaId(oferta);

        if (empresaOferenteId) {
          const { data: usuariosEmpresa, error: errorUsuarios } =
            await supabase
              .from("company_users")
              .select("profile_id")
              .eq("company_id", empresaOferenteId)
              .eq("activo", true);

          if (errorUsuarios) {
            console.error(
              "ERROR OBTENIENDO USUARIOS DE LA EMPRESA OFERENTE:",
              errorUsuarios
            );
          } else {
            for (const usuario of usuariosEmpresa || []) {
              try {
                await crearNotificacion({
                  profileId: usuario.profile_id,
                  titulo: "❌ Oferta rechazada",
                  mensaje:
                    `Tu oferta fue rechazada para la operación ${oferta.codigo_operacion}.`,
                  tipo: "OFERTA_RECHAZADA",
                  operacionId: oferta.operacion_id,
                  ofertaId: oferta.oferta_id,
                });
              } catch (errorNotificacion) {
                console.error(
                  "ERROR CREANDO NOTIFICACIÓN:",
                  errorNotificacion
                );
              }
            }
          }
        }
      } catch (errorNotificacion) {
        console.error(
          "ERROR PROCESANDO NOTIFICACIÓN DE OFERTA RECHAZADA:",
          errorNotificacion
        );
      }
    }

    // =====================================================
    // 8. ACTUALIZAR PANTALLA
    // =====================================================

    setOfertas((anteriores) =>
      anteriores.map((item) =>
        item.oferta_id === oferta.oferta_id
          ? {
              ...item,
              estado: nuevoEstado,
            }
          : item
      )
    );

    alert(
      nuevoEstado === "ACEPTADA"
        ? "Oferta aceptada correctamente. La operación pasó al workflow."
        : "Oferta rechazada correctamente."
    );
  }

  // =====================================================
  // FORMATO
  // =====================================================

  function formatoNumero(
    numero: number
  ) {
    return numero.toLocaleString(
      "es-AR",
      {
        maximumFractionDigits: 2,
      }
    );
  }

  function estadoTexto(
    estado: string
  ) {
    switch (estado) {
      case "ACEPTADA":
        return "Aceptada";

      case "RECHAZADA":
        return "Rechazada";

      case "PENDIENTE":
        return "Pendiente";

      default:
        return estado;
    }
  }

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          marginBottom: 30,
        }}
      >
        <h1
          style={{
            fontSize: 34,
            marginBottom: 8,
          }}
        >
          📩 Ofertas recibidas
        </h1>

        <p
          style={{
            color: "#666",
            margin: 0,
          }}
        >
          Ofertas realizadas sobre tus publicaciones.
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
          Cargando ofertas...
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

      {!loading &&
        !error &&
        ofertas.length === 0 && (
          <div
            style={{
              background: "white",
              padding: 50,
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 50,
                marginBottom: 15,
              }}
            >
              📭
            </div>

            <h2>
              No tenés ofertas recibidas.
            </h2>

            <p
              style={{
                color: "#666",
              }}
            >
              Cuando otro usuario haga una oferta
              sobre una de tus publicaciones,
              aparecerá aquí.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        ofertas.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {ofertas.map((oferta) => (
              <div
                key={oferta.oferta_id}
                style={{
                  background: "white",
                  borderRadius: 14,
                  padding: 25,
                  boxShadow:
                    "0 2px 10px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
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
                      🌾 Oferta recibida
                    </h2>

                    <div
                      style={{
                        color: "#666",
                      }}
                    >
                      Operación:{" "}
                      <strong>
                        {oferta.codigo_operacion}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      padding:
                        "8px 14px",
                      borderRadius: 20,
                      background:
                        oferta.estado ===
                        "ACEPTADA"
                          ? "#dcfce7"
                          : oferta.estado ===
                            "RECHAZADA"
                          ? "#fee2e2"
                          : "#fef3c7",
                      color:
                        oferta.estado ===
                        "ACEPTADA"
                          ? "#166534"
                          : oferta.estado ===
                            "RECHAZADA"
                          ? "#991b1b"
                          : "#92400e",
                      fontWeight: 600,
                    }}
                  >
                    {estadoTexto(
                      oferta.estado
                    )}
                  </div>
                </div>

                <hr
                  style={{
                    margin:
                      "20px 0",
                    border: 0,
                    borderTop:
                      "1px solid #eee",
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 15,
                  }}
                >
                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Producto
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {oferta.tipo}
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Cantidad ofrecida
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {formatoNumero(
                        oferta.cantidad_tn
                      )}{" "}
                      TN
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Precio ofrecido
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      USD{" "}
                      {formatoNumero(
                        oferta.precio_tn
                      )}{" "}
                      / TN
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Precio publicado
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      USD{" "}
                      {formatoNumero(
                        oferta.precio_publicado
                      )}{" "}
                      / TN
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Publicado
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {formatoNumero(
                        oferta.cantidad_publicada
                      )}{" "}
                      TN
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Ubicación
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {oferta.localidad ||
                        "-"}
                      {oferta.provincia
                        ? `, ${oferta.provincia}`
                        : ""}
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Puerto
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {oferta.puerto ||
                        "-"}
                    </div>
                  </div>

                  <div>
                    <small
                      style={{
                        color: "#777",
                      }}
                    >
                      Empresa
                    </small>

                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {oferta.empresa_publicante ||
                        "-"}
                    </div>
                  </div>
                </div>

                {oferta.observaciones && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: 15,
                      background:
                        "#f8fafc",
                      borderRadius: 10,
                    }}
                  >
                    <strong>
                      Observaciones:
                    </strong>

                    <div
                      style={{
                        marginTop: 5,
                        color: "#555",
                      }}
                    >
                      {
                        oferta.observaciones
                      }
                    </div>
                  </div>
                )}

                {oferta.estado ===
                  "PENDIENTE" && (
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 25,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() =>
                        cambiarEstado(
                          oferta,
                          "ACEPTADA"
                        )
                      }
                      style={{
                        padding:
                          "12px 20px",
                        border: 0,
                        borderRadius: 8,
                        background:
                          "#16a34a",
                        color: "white",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ✓ Aceptar oferta
                    </button>

                    <button
                      onClick={() =>
                        cambiarEstado(
                          oferta,
                          "RECHAZADA"
                        )
                      }
                      style={{
                        padding:
                          "12px 20px",
                        border: 0,
                        borderRadius: 8,
                        background:
                          "#dc2626",
                        color: "white",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ✕ Rechazar oferta
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </main>
  );
}
