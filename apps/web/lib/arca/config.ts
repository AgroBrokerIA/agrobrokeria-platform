import fs from "node:fs";
import path from "node:path";

const ARCA_DIR = path.join(process.cwd(), ".secrets", "arca");

export const arcaConfig = {
  cuit: "27400363817",

  certificatePath: path.join(
    ARCA_DIR,
    "agrobrokeria-wscpe-homo.crt"
  ),

  privateKeyPath: path.join(
    ARCA_DIR,
    "agrobrokeria-wscpe-homo.key"
  ),

  wsaaUrl:
    "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",

  wscpeUrl:
    "https://cpea-ws-qaext.afip.gob.ar/wscpe/services/soap",
};

export function verificarCredencialesARCA() {
  if (!fs.existsSync(arcaConfig.certificatePath)) {
    throw new Error("No se encontró el certificado de ARCA.");
  }

  if (!fs.existsSync(arcaConfig.privateKeyPath)) {
    throw new Error("No se encontró la clave privada de ARCA.");
  }

  return {
    certificado: true,
    clavePrivada: true,
    cuit: arcaConfig.cuit,
  };
}
