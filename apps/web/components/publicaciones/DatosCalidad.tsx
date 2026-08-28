"use client";

type FormCalidad = {
  calidad: string;
  humedad: number | string;
  proteina: number | string;
};

type Props = {
  form: FormCalidad;
  actualizarCampo: (
    campo: string,
    valor: string | number
  ) => void;
};

export default function DatosCalidad({
  form,
  actualizarCampo,
}: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-md">
      <h2 className="mb-6 text-2xl font-bold">
        Calidad del Producto
      </h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

        <div>
          <label className="font-semibold">
            Calidad
          </label>

          <input
            type="text"
            value={form.calidad}
            onChange={(e) =>
              actualizarCampo("calidad", e.target.value)
            }
            placeholder="Ej: Grado 2"
            className="mt-2 w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label className="font-semibold">
            Humedad (%)
          </label>

          <input
            type="number"
            step="0.01"
            value={form.humedad}
            onChange={(e) =>
              actualizarCampo(
                "humedad",
                Number(e.target.value)
              )
            }
            className="mt-2 w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label className="font-semibold">
            Proteína (%)
          </label>

          <input
            type="number"
            step="0.01"
            value={form.proteina}
            onChange={(e) =>
              actualizarCampo(
                "proteina",
                Number(e.target.value)
              )
            }
            className="mt-2 w-full rounded-lg border p-3"
          />
        </div>

      </div>
    </div>
  );
}