import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const { path, operationId } = await req.json();
    if (typeof path !== "string" || typeof operationId !== "string" || !/^[0-9a-f-]{36}$/i.test(operationId)) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const expectedPrefix = `operations/${operationId}/`;
    if (!path.startsWith(expectedPrefix) || path.includes("..") || path.includes("\\") || path.startsWith("/")) {
      return NextResponse.json({ error: "INVALID_STORAGE_PATH" }, { status: 400 });
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authorization } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const { data: participant, error: participantError } = await userClient
      .rpc("usuario_participa_operacion", { p_operacion_id: operationId });
    if (participantError || participant !== true) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: "STORAGE_SERVICE_NOT_CONFIGURED" }, { status: 503 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const { data, error } = await admin.storage.from("agrobroker-private").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return NextResponse.json({ error: "SIGNED_URL_FAILED", detail: error?.message }, { status: 404 });

    return NextResponse.json({ url: data.signedUrl, expiresIn: 300, path });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "STORAGE_URL_ERROR" }, { status: 500 });
  }
}
