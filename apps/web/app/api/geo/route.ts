import { NextResponse } from "next/server";
import { getCountries, getStatesOfCountry, getCitiesOfState } from "@countrystatecity/countries";
import { supabase } from "@/lib/supabase/server";

const ARGENTINA_PROVINCES = [
  ["C", "Ciudad Autónoma de Buenos Aires", "02"],
  ["B", "Buenos Aires", "06"],
  ["K", "Catamarca", "10"],
  ["H", "Chaco", "22"],
  ["U", "Chubut", "26"],
  ["X", "Córdoba", "14"],
  ["W", "Corrientes", "18"],
  ["E", "Entre Ríos", "30"],
  ["P", "Formosa", "34"],
  ["Y", "Jujuy", "38"],
  ["L", "La Pampa", "42"],
  ["F", "La Rioja", "46"],
  ["M", "Mendoza", "50"],
  ["N", "Misiones", "54"],
  ["Q", "Neuquén", "58"],
  ["R", "Río Negro", "62"],
  ["A", "Salta", "66"],
  ["J", "San Juan", "70"],
  ["D", "San Luis", "74"],
  ["Z", "Santa Cruz", "78"],
  ["S", "Santa Fe", "82"],
  ["G", "Santiago del Estero", "86"],
  ["V", "Tierra del Fuego", "94"],
  ["T", "Tucumán", "90"],
] as const;

async function cargarLocalidadesOficiales(provinciaId: string) {
  const endpoint = new URL("https://apis.datos.gob.ar/georef/api/v2.0/localidades");
  endpoint.searchParams.set("provincia", provinciaId);
  endpoint.searchParams.set("max", "5000");
  endpoint.searchParams.set("orden", "nombre");
  endpoint.searchParams.set("campos", "id,nombre,centroide");

  const response = await fetch(endpoint.toString(), {
    next: { revalidate: 86400 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("El catálogo oficial de localidades no respondió.");
  const payload = await response.json() as {
    localidades?: Array<{
      id: string | number;
      nombre: string;
      centroide?: { lat?: number; lon?: number };
    }>;
    total?: number;
  };
  return (payload.localidades ?? [])
    .filter((x) => x.id != null && x.nombre)
    .map((x) => ({
      id: String(x.id),
      name: x.nombre,
      fullName: x.nombre,
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
      if (!selected) return NextResponse.json({ country, state, cities: [], error: "Provincia no reconocida." });

      const [, provinceName, officialProvinceId] = selected;

      // Source of truth: national GeoRef API v2, filtered by official province ID.
      try {
        const cities = await cargarLocalidadesOficiales(officialProvinceId);
        if (cities.length) {
          return NextResponse.json({ country, state, cities, source: "argentina-georef-v2" });
        }
      } catch (error) {
        console.error("GeoRef v2 falló; se intenta catálogo local:", error);
      }

      // Fallback to existing local data if GeoRef is temporarily unavailable.
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
