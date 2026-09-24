import https from "node:https";
import { arcaConfig } from "./config";

const WSCPE_NS = "https://serviciosjava.afip.gob.ar/wscpe/";

function enviarSOAP(soap: string): Promise<{
  status: number;
  contentType: string | null;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const url = new URL(arcaConfig.wscpeUrl);
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          Accept: "text/xml",
          "User-Agent": "AgroBrokerIA/1.0",
          SOAPAction: '""',
          "Content-Length": Buffer.byteLength(soap, "utf8"),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => resolve({
          status: response.statusCode ?? 0,
          contentType: response.headers["content-type"] ?? null,
          body: Buffer.concat(chunks).toString("utf8"),
        }));
      }
    );

    request.on("error", reject);
    request.setTimeout(30000, () => {
      request.destroy(new Error("Timeout comunicando con WSCPE ARCA."));
    });
    request.write(soap);
    request.end();
  });
}

function redactarXmlTag(xml: string, tag: string): string {
  let resultado = xml;
  let cursor = 0;

  while (true) {
    const apertura = resultado.indexOf("<" + tag, cursor);
    if (apertura < 0) break;

    const cierreApertura = resultado.indexOf(">", apertura);
    if (cierreApertura < 0) break;

    const cierre = resultado.indexOf("</" + tag + ">", cierreApertura);
    if (cierre < 0) break;

    resultado =
      resultado.slice(0, cierreApertura + 1) +
      "[REDACTED]" +
      resultado.slice(cierre);

    cursor = cierreApertura + 1 + "[REDACTED]".length + ("</" + tag + ">").length;
  }

  return resultado;
}

function validarRespuesta(
  response: { status: number; contentType: string | null; body: string },
  operacion: string
) {
  if (response.status < 200 || response.status >= 300) {
    const cuerpo = ["token", "sign", "auth", "cuit"].reduce(
      (texto, tag) => redactarXmlTag(texto, tag),
      response.body
    ).slice(0, 3000);

    throw new Error(
      `${operacion}: HTTP ${response.status}; Content-Type ${response.contentType ?? "desconocido"}; ` +
      `Respuesta: ${cuerpo || "[vacía]"}`
    );
  }

  if (!response.body.includes("Envelope")) {
    const cuerpo = ["token", "sign", "auth", "cuit"].reduce(
      (texto, tag) => redactarXmlTag(texto, tag),
      response.body
    ).slice(0, 1200);

    throw new Error(
      `${operacion}: ARCA no devolvió una respuesta SOAP válida. ` +
      `HTTP ${response.status}; Content-Type ${response.contentType ?? "desconocido"}; ` +
      `Respuesta: ${cuerpo || "[vacía]"}`
    );
  }
}

export async function probarWSCPE() {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsc="${WSCPE_NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <wsc:dummy/>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await enviarSOAP(soap);
  validarRespuesta(response, "WSCPE Dummy");
  return { ok: true, respuestaXml: response.body };
}

export async function probarWSCPEAutenticado() {
  const { obtenerCredencialesWSCPE } = await import("./credentials");
  const credenciales = await obtenerCredencialesWSCPE();

  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsc="${WSCPE_NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <wsc:ConsultarProvinciasReq>
      <auth>
        <token>${credenciales.token}</token>
        <sign>${credenciales.sign}</sign>
        <cuitRepresentada>${arcaConfig.cuit}</cuitRepresentada>
      </auth>
    </wsc:ConsultarProvinciasReq>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await enviarSOAP(soap);
  validarRespuesta(response, "WSCPE ConsultarProvincias autenticado");
  return { ok: true, respuestaXml: response.body };
}

export async function consultarProvinciasWSCPE() {
  const { obtenerCredencialesWSCPE } = await import("./credentials");
  const credenciales = await obtenerCredencialesWSCPE();

  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsc="${WSCPE_NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <wsc:ConsultarProvinciasReq>
      <auth>
        <token>${credenciales.token}</token>
        <sign>${credenciales.sign}</sign>
        <cuit>${arcaConfig.cuit}</cuit>
      </auth>
    </wsc:ConsultarProvinciasReq>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await enviarSOAP(soap);
  validarRespuesta(response, "WSCPE ConsultarProvincias");
  return { ok: true, respuestaXml: response.body };
}
