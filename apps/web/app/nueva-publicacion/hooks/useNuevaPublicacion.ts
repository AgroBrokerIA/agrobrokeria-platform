import { useState } from "react";

export function useNuevaPublicacion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(
    accion: () => Promise<void>
  ) {
    try {
      setLoading(true);
      setError(null);

      await accion();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    error,
    ejecutar,
  };
}