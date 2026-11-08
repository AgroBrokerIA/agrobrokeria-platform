"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ArcaTestPage() {
  const [resultado, setResultado] = useState<string>("Preparando prueba...");
  const [cargando, setCargando] = useState(false);

  async function ejecutarPrueba() {
    setCargando(true);
    setResultado("Validando credenciales y consultando ARCA en homologación...");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setResultado("No hay una sesión activa. Volvé a iniciar sesión en AgroBrokerIA.");
      setCargando(false);
      return;
    }

    try {
      const {data,error}=await supabase.functions.invoke("carta-porte-arca",{body:{action:"health"}});
      setResultado(JSON.stringify(error?{ok:false,error:error.message,detalle:data}:data,null,2));
    } catch (error) {
      setResultado(error instanceof Error?error.message:"Error de conexión con ARCA.");
    }
    } finally {
      setCargando(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Prueba ARCA WSCPE</h1>
      <p style={{ marginTop: 8 }}>
        Esta prueba usa tu sesión de AgroBrokerIA y luego intenta autenticarse
        contra WSAA y consultar WSCPE en homologación.
      </p>

      <button
        type="button"
        onClick={ejecutarPrueba}
        disabled={cargando}
        style={{
          marginTop: 24,
          padding: "10px 16px",
          borderRadius: 8,
          border: "1px solid #ccc",
          cursor: cargando ? "wait" : "pointer",
        }}
      >
        {cargando ? "Probando..." : "Probar homologación ARCA"}
      </button>

      <pre
        style={{
          marginTop: 24,
          padding: 20,
          borderRadius: 8,
          background: "#f5f5f5",
          whiteSpace: "pre-wrap",
          overflowX: "auto",
        }}
      >
        {resultado}
      </pre>
    </main>
  );
}
