import { createClient } from "@supabase/supabase-js";
// Server only. Never import from client components.
export function admin() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL, k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !k) throw new Error("Missing server Supabase environment variables");
  return createClient(u, k, { auth: { persistSession: false } });
}
