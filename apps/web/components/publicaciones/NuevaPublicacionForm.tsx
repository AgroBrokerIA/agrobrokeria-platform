"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  obtenerProductos,
  obtenerMonedas,
  obtenerIncoterms,
} from "@/app/nueva-publicacion/services/publicaciones";

import { supabase } from "@/lib/supabase/client";
import { crearPublicacion, actualizarPublicacion } from "@/app/nueva-publicacion/services/publicaciones";
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

  if (error) {
    throw new Error(
      `No se pudo obtener la empresa: ${error.message}`
    );
  }

  if (!data?.id) {
    throw new Error(
      "Tu usuario no tiene una empresa activa vinculada."
    );
  }

  return data.id;
}

export default function NuevaPublicacionForm() {
  const router = useRouter();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [incoterms, setIncoterms] = useState<Incoterm[]>([]);

  const [form, setForm] = useState<Formulario>({
    tipo: "VENTA",
    producto_id: 1,
    cantidad_tn: "",
    precio_tn: "",
    moneda_id: 2,
    incoterm_id: 1,
    provincia: "",
    localidad: "",
    puerto: "",
    calidad: "",
    humedad: "",
    proteina: "",
    observaciones: "",
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [modoEdicion, setModoEdicion] = useState(false);
  const [publicacionId, setPublicacionId] =
    useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setCargando(true);
      setError("");

      const parametros = new URLSearchParams(
        window.location.search
      );

      const id = parametros.get("id");

      if (id) {
        setModoEdicion(true);
        setPublicacionId(id);
      }

      const [p, m, i] = await Promise.all([
        obtenerProductos(),
        obtenerMonedas(),
        obtenerIncoterms(),
      ]);

      const productosData =
        (p.data as Producto[]) ?? [];

      const monedasData =
        (m.data as Moneda[]) ?? [];

      const incotermsData =
        (i.data as Incoterm[]) ?? [];

      setProductos(productosData);
      setMonedas(monedasData);
      setIncoterms(incotermsData);

      const maiz = productosData.find(
        (producto) => producto.codigo === "MAIZ"
      );

      const usd = monedasData.find(
        (moneda) => moneda.codigo === "USD"
      );

      const fob = incotermsData.find(
        (incoterm) => incoterm.codigo === "FOB"
      );

      if (!id) {
        setForm((anterior) => ({
          ...anterior,
          producto_id: maiz?.id ?? 1,
          moneda_id: usd?.id ?? 2,
          incoterm_id: fob?.id ?? 1,
        }));

        return;
      }

      const {
        data: publicacion,
        error: errorPublicacion,
      } = await supabase
        .from("publicaciones")
        .select(`
          id,
          tipo,
          producto_id,
          cantidad_tn,
          precio_tn,
          moneda_id,
          incoterm_id,
          provincia,
          localidad,
          puerto,
          calidad,
          humedad,
          proteina,
          observaciones
        `)
        .eq("id", id)
        .single();

      if (errorPublicacion) {
        setError(
          `No se pudo cargar la publicación: ${errorPublicacion.message}`
        );
        return;
      }

      if (!publicacion) {
        setError(
          "No se encontró la publicación."
        );
        return;
      }

      setForm({
        tipo:
          publicacion.tipo === "COMPRA"
            ? "COMPRA"
            : "VENTA",

        producto_id:
          Number(publicacion.producto_id),

        cantidad_tn:
          String(publicacion.cantidad_tn ?? ""),

        precio_tn:
          String(publicacion.precio_tn ?? ""),

        moneda_id:
          Number(publicacion.moneda_id),

        incoterm_id:
          Number(publicacion.incoterm_id),

        provincia:
          publicacion.provincia ?? "",

        localidad:
          publicacion.localidad ?? "",

        puerto:
          publicacion.puerto ?? "",

        calidad:
          publicacion.calidad ?? "",

        humedad:
          publicacion.humedad != null
            ? String(publicacion.humedad)
            : "",

        proteina:
          publicacion.proteina != null
            ? String(publicacion.proteina)
            : "",

        observaciones:
          publicacion.observaciones ?? "",
      });
    } catch (e) {
      console.error(e);

      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron cargar los datos."
      );
    } finally {
      setCargando(false);
    }
  }

  function actualizarCampo(
    campo: keyof Formulario,
    valor: string | number
  ) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function guardar(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMensaje("");
    setError("");

    if (!form.producto_id) {
      setError("Seleccioná un producto.");
      return;
    }

    if (
      !form.cantidad_tn ||
      Number(form.cantidad_tn) <= 0
    ) {
      setError(
        "Ingresá una cantidad válida en toneladas."
      );
      return;
    }

    if (
      !form.precio_tn ||
      Number(form.precio_tn) <= 0
    ) {
      setError(
        "Ingresá un precio válido por tonelada."
      );
      return;
    }

    if (!form.provincia.trim()) {
      setError("Ingresá la provincia.");
      return;
    }

    if (!form.localidad.trim()) {
      setError("Ingresá la localidad.");
      return;
    }

    if (!form.puerto.trim()) {
      setError("Ingresá el puerto.");
      return;
    }

    try {
      setGuardando(true);

      const datos = {
        tipo: form.tipo,
        producto_id: form.producto_id,
        cantidad_tn: Number(form.cantidad_tn),
        precio_tn: Number(form.precio_tn),
        moneda_id: form.moneda_id,
        incoterm_id: form.incoterm_id,
        provincia: form.provincia.trim(),
        localidad: form.localidad.trim(),
        puerto: form.puerto.trim(),
        calidad: form.calidad.trim(),
        humedad: form.humedad
          ? Number(form.humedad)
          : null,
        proteina: form.proteina
          ? Number(form.proteina)
          : null,
        observaciones: form.observaciones.trim(),
      };

      /*
       * EDITAR PUBLICACIÓN
       */

      if (modoEdicion && publicacionId) {
        const { data, error: errorActualizacion } = await actualizarPublicacion(publicacionId, datos);
        if (errorActualizacion) {
          setError(`No se pudieron guardar los cambios: ${errorActualizacion.message}`);
          return;
        }
        setMensaje("✅ Publicación actualizada correctamente.");
        setTimeout(() => router.push("/mis-publicaciones"), 700);
        return;
      }

      /*
       * CREAR NUEVA PUBLICACIÓN
       *
       * Se obtiene la empresa REAL vinculada
       * al usuario autenticado.
       */

      const empresaId =
        await obtenerEmpresaDelUsuario();

      console.log(
        "Empresa utilizada para publicar:",
        empresaId
      );

      const nuevaPublicacion: Publicacion = {
        empresa_id: empresaId,
        ...datos,
        estado: "PUBLICADA",
      };

      console.log(
        "Datos de nueva publicación:",
        nuevaPublicacion
      );

      const {
        data,
        error: errorInsertar,
      } = await crearPublicacion(nuevaPublicacion);

      if (errorInsertar) {
        console.error(errorInsertar);

        setError(
          `No se pudo publicar: ${errorInsertar.message}`
        );

        return;
      }

      console.log(
        "Publicación creada:",
        data
      );

      setMensaje(
        "✅ Publicación creada correctamente."
      );

      setForm({
        tipo: "VENTA",
        producto_id:
          productos.find(
            (p) => p.codigo === "MAIZ"
          )?.id ?? 1,
        cantidad_tn: "",
        precio_tn: "",
        moneda_id:
          monedas.find(
            (m) => m.codigo === "USD"
          )?.id ?? 2,
        incoterm_id:
          incoterms.find(
            (i) => i.codigo === "FOB"
          )?.id ?? 1,
        provincia: "",
        localidad: "",
        puerto: "",
        calidad: "",
        humedad: "",
        proteina: "",
        observaciones: "",
      });

      setTimeout(() => {
        router.push("/mis-publicaciones");
      }, 700);
    } catch (e) {
      console.error(e);

      setError(
        e instanceof Error
          ? e.message
          : "Ocurrió un error al publicar."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div style={{ padding: 20 }}>
        Cargando formulario...
      </div>
    );
  }

  return (
    <form
      onSubmit={guardar}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <h1>Nueva publicación</h1>

      {mensaje && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#dcfce7",
            color: "#166534",
          }}
        >
          {mensaje}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      <label>
        Tipo
        <select
          value={form.tipo}
          onChange={(e) =>
            actualizarCampo(
              "tipo",
              e.target.value as
                | "VENTA"
                | "COMPRA"
            )
          }
        >
          <option value="VENTA">Venta</option>
          <option value="COMPRA">Compra</option>
        </select>
      </label>

      <label>
        Producto
        <select
          value={form.producto_id}
          onChange={(e) =>
            actualizarCampo(
              "producto_id",
              Number(e.target.value)
            )
          }
        >
          {productos.map((producto) => (
            <option
              key={producto.id}
              value={producto.id}
            >
              {producto.nombre}
            </option>
          ))}
        </select>
      </label>

      <label>
        Cantidad (TN)
        <input
          type="number"
          value={form.cantidad_tn}
          onChange={(e) =>
            actualizarCampo(
              "cantidad_tn",
              e.target.value
            )
          }
        />
      </label>

      <label>
        Precio por TN
        <input
          type="number"
          value={form.precio_tn}
          onChange={(e) =>
            actualizarCampo(
              "precio_tn",
              e.target.value
            )
          }
        />
      </label>

      <label>
        Moneda
        <select
          value={form.moneda_id}
          onChange={(e) =>
            actualizarCampo(
              "moneda_id",
              Number(e.target.value)
            )
          }
        >
          {monedas.map((moneda) => (
            <option
              key={moneda.id}
              value={moneda.id}
            >
              {moneda.codigo} -{" "}
              {moneda.nombre}
            </option>
          ))}
        </select>
      </label>

      <label>
        Incoterm
        <select
          value={form.incoterm_id}
          onChange={(e) =>
            actualizarCampo(
              "incoterm_id",
              Number(e.target.value)
            )
          }
        >
          {incoterms.map((incoterm) => (
            <option
              key={incoterm.id}
              value={incoterm.id}
            >
              {incoterm.codigo} -{" "}
              {incoterm.descripcion}
            </option>
          ))}
        </select>
      </label>

      <label>
        Provincia
        <input
          value={form.provincia}
          onChange={(e) =>
            actualizarCampo(
              "provincia",
              e.target.value
            )
          }
        />
      </label>

      <label>
        Localidad
        <input
          value={form.localidad}
          onChange={(e) =>
            actualizarCampo(
              "localidad",
              e.target.value
            )
          }
        />
      </label>

      <label>
        Puerto
        <input
          value={form.puerto}
          onChange={(e) =>
            actualizarCampo(
              "puerto",
              e.target.value
            )
          }
        />
      </label>

      <label>
        Calidad
        <input
          value={form.calidad}
          onChange={(e) =>
            actualizarCampo(
              "calidad",
              e.target.value
            )
          }
        />
      </label>

      <label>
        Humedad
        <input
          type="number"
          value={form.humedad}
          onChange={(e) =>
            actualizarCampo(
              "humedad",
              e.target.value
            )
          }
        />
      </label>

      <label>
        Proteína
        <input
          type="number"
          value={form.proteina}
          onChange={(e) =>
            actualizarCampo(
              "proteina",
              e.target.value
            )
          }
        />
      </label>

      <label>
        Observaciones
        <textarea
          value={form.observaciones}
          onChange={(e) =>
            actualizarCampo(
              "observaciones",
              e.target.value
            )
          }
        />
      </label>

      <button
        type="submit"
        disabled={guardando}
        style={{
          padding: 14,
          borderRadius: 8,
          border: "none",
          cursor: guardando
            ? "wait"
            : "pointer",
          background: "#16a34a",
          color: "white",
          fontSize: 16,
        }}
      >
        {guardando
          ? "Guardando..."
          : modoEdicion
          ? "Guardar cambios"
          : "Publicar"}
      </button>
    </form>
  );
}
