"use client";
import { FormEvent, useEffect, useState } from "react";
import { browserDb } from "@/lib/supabase";

export default function AcceptInvite() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const db = browserDb();
    const check = async () => {
      const { data } = await db.auth.getSession();
      if (active) setReady(!!data.session);
    };
    check();
    const { data: subscription } = db.auth.onAuthStateChange((_event, session) => {
      if (active) setReady(!!session);
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await browserDb().auth.updateUser({ password });
      if (updateError) throw updateError;
      window.location.assign("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set password.");
      setBusy(false);
    }
  }

  return <main className="min-h-screen flex items-center justify-center p-6">
    <div className="panel w-full max-w-md space-y-5">
      <div className="text-blue-400 tracking-widest font-bold">AV SELECT</div>
      <h1 className="text-3xl font-bold">Accept your invitation</h1>
      {!ready ? <p className="muted">Your invitation session is not active. Open the latest invitation link from your email. If it expired, contact the administrator.</p> :
      <form onSubmit={submit} className="space-y-4">
        <p className="muted">Create your password, then complete your technician profile.</p>
        <label className="block"><span className="label">New password</span>
          <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)}/></label>
        <label className="block"><span className="label">Confirm password</span>
          <input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)}/></label>
        {error && <p role="alert" className="text-red-400">{error}</p>}
        <button className="primary w-full" disabled={busy}>{busy ? "Saving…" : "Continue to onboarding"}</button>
      </form>}
    </div>
  </main>;
}
