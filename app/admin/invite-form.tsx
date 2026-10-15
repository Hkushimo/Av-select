"use client";
import { FormEvent, useState } from "react";

export default function InviteForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/admin/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Couldn't send invitation.");
      setStatus(result.message || "Invitation sent.");
      setEmail("");
    } catch (err) { setError(err instanceof Error ? err.message : "Invitation failed."); }
    finally { setBusy(false); }
  }

  return <section className="panel space-y-4">
    <div><h2 className="text-xl font-bold">Invite a technician</h2>
    <p className="muted text-sm mt-1">Send a private email invitation. They'll set a password and complete the four-step technician profile.</p></div>
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
      <input aria-label="Technician email" type="email" required placeholder="technician@example.com"
        value={email} onChange={e => setEmail(e.target.value)} className="flex-1"/>
      <button className="primary" disabled={busy}>{busy ? "Sending…" : "Send invitation"}</button>
    </form>
    {status && <p role="status" className="text-green-300 text-sm">{status}</p>}
    {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
  </section>;
}
