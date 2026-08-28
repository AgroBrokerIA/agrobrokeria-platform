"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  obtenerProductos,
  obtenerMonedas,
  obtenerIncoterms,
} from "@/app/nueva-publicacion/services/publicaciones";

import { supabase } from "@/lib/supabase/client";

import { Producto } from "@/types/producto";
import { Moneda } from "@/types/moneda";
import { Incoterm } from "@/types/incoterm";

const EMPRESA_DEMO_ID =
  "63ff29e0-a444-4d6a-a057-70aeffc89dfc";

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

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [publicacionId, setPublicacionId] =
    useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setCargando(true);
      setError("");

      const parametros =
        new URLSearchParams(
          window.location.search
        );

      const id =
        parametros.get("id");

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

      const maiz =
        productosData.find(
          (producto) =>
            producto.codigo === "MAIZ"
        );

      const usd =
        monedasData.find(
          (moneda) =>
            moneda.codigo === "USD"
        );

      const fob =
        incotermsData.find(
          (incoterm) =>
            incoterm.codigo === "FOB"
        );

      /*
       * NUEVA PUBLICACIÓN
       */

      if (!id) {
        setForm((anterior) => ({
          ...anterior,

          producto_id:
            maiz?.id ?? 1,

          moneda_id:
            usd?.id ?? 2,

          incoterm_id:
            fob?.id ?? 1,
        }));

        return;
      }

      /*
       * EDICIÓN
       */

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
        console.error(
          errorPublicacion
        );

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
          Number(
            publicacion.producto_id
          ),

        cantidad_tn:
          String(
            publicacion.cantidad_tn ?? ""
          ),

        precio_tn:
          String(
            publicacion.precio_tn ?? ""
          ),

        moneda_id:
          Number(
            publicacion.moneda_id
          ),

        incoterm_id:
          Number(
            publicacion.incoterm_id
          ),

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
            ? String(
                publicacion.humedad
              )
            : "",

        proteina:
          publicacion.proteina != null
            ? String(
                publicacion.proteina
              )
            : "",

        observaciones:
          publicacion.observaciones ?? "",
      });
    } catch (e) {
      console.error(e);

      setError(
        "No se pudieron cargar los datos."
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

    /*
     * VALIDACIONES
     */

    if (!form.producto_id) {
      setError(
        "Seleccioná un producto."
      );
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
      setError(
        "Ingresá la provincia."
      );
      return;
    }

    if (!form.localidad.trim()) {
      setError(
        "Ingresá la localidad."
      );
      return;
    }

    if (!form.puerto.trim()) {
      setError(
        "Ingresá el puerto."
      );
      return;
    }

    try {
      setGuardando(true);

      /*
       * DATOS A GUARDAR
       */

      const datos = {
        tipo: form.tipo,

        producto_id:
          form.producto_id,

        cantidad_tn:
          Number(form.cantidad_tn),

        precio_tn:
          Number(form.precio_tn),

        moneda_id:
          form.moneda_id,

        incoterm_id:
          form.incoterm_id,

        provincia:
          form.provincia.trim(),

        localidad:
          form.localidad.trim(),

        puerto:
          form.puerto.trim(),

        calidad:
          form.calidad.trim(),

        humedad:
          form.humedad
            ? Number(form.humedad)
            : null,

        proteina:
          form.proteina
            ? Number(form.proteina)
            : null,

        observaciones:
          form.observaciones.trim(),
      };

      /*
       * EDITAR
       */

      if (
        modoEdicion &&
        publicacionId
      ) {
        const {
          data,
          error:
            errorActualizacion,
        } = await supabase
          .from("publicaciones")
          .update(datos)
          .eq(
            "id",
            publicacionId
          )
          .select()
          .single();

        if (errorActualizacion) {
          console.error(
            errorActualizacion
          );

          setError(
            `No se pudieron guardar los cambios: ${errorActualizacion.message}`
          );

          return;
        }

        console.log(
          "Publicación actualizada:",
          data
        );

        setMensaje(
          "✅ Publicación actualizada correctamente."
        );

        setTimeout(() => {
          router.push(
            "/mis-publicaciones"
          );
        }, 700);

        return;
      }

      /*
       * CREAR NUEVA
       */

      const nuevaPublicacion = {
        empresa_id:
          EMPRESA_DEMO_ID,

        ...datos,

        estado:
          "PUBLICADA",
      };

      const {
        data,
        error:
          errorInsertar,
      } = await supabase
        .from("publicaciones")
        .insert(
          nuevaPublicacion
        )
        .select()
        .single();

      if (errorInsertar) {
        console.error(
          errorInsertar
        );

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

      /*
       * LIMPIAR
       */

      setForm({
        tipo: "VENTA",

        producto_id:
          productos.find(
            (p) =>
              p.codigo === "MAIZ"
          )?.id ?? 1,

        cantidad_tn: "",

        precio_tn: "",

        moneda_id:
          monedas.find(
            (m) =>
              m.codigo === "USD"
          )?.id ?? 2,

        incoterm_id:
          incoterms.find(
            (i) =>
              i.codigo === "FOB"
          )?.id ?? 1,

        provincia: "",
        localidad: "",
        puerto: "",
        calidad: "",
        humedad: "",
        proteina: "",
        observaciones: "",
      });
    } catch (e) {
      console.error(e);

      setError(
        "Ocurrió un error al guardar la publicación."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 30,
        }}
      >
        <p>
          Cargando formulario...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={guardar}
      style={{
        background: "white",
        borderRadius: 12,
        padding: 30,
        boxShadow:
          "0 5px 15px rgba(0,0,0,.08)",
      }}
    >
      <h1
        style={{
          fontSize: 34,
          marginBottom: 30,
        }}
      >
        {modoEdicion
          ? "✏️ Editar Publicación"
          : "🌾 Nueva Publicación"}
      </h1>

      {modoEdicion && (
        <div
          style={{
            background: "#eff6ff",
            color: "#1e40af",
            padding: 14,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          Estás editando una
          publicación existente.
        </div>
      )}

      {mensaje && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 14,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {mensaje}
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 14,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 20,
        }}
      >
        <div>
          <label>Tipo</label>

          <select
            className="input"
            value={form.tipo}
            onChange={(e) =>
              actualizarCampo(
                "tipo",
                e.target.value
              )
            }
          >
            <option value="VENTA">
              VENTA
            </option>

            <option value="COMPRA">
              COMPRA
            </option>
          </select>
        </div>

        <div>
          <label>Producto</label>

          <select
            className="input"
            value={form.producto_id}
            onChange={(e) =>
              actualizarCampo(
                "producto_id",
                Number(
                  e.target.value
                )
              )
            }
          >
            {productos.map((p) => (
              <option
                key={p.id}
                value={p.id}
              >
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Moneda</label>

          <select
            className="input"
            value={form.moneda_id}
            onChange={(e) =>
              actualizarCampo(
                "moneda_id",
                Number(
                  e.target.value
                )
              )
            }
          >
            {monedas.map((m) => (
              <option
                key={m.id}
                value={m.id}
              >
                {m.codigo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Incoterm</label>

          <select
            className="input"
            value={form.incoterm_id}
            onChange={(e) =>
              actualizarCampo(
                "incoterm_id",
                Number(
                  e.target.value
                )
              )
            }
          >
            {incoterms.map((i) => (
              <option
                key={i.id}
                value={i.id}
              >
                {i.codigo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>
            Cantidad (TN)
          </label>

          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={
              form.cantidad_tn
            }
            onChange={(e) =>
              actualizarCampo(
                "cantidad_tn",
                e.target.value
              )
            }
            placeholder="Ej: 25000"
          />
        </div>

        <div>
          <label>
            Precio por TN
          </label>

          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={
              form.precio_tn
            }
            onChange={(e) =>
              actualizarCampo(
                "precio_tn",
                e.target.value
              )
            }
            placeholder="Ej: 230"
          />
        </div>

        <div>
          <label>
            Provincia
          </label>

          <input
            className="input"
            value={
              form.provincia
            }
            onChange={(e) =>
              actualizarCampo(
                "provincia",
                e.target.value
              )
            }
            placeholder="Ej: Santa Fe"
          />
        </div>

        <div>
          <label>
            Localidad
          </label>

          <input
            className="input"
            value={
              form.localidad
            }
            onChange={(e) =>
              actualizarCampo(
                "localidad",
                e.target.value
              )
            }
            placeholder="Ej: Rosario"
          />
        </div>

        <div>
          <label>
            Puerto
          </label>

          <input
            className="input"
            value={form.puerto}
            onChange={(e) =>
              actualizarCampo(
                "puerto",
                e.target.value
              )
            }
            placeholder="Ej: Puerto Rosario"
          />
        </div>

        <div>
          <label>
            Calidad
          </label>

          <input
            className="input"
            value={form.calidad}
            onChange={(e) =>
              actualizarCampo(
                "calidad",
                e.target.value
              )
            }
            placeholder="Especificaciones de calidad"
          />
        </div>

        <div>
          <label>
            Humedad (%)
          </label>

          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={form.humedad}
            onChange={(e) =>
              actualizarCampo(
                "humedad",
                e.target.value
              )
            }
            placeholder="Ej: 14"
          />
        </div>

        <div>
          <label>
            Proteína (%)
          </label>

          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={form.proteina}
            onChange={(e) =>
              actualizarCampo(
                "proteina",
                e.target.value
              )
            }
            placeholder="Ej: 11"
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
        }}
      >
        <label>
          Observaciones
        </label>

        <textarea
          className="input"
          rows={5}
          value={
            form.observaciones
          }
          onChange={(e) =>
            actualizarCampo(
              "observaciones",
              e.target.value
            )
          }
          placeholder="Información adicional..."
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "flex-end",
          gap: 12,
          marginTop: 25,
        }}
      >
        {modoEdicion && (
          <button
            type="button"
            onClick={() =>
              router.push(
                "/mis-publicaciones"
              )
            }
            style={{
              background: "#e5e7eb",
              color: "#111827",
              border: "none",
              padding:
                "14px 24px",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={guardando}
          style={{
            background: guardando
              ? "#86efac"
              : "#16a34a",
            color: "white",
            border: "none",
            padding:
              "14px 28px",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: guardando
              ? "not-allowed"
              : "pointer",
          }}
        >
          {guardando
            ? "Guardando..."
            : modoEdicion
            ? "💾 Guardar cambios"
            : "🚀 Publicar"}
        </button>
      </div>
    </form>
  );
}