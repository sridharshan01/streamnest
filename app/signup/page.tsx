"use client";
import { useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";

export default function Signup() {
  const [f, setF] = useState({ username: "", email: "", password: "", confirm: "", terms: false });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(f.username)) return setErr("Username must be 3–24 letters, numbers or underscores.");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr("Enter a valid email address.");
    if (f.password.length < 8) return setErr("Password must be at least 8 characters.");
    if (f.password !== f.confirm) return setErr("Passwords don't match.");
    if (!f.terms) return setErr("Accept the terms and privacy policy to continue.");
    setBusy(true);
    try {
      const a = await fetch(`/api/auth/username-available?u=${encodeURIComponent(f.username)}`).then((r) => r.json());
      if (!a.available) return setErr("That username is taken.");
      const { data, error } = await sb().auth.signUp({ email: f.email, password: f.password, options: { data: { username: f.username }, emailRedirectTo: `${location.origin}/login` } });
      if (error) return setErr(error.message);
      if (data.session) location.href = "/dashboard"; else setSent(true);
    } catch { setErr("Something went wrong. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  async function resend() {
    const { error } = await sb().auth.resend({ type: "signup", email: f.email });
    setMsg(error ? "Couldn't resend yet. Wait a minute and try again." : "Verification email sent again.");
  }

  if (sent) return (<><h1>Check your email</h1><p>We sent a verification link to <b>{f.email}</b>. Open it, then sign in.</p>
    <button className="ghost" onClick={resend}>Resend email</button>{msg && <p role="status" className="muted">{msg}</p>}<p><Link href="/login">Go to sign in</Link></p></>);
  return (
    <form onSubmit={submit} className="form">
      <h1>Create account</h1>
      <label>Username<input value={f.username} onChange={(e) => set("username", e.target.value)} autoComplete="username" required /></label>
      <label>Email<input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required /></label>
      <label>Password<input type={show ? "text" : "password"} value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" required /></label>
      <label>Confirm password<input type={show ? "text" : "password"} value={f.confirm} onChange={(e) => set("confirm", e.target.value)} autoComplete="new-password" required /></label>
      <label className="chk"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords</label>
      <label className="chk"><input type="checkbox" checked={f.terms} onChange={(e) => set("terms", e.target.checked)} /> I accept the terms and privacy policy</label>
      {err && <p role="alert" className="err">{err}</p>}
      <button disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      <p>Already have an account? <Link href="/login">Sign in</Link></p>
    </form>
  );
}
