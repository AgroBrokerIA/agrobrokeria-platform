import path from "node:path";

type ArcaConfig = {
  cuit: string;
  environment: "PRODUCCION" | "HOMOLOGACION";
  certificatePath: string;
  privateKeyPath: string;
  certificatePem: string | null;
  privateKeyPem: string | null;
  certificateBase64: string | null;
  privateKeyBase64: string | null;
  wsaaUrl: string;
  wscpeUrl: string;
};

/**
 * Cloudflare Workers may initialize a module before request-scoped runtime
 * bindings are exposed through process.env. Resolve every setting lazily,
 * when a request actually reads it, instead of snapshotting secrets at import.
 */
function readArcaConfig(): ArcaConfig {
  const environment = (process.env.ARCA_ENVIRONMENT ?? "HOMOLOGACION").trim().toUpperCase();
  const isProduction = ["PRODUCCION", "PRODUCTION", "PROD"].includes(environment);
  const arcaDir = path.join(process.cwd(), ".secrets", "arca");

  return {
    cuit: (process.env.ARCA_CUIT ?? "").trim(),
    environment: isProduction ? "PRODUCCION" : "HOMOLOGACION",
    certificatePath: path.join(
      arcaDir,
      isProduction ? "agrobrokeria-wscpe.crt" : "agrobrokeria-wscpe-homo.crt"
    ),
    privateKeyPath: path.join(
      arcaDir,
      isProduction ? "agrobrokeria-wscpe.key" : "agrobrokeria-wscpe-homo.key"
    ),
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
      ? "https://wsaa.afip.gov.ar/ws/services/LoginCms"
      : "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    wscpeUrl: isProduction
      ? "https://cpea-ws.afip.gob.ar/wscpe/services/soap"
      : "https://cpea-ws-qaext.afip.gob.ar/wscpe/services/soap",
  };
}

export const arcaConfig = new Proxy({} as ArcaConfig, {
  get(_target, property: string | symbol) {
    if (typeof property !== "string" || !(property in readArcaConfig())) {
      return undefined;
    }
    return readArcaConfig()[property as keyof ArcaConfig];
  },
});

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
