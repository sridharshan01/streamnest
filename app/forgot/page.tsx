"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";
export default function Forgot() {
  const [email, setEmail] = useState(""); const [done, setDone] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await sb().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/reset` });
    if (error) setErr("Couldn't send the email right now. Wait a minute and try again."); else setDone(true);
  }
  if (done) return <><h1>Check your email</h1><p>If an account exists for that address, a reset link is on its way.</p></>;
  return <form onSubmit={submit} className="form"><h1>Reset password</h1>
    <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
    {err && <p role="alert" className="err">{err}</p>}<button>Send reset link</button></form>;
}
