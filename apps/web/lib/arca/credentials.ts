import { solicitarTicketWSCPE } from "./wsaa";

type ArcaCredentials = {
  token: string;
  sign: string;
  expirationTime: string | null;
};

let credenciales: ArcaCredentials | null = null;

export async function obtenerCredencialesWSCPE(): Promise<ArcaCredentials> {
  if (credenciales?.token && credenciales.sign) {
    if (
      !credenciales.expirationTime ||
      new Date(credenciales.expirationTime).getTime() > Date.now() + 60_000
    ) {
      return credenciales;
    }
  }

  const nuevas = await solicitarTicketWSCPE();

  credenciales = {
    token: nuevas.token,
    sign: nuevas.sign,
    expirationTime: nuevas.expirationTime,
  };

  return credenciales;
}
