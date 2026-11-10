import { createClient } from "@supabase/supabase-js";

type SupabaseInstance = ReturnType<typeof createClient>;

let instance: SupabaseInstance | undefined;

function getSupabase(): SupabaseInstance {
  if (instance) return instance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase no está configurado: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  instance = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return instance;
}

// Avoid module-scope initialization during Cloudflare Workers build and route collection.
export const supabase = new Proxy({} as SupabaseInstance, {
  get(_target, property) {
    const client = getSupabase();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
