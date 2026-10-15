"use client";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { browserDb } from "@/lib/supabase";

function InviteForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [valid, setValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/invite?token=" + encodeURIComponent(token), { cache: "no-store" })
      .then(r => r.json()).then((data: { valid?: boolean }) => { if (active) setValid(!!data.valid); })
      .catch(() => { if (active) setValid(false); });
    return () => { active = false; };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (password.length < 10) { setError("Password must be at least 10 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not create your account.");
      const { error: signInError } = await browserDb().auth.signInWithPassword({ email, password });
      if (signInError) throw new Error("Account created. Please sign in at /login to continue.");
      window.location.replace("/onboarding");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not accept invitation."); setBusy(false); }
  }

  return <main className="min-h-screen flex items-center justify-center p-4 sm:p-6">
    <div className="panel w-full max-w-md space-y-5">
      <p className="text-blue-400 tracking-widest font-bold">AV SELECT</p>
      <h1 className="text-2xl sm:text-3xl font-bold">Join the technician roster</h1>
      {valid === null ? <p className="muted">Checking your invitation…</p> :
      !valid ? <p className="text-red-300">This invitation has expired or was already used. Ask your administrator for a new link.</p> :
      <form className="space-y-4" onSubmit={submit}>
        <p className="muted text-sm">Set up your login, then complete your AV experience profile.</p>
        <label className="block"><span className="label">Your email</span><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label className="block"><span className="label">Create password</span><input type="password" minLength={10} autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <label className="block"><span className="label">Confirm password</span><input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
        <button className="primary w-full" disabled={busy}>{busy ? "Creating account…" : "Join AV Select"}</button>
      </form>}
    </div>
  </main>;
}
export default function InvitePage() {
  return <Suspense fallback={<main className="p-6">Loading invite…</main>}><InviteForm/></Suspense>;
}
