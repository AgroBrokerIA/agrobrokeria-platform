import { NextResponse } from "next/server";
import { getCountries, getStatesOfCountry, getCitiesOfState } from "@countrystatecity/countries";
import { supabase } from "@/lib/supabase/server";

const ARGENTINA_PROVINCES = [
  ["C", "Ciudad Autónoma de Buenos Aires"],
  ["B", "Buenos Aires"],
  ["K", "Catamarca"],
  ["H", "Chaco"],
  ["U", "Chubut"],
  ["X", "Córdoba"],
  ["W", "Corrientes"],
  ["E", "Entre Ríos"],
  ["P", "Formosa"],
  ["Y", "Jujuy"],
  ["L", "La Pampa"],
  ["F", "La Rioja"],
  ["M", "Mendoza"],
  ["N", "Misiones"],
  ["Q", "Neuquén"],
  ["R", "Río Negro"],
  ["A", "Salta"],
  ["J", "San Juan"],
  ["D", "San Luis"],
  ["Z", "Santa Cruz"],
  ["S", "Santa Fe"],
  ["G", "Santiago del Estero"],
  ["V", "Tierra del Fuego"],
  ["T", "Tucumán"],
] as const;

async function localidadesOficialesArgentina(provincia: string) {
  const endpoint = new URL("https://apis.datos.gob.ar/georef/api/localidades");
  endpoint.searchParams.set("provincia", provincia);
  endpoint.searchParams.set("max", "5000");
  endpoint.searchParams.set("orden", "nombre");
  endpoint.searchParams.set("campos", "id,nombre,nombre_completo,centroide");

  const response = await fetch(endpoint.toString(), {
    next: { revalidate: 86400 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("El catálogo oficial de localidades no respondió.");
  const payload = await response.json() as {
    localidades?: Array<{
      id: string | number;
      nombre: string;
      nombre_completo?: string;
      centroide?: { lat?: number; lon?: number };
    }>;
  };

  return (payload.localidades ?? [])
    .filter((x) => x.id != null && x.nombre)
    .map((x) => ({
      id: String(x.id),
      name: x.nombre,
      fullName: x.nombre_completo ?? x.nombre,
      postalCode: null,
      latitude: x.centroide?.lat ?? null,
      longitude: x.centroide?.lon ?? null,
    }));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country")?.toUpperCase();
  const state = url.searchParams.get("state")?.toUpperCase();

  try {
    if (!country) return NextResponse.json({ countries: await getCountries() });

    if (country === "AR") {
      if (!state) {
        return NextResponse.json({
          country,
          states: ARGENTINA_PROVINCES.map(([iso2, name]) => ({ iso2, name })),
        });
      }

      const selected = ARGENTINA_PROVINCES.find(([code]) => code.toUpperCase() === state);
      if (!selected) return NextResponse.json({ country, state, cities: [] });

      const provinceName = selected[1];

      // First use the official national GeoRef API. This fills localities even
      // when the application's own provincial/locality tables are incomplete.
      try {
        const cities = await localidadesOficialesArgentina(provinceName);
        if (cities.length) return NextResponse.json({ country, state, cities, source: "argentina-georef" });
      } catch (error) {
        console.error("No se pudo consultar GeoRef Argentina:", error);
      }

      // Resilient fallback to the local catalog if the official service is unavailable.
      const { data: province, error: provinceError } = await supabase
        .from("provincias")
        .select("id,nombre")
        .eq("pais_id", 1)
        .eq("tipo", "STATE")
        .eq("activo", true)
        .ilike("nombre", provinceName)
        .maybeSingle();
      if (provinceError) throw provinceError;

      if (province?.id) {
        const { data: cities, error } = await supabase
          .from("localidades")
          .select("id,nombre,codigo_postal,latitud,longitud")
          .eq("provincia_id", province.id)
          .eq("activo", true)
          .order("nombre", { ascending: true });
        if (error) throw error;
        return NextResponse.json({
          country,
          state,
          cities: (cities ?? []).map((x: any) => ({
            id: String(x.id),
            name: x.nombre,
            fullName: x.nombre,
            postalCode: x.codigo_postal ?? null,
            latitude: x.latitud ?? null,
            longitude: x.longitud ?? null,
          })),
          source: "local-catalog",
        });
      }

      return NextResponse.json({ country, state, cities: [], source: "empty" });
    }

    const states = await getStatesOfCountry(country);
    if (!state) return NextResponse.json({ country, states });
    return NextResponse.json({ country, state, cities: await getCitiesOfState(country, state) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el catálogo geográfico." },
      { status: 500 }
    );
  }
}
