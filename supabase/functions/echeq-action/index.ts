import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (body: unknown, status = 410) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

Deno.serve(async () =>
  json({
    ok: false,
    error: "ECHEQ_INTEGRATION_DISABLED",
    message: "La integración de eCheq fue retirada de los medios de pago de AgroBrokerIA.",
  })
);
