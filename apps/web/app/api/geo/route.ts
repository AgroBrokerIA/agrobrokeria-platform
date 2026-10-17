import { NextResponse } from "next/server";
import { getCountries, getStatesOfCountry, getCitiesOfState } from "@countrystatecity/countries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country")?.toUpperCase();
  const state = url.searchParams.get("state")?.toUpperCase();

  try {
    if (!country) return NextResponse.json({ countries: await getCountries() });
    const states = await getStatesOfCountry(country);
    if (!state) return NextResponse.json({ country, states });

    const cities = await getCitiesOfState(country, state);
    return NextResponse.json({ country, state, cities });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el catálogo geográfico." },
      { status: 500 }
    );
  }
}
