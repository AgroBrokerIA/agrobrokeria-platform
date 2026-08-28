"use client";

type Props = {
  loading: boolean;
  onGuardar: () => void;
};

export default function BotonesFormulario({
  loading,
  onGuardar,
}: Props) {
  return (
    <div className="flex justify-end gap-4 mt-8">

      <button
        type="button"
        className="rounded-lg border px-6 py-3 hover:bg-gray-100 transition"
      >
        Cancelar
      </button>

      <button
        type="button"
        className="rounded-lg bg-gray-700 px-6 py-3 text-white hover:bg-gray-800 transition"
      >
        Guardar borrador
      </button>

      <button
        type="button"
        onClick={onGuardar}
        disabled={loading}
        className="rounded-lg bg-green-600 px-8 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition"
      >
        {loading ? "Publicando..." : "🌾 Publicar"}
      </button>

    </div>
  );
}