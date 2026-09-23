import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { arcaConfig, getArcaCertificateMaterial } from "./config";

const execFileAsync = promisify(execFile);

function generarUniqueId(): number {
  return Math.floor(Date.now() / 1000) % 4294967295;
}

function fechaARCA(fecha: Date): string {
  return fecha.toISOString();
}

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generarTRA(): string {
  const ahora = new Date();
  const expiracion = new Date(ahora.getTime() + 10 * 60 * 1000);
  const uniqueId = generarUniqueId();
  const destination = arcaConfig.environment === "PRODUCCION"
    ? "cn=wsaa,o=afip,c=ar,serialNumber=CUIT 33693450239"
    : "cn=wsaahomo,o=afip,c=ar,serialNumber=CUIT 33693450239";

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <destination>${escaparXml(destination)}</destination>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${fechaARCA(ahora)}</generationTime>
    <expirationTime>${fechaARCA(expiracion)}</expirationTime>
  </header>
  <service>wscpe</service>
</loginTicketRequest>`;
}

async function generarCMS(traPath: string, cmsPath: string, certificatePath: string, privateKeyPath: string) {
  await execFileAsync("openssl", [
    "cms",
    "-sign",
    "-binary",
    "-in",
    traPath,
    "-signer",
    certificatePath,
    "-inkey",
    privateKeyPath,
    "-outform",
    "DER",
    "-out",
    cmsPath,
    "-nodetach",
    "-md",
    "sha1",
  ]);
}

function extraerXmlRespuesta(soap: string): string {
  const match = soap.match(/<loginCmsReturn[^>]*>([\s\S]*?)<\/loginCmsReturn>/i);
  if (!match) {
    throw new Error("ARCA WSAA no devolvió una respuesta de autenticación válida.");
  }

  return match[1]
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extraerCredenciales(xml: string) {
  const token = xml.match(/<token>([\s\S]*?)<\/token>/i)?.[1];
  const sign = xml.match(/<sign>([\s\S]*?)<\/sign>/i)?.[1];
  const expirationTime = xml.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/i)?.[1];

  if (!token || !sign) {
    throw new Error("ARCA no devolvió Token/Sign.");
  }

  return {
    token: token.trim(),
    sign: sign.trim(),
    expirationTime: expirationTime?.trim() ?? null,
  };
}

export async function solicitarTicketWSCPE() {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "agrobrokeria-wsaa-"));
  const traPath = path.join(tmpDir, "LoginTicketRequest.xml");
  const cmsPath = path.join(tmpDir, "LoginTicketRequest.xml.cms");
  const certPath = path.join(tmpDir, "arca.crt");
  const keyPath = path.join(tmpDir, "arca.key");

  try {
    const material = getArcaCertificateMaterial();
    await fs.promises.writeFile(certPath, material.certificate, { encoding: "utf8", mode: 0o600 });
    await fs.promises.writeFile(keyPath, material.privateKey, { encoding: "utf8", mode: 0o600 });
    await fs.promises.writeFile(traPath, generarTRA(), "utf8");
    await generarCMS(traPath, cmsPath, certPath, keyPath);

    const cmsBase64 = (await fs.promises.readFile(cmsPath)).toString("base64");
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(arcaConfig.wsaaUrl, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "urn:LoginCms" },
      body: soap,
      signal: AbortSignal.timeout(30000),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`WSAA HTTP ${response.status}`);
    }

    const credentials = extraerCredenciales(extraerXmlRespuesta(responseText));
    return {
      ok: true,
      ambiente: arcaConfig.environment,
      servicio: "wscpe",
      token: credentials.token,
      sign: credentials.sign,
      expirationTime: credentials.expirationTime,
    };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
