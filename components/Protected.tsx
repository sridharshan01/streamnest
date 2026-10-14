"use client";
import { useUser } from "@/lib/useUser";
export default function Protected({ children }: { children: React.ReactNode }) {
  const { user, ready, configError } = useUser(true);
  if (configError) return <p role="alert" className="err">Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>;
  if (!ready || !user) return <p className="muted">Loading…</p>;
  return <>{children}</>;
}
