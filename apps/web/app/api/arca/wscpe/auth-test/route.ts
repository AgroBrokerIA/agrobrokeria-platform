import { NextResponse } from "next/server";
import { probarWSCPEAutenticado } from "@/lib/arca/wscpe";

export async function GET() {
  try {
    const resultado = await probarWSCPEAutenticado();

    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
