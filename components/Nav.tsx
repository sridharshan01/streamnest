"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

export default function Nav() {
  const { user } = useUser(); const router = useRouter();
  return (
    <header className="nav">
      <Link href="/"><strong>StreamNest</strong></Link>
      <nav aria-label="Main">
        {user ? (<>
          <Link href="/dashboard">Dashboard</Link><Link href="/history">History</Link><Link href="/saved">Saved</Link><Link href="/trash">Trash</Link>
          <button className="ghost" onClick={async () => { await sb().auth.signOut(); router.push("/"); }}>Sign out</button>
        </>) : (<><Link href="/login">Sign in</Link><Link className="btn" href="/signup">Sign up</Link></>)}
      </nav>
    </header>
  );
}
