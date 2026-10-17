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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country")?.toUpperCase();
  const state = url.searchParams.get("state")?.toUpperCase();

  try {
    if (!country) return NextResponse.json({ countries: await getCountries() });

    // Argentina's provinces are stable application data; don't depend on
    // a third-party package's subdivision codes to populate this essential selector.
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
        if (cities?.length) {
          return NextResponse.json({
            country,
            state,
            cities: cities.map((x: any) => ({
              id: String(x.id),
              name: x.nombre,
              postalCode: x.codigo_postal ?? null,
              latitude: x.latitud ?? null,
              longitude: x.longitud ?? null,
            })),
          });
        }
      }

      // Keep the city selector usable if the local catalog is incomplete.
      const externalStates = await getStatesOfCountry(country);
      const external = externalStates.find((x: any) =>
        String(x.name).localeCompare(provinceName, "es", { sensitivity: "base" }) === 0
      );
      if (external?.iso2) {
        return NextResponse.json({ country, state, cities: await getCitiesOfState(country, external.iso2) });
      }
      return NextResponse.json({ country, state, cities: [] });
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
