"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type MedioCobro = {
  id: string;
  empresa_id: string;
  profile_id: string | null;
  tipo: "BANCO" | "FINANCIERA";
  nombre: string;
  titular: string | null;
  cuit_cuil: string | null;
  banco: string | null;
  tipo_cuenta: string | null;
  cbu: string | null;
  alias: string | null;
  moneda_id: number | null;
  es_predeterminado: boolean;
  estado: "PENDIENTE" | "VALIDADO" | "RECHAZADO" | "INACTIVO";
  motivo_rechazo: string | null;
};

const monedaNombre: Record<number, string> = {
  1: "ARS",
  2: "USD",
  3: "EUR",
  4: "BRL",
};

export default function MediosCobroPage() {
  const [medios, setMedios] = useState<MedioCobro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [tipo, setTipo] = useState<"BANCO" | "FINANCIERA">("BANCO");
  const [nombre, setNombre] = useState("");
  const [titular, setTitular] = useState("");
  const [cuitCuil, setCuitCuil] = useState("");
  const [banco, setBanco] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState("");
  const [cbu, setCbu] = useState("");
  const [alias, setAlias] = useState("");
  const [monedaId, setMonedaId] = useState("2");
  const [predeterminado, setPredeterminado] = useState(true);

  async function cargarMedios() {
    setCargando(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Necesitás iniciar sesión.");
      setCargando(false);
      return;
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .single();

    if (errorPerfil || !perfil?.active_company_id) {
      setError("No se encontró una empresa activa.");
      setCargando(false);
      return;
    }

    const { data, error: errorMedios } = await supabase
      .from("medios_cobro")
      .select("*")
      .eq("empresa_id", perfil.active_company_id)
      .neq("estado", "INACTIVO")
      .order("es_predeterminado", { ascending: false })
      .order("creado_at", { ascending: false });

    if (errorMedios) {
      setError(errorMedios.message);
    } else {
      setMedios((data || []) as MedioCobro[]);
    }

    setCargando(false);
  }

  function limpiarFormulario() {
    setTipo("BANCO");
    setNombre("");
    setTitular("");
    setCuitCuil("");
    setBanco("");
    setTipoCuenta("");
    setCbu("");
    setAlias("");
    setMonedaId("2");
    setPredeterminado(true);
  }

  async function guardarMedio() {
    setError("");
    setMensaje("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Necesitás iniciar sesión.");
      return;
    }

    if (!nombre.trim()) {
      setError(
        tipo === "BANCO"
          ? "Ingresá el nombre de la cuenta."
          : "Ingresá el nombre de la financiera."
      );
      return;
    }

    if (!titular.trim()) {
      setError("Ingresá el titular.");
      return;
    }

    if (!cuitCuil.trim()) {
      setError("Ingresá CUIT/CUIL.");
      return;
    }

    if (tipo === "BANCO") {
      if (!cbu.trim() && !alias.trim()) {
        setError("Ingresá CBU o Alias.");
        return;
      }
    }

    setGuardando(true);

    try {
      const { data: perfil, error: errorPerfil } = await supabase
        .from("profiles")
        .select("active_company_id")
        .eq("id", user.id)
        .single();

      if (errorPerfil || !perfil?.active_company_id) {
        throw new Error("No se encontró una empresa activa.");
      }

      if (predeterminado) {
        const { error: errorPredeterminado } = await supabase
          .from("medios_cobro")
          .update({ es_predeterminado: false })
          .eq("empresa_id", perfil.active_company_id);

        if (errorPredeterminado) {
          throw new Error(errorPredeterminado.message);
        }
      }

      const { error: errorInsert } = await supabase
        .from("medios_cobro")
        .insert({
          empresa_id: perfil.active_company_id,
          profile_id: user.id,
          tipo,
          nombre: nombre.trim(),
          titular: titular.trim(),
          cuit_cuil: cuitCuil.trim(),
          banco: tipo === "BANCO" ? banco.trim() || null : null,
          tipo_cuenta: tipo === "BANCO" ? tipoCuenta || null : null,
          cbu: tipo === "BANCO" ? cbu.trim() || null : null,
          alias: tipo === "BANCO" ? alias.trim() || null : null,
          moneda_id: Number(monedaId),
          es_predeterminado: predeterminado,
          estado: "PENDIENTE",
        });

      if (errorInsert) {
        throw new Error(errorInsert.message);
      }

      setMensaje(
        "Medio de cobro registrado. Quedará pendiente de validación."
      );

      limpiarFormulario();
      setMostrarFormulario(false);
      await cargarMedios();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo registrar el medio de cobro."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function hacerPredeterminado(id: string) {
    setError("");
    setMensaje("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Necesitás iniciar sesión.");
      return;
    }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .single();

    if (!perfil?.active_company_id) {
      setError("No se encontró una empresa activa.");
      return;
    }

    const { error: errorQuitar } = await supabase
      .from("medios_cobro")
      .update({ es_predeterminado: false })
      .eq("empresa_id", perfil.active_company_id);

    if (errorQuitar) {
      setError(errorQuitar.message);
      return;
    }

    const { error: errorMarcar } = await supabase
      .from("medios_cobro")
      .update({ es_predeterminado: true })
      .eq("id", id);

    if (errorMarcar) {
      setError(errorMarcar.message);
      return;
    }

    setMensaje("Medio de cobro predeterminado actualizado.");
    await cargarMedios();
  }

  useEffect(() => {
    cargarMedios();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Medios de cobro
            </h1>
            <p className="mt-1 text-slate-600">
              Configurá dónde recibir tus comisiones de AgroBrokerIA.
            </p>
          </div>

          <button
            onClick={() => {
              limpiarFormulario();
              setMostrarFormulario(true);
              setError("");
              setMensaje("");
            }}
            className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
          >
            + Agregar medio de cobro
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            {mensaje}
          </div>
        )}

        {mostrarFormulario && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Nuevo medio de cobro
                </h2>
                <p className="text-sm text-slate-500">
                  Los datos quedarán asociados a tu empresa.
                </p>
              </div>

              <button
                onClick={() => setMostrarFormulario(false)}
                className="text-slate-500 hover:text-slate-900"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Tipo
                </span>
                <select
                  value={tipo}
                  onChange={(e) =>
                    setTipo(e.target.value as "BANCO" | "FINANCIERA")
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="BANCO">Transferencia bancaria</option>
                  <option value="FINANCIERA">Financiera</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Nombre / identificación
                </span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={
                    tipo === "BANCO"
                      ? "Ej. Cuenta bancaria principal"
                      : "Ej. Financiera"
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Titular
                </span>
                <input
                  value={titular}
                  onChange={(e) => setTitular(e.target.value)}
                  placeholder="Nombre completo / razón social"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  CUIT / CUIL
                </span>
                <input
                  value={cuitCuil}
                  onChange={(e) => setCuitCuil(e.target.value)}
                  placeholder="CUIT/CUIL"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>

              {tipo === "BANCO" && (
                <>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      Banco
                    </span>
                    <input
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                      placeholder="Ej. Banco Nación"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      Tipo de cuenta
                    </span>
                    <select
                      value={tipoCuenta}
                      onChange={(e) => setTipoCuenta(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                    >
                      <option value="">Seleccionar</option>
                      <option value="CA">Caja de ahorro</option>
                      <option value="CC">Cuenta corriente</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      CBU
                    </span>
                    <input
                      value={cbu}
                      onChange={(e) => setCbu(e.target.value)}
                      placeholder="22 dígitos"
                      inputMode="numeric"
                      maxLength={22}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      Alias
                    </span>
                    <input
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      placeholder="Ej. agro.comisiones"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Moneda
                </span>
                <select
                  value={monedaId}
                  onChange={(e) => setMonedaId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="1">ARS</option>
                  <option value="2">USD</option>
                  <option value="3">EUR</option>
                  <option value="4">BRL</option>
                </select>
              </label>

              <label className="flex items-center gap-3 pt-7">
                <input
                  type="checkbox"
                  checked={predeterminado}
                  onChange={(e) => setPredeterminado(e.target.checked)}
                  className="h-5 w-5"
                />
                <span className="font-semibold text-slate-700">
                  Usar como medio predeterminado
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setMostrarFormulario(false)}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
              >
                Cancelar
              </button>

              <button
                onClick={guardarMedio}
                disabled={guardando}
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar medio de cobro"}
              </button>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Tus medios de cobro
          </h2>

          {cargando ? (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500">
              Cargando...
            </div>
          ) : medios.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="text-4xl">🏦</div>
              <h3 className="mt-3 font-bold text-slate-900">
                Todavía no tenés un medio de cobro
              </h3>
              <p className="mt-1 text-slate-500">
                Configurá una cuenta bancaria o financiera para poder retirar
                tus comisiones.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {medios.map((medio) => (
                <article
                  key={medio.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {medio.tipo === "BANCO" ? "🏦" : "💳"}
                        </span>
                        <h3 className="font-bold text-slate-900">
                          {medio.nombre}
                        </h3>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {medio.tipo === "BANCO"
                          ? "Transferencia bancaria"
                          : "Financiera"}
                      </p>
                    </div>

                    {medio.es_predeterminado && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                        ★ Predeterminado
                      </span>
                    )}
                  </div>

                  <div className="mt-5 space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">Titular:</span>{" "}
                      {medio.titular || "—"}
                    </div>

                    <div>
                      <span className="font-semibold">CUIT/CUIL:</span>{" "}
                      {medio.cuit_cuil || "—"}
                    </div>

                    {medio.tipo === "BANCO" && (
                      <>
                        <div>
                          <span className="font-semibold">Banco:</span>{" "}
                          {medio.banco || "—"}
                        </div>

                        <div>
                          <span className="font-semibold">CBU:</span>{" "}
                          {medio.cbu
                            ? `•••• •••• •••• ${medio.cbu.slice(-4)}`
                            : "—"}
                        </div>

                        <div>
                          <span className="font-semibold">Alias:</span>{" "}
                          {medio.alias || "—"}
                        </div>
                      </>
                    )}

                    <div>
                      <span className="font-semibold">Moneda:</span>{" "}
                      {medio.moneda_id
                        ? monedaNombre[medio.moneda_id] || "—"
                        : "—"}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        medio.estado === "VALIDADO"
                          ? "bg-emerald-100 text-emerald-700"
                          : medio.estado === "RECHAZADO"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {medio.estado}
                    </span>

                    {!medio.es_predeterminado && medio.estado !== "INACTIVO" && (
                      <button
                        onClick={() => hacerPredeterminado(medio.id)}
                        className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                      >
                        Usar como predeterminado
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
