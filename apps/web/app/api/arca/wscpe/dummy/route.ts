import { NextResponse } from "next/server";
import { probarWSCPE } from "@/lib/arca/wscpe";

export async function GET() {
  try {
    const resultado = await probarWSCPE();
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
