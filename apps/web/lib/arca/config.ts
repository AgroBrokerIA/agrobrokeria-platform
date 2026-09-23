import path from "node:path";

const ARCA_DIR = path.join(process.cwd(), ".secrets", "arca");
const environment = (process.env.ARCA_ENVIRONMENT ?? "HOMOLOGACION").toUpperCase();
const isProduction = environment === "PRODUCCION";

export const arcaConfig = {
  cuit: process.env.ARCA_CUIT ?? "",
  environment: isProduction ? "PRODUCCION" : "HOMOLOGACION",

  certificatePath: path.join(
    ARCA_DIR,
    isProduction ? "agrobrokeria-wscpe.crt" : "agrobrokeria-wscpe-homo.crt"
  ),

  privateKeyPath: path.join(
    ARCA_DIR,
    isProduction ? "agrobrokeria-wscpe.key" : "agrobrokeria-wscpe-homo.key"
  ),

  certificatePem: process.env.ARCA_CERTIFICATE_PEM ?? null,
  privateKeyPem: process.env.ARCA_PRIVATE_KEY_PEM ?? null,
  certificateBase64: process.env.ARCA_CERTIFICATE_BASE64 ?? null,
  privateKeyBase64: process.env.ARCA_PRIVATE_KEY_BASE64 ?? null,

  wsaaUrl: isProduction
    ? "https://wsaa.afip.gov.ar/ws/services/LoginCms"
    : "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",

  wscpeUrl: isProduction
    ? "https://cpea-ws.afip.gob.ar/wscpe/services/soap"
    : "https://cpea-ws-qaext.afip.gob.ar/wscpe/services/soap",
};

export function getArcaCertificateMaterial() {
  const certificate = arcaConfig.certificateBase64
    ? Buffer.from(arcaConfig.certificateBase64, "base64").toString("utf8")
    : arcaConfig.certificatePem;

  const privateKey = arcaConfig.privateKeyBase64
    ? Buffer.from(arcaConfig.privateKeyBase64, "base64").toString("utf8")
    : arcaConfig.privateKeyPem;

  if (certificate && privateKey) {
    return { certificate, privateKey, source: "environment" as const };
  }



  throw new Error(
    "Faltan las credenciales X.509 de ARCA. Configurá ARCA_CERTIFICATE_BASE64 y ARCA_PRIVATE_KEY_BASE64 en el servidor."
  );
}

export function verificarCredencialesARCA() {
  const material = getArcaCertificateMaterial();

  return {
    certificado: Boolean(material.certificate),
    clavePrivada: Boolean(material.privateKey),
    cuit: arcaConfig.cuit,
    ambiente: arcaConfig.environment,
    origen: material.source,
  };
}
