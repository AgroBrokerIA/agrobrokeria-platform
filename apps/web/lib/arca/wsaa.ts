import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import forge from "node-forge";
import { arcaConfig, getArcaCertificateMaterial } from "./config";

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

function generarCMS(tra: string, certificatePem: string, privateKeyPem: string): string {
  const certificate = forge.pki.certificateFromPem(certificatePem);
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const p7 = forge.pkcs7.createSignedData();

  p7.content = forge.util.createBuffer(tra, "utf8");
  p7.addCertificate(certificate);
  p7.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha1,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        value: fechaARCA(new Date()),
      },
    ],
  });
  p7.sign({ detached: false });

  return forge.asn1.toDer(p7.toAsn1()).getBytes();
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
  const material = getArcaCertificateMaterial();
  const tra = generarTRA();
  const cmsDer = generarCMS(tra, material.certificate, material.privateKey);
  const cmsBase64 = Buffer.from(cmsDer, "binary").toString("base64");
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

}
