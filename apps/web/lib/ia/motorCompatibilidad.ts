import { notificarOportunidadIA } from "@/lib/ia/notificarOportunidad";
import { supabase } from "@/lib/supabase/client";

type Publicacion = {
  id: string;
  empresa_id: string;
  tipo: string;
  producto_id: number;
  cantidad_tn: number;
  precio_tn: number;
  moneda_id: number;
  incoterm_id?: number | null;
  provincia?: string | null;
  localidad?: string | null;
  puerto?: string | null;
};

type Candidato = {
  empresa_id: string;
  cantidad_minima?: number | null;
  cantidad_maxima?: number | null;
  precio_objetivo?: number | null;
  moneda_id?: number | null;
  provincia?: string | null;
  localidad?: string | null;
  puerto?: string | null;
  prioridad?: number | null;
  volumen_minimo?: number | null;
  volumen_maximo?: number | null;
};

export type ResultadoCompatibilidad = {
  empresa_id: string;
  puntaje_total: number;
  puntaje_producto: number;
  puntaje_zona: number;
  puntaje_cantidad: number;
  puntaje_precio: number;
  puntaje_historial: number;
  puntaje_documentacion: number;
  recomendada: boolean;
};

function normalizar(valor: unknown): string {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function coincideTexto(
  a?: string | null,
  b?: string | null
): boolean {
  const na = normalizar(a);
  const nb = normalizar(b);

  if (!na || !nb) return false;

  return na === nb || na.includes(nb) || nb.includes(na);
}

function calcularCantidad(
  cantidad: number,
  minimo?: number | null,
  maximo?: number | null
): number {
  if (!minimo && !maximo) return 70;

  if (minimo && cantidad < minimo) return 30;

  if (maximo && cantidad > maximo) return 50;

  return 100;
}

function calcularPrecio(
  precio: number,
  objetivo?: number | null
): number {
  if (!objetivo || objetivo <= 0) return 70;

  const diferencia =
    Math.abs(precio - objetivo) / objetivo;

  if (diferencia <= 0.02) return 100;
  if (diferencia <= 0.05) return 85;
  if (diferencia <= 0.10) return 65;
  if (diferencia <= 0.20) return 40;

  return 20;
}

function calcularZona(
  publicacion: Publicacion,
  candidato: Candidato
): number {
  let evaluables = 0;
  let coincidencias = 0;

  if (candidato.provincia) {
    evaluables++;

    if (
      coincideTexto(
        publicacion.provincia,
        candidato.provincia
      )
    ) {
      coincidencias++;
    }
  }

  if (candidato.localidad) {
    evaluables++;

    if (
      coincideTexto(
        publicacion.localidad,
        candidato.localidad
      )
    ) {
      coincidencias++;
    }
  }

  if (candidato.puerto) {
    evaluables++;

    if (
      coincideTexto(
        publicacion.puerto,
        candidato.puerto
      )
    ) {
      coincidencias++;
    }
  }

  if (!evaluables) return 70;

  return Math.round(
    (coincidencias / evaluables) * 100
  );
}

function calcularTotal(
  producto: number,
  zona: number,
  cantidad: number,
  precio: number,
  historial: number,
  documentacion: number
): number {
  return Math.round(
    producto * 0.30 +
      zona * 0.15 +
      cantidad * 0.20 +
      precio * 0.20 +
      historial * 0.10 +
      documentacion * 0.05
  );
}

async function obtenerHistorial(
  empresaId: string
): Promise<number> {
  const { data: compras } = await supabase
    .from("publicaciones")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("tipo", "COMPRA");

  const { data: ventas } = await supabase
    .from("publicaciones")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("tipo", "VENTA");

  const ids = [
    ...(compras ?? []).map((x) => x.id),
    ...(ventas ?? []).map((x) => x.id),
  ];

  if (ids.length === 0) return 50;

  const { count, error } = await supabase
    .from("operaciones")
    .select("id", {
      count: "exact",
      head: true,
    })
    .or(
      `publicacion_compra_id.in.(${ids.join(",")}),publicacion_venta_id.in.(${ids.join(",")})`
    );

  if (error || !count) return 50;

  if (count >= 20) return 100;
  if (count >= 10) return 90;
  if (count >= 5) return 80;

  return 70;
}

async function obtenerDocumentacion(
  empresaId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("empresas_verificaciones")
    .select("id")
    .eq("empresa_id", empresaId)
    .limit(1);

  if (error) return 50;

  return data && data.length > 0 ? 100 : 50;
}

async function obtenerCandidatos(
  publicacion: Publicacion
): Promise<Candidato[]> {
  const candidatos: Candidato[] = [];

  const { data: intereses } = await supabase
    .from("intereses_comerciales")
    .select(
      `
      empresa_id,
      cantidad_minima,
      cantidad_maxima,
      precio_objetivo,
      moneda_id,
      provincia,
      localidad,
      puerto,
      prioridad
      `
    )
    .eq("producto_id", publicacion.producto_id)
    .eq("activo", true);

  for (const interes of intereses ?? []) {
    if (interes.empresa_id === publicacion.empresa_id) {
      continue;
    }

    candidatos.push({
      empresa_id: interes.empresa_id,
      cantidad_minima: interes.cantidad_minima,
      cantidad_maxima: interes.cantidad_maxima,
      precio_objetivo: interes.precio_objetivo,
      moneda_id: interes.moneda_id,
      provincia: interes.provincia,
      localidad: interes.localidad,
      puerto: interes.puerto,
      prioridad: interes.prioridad,
    });
  }

  const { data: productos } = await supabase
    .from("empresas_productos")
    .select(
      `
      empresa_id,
      compra,
      venta,
      volumen_minimo,
      volumen_maximo,
      prioridad
      `
    )
    .eq("producto_id", publicacion.producto_id);

  for (const producto of productos ?? []) {
    if (producto.empresa_id === publicacion.empresa_id) {
      continue;
    }

    const tipo = normalizar(publicacion.tipo);

    const compatible =
      tipo === "venta"
        ? producto.compra === true
        : producto.venta === true;

    if (!compatible) continue;

    candidatos.push({
      empresa_id: producto.empresa_id,
      volumen_minimo: producto.volumen_minimo,
      volumen_maximo: producto.volumen_maximo,
      prioridad: producto.prioridad,
    });
  }

  const unificados = new Map<string, Candidato>();

  for (const candidato of candidatos) {
    const anterior = unificados.get(
      candidato.empresa_id
    );

    if (!anterior) {
      unificados.set(
        candidato.empresa_id,
        candidato
      );
      continue;
    }

    unificados.set(candidato.empresa_id, {
      ...anterior,
      cantidad_minima:
        candidato.cantidad_minima ??
        anterior.cantidad_minima,
      cantidad_maxima:
        candidato.cantidad_maxima ??
        anterior.cantidad_maxima,
      precio_objetivo:
        candidato.precio_objetivo ??
        anterior.precio_objetivo,
      moneda_id:
        candidato.moneda_id ??
        anterior.moneda_id,
      provincia:
        candidato.provincia ??
        anterior.provincia,
      localidad:
        candidato.localidad ??
        anterior.localidad,
      puerto:
        candidato.puerto ??
        anterior.puerto,
      prioridad: Math.max(
        candidato.prioridad ?? 0,
        anterior.prioridad ?? 0
      ),
    });
  }

  return Array.from(
    unificados.values()
  );
}

export async function procesarPublicacionConIA(
  publicacionId: string
): Promise<ResultadoCompatibilidad[]> {
  const { data: publicacion, error } =
    await supabase
      .from("publicaciones")
      .select(
        `
        id,
        empresa_id,
        tipo,
        producto_id,
        cantidad_tn,
        precio_tn,
        moneda_id,
        incoterm_id,
        provincia,
        localidad,
        puerto
        `
      )
      .eq("id", publicacionId)
      .single();

  if (error || !publicacion) {
    throw new Error(
      error?.message ??
        "No se encontró la publicación."
    );
  }

  const candidatos =
    await obtenerCandidatos(publicacion);

  const resultados: ResultadoCompatibilidad[] = [];

  for (const candidato of candidatos) {
    const puntajeProducto = 100;

    const puntajeCantidad =
      calcularCantidad(
        Number(publicacion.cantidad_tn),
        candidato.cantidad_minima ??
          candidato.volumen_minimo,
        candidato.cantidad_maxima ??
          candidato.volumen_maximo
      );

    const mismaMoneda =
      candidato.moneda_id == null ||
      Number(candidato.moneda_id) ===
        Number(publicacion.moneda_id);

    const puntajePrecio = mismaMoneda
      ? calcularPrecio(
          Number(publicacion.precio_tn),
          candidato.precio_objetivo
        )
      : 20;

    const puntajeZona =
      calcularZona(
        publicacion,
        candidato
      );

    const puntajeHistorial =
      await obtenerHistorial(
        candidato.empresa_id
      );

    const puntajeDocumentacion =
      await obtenerDocumentacion(
        candidato.empresa_id
      );

    const puntajeTotal =
      calcularTotal(
        puntajeProducto,
        puntajeZona,
        puntajeCantidad,
        puntajePrecio,
        puntajeHistorial,
        puntajeDocumentacion
      );

    const resultado: ResultadoCompatibilidad = {
      empresa_id: candidato.empresa_id,
      puntaje_total: puntajeTotal,
      puntaje_producto: puntajeProducto,
      puntaje_zona: puntajeZona,
      puntaje_cantidad: puntajeCantidad,
      puntaje_precio: puntajePrecio,
      puntaje_historial: puntajeHistorial,
      puntaje_documentacion:
        puntajeDocumentacion,
      recomendada: puntajeTotal >= 80,
    };

    resultados.push(resultado);

    const { error: compatibilidadError } =
      await supabase.rpc(
        "guardar_compatibilidad_ia",
        {
          p_publicacion_id:
            publicacion.id,
          p_empresa_id:
            candidato.empresa_id,
          p_puntaje_total:
            resultado.puntaje_total,
          p_puntaje_producto:
            resultado.puntaje_producto,
          p_puntaje_zona:
            resultado.puntaje_zona,
          p_puntaje_cantidad:
            resultado.puntaje_cantidad,
          p_puntaje_precio:
            resultado.puntaje_precio,
          p_puntaje_historial:
            resultado.puntaje_historial,
          p_puntaje_documentacion:
            resultado.puntaje_documentacion,
          p_recomendada:
            resultado.recomendada,
        }
      );

    if (compatibilidadError) {
      throw new Error(
        `No se pudo guardar la compatibilidad IA: ${compatibilidadError.message}`
      );
    }

    if (resultado.recomendada) {
      const { error: oportunidadError } =
        await supabase.rpc(
          "crear_oportunidad_ia",
          {
            p_publicacion_id:
              publicacion.id,
            p_empresa_id:
              candidato.empresa_id,
            p_indice_compatibilidad:
              resultado.puntaje_total,
          }
        );

      if (oportunidadError) {
        throw new Error(
          `No se pudo crear la oportunidad IA: ${oportunidadError.message}`
        );
      }

      await notificarOportunidadIA(
        candidato.empresa_id,
        publicacion.id,
        resultado.puntaje_total
      );
    }
  }

  return resultados.sort(
    (a, b) =>
      b.puntaje_total -
      a.puntaje_total
  );
}
