"use client";
import { useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";

export default function Login() {
  const [id, setId] = useState(""); const [pw, setPw] = useState(""); const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const s = sb();
      if (id.includes("@")) {
        const { error } = await s.auth.signInWithPassword({ email: id.trim(), password: pw });
        if (error) return setErr(/confirm/i.test(error.message) ? "Verify your email first. Check your inbox." : "Wrong email or password.");
      } else {
        const res = await fetch("/api/auth/username-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: id.trim(), password: pw }) });
        if (res.status === 429) return setErr("Too many attempts. Wait a minute and try again.");
        const j = await res.json();
        if (!j.ok) return setErr(j.message ?? "Wrong username or password.");
        const { error } = await s.auth.setSession({ access_token: j.access_token, refresh_token: j.refresh_token });
        if (error) return setErr("Couldn't start your session. Try again.");
      }
      location.href = "/dashboard";
    } catch { setErr("Something went wrong. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="form">
      <h1>Sign in</h1>
      <label>Email or username<input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" required /></label>
      <label>Password<input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required /></label>
      <label className="chk"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password</label>
      {err && <p role="alert" className="err">{err}</p>}
      <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p><Link href="/forgot">Forgot password?</Link> · <Link href="/signup">Create account</Link></p>
    </form>
  );
}
