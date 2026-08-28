"use client";

type FormLogistico = {
  provincia: string;
  localidad: string;
  puerto: string;
};

type Props = {
  form: FormLogistico;
  actualizarCampo: (
    campo: string,
    valor: string | number
  ) => void;
};

export default function DatosLogisticos({
  form,
  actualizarCampo,
}: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-md">
      <h2 className="mb-6 text-2xl font-bold">
        Datos Logísticos
      </h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="font-semibold">
            Provincia
          </label>

          <select
            value={form.provincia}
            onChange={(e) =>
              actualizarCampo("provincia", e.target.value)
            }
            className="mt-2 w-full rounded-lg border p-3"
          >
            <option value="">Seleccionar provincia</option>
            <option value="Buenos Aires">Buenos Aires</option>
            <option value="Catamarca">Catamarca</option>
            <option value="Chaco">Chaco</option>
            <option value="Chubut">Chubut</option>
            <option value="Córdoba">Córdoba</option>
            <option value="Corrientes">Corrientes</option>
            <option value="Entre Ríos">Entre Ríos</option>
            <option value="Formosa">Formosa</option>
            <option value="Jujuy">Jujuy</option>
            <option value="La Pampa">La Pampa</option>
            <option value="La Rioja">La Rioja</option>
            <option value="Mendoza">Mendoza</option>
            <option value="Misiones">Misiones</option>
            <option value="Neuquén">Neuquén</option>
            <option value="Río Negro">Río Negro</option>
            <option value="Salta">Salta</option>
            <option value="San Juan">San Juan</option>
            <option value="San Luis">San Luis</option>
            <option value="Santa Cruz">Santa Cruz</option>
            <option value="Santa Fe">Santa Fe</option>
            <option value="Santiago del Estero">
              Santiago del Estero
            </option>
            <option value="Tierra del Fuego">
              Tierra del Fuego
            </option>
            <option value="Tucumán">Tucumán</option>
          </select>
        </div>

        <div>
          <label className="font-semibold">
            Localidad
          </label>

          <input
            type="text"
            value={form.localidad}
            onChange={(e) =>
              actualizarCampo("localidad", e.target.value)
            }
            placeholder="Ej: Rosario"
            className="mt-2 w-full rounded-lg border p-3"
          />
        </div>

        <div className="md:col-span-2">
          <label className="font-semibold">
            Puerto / Lugar de entrega
          </label>

          <input
            type="text"
            value={form.puerto}
            onChange={(e) =>
              actualizarCampo("puerto", e.target.value)
            }
            placeholder="Ej: Puerto Rosario"
            className="mt-2 w-full rounded-lg border p-3"
          />
        </div>
      </div>
    </div>
  );
}