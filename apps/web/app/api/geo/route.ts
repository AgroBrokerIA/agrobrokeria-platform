import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

// El catálogo geográfico de Supabase es la fuente única para países,
// provincias/estados y localidades. Evita depender de paquetes o APIs externas.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const countryCode = url.searchParams.get("country")?.trim().toUpperCase();
  const stateCode = url.searchParams.get("state")?.trim().toUpperCase();

  try {
    if (!countryCode) {
      const { data, error } = await supabase
        .from("paises")
        .select("codigo_iso,nombre")
        .eq("activo", true)
        .not("codigo_iso", "is", null)
        .order("nombre", { ascending: true });
      if (error) throw error;
      return NextResponse.json({
        countries: (data ?? []).map((x: any) => ({ iso2: x.codigo_iso, name: x.nombre })),
      });
    }

    const { data: country, error: countryError } = await supabase
      .from("paises")
      .select("id,codigo_iso,nombre")
      .eq("codigo_iso", countryCode)
      .eq("activo", true)
      .maybeSingle();
    if (countryError) throw countryError;
    if (!country) return NextResponse.json({ error: "País no encontrado." }, { status: 404 });

    if (!stateCode) {
      const { data, error } = await supabase
        .from("provincias")
        .select("codigo,nombre")
        .eq("pais_id", country.id)
        .eq("activo", true)
        .order("nombre", { ascending: true });
      if (error) throw error;
      return NextResponse.json({
        country: countryCode,
        states: (data ?? []).map((x: any) => ({ iso2: x.codigo, name: x.nombre })),
      });
    }

    const { data: state, error: stateError } = await supabase
      .from("provincias")
      .select("id,codigo,nombre")
      .eq("pais_id", country.id)
      .eq("codigo", stateCode)
      .eq("activo", true)
      .maybeSingle();
    if (stateError) throw stateError;
    if (!state) return NextResponse.json({ country: countryCode, state: stateCode, cities: [] });

    const { data: cities, error: citiesError } = await supabase
      .from("localidades")
      .select("id,nombre,codigo_postal,latitud,longitud")
      .eq("provincia_id", state.id)
      .eq("activo", true)
      .order("nombre", { ascending: true });
    if (citiesError) throw citiesError;

    return NextResponse.json({
      country: countryCode,
      state: stateCode,
      cities: (cities ?? []).map((x: any) => ({
        id: String(x.id),
        name: x.nombre,
        fullName: x.nombre,
        postalCode: x.codigo_postal ?? null,
        latitude: x.latitud ?? null,
        longitude: x.longitud ?? null,
      })),
    });
  } catch (error) {
    console.error("Geo API: error consultando catálogo geográfico", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el catálogo geográfico." },
      { status: 500 }
    );
  }
}
