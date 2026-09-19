import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { arcaConfig } from "./config";

const execFileAsync = promisify(execFile);

const WSAA_DESTINATION =
  "cn=wsaahomo,o=afip,c=ar,serialNumber=CUIT 33693450239";

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

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <destination>${escaparXml(WSAA_DESTINATION)}</destination>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${fechaARCA(ahora)}</generationTime>
    <expirationTime>${fechaARCA(expiracion)}</expirationTime>
  </header>
  <service>wscpe</service>
</loginTicketRequest>`;
}

async function generarCMS(
  traPath: string,
  cmsPath: string
): Promise<void> {
  await execFileAsync("openssl", [
    "cms",
    "-sign",
    "-binary",
    "-in",
    traPath,
    "-signer",
    arcaConfig.certificatePath,
    "-inkey",
    arcaConfig.privateKeyPath,
    "-outform",
    "DER",
    "-out",
    cmsPath,
    "-nodetach",
    "-md",
    "sha256",
  ]);
}

function extraerXmlRespuesta(soap: string): string {
  const match = soap.match(
    /<loginCmsReturn[^>]*>([\s\S]*?)<\/loginCmsReturn>/
  );

  if (!match) {
    throw new Error(
      `ARCA WSAA no devolvió loginCmsReturn. Respuesta: ${soap.slice(
        0,
        1000
      )}`
    );
  }

  return match[1]
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extraerCredenciales(xml: string) {
  const token = xml.match(/<token>([\s\S]*?)<\/token>/)?.[1];
  const sign = xml.match(/<sign>([\s\S]*?)<\/sign>/)?.[1];
  const expirationTime = xml.match(
    /<expirationTime>([\s\S]*?)<\/expirationTime>/
  )?.[1];

  if (!token || !sign) {
    throw new Error(
      `ARCA no devolvió Token/Sign. Respuesta: ${xml.slice(0, 1500)}`
    );
  }

  return {
    token,
    sign,
    expirationTime: expirationTime ?? null,
  };
}

export async function solicitarTicketWSCPE() {
  const tmpDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "agrobrokeria-wsaa-")
  );

  const traPath = path.join(tmpDir, "LoginTicketRequest.xml");
  const cmsPath = path.join(tmpDir, "LoginTicketRequest.xml.cms");

  try {
    const tra = generarTRA();

    await fs.promises.writeFile(traPath, tra, "utf8");

    await generarCMS(traPath, cmsPath);

    const cms = await fs.promises.readFile(cmsPath);
    const cmsBase64 = cms.toString("base64");

    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ser="https://wsaa.afip.gov.ar/ws/services/LoginCms">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:loginCms>
      <ser:in0>${cmsBase64}</ser:in0>
    </ser:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(arcaConfig.wsaaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "",
      },
      body: soap,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `WSAA HTTP ${response.status}: ${responseText.slice(0, 1500)}`
      );
    }

    const loginTicketXml = extraerXmlRespuesta(responseText);
    const credentials = extraerCredenciales(loginTicketXml);

    return {
      ok: true,
      ambiente: "HOMOLOGACION",
      servicio: "wscpe",
      token: credentials.token,
      sign: credentials.sign,
      expirationTime: credentials.expirationTime,
    };
  } finally {
    await fs.promises.rm(tmpDir, {
      recursive: true,
      force: true,
    });
  }
}
