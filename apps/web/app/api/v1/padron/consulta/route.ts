import { NextRequest } from "next/server";
import { POST as consultarPadron } from "@/app/api/arca/padron/consulta/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ruta versionada solicitada por el formulario de registro.
// La consulta ARCA se ejecuta exclusivamente en el backend.
export async function POST(request: NextRequest) {
  return consultarPadron(request);
}
