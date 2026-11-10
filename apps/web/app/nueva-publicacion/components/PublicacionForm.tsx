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
  categoria?: string | null;
  activo?: boolean | null;
};

type Moneda = {
  id: number;
  codigo: string | null;
  nombre: string | null;
  simbolo: string | null;
};

type Incoterm = {
  id: number;
  codigo: string | null;
  descripcion: string | null;
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
  representado_razon_social: string;
  representado_cuit: string;
  representado_sisa_categoria: string;
};

async function obtenerContextoDelUsuario() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("No hay un usuario autenticado.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("active_company_id,tipo_usuario").eq("id", user.id).single();
  if (profileError || !profile) throw new Error("No se pudo determinar el perfil del usuario.");

  const role = String(profile.tipo_usuario || "").toLowerCase();
  const roleIntermediary = ["intermediario","comisionista","corredor"].some(x => role.includes(x));

  if (!profile.active_company_id) {
    if (roleIntermediary) return { empresaId: null, intermediarioEmpresaId: null, isIntermediary: true };
    throw new Error("Tu usuario no tiene una empresa vinculada.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_users").select("company_id").eq("company_id", profile.active_company_id)
    .eq("profile_id", user.id).eq("activo", true).maybeSingle();
  if (membershipError || !membership) throw new Error("No se verificó tu vínculo activo con la empresa.");

  const { data: mapping, error: mappingError } = await supabase
    .from("company_empresa_map").select("empresa_id,verified")
    .eq("company_id", profile.active_company_id).eq("verified", true).maybeSingle();
  if (mappingError) throw new Error("No se pudo validar el legajo empresarial.");
  if (!mapping?.empresa_id) {
    if (roleIntermediary) return { empresaId: null, intermediarioEmpresaId: null, isIntermediary: true };
    throw new Error("La empresa todavía no tiene una vinculación operativa verificada.");
  }

  const { data: empresa, error: empresaError } = await supabase
    .from("empresas").select("id,tipo_empresa,tipo_operador,activa")
    .eq("id", mapping.empresa_id).maybeSingle();
  if (empresaError || !empresa || !empresa.activa) throw new Error("El legajo empresarial no está activo.");

  const operatorType = String(empresa.tipo_operador || empresa.tipo_empresa || "").toLowerCase();
  const isIntermediary = roleIntermediary ||
    ["broker","intermediario","comisionista_intermediario","corredor_oficial"].some(x => operatorType.includes(x));

  if (isIntermediary) {
    if (!["broker","intermediario","comisionista_intermediario","corredor_oficial"].some(x => operatorType.includes(x))) {
      throw new Error("El legajo de tu empresa no está catalogado como corredor o intermediario.");
    }
    return { empresaId: null, intermediarioEmpresaId: empresa.id, isIntermediary: true };
  }

  return { empresaId: empresa.id, intermediarioEmpresaId: null, isIntermediary: false };
}

export default function PublicationForm(props: any) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [incoterms, setIncoterms] = useState<Incoterm[]>([]);
  const [provincias, setProvincias] = useState<{id:number;nombre:string;codigo:string}[]>([]);
  const [localidades, setLocalidades] = useState<{id:number;nombre:string;provincia_id:number}[]>([]);
  const [puertos, setPuertos] = useState<{id:string;nombre:string}[]>([]);

  const [form, setForm] = useState<Formulario>({
    tipo: "VENTA",
    producto_id: 0,
    cantidad_tn: "",
    precio_tn: "",
    moneda_id: 0,
    incoterm_id: 0,
    provincia: "",
    localidad: "",
    puerto: "",
    calidad: "",
    humedad: "",
    proteina: "",
    observaciones: "",
    representado_razon_social: "",
    representado_cuit: "",
    representado_sisa_categoria: "",
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [isIntermediary, setIsIntermediary] = useState(false);
  const [intermediarioEmpresaId, setIntermediarioEmpresaId] = useState<string | null>(null);

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
      const [{data:provData,error:provError},{data:portData,error:portError}]=await Promise.all([
        supabase.from("provincias").select("id,nombre,codigo").order("nombre"),
        supabase.from("puertos").select("id,nombre").order("nombre")
      ]);
      if(provError) throw provError;
      if(portError) throw portError;
      setProvincias((provData||[]) as {id:number;nombre:string;codigo:string}[]);
      setPuertos(portData || []);

      const contexto = await obtenerContextoDelUsuario();
      setIsIntermediary(contexto.isIntermediary);
      setIntermediarioEmpresaId(contexto.intermediarioEmpresaId);
    } catch (e) {
      console.error(e);

      setError(
        "No se pudieron cargar los datos del formulario."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(()=>{const provincia=provincias.find(x=>x.nombre===form.provincia);if(!provincia){setLocalidades([]);return;}supabase.from("localidades").select("id,nombre,provincia_id").eq("provincia_id",provincia.id).order("nombre").then(({data,error})=>{if(!error)setLocalidades((data||[]) as {id:number;nombre:string;provincia_id:number}[]);});},[form.provincia,provincias]);
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

    if (!form.moneda_id) { setError("Seleccioná la moneda real de la publicación."); return; }
    if (!form.incoterm_id) { setError("Seleccioná la condición comercial."); return; }

    if (isIntermediary) {
      if (!intermediarioEmpresaId) { setError("Tu legajo de corredor/comisionista debe estar vinculado y verificado antes de publicar en representación de un cliente."); return; }
      if (!form.representado_razon_social.trim()) { setError("Ingresá la razón social del productor o cliente representado."); return; }
      if (!/^\d{11}$/.test(form.representado_cuit.replace(/\D/g, ""))) { setError("Ingresá un CUIT válido de 11 dígitos del cliente representado."); return; }
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

      const contexto = await obtenerContextoDelUsuario();
      setIsIntermediary(contexto.isIntermediary);
      setIntermediarioEmpresaId(contexto.intermediarioEmpresaId);
      if (contexto.isIntermediary && !contexto.intermediarioEmpresaId) {
        throw new Error("El legajo del intermediario debe estar verificado antes de representar a un cliente.");
      }

      /*
       * DATOS QUE SE VAN A GUARDAR
       */

      const nuevaPublicacion: Publicacion = {
        empresa_id: contexto.empresaId,
        intermediario_empresa_id: contexto.intermediarioEmpresaId,
        representado_razon_social: contexto.isIntermediary ? form.representado_razon_social.trim() : null,
        representado_cuit: contexto.isIntermediary ? form.representado_cuit.replace(/\D/g, "") : null,
        representado_sisa_categoria: contexto.isIntermediary ? (form.representado_sisa_categoria.trim() || null) : null,

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

        producto_id: 0,

        cantidad_tn: "",

        precio_tn: "",

        moneda_id: 0,

        incoterm_id: 0,

        provincia: "",

        localidad: "",

        puerto: "",

        calidad: "",

        humedad: "",

        proteina: "",

        observaciones: "",
        representado_razon_social: "",
        representado_cuit: "",
        representado_sisa_categoria: "",
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

        {/* TIPO DE CONTRATO */}
        <div>
          <label>Condición contractual</label>
          <input style={inputStyle} value="F1 · Formal" readOnly/>
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
            <option value={0}>Seleccioná un producto</option>
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
            <option value={0}>Seleccioná una moneda</option>
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
            <option value={0}>Seleccioná una condición</option>
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

          <select value={form.provincia} onChange={(e)=>{actualizarCampo("provincia",e.target.value);actualizarCampo("localidad","");}} style={inputStyle}><option value="">Seleccioná una provincia</option>{provincias.map(x=><option key={x.id} value={x.nombre}>{x.nombre}</option>)}</select>
        </div>

        {/* LOCALIDAD */}

        <div>
          <label>
            Localidad
          </label>

          <select value={form.localidad} onChange={(e)=>actualizarCampo("localidad",e.target.value)} disabled={!form.provincia} style={inputStyle}><option value="">{form.provincia?"Seleccioná una localidad":"Primero seleccioná una provincia"}</option>{localidades.map(x=><option key={x.id} value={x.nombre}>{x.nombre}</option>)}</select>
        </div>

        {/* PUERTO */}

        <div>
          <label>
            Puerto
          </label>

          <select value={form.puerto} onChange={(e)=>actualizarCampo("puerto",e.target.value)} style={inputStyle}><option value="">Seleccioná un puerto</option>{puertos.map(x=><option key={x.id} value={x.nombre}>{x.nombre}</option>)}</select>
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
        {isIntermediary && (
          <>
            <div style={{gridColumn:"1 / -1",background:"#eff6ff",border:"1px solid #bfdbfe",padding:14,borderRadius:8,color:"#1e3a8a"}}>
              Publicás como intermediario verificado. La publicación no te identifica como titular del grano: el productor/cliente representado queda individualizado en el registro.
            </div>
            <div>
              <label>Razón social del cliente representado</label>
              <input value={form.representado_razon_social} onChange={e=>actualizarCampo("representado_razon_social",e.target.value)} style={inputStyle} placeholder="Razón social real del productor o cliente"/>
            </div>
            <div>
              <label>CUIT del cliente representado</label>
              <input value={form.representado_cuit} onChange={e=>actualizarCampo("representado_cuit",e.target.value)} style={inputStyle} placeholder="11 dígitos"/>
            </div>
            <div>
              <label>Categoría SISA (si corresponde)</label>
              <input value={form.representado_sisa_categoria} onChange={e=>actualizarCampo("representado_sisa_categoria",e.target.value)} style={inputStyle} placeholder="Categoría declarada / constancia"/>
            </div>
          </>
        )}
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