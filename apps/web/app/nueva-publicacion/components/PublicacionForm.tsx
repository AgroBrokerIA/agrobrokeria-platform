"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { crearPublicacion } from "@/app/nueva-publicacion/services/publicaciones";
import { Publicacion } from "@/types/publicacion";

import {
  obtenerProductos,
  obtenerMonedas,
  obtenerIncoterms,
} from "../services/publicaciones";

type Producto = {
  id: number;
  codigo: string;
  nombre: string;
  categoria?: string;
  activo?: boolean;
};

type Moneda = {
  id: number;
  codigo: string;
  nombre: string;
  simbolo: string;
};

type Incoterm = {
  id: number;
  codigo: string;
  descripcion: string;
};

type Formulario = {
  tipo: string;
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

  const { data: companyUser, error: companyUserError } =
    await supabase
      .from("company_users")
      .select("company_id")
      .eq("profile_id", user.id)
      .eq("activo", true)
      .limit(1)
      .maybeSingle();

  if (companyUserError) {
    throw new Error(
      `No se pudo obtener la empresa del usuario: ${companyUserError.message}`
    );
  }

  if (!companyUser?.company_id) {
    throw new Error(
      "Tu usuario no tiene una empresa vinculada."
    );
  }

  const { data: company, error: companyError } =
    await supabase
      .from("companies")
      .select("id, cuit")
      .eq("id", companyUser.company_id)
      .single();

  if (companyError) {
    throw new Error(
      `No se pudo obtener la empresa: ${companyError.message}`
    );
  }

  if (!company?.cuit) {
    throw new Error(
      "La empresa del usuario no tiene CUIT registrado."
    );
  }

  const { data: empresa, error: empresaError } =
    await supabase
      .from("empresas")
      .select("id, nombre_comercial, razon_social, cuit")
      .eq("cuit", company.cuit)
      .eq("activa", true)
      .single();

  if (empresaError) {
    throw new Error(
      `No se pudo encontrar la empresa operativa: ${empresaError.message}`
    );
  }

  if (!empresa?.id) {
    throw new Error(
      "No se encontró una empresa operativa asociada al CUIT del usuario."
    );
  }

  return empresa.id;
}

export default function PublicationForm(props: any) {
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

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setCargando(true);
      setError("");

      const [
        productosResponse,
        monedasResponse,
        incotermsResponse,
      ] = await Promise.all([
        obtenerProductos(),
        obtenerMonedas(),
        obtenerIncoterms(),
      ]);

      const productosData =
        productosResponse?.data || [];

      const monedasData =
        monedasResponse?.data || [];

      const incotermsData =
        incotermsResponse?.data || [];

      setProductos(productosData);
      setMonedas(monedasData);
      setIncoterms(incotermsData);

      /*
       * VALORES PREDETERMINADOS
       *
       * Producto: MAÍZ
       * Moneda: USD
       * Incoterm: FOB
       */

      const maiz = productosData.find(
        (producto: Producto) =>
          producto.codigo === "MAIZ"
      );

      const usd = monedasData.find(
        (moneda: Moneda) =>
          moneda.codigo === "USD"
      );

      const fob = incotermsData.find(
        (incoterm: Incoterm) =>
          incoterm.codigo === "FOB"
      );

      setForm((anterior) => ({
        ...anterior,

        producto_id:
          maiz?.id ??
          anterior.producto_id,

        moneda_id:
          usd?.id ??
          anterior.moneda_id,

        incoterm_id:
          fob?.id ??
          anterior.incoterm_id,
      }));
    } catch (e) {
      console.error(e);

      setError(
        "No se pudieron cargar los datos del formulario."
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

  async function publicar(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMensaje("");
    setError("");

    /*
     * VALIDACIONES
     */

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

      /*
       * OBTENER EMPRESA REAL DEL USUARIO
       */

      const empresaId =
        await obtenerEmpresaDelUsuario();

      /*
       * DATOS QUE SE VAN A GUARDAR
       */

      const nuevaPublicacion: Publicacion = {
        empresa_id: empresaId,

        tipo: form.tipo as "VENTA" | "COMPRA",

        producto_id: form.producto_id,

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

        estado: "PUBLICADA",
      };

      console.log(
        "Datos a guardar:",
        nuevaPublicacion
      );

      const {
        data,
        error: errorInsertar,
      } = await crearPublicacion(nuevaPublicacion);

      if (errorInsertar) {
        console.error(
          "Error Supabase:",
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
       * LIMPIAR FORMULARIO
       */

      setForm({
        tipo: "VENTA",

        producto_id:
          productos.find(
            (p) => p.codigo === "MAIZ"
          )?.id || 1,

        cantidad_tn: "",

        precio_tn: "",

        moneda_id:
          monedas.find(
            (m) => m.codigo === "USD"
          )?.id || 2,

        incoterm_id:
          incoterms.find(
            (i) => i.codigo === "FOB"
          )?.id || 1,

        provincia: "",

        localidad: "",

        puerto: "",

        calidad: "",

        humedad: "",

        proteina: "",

        observaciones: "",
      });

      if (props?.onSuccess) {
        props.onSuccess(data);
      }
    } catch (e) {
      console.error(e);

      setError(
        "Ocurrió un error al crear la publicación."
      );
    } finally {
      setGuardando(false);
    }
  }

  /*
   * CARGANDO
   */

  if (cargando) {
    return (
      <div
        style={{
          background: "white",
          padding: 30,
          borderRadius: 12,
        }}
      >
        <p>
          Cargando formulario...
        </p>
      </div>
    );
  }

  /*
   * FORMULARIO
   */

  return (
    <form
      onSubmit={publicar}
      style={{
        background: "white",
        padding: 30,
        borderRadius: 12,
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 25,
          fontSize: 26,
        }}
      >
        Nueva Publicación
      </h2>

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
            "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 20,
        }}
      >
        {/* TIPO */}

        <div>
          <label>
            Tipo
          </label>

          <select
            value={form.tipo}
            onChange={(e) =>
              actualizarCampo(
                "tipo",
                e.target.value
              )
            }
            style={inputStyle}
          >
            <option value="VENTA">
              VENTA
            </option>

            <option value="COMPRA">
              COMPRA
            </option>
          </select>
        </div>

        {/* PRODUCTO */}

        <div>
          <label>
            Producto
          </label>

          <select
            value={form.producto_id}
            onChange={(e) =>
              actualizarCampo(
                "producto_id",
                Number(e.target.value)
              )
            }
            style={inputStyle}
          >
            {productos.map(
              (producto) => (
                <option
                  key={producto.id}
                  value={producto.id}
                >
                  {producto.nombre}
                </option>
              )
            )}
          </select>
        </div>

        {/* MONEDA */}

        <div>
          <label>
            Moneda
          </label>

          <select
            value={form.moneda_id}
            onChange={(e) =>
              actualizarCampo(
                "moneda_id",
                Number(e.target.value)
              )
            }
            style={inputStyle}
          >
            {monedas.map(
              (moneda) => (
                <option
                  key={moneda.id}
                  value={moneda.id}
                >
                  {moneda.codigo}
                </option>
              )
            )}
          </select>
        </div>

        {/* INCOTERM */}

        <div>
          <label>
            Incoterm
          </label>

          <select
            value={form.incoterm_id}
            onChange={(e) =>
              actualizarCampo(
                "incoterm_id",
                Number(e.target.value)
              )
            }
            style={inputStyle}
          >
            {incoterms.map(
              (incoterm) => (
                <option
                  key={incoterm.id}
                  value={incoterm.id}
                >
                  {incoterm.codigo}
                </option>
              )
            )}
          </select>
        </div>

        {/* CANTIDAD */}

        <div>
          <label>
            Cantidad (TN)
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.cantidad_tn}
            onChange={(e) =>
              actualizarCampo(
                "cantidad_tn",
                e.target.value
              )
            }
            placeholder="Ej: 25000"
            style={inputStyle}
          />
        </div>

        {/* PRECIO */}

        <div>
          <label>
            Precio por TN
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.precio_tn}
            onChange={(e) =>
              actualizarCampo(
                "precio_tn",
                e.target.value
              )
            }
            placeholder="Ej: 230"
            style={inputStyle}
          />
        </div>

        {/* PROVINCIA */}

        <div>
          <label>
            Provincia
          </label>

          <input
            type="text"
            value={form.provincia}
            onChange={(e) =>
              actualizarCampo(
                "provincia",
                e.target.value
              )
            }
            placeholder="Ej: Santa Fe"
            style={inputStyle}
          />
        </div>

        {/* LOCALIDAD */}

        <div>
          <label>
            Localidad
          </label>

          <input
            type="text"
            value={form.localidad}
            onChange={(e) =>
              actualizarCampo(
                "localidad",
                e.target.value
              )
            }
            placeholder="Ej: Rosario"
            style={inputStyle}
          />
        </div>

        {/* PUERTO */}

        <div>
          <label>
            Puerto
          </label>

          <input
            type="text"
            value={form.puerto}
            onChange={(e) =>
              actualizarCampo(
                "puerto",
                e.target.value
              )
            }
            placeholder="Ej: Puerto Rosario"
            style={inputStyle}
          />
        </div>

        {/* CALIDAD */}

        <div>
          <label>
            Calidad
          </label>

          <input
            type="text"
            value={form.calidad}
            onChange={(e) =>
              actualizarCampo(
                "calidad",
                e.target.value
              )
            }
            placeholder="Especificaciones de calidad"
            style={inputStyle}
          />
        </div>

        {/* HUMEDAD */}

        <div>
          <label>
            Humedad (%)
          </label>

          <input
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
            style={inputStyle}
          />
        </div>

        {/* PROTEINA */}

        <div>
          <label>
            Proteína (%)
          </label>

          <input
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
            style={inputStyle}
          />
        </div>
      </div>

      {/* OBSERVACIONES */}

      <div
        style={{
          marginTop: 20,
        }}
      >
        <label>
          Observaciones
        </label>

        <textarea
          value={form.observaciones}
          onChange={(e) =>
            actualizarCampo(
              "observaciones",
              e.target.value
            )
          }
          placeholder="Información adicional de la operación..."
          rows={5}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
        />
      </div>

      {/* BOTÓN */}

      <div
        style={{
          marginTop: 25,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="submit"
          disabled={guardando}
          style={{
            background: guardando
              ? "#86efac"
              : "#16a34a",
            color: "white",
            border: "none",
            padding: "14px 28px",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: guardando
              ? "not-allowed"
              : "pointer",
          }}
        >
          {guardando
            ? "Publicando..."
            : "🚀 Publicar"}
        </button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  marginTop: 7,
  border: "1px solid #d1d5db",
  borderRadius: 7,
  fontSize: 15,
  background: "white",
};