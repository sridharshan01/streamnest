"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
export default function Reset() {
  const [ok, setOk] = useState(false); const [pw, setPw] = useState(""); const [c, setC] = useState("");
  const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState(false);
  useEffect(() => {
    const s = sb();
    s.auth.getSession().then(({ data }) => { if (data.session) setOk(true); });
    const { data } = s.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setOk(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw !== c) return setErr("Passwords don't match.");
    const { error } = await sb().auth.updateUser({ password: pw });
    if (error) setErr("Couldn't update the password. Request a new reset link."); else setDone(true);
  }
  if (done) return <><h1>Password updated</h1><p><a href="/dashboard">Go to dashboard</a></p></>;
  if (!ok) return <p className="muted">Open the reset link from your email to continue.</p>;
  return <form onSubmit={submit} className="form"><h1>New password</h1>
    <label>New password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required /></label>
    <label>Confirm<input type="password" value={c} onChange={(e) => setC(e.target.value)} autoComplete="new-password" required /></label>
    {err && <p role="alert" className="err">{err}</p>}<button>Update password</button></form>;
}
