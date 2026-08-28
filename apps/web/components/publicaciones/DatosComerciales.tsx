"use client";

import { Producto } from "@/types/producto";
import { Moneda } from "@/types/moneda";
import { Incoterm } from "@/types/incoterm";

type Props = {
  productos: Producto[];
  monedas: Moneda[];
  incoterms: Incoterm[];

  form: any;

  actualizarCampo: (
    campo: string,
    valor: string | number
  ) => void;
};

export default function DatosComerciales({
  productos,
  monedas,
  incoterms,
  form,
  actualizarCampo,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border">

      <h2 className="text-2xl font-bold mb-6">
        Datos Comerciales
      </h2>

      <div className="grid grid-cols-2 gap-5">

        <div>
          <label className="font-semibold">
            Tipo
          </label>

          <select
            value={form.tipo}
            onChange={(e) =>
              actualizarCampo("tipo", e.target.value)
            }
            className="w-full border rounded-lg p-3 mt-2"
          >
            <option value="VENTA">
              Venta
            </option>

            <option value="COMPRA">
              Compra
            </option>
          </select>
        </div>

        <div>
          <label className="font-semibold">
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
            className="w-full border rounded-lg p-3 mt-2"
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
        </div>

        <div>
          <label className="font-semibold">
            Cantidad (TN)
          </label>

          <input
            type="number"
            value={form.cantidad_tn}
            onChange={(e) =>
              actualizarCampo(
                "cantidad_tn",
                Number(e.target.value)
              )
            }
            className="w-full border rounded-lg p-3 mt-2"
          />
        </div>

        <div>
          <label className="font-semibold">
            Precio
          </label>

          <input
            type="number"
            value={form.precio_tn}
            onChange={(e) =>
              actualizarCampo(
                "precio_tn",
                Number(e.target.value)
              )
            }
            className="w-full border rounded-lg p-3 mt-2"
          />
        </div>

        <div>
          <label className="font-semibold">
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
            className="w-full border rounded-lg p-3 mt-2"
          >
            {monedas.map((moneda) => (
              <option
                key={moneda.id}
                value={moneda.id}
              >
                {moneda.codigo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold">
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
            className="w-full border rounded-lg p-3 mt-2"
          >
            {incoterms.map((incoterm) => (
              <option
                key={incoterm.id}
                value={incoterm.id}
              >
                {incoterm.codigo}
              </option>
            ))}
          </select>
        </div>

      </div>

    </div>
  );
}