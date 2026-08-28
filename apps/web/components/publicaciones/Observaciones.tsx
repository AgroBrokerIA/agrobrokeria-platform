"use client";

type Props = {
  observaciones: string;
  actualizarCampo: (
    campo: string,
    valor: string | number
  ) => void;
};

export default function Observaciones({
  observaciones,
  actualizarCampo,
}: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-md">
      <h2 className="mb-6 text-2xl font-bold">
        Observaciones
      </h2>

      <textarea
        rows={6}
        value={observaciones}
        onChange={(e) =>
          actualizarCampo(
            "observaciones",
            e.target.value
          )
        }
        placeholder="Escriba información adicional sobre la mercadería, condiciones comerciales, entrega, certificaciones, etc."
        className="w-full rounded-lg border p-4 resize-none"
      />
    </div>
  );
}