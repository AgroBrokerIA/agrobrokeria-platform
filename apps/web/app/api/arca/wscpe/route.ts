import { NextResponse } from "next/server";
import { solicitarTicketWSCPE } from "@/lib/arca/wsaa";

export async function GET() {
  try {
    const resultado = await solicitarTicketWSCPE();

    return NextResponse.json({
      ok: true,
      ambiente: resultado.ambiente,
      servicio: resultado.servicio,
      expirationTime: resultado.expirationTime,
      mensaje: "Autenticación WSAA realizada correctamente.",
    });
  } catch (error) {
    console.error("Error WSAA ARCA:", error);

    return NextResponse.json(
      {
        ok: false,
        mensaje: "Error autenticando contra ARCA WSAA.",
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
