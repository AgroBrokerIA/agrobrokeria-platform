import type { Database } from "@/types/database";
import { createClient } from "@supabase/supabase-js";

type SupabaseInstance = ReturnType<typeof createClient<Database>>;

let instance: SupabaseInstance | undefined;

function getSupabase(): SupabaseInstance {
  if (instance) return instance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase no está configurado: definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno de compilación de Cloudflare."
    );
  }

  instance = createClient<Database>(url, anonKey, {
    auth: { experimental: { passkey: true } },
  });

  return instance;
}

// Importing this module is safe during static route collection; the client is
// created only when browser/application code actually accesses Supabase.
export const supabase = new Proxy({} as SupabaseInstance, {
  get(_target, property) {
    const client = getSupabase();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
