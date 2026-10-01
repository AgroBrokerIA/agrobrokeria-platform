import { NextResponse } from "next/server";
import { getCountries, getStatesOfCountry, getCitiesOfState } from "@countrystatecity/countries";
import { supabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country")?.toUpperCase();
  const state = url.searchParams.get("state")?.toUpperCase();

  try {
    if (!country) return NextResponse.json({ countries: await getCountries() });
    const states = await getStatesOfCountry(country);
    if (!state) return NextResponse.json({ country, states });

    // Argentina uses the official Georef catalog persisted in Supabase.
    // Keep the global CountryStateCity catalog for every other country.
    if (country === "AR") {
      const selected = states.find((x: any) => String(x.iso2).toUpperCase() === state);
      if (selected?.name) {
        const { data: province } = await supabase
          .from("provincias")
          .select("id,nombre")
          .ilike("nombre", selected.name)
          .maybeSingle();

        if (province?.id) {
          const { data: cities, error } = await supabase
            .from("localidades")
            .select("id,nombre,codigo_postal,latitud,longitud")
            .eq("provincia_id", province.id)
            .eq("activo", true)
            .order("nombre", { ascending: true });

          if (!error && cities?.length) {
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
      }
    }

    return NextResponse.json({ country, state, cities: await getCitiesOfState(country, state) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el catálogo geográfico." },
      { status: 500 }
    );
  }
}
