import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

type PortRecord = {
  codigo: string;
  nombre: string;
  pais: string;
  provincia: string | null;
  localidad: string | null;
  tipo: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.trim())) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const countryCode = url.searchParams.get("country")?.trim().toUpperCase() ?? "";
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length === 1) {
    return NextResponse.json({ ports: [], source: "UN/LOCODE", message: "Escribí al menos dos letras para buscar." });
  }

  let fallbackPorts: Array<PortRecord & { source: string }> = [];
  try {
    const { data: countries, error: countriesError } = await supabase
      .from("paises").select("codigo_iso,nombre").eq("activo", true);
    if (countriesError) throw countriesError;
    const countryNames = new Map((countries ?? []).map((country: any) => [country.codigo_iso, country.nombre]));
    const selectedCountryName = countryNames.get(countryCode) ?? "";

    const { data: localPorts, error: localError } = await supabase
      .from("catalogo_puertos")
      .select("codigo,nombre,pais,provincia,localidad,tipo")
      .eq("activo", true)
      .order("nombre", { ascending: true });
    if (localError) throw localError;

    const needle = normalize(query);
    const localMatches = ((localPorts ?? []) as PortRecord[]).filter((port) => {
      const sameCountry = !countryCode || normalize(port.pais) === normalize(selectedCountryName);
      const matchesQuery = !needle || normalize([port.nombre, port.pais, port.provincia ?? "", port.localidad ?? "", port.codigo].join(" ")).includes(needle);
      return sameCountry && matchesQuery;
    }).map((port) => ({ ...port, source: "Catálogo AgroBrokerIA" }));
    fallbackPorts = localMatches;

    const response = await fetch("https://raw.githubusercontent.com/datasets/un-locode/main/data/code-list.csv", {
      headers: { Accept: "text/csv" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error("No se pudo consultar el catálogo internacional UN/LOCODE.");
    const csv = await response.text();
    const rows = parseCsv(csv);
    if (!rows.length) throw new Error("El catálogo internacional de puertos llegó vacío.");

    const headers = rows[0].map((value) => normalize(value));
    const index = (name: string) => headers.indexOf(normalize(name));
    const countryIndex = index("Country");
    const locationIndex = index("Location");
    const nameIndex = index("Name");
    const subdivisionIndex = index("Subdivision");
    const functionIndex = index("Function");
    if ([countryIndex, locationIndex, nameIndex, functionIndex].some((value) => value < 0)) {
      throw new Error("El formato del catálogo UN/LOCODE cambió y requiere revisión.");
    }

    const globalMatches = rows.slice(1).flatMap((row) => {
      const iso = (row[countryIndex] ?? "").trim().toUpperCase();
      const location = (row[locationIndex] ?? "").trim().toUpperCase();
      const name = (row[nameIndex] ?? "").trim();
      const functions = (row[functionIndex] ?? "").trim();
      if (!iso || !location || !name || functions[0] !== "1") return [];
      if (countryCode && iso !== countryCode) return [];
      const countryName = countryNames.get(iso) ?? iso;
      if (needle && !normalize([name, iso, countryName, location, row[subdivisionIndex] ?? ""].join(" ")).includes(needle)) return [];
      return [{
        codigo: iso + location,
        nombre: name,
        pais: countryName,
        provincia: (row[subdivisionIndex] ?? "").trim() || null,
        localidad: name,
        tipo: "Puerto marítimo / fluvial UN/LOCODE",
        source: "UN/LOCODE",
      }];
    });

    const unique = new Map<string, (typeof globalMatches)[number] | (typeof localMatches)[number]>();
    for (const port of [...localMatches, ...globalMatches]) {
      const key = [normalize(port.pais), normalize(port.nombre), normalize(port.localidad ?? "")].join("|");
      if (!unique.has(key)) unique.set(key, port);
    }
    const ports = [...unique.values()]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .slice(0, 80);

    return NextResponse.json({
      ports,
      totalReturned: ports.length,
      source: "UN/LOCODE + catálogo AgroBrokerIA",
      attribution: "UN/LOCODE, UNECE; catálogo local AgroBrokerIA.",
    });
  } catch (error) {
    console.error("Ports API:", error);
    if (fallbackPorts.length) {
      return NextResponse.json({
        ports: fallbackPorts.slice(0, 80),
        source: "Catálogo AgroBrokerIA (respaldo)",
        warning: "El catálogo internacional no respondió; se muestran los puertos locales disponibles.",
      });
    }
    return NextResponse.json({
      error: error instanceof Error ? error.message : "No se pudo cargar el catálogo de puertos.",
    }, { status: 503 });
  }
}
