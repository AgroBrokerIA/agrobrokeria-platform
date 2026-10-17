import { NextResponse } from "next/server";
import { getCountries, getStatesOfCountry, getCitiesOfState } from "@countrystatecity/countries";
import { supabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country")?.toUpperCase();
  const state = url.searchParams.get("state")?.toUpperCase();

  try {
    if (!country) return NextResponse.json({ countries: await getCountries() });

    // Argentina: use the platform's persisted provincial/locality catalog,
    // not third-party ISO subdivision codes which do not match Argentine codes.
    if (country === "AR") {
      if (!state) {
        const { data, error } = await supabase
          .from("provincias")
          .select("codigo,nombre")
          .eq("pais_id", 1)
          .eq("tipo", "STATE")
          .eq("activo", true)
          .order("nombre", { ascending: true });
        if (error) throw error;
        return NextResponse.json({
          country,
          states: (data ?? []).map((p: any) => ({ iso2: p.codigo, name: p.nombre })),
        });
      }

      const { data: province, error: provinceError } = await supabase
        .from("provincias")
        .select("id,codigo,nombre")
        .eq("pais_id", 1)
        .eq("tipo", "STATE")
        .eq("activo", true)
        .ilike("codigo", state)
        .maybeSingle();
      if (provinceError) throw provinceError;
      if (!province) return NextResponse.json({ country, state, cities: [] });

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
          postalCode: x.codigo_postal ?? null,
          latitude: x.latitud ?? null,
          longitude: x.longitud ?? null,
        })),
      });
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
