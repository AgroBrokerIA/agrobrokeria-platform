import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { solicitarTicketWSCPE } from "@/lib/arca/wsaa";

export async function GET() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    }

    const resultado = await solicitarTicketWSCPE();

    return NextResponse.json({
      ok: true,
      ambiente: resultado.ambiente,
      servicio: resultado.servicio,
      expirationTime: resultado.expirationTime,
      mensaje: "Autenticación WSAA realizada correctamente.",
    });
  } catch (error) {
    console.error("ARCA WSAA:", error);
    return NextResponse.json(
      { ok: false, mensaje: "No fue posible autenticar contra ARCA WSAA." },
      { status: 502 }
    );
  }
}
