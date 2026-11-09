import path from "node:path";

const ARCA_DIR = path.join(process.cwd(), ".secrets", "arca");
const environment = (process.env.ARCA_ENVIRONMENT ?? "HOMOLOGACION").trim().toUpperCase();
const isProduction = ["PRODUCCION", "PRODUCTION", "PROD"].includes(environment);

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

  // Homologation must never fall back to production credentials.
  certificatePem: isProduction
    ? process.env.ARCA_CERTIFICATE_PEM ?? null
    : process.env.ARCA_CERTIFICATE_HOMO_PEM ?? null,
  privateKeyPem: isProduction
    ? process.env.ARCA_PRIVATE_KEY_PEM ?? null
    : process.env.ARCA_PRIVATE_KEY_HOMO_PEM ?? null,
  certificateBase64: isProduction
    ? process.env.ARCA_CERTIFICATE_BASE64 ?? null
    : process.env.ARCA_CERTIFICATE_HOMO_BASE64 ?? null,
  privateKeyBase64: isProduction
    ? process.env.ARCA_PRIVATE_KEY_BASE64 ?? null
    : process.env.ARCA_PRIVATE_KEY_HOMO_BASE64 ?? null,

  wsaaUrl: isProduction
    ? "https://wsaa.arca.gov.ar/ws/services/LoginCms"
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



  const certificateVariable = arcaConfig.environment === "PRODUCCION" ? "ARCA_CERTIFICATE_BASE64" : "ARCA_CERTIFICATE_HOMO_BASE64";
  const privateKeyVariable = arcaConfig.environment === "PRODUCCION" ? "ARCA_PRIVATE_KEY_BASE64" : "ARCA_PRIVATE_KEY_HOMO_BASE64";
  throw new Error(
    `Faltan las credenciales X.509 de ARCA para el ambiente ${arcaConfig.environment}. Configurá ${certificateVariable} y ${privateKeyVariable} en las variables de entorno del proyecto Vercel.`
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
