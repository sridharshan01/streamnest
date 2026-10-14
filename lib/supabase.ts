import { createClient, SupabaseClient } from "@supabase/supabase-js";
let c: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!c) {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL, k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!u || !k) throw new Error("Missing Supabase environment variables");
    c = createClient(u, k);
  }
  return c;
}
