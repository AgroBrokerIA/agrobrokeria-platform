import { NextResponse } from "next/server";

export const revalidate = 300;

type Instrument = { symbol: string; name: string; category: "Divisas" | "Índices" | "Acciones"; market: string };

const instruments: Instrument[] = [
  { symbol: "ARS=X", name: "Dólar estadounidense / Peso argentino", category: "Divisas", market: "Yahoo Finance" },
  { symbol: "EURUSD=X", name: "Euro / Dólar estadounidense", category: "Divisas", market: "Yahoo Finance" },
  { symbol: "BRL=X", name: "Dólar estadounidense / Real brasileño", category: "Divisas", market: "Yahoo Finance" },
  { symbol: "^MERV", name: "Índice S&P Merval", category: "Índices", market: "BYMA" },
  { symbol: "^GSPC", name: "S&P 500", category: "Índices", market: "NYSE" },
  { symbol: "^IXIC", name: "Nasdaq Composite", category: "Índices", market: "NASDAQ" },
  { symbol: "YPFD.BA", name: "YPF", category: "Acciones", market: "BYMA" },
  { symbol: "GGAL.BA", name: "Grupo Galicia", category: "Acciones", market: "BYMA" },
  { symbol: "BMA.BA", name: "Banco Macro", category: "Acciones", market: "BYMA" },
];

async function quoteFor(instrument: Instrument) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(instrument.symbol)}?range=5d&interval=1d`;
    const response = await fetch(url, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 AgroBrokerIA/1.0" },
    });
    if (!response.ok) return null;
    const json = await response.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price)) return null;
    const previous = Number(meta?.chartPreviousClose ?? meta?.previousClose);
    const change = Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : null;
    const marketTime = Number(meta?.regularMarketTime);
    return {
      symbol: instrument.symbol,
      name: instrument.name,
      category: instrument.category,
      market: instrument.market,
      price,
      currency: String(meta?.currency || ""),
      changePercent: change,
      updatedAt: Number.isFinite(marketTime) ? new Date(marketTime * 1000).toISOString() : null,
      source: "Yahoo Finance",
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const results = await Promise.all(instruments.map(quoteFor));
  const quotes = results.filter((item): item is NonNullable<typeof item> => item !== null);
  return NextResponse.json({
    quotes,
    updatedAt: new Date().toISOString(),
    source: "Yahoo Finance",
    delayed: true,
    message: quotes.length ? null : "El proveedor no devolvió cotizaciones en este momento.",
  }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
