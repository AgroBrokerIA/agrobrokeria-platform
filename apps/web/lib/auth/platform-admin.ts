import { createClient } from "@supabase/supabase-js";

type PlatformAdminResult =
  | { ok: true; user: { id: string; email?: string } }
  | { ok: false; status: 401 | 403 | 500; error: string };

export async function requirePlatformAdmin(request: Request): Promise<PlatformAdminResult> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { ok: false, status: 401, error: "AUTH_REQUIRED" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false, status: 500, error: "AUTH_CONFIG_NOT_AVAILABLE" };

  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user) return { ok: false, status: 401, error: "INVALID_SESSION" };

  const { data: admin, error: adminError } = await client
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) return { ok: false, status: 500, error: "ADMIN_CHECK_FAILED" };
  if (!admin) return { ok: false, status: 403, error: "PLATFORM_ADMIN_REQUIRED" };

  return { ok: true, user: { id: user.id, email: user.email } };
}
