import { useEffect, useState } from "react";
import {
  obtenerPublicaciones,
  eliminarPublicacion,
} from "@/services/publicaciones";

export function usePublicaciones() {
  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    setLoading(true);

    const { data } = await obtenerPublicaciones();

    setPublicaciones(data ?? []);

    setLoading(false);
  }

  async function eliminar(id: string) {
    await eliminarPublicacion(id);

    await cargar();
  }

  useEffect(() => {
    cargar();
  }, []);

  return {
    publicaciones,
    loading,
    cargar,
    eliminar,
  };
}