import { createClient } from "@supabase/supabase-js";
import { solicitarTicketWSCPE } from "./wsaa";
import { arcaConfig } from "./config";

type ArcaCredentials = {
  token: string;
  sign: string;
  expirationTime: string | null;
};

let credencialesMemoria: ArcaCredentials | null = null;
let refreshEnCurso: Promise<ArcaCredentials> | null = null;

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY para persistir el Ticket de Acceso ARCA en Supabase."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function vigente(credenciales: ArcaCredentials | null): credenciales is ArcaCredentials {
  return Boolean(
    credenciales?.token &&
      credenciales.sign &&
      credenciales.expirationTime &&
      new Date(credenciales.expirationTime).getTime() > Date.now() + 60_000
  );
}

async function cargarPersistidas(): Promise<ArcaCredentials | null> {
  const supabaseAdmin = getAdminSupabase();

  const { data, error } = await supabaseAdmin
    .from("arca_tickets_acceso")
    .select("token, sign, expiration_time")
    .eq("cuit", arcaConfig.cuit)
    .eq("ambiente", arcaConfig.environment)
    .eq("servicio", "wscpe")
    .gt("expiration_time", new Date(Date.now() + 60_000).toISOString())
    .order("expiration_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el TA de ARCA desde Supabase: ${error.message}`);
  }

  if (!data) return null;

  return {
    token: data.token,
    sign: data.sign,
    expirationTime: data.expiration_time,
  };
}

async function persistir(credenciales: ArcaCredentials): Promise<void> {
  const supabaseAdmin = getAdminSupabase();

  const { error } = await supabaseAdmin
    .from("arca_tickets_acceso")
    .upsert(
      {
        cuit: arcaConfig.cuit,
        ambiente: arcaConfig.environment,
        servicio: "wscpe",
        token: credenciales.token,
        sign: credenciales.sign,
        expiration_time: credenciales.expirationTime,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cuit,ambiente,servicio" }
    );

  if (error) {
    throw new Error(`No se pudo persistir el TA de ARCA en Supabase: ${error.message}`);
  }
}

export async function obtenerCredencialesWSCPE(): Promise<ArcaCredentials> {
  if (vigente(credencialesMemoria)) {
    return credencialesMemoria;
  }

  if (refreshEnCurso) {
    return refreshEnCurso;
  }

  refreshEnCurso = (async () => {
    const persistidas = await cargarPersistidas();

    if (vigente(persistidas)) {
      credencialesMemoria = persistidas;
      return persistidas;
    }

    const nuevas = await solicitarTicketWSCPE();

    const credencialesNuevas: ArcaCredentials = {
      token: nuevas.token,
      sign: nuevas.sign,
      expirationTime: nuevas.expirationTime,
    };

    if (!vigente(credencialesNuevas)) {
      throw new Error("ARCA devolvió un TA sin expirationTime vigente.");
    }

    await persistir(credencialesNuevas);
    credencialesMemoria = credencialesNuevas;

    return credencialesNuevas;
  })();

  try {
    return await refreshEnCurso;
  } finally {
    refreshEnCurso = null;
  }
}
