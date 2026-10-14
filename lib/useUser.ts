"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { sb } from "./supabase";

export function useUser(required = false) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let client; try { client = sb(); } catch { setConfigError(true); setReady(true); return; }
    let off = false;
    client.auth.getSession().then(({ data }) => {
      if (off) return;
      setUser(data.session?.user ?? null); setReady(true);
      if (required && !data.session) router.replace("/login");
    });
    const { data: sub } = client.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (required && !s) router.replace("/login");
    });
    return () => { off = true; sub.subscription.unsubscribe(); };
  }, [required, router]);
  return { user, ready, configError };
}
